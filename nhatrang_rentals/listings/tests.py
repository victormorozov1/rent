from decimal import Decimal

from django.test import TestCase
from django.urls import reverse

from .models import Listing


class FavoritesViewTests(TestCase):
    def setUp(self):
        self.listing = Listing.objects.create(
            title="Тестовая квартира",
            description="Уютная квартира для тестов",
            price_per_month=Decimal("100000"),
            address="Нячанг, тестовая улица",
            telegram_url="https://t.me/example",
        )

    def test_favorites_page_renders(self):
        url = reverse("listings:favorites")
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "listings/favorites.html")
        self.assertContains(response, "Избранные объявления")
        self.assertContains(response, self.listing.title)
