// ======= Анонимный ID пользователя в куках =======

function getUserId() {
    const name = "anon_user_id=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const parts = decodedCookie.split(";");
    for (let part of parts) {
        part = part.trim();
        if (part.indexOf(name) === 0) {
            return part.substring(name.length, part.length);
        }
    }

    // если нет — создаём
    let newId;
    if (window.crypto && crypto.randomUUID) {
        newId = crypto.randomUUID();
    } else {
        newId = "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }

    const oneYearSeconds = 365 * 24 * 60 * 60;
    document.cookie = `anon_user_id=${newId};path=/;max-age=${oneYearSeconds}`;
    return newId;
}

const USER_ID = getUserId();

// ======= Отправка событий на сервер (analytics app) =======

function trackAction(actionType, details = {}) {
    try {
        fetch("/analytics/track/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            // keepalive — чтобы не потерять событие при уходе со страницы (если браузер поддерживает)
            keepalive: true,
            body: JSON.stringify({
                user_id: USER_ID,
                action_type: actionType,
                details: details
            })
        }).catch(() => {
            // глушим ошибки, чтобы не мешать пользователю
        });
    } catch (e) {
        // игнор
    }
}

// ======= Фавориты в localStorage =======

const FAVORITES_KEY = "nhatrang_favorites";

function readFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        if (!raw) return [];
        const ids = JSON.parse(raw);
        if (Array.isArray(ids)) return ids;
        return [];
    } catch (e) {
        return [];
    }
}

function writeFavorites(ids) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    } catch (e) {
        // ignore
    }
}

function isFavorite(id) {
    const ids = readFavorites();
    return ids.includes(String(id));
}

function toggleFavorite(id) {
    const ids = readFavorites();
    const strId = String(id);
    let action;
    if (ids.includes(strId)) {
        const filtered = ids.filter((x) => x !== strId);
        writeFavorites(filtered);
        action = "favorite_remove";
    } else {
        ids.push(strId);
        writeFavorites(ids);
        action = "favorite_add";
    }
    trackAction(action, { listing_id: strId });
    updateFavoriteButtonsState();
}

// Обновление всех кнопок на странице
function updateFavoriteButtonsState() {
    const ids = readFavorites();
    const set = new Set(ids);

    document.querySelectorAll("[data-listing-id]").forEach((card) => {
        const id = card.getAttribute("data-listing-id");
        const btn = card.querySelector(".favorite-btn");
        if (!btn) return;

        const isFav = set.has(String(id));
        btn.classList.toggle("is-favorite", isFav);
        const icon = btn.querySelector(".favorite-icon");
        const textSpan = btn.querySelector(".favorite-text");

        if (icon) {
            icon.textContent = isFav ? "★" : "☆";
        }

        if (textSpan) {
            textSpan.textContent = isFav ? "В избранном" : "В избранное";
        }
    });

    // Detal page layout (button outside data-listing-id)
    const detailLayout = document.querySelector(".detail-layout");
    if (detailLayout) {
        const listingId = detailLayout.getAttribute("data-listing-id");
        const btn = detailLayout.querySelector(".favorite-btn");
        if (btn) {
            const isFav = set.has(String(listingId));
            btn.classList.toggle("is-favorite", isFav);
            const icon = btn.querySelector(".favorite-icon");
            const textSpan = btn.querySelector(".favorite-text");
            if (icon) icon.textContent = isFav ? "★" : "☆";
            if (textSpan) textSpan.textContent = isFav ? "В избранном" : "В избранное";
        }
    }
}

// ======= Карусель фото на странице детали =======

function initCarousel(root) {
    const track = root.querySelector(".carousel-track");
    if (!track) return;
    const slides = Array.from(track.querySelectorAll(".carousel-slide"));
    if (!slides.length) return;

    let currentIndex = 0;
    const autoplayMs = parseInt(root.dataset.carouselAutoplay, 10);
    let autoplayTimer = null;

    function update() {
        const offset = -currentIndex * 100;
        track.style.transform = `translateX(${offset}%)`;

        const dotsContainer = root.querySelector("[data-carousel-dots]");
        if (dotsContainer) {
            dotsContainer.querySelectorAll("button").forEach((dot, idx) => {
                dot.classList.toggle("is-active", idx === currentIndex);
            });
        }
    }

    function goTo(index) {
        currentIndex = (index + slides.length) % slides.length;
        update();
    }

    function stopAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    function startAutoplay() {
        stopAutoplay();
        if (!autoplayMs || slides.length <= 1) return;
        autoplayTimer = setInterval(() => {
            goTo(currentIndex + 1);
            trackAction("carousel_autoplay", { index: currentIndex });
        }, autoplayMs);
    }

    // Кнопки
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            goTo(currentIndex - 1);
            trackAction("carousel_prev", { index: currentIndex });
            startAutoplay();
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            goTo(currentIndex + 1);
            trackAction("carousel_next", { index: currentIndex });
            startAutoplay();
        });
    }

    // Точки
    const dotsContainer = root.querySelector("[data-carousel-dots]");
    if (dotsContainer) {
        dotsContainer.innerHTML = "";
        slides.forEach((_, idx) => {
            const dot = document.createElement("button");
            if (idx === 0) dot.classList.add("is-active");
            dot.addEventListener("click", () => {
                goTo(idx);
                trackAction("carousel_dot", { index: currentIndex });
                startAutoplay();
            });
            dotsContainer.appendChild(dot);
        });
    }

    if (slides.length <= 1) {
        [prevBtn, nextBtn, dotsContainer].forEach((el) => {
            if (el) el.style.display = "none";
        });
    }

    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);

    update();
    startAutoplay();
}

// ======= Инициализация на DOMContentLoaded =======

document.addEventListener("DOMContentLoaded", () => {
    // Трекинг открытия страницы
    trackAction("page_view", {
        path: window.location.pathname,
        search: window.location.search,
    });

    // Фавориты
    updateFavoriteButtonsState();

    document.body.addEventListener("click", (e) => {
        const btn = e.target.closest(".favorite-btn");
        if (!btn) return;

        // определяем listing id
        let container = btn.closest("[data-listing-id]");
        if (!container) {
            container = document.querySelector(".detail-layout");
        }
        if (!container) return;

        const listingId = container.getAttribute("data-listing-id");
        if (!listingId) return;

        toggleFavorite(listingId);
    });

    // Фильтры — отправка формы
    const filterForm = document.getElementById("filter-form");
    if (filterForm) {
        filterForm.addEventListener("submit", () => {
            const formData = new FormData(filterForm);
            const payload = Object.fromEntries(formData.entries());
            trackAction("filter_submit", payload);
        });

        const sortSelect = document.getElementById("sort");
        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                trackAction("sort_change", { sort: sortSelect.value });
                filterForm.requestSubmit();
            });
        }
    }

    // Telegram-кнопка на странице детали
    const tgButton = document.getElementById("telegram-button");
    if (tgButton && window.TELEGRAM_URL) {
        tgButton.addEventListener("click", () => {
            trackAction("open_telegram", {
                url: window.TELEGRAM_URL,
                path: window.location.pathname,
            });
            window.open(window.TELEGRAM_URL, "_blank");
        });
    }

    // Карусель
    document.querySelectorAll("[data-carousel]").forEach((carousel) => {
        initCarousel(carousel);
    });
});
