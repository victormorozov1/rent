from django.contrib import admin
from .models import FeedbackRequest, Listing, ListingPhoto, Tag

class ListingPhotoInline(admin.TabularInline):
    model = ListingPhoto
    extra = 1


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "price_per_month", "address", "created_at")
    list_filter = ("tags",)
    search_fields = ("title", "description", "address")
    inlines = [ListingPhotoInline]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color", "icon")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(FeedbackRequest)
class FeedbackRequestAdmin(admin.ModelAdmin):
    list_display = ("name", "contact", "created_at")
    search_fields = ("name", "contact", "message")
    readonly_fields = ("created_at",)
