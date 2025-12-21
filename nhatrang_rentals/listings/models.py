from django.db import models


class FeedbackRequest(models.Model):
    """Запрос, отправленный через форму обратной связи."""

    name = models.CharField("Имя", max_length=200)
    contact = models.CharField("Контакты", max_length=200)
    message = models.TextField("Сообщение")
    user_id = models.CharField("Анонимный пользователь", max_length=64, blank=True, null=True)
    created_at = models.DateTimeField("Создано", auto_now_add=True)

    class Meta:
        verbose_name = "Запрос обратной связи"
        verbose_name_plural = "Запросы обратной связи"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.contact})"

class Tag(models.Model):
    """
    Справочник тегов, чтобы админ мог менять цвет/иконку при желании.
    """
    slug = models.SlugField(unique=True)
    name = models.CharField(max_length=100)
    color = models.CharField(
        max_length=20,
        help_text="CSS-цвет, например: #2dd4bf или rgb(45,212,191)",
    )
    icon = models.CharField(
        max_length=50,
        help_text="Например: emoji (🏖️) или CSS-класс иконки.",
    )

    class Meta:
        verbose_name = "Тег"
        verbose_name_plural = "Теги"

    def __str__(self):
        return self.name


class Listing(models.Model):
    title = models.CharField("Название", max_length=200)
    description = models.TextField("Описание")
    price_per_month = models.DecimalField(
        "Цена в месяц (₽)",
        max_digits=10,
        decimal_places=2,
    )
    address = models.CharField("Адрес", max_length=255)
    telegram_url = models.URLField(
        "Ссылка на Telegram",
        help_text="Например: https://t.me/username",
    )
    tags = models.ManyToManyField(Tag, related_name="listings", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Объявление"
        verbose_name_plural = "Объявления"

    def __str__(self):
        return self.title


class ListingPhoto(models.Model):
    listing = models.ForeignKey(
        Listing,
        related_name="photos",
        on_delete=models.CASCADE,
    )
    image = models.ImageField(
        upload_to="listing_photos/",
        verbose_name="Фото"
    )
    order = models.PositiveIntegerField(
        "Порядок",
        default=0,
        help_text="Для сортировки фотографий",
    )

    class Meta:
        verbose_name = "Фотография"
        verbose_name_plural = "Фотографии"
        ordering = ["order", "id"]

    def __str__(self):
        return f"Фото #{self.pk} для {self.listing}"
