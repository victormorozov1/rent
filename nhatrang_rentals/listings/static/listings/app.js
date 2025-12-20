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
const FAVORITES_FILTER_KEY = "nhatrang_favorites_filter";

let favoriteFilterEnabled = false;
let favoritesToggleBtn = null;

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

function readFavoriteFilterState() {
    try {
        return localStorage.getItem(FAVORITES_FILTER_KEY) === "1";
    } catch (e) {
        return false;
    }
}

function writeFavoriteFilterState(enabled) {
    try {
        if (enabled) {
            localStorage.setItem(FAVORITES_FILTER_KEY, "1");
        } else {
            localStorage.removeItem(FAVORITES_FILTER_KEY);
        }
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
    applyFavoritesFilter();
}

function updateFavoritesToggleUI() {
    if (!favoritesToggleBtn) return;

    favoritesToggleBtn.classList.toggle("is-favorite", favoriteFilterEnabled);
    favoritesToggleBtn.setAttribute("aria-pressed", favoriteFilterEnabled ? "true" : "false");

    const icon = favoritesToggleBtn.querySelector(".favorite-icon");
    const textSpan = favoritesToggleBtn.querySelector(".favorite-text");

    if (icon) {
        icon.textContent = favoriteFilterEnabled ? "★" : "☆";
    }

    if (textSpan) {
        textSpan.textContent = "Избранное";
    }
}

function applyFavoritesFilter() {
    const cards = document.querySelectorAll(".listing-card[data-listing-id]");
    if (!cards.length) return;

    const favoritesSet = new Set(readFavorites().map(String));
    let visibleCount = 0;

    cards.forEach((card) => {
        const id = card.getAttribute("data-listing-id");
        const isFav = favoritesSet.has(String(id));
        const shouldShow = !favoriteFilterEnabled || isFav;

        card.classList.toggle("is-hidden-by-favorites", !shouldShow);
        if (shouldShow) {
            visibleCount += 1;
        }
    });

    const emptyState = document.getElementById("favorites-empty-state");
    if (emptyState) {
        const showEmpty = favoriteFilterEnabled && visibleCount === 0;
        emptyState.hidden = !showEmpty;
    }
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
            if (btn.hasAttribute("data-open-favorites-list")) {
                const icon = btn.querySelector(".favorite-icon");
                const textSpan = btn.querySelector(".favorite-text");
                if (icon) icon.textContent = "★";
                if (textSpan) textSpan.textContent = "Избранное";
                return;
            }
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
    const listingId = root.closest("[data-listing-id]")?.getAttribute("data-listing-id") || null;

    const thumbsContainer = root.querySelector("[data-carousel-thumbs]");
    const lightbox = root.querySelector("[data-carousel-lightbox]");
    const lightboxImg = lightbox?.querySelector("[data-carousel-lightbox-img]");

    function renderThumbnails() {
        if (!thumbsContainer) return;
        thumbsContainer.innerHTML = "";

        slides.forEach((slide, idx) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "carousel-thumb";

            const img = document.createElement("img");
            img.src = slide.src;
            img.alt = slide.alt || `Фото ${idx + 1}`;
            btn.appendChild(img);

            btn.addEventListener("click", () => {
                currentIndex = idx;
                update();
                trackAction("carousel_thumb", { index: currentIndex });
            });

            thumbsContainer.appendChild(btn);
        });
    }

    function updateLightboxImage() {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = slides[currentIndex].src;
        lightboxImg.alt = slides[currentIndex].alt || "";
    }

    function update() {
        const offset = -currentIndex * 100;
        track.style.transform = `translateX(${offset}%)`;

        if (thumbsContainer) {
            thumbsContainer.querySelectorAll(".carousel-thumb").forEach((thumb, idx) => {
                thumb.classList.toggle("is-active", idx === currentIndex);
                if (idx === currentIndex) {
                    thumb.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                }
            });
        }

        updateLightboxImage();
    }

    // Кнопки
    const prevBtn = root.querySelector("[data-carousel-prev]");
    const nextBtn = root.querySelector("[data-carousel-next]");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            update();
            trackAction("carousel_prev", { index: currentIndex, listing_id: listingId });
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % slides.length;
            update();
            trackAction("carousel_next", { index: currentIndex, listing_id: listingId });
        });
    }

    renderThumbnails();

    // Фуллскрин
    const openFullscreen = root.querySelector("[data-carousel-fullscreen-open]");
    if (openFullscreen && lightbox && lightboxImg) {
        const closeButtons = root.querySelectorAll("[data-carousel-fullscreen-close]");

        const close = () => {
            lightbox.hidden = true;
            document.body.classList.remove("no-scroll");
            trackAction("carousel_fullscreen_close", { index: currentIndex });
        };

        openFullscreen.addEventListener("click", () => {
            updateLightboxImage();
            lightbox.hidden = false;
            document.body.classList.add("no-scroll");
            trackAction("carousel_fullscreen_open", { index: currentIndex });
        });

        closeButtons.forEach((btn) => {
            btn.addEventListener("click", close);
        });

        lightbox.addEventListener("click", (e) => {
            if (e.target === lightbox) close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !lightbox.hidden) {
                close();
            }
        });
    }

    update();
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

    favoriteFilterEnabled = readFavoriteFilterState();
    favoritesToggleBtn = document.getElementById("favorites-toggle");

    if (favoritesToggleBtn) {
        favoritesToggleBtn.addEventListener("click", () => {
            favoriteFilterEnabled = !favoriteFilterEnabled;
            writeFavoriteFilterState(favoriteFilterEnabled);
            updateFavoritesToggleUI();
            applyFavoritesFilter();
            trackAction("favorites_filter_toggle", { enabled: favoriteFilterEnabled });
        });

        updateFavoritesToggleUI();
    }

    applyFavoritesFilter();

    document.body.addEventListener("click", (e) => {
        const btn = e.target.closest(".favorite-btn");
        if (!btn) return;

        if (btn.hasAttribute("data-open-favorites-list")) {
            const container = btn.closest("[data-listing-id]");
            const listingId = container?.getAttribute("data-listing-id") || null;
            const favoritesUrl = btn.getAttribute("data-favorites-url") || "/";

            favoriteFilterEnabled = true;
            writeFavoriteFilterState(true);
            trackAction("favorites_open_list", { from: "detail", listing_id: listingId });
            window.location.href = favoritesUrl;
            return;
        }

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
        let filterSubmitTimeout;

        const submitFilters = () => {
            filterForm.requestSubmit();
        };

        const scheduleFilterSubmit = () => {
            clearTimeout(filterSubmitTimeout);
            filterSubmitTimeout = setTimeout(submitFilters, 300);
        };

        filterForm.addEventListener("submit", () => {
            const formData = new FormData(filterForm);
            const payload = Object.fromEntries(formData.entries());
            trackAction("filter_submit", payload);
        });

        const sortSelect = document.getElementById("sort");
        if (sortSelect) {
            sortSelect.addEventListener("change", () => {
                trackAction("sort_change", { sort: sortSelect.value });
                submitFilters();
            });
        }

        filterForm.querySelectorAll("input, select").forEach((input) => {
            const eventName = input.type === "number" || input.type === "text" ? "input" : "change";
            input.addEventListener(eventName, () => {
                if (input.type === "radio" || input.type === "checkbox" || eventName === "change") {
                    submitFilters();
                } else {
                    scheduleFilterSubmit();
                }
            });
        });
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
    document.querySelectorAll("[data-carousel]").forEach((carousel) => initCarousel(carousel));
});
