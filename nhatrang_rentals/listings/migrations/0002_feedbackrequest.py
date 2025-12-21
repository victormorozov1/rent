from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="FeedbackRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200, verbose_name="Имя")),
                ("contact", models.CharField(max_length=200, verbose_name="Контакты")),
                ("message", models.TextField(verbose_name="Сообщение")),
                (
                    "user_id",
                    models.CharField(
                        blank=True, max_length=64, null=True, verbose_name="Анонимный пользователь"
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Создано")),
            ],
            options={
                "verbose_name": "Запрос обратной связи",
                "verbose_name_plural": "Запросы обратной связи",
                "ordering": ["-created_at"],
            },
        ),
    ]
