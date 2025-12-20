from django.shortcuts import render, get_object_or_404
from .models import Listing, Tag

def listing_list(request):
    qs = Listing.objects.all().prefetch_related("tags", "photos")

    # Фильтр по цене
    price_min = request.GET.get("price_min")
    price_max = request.GET.get("price_max")
    tag_slug = request.GET.get("tag")

    if price_min:
        try:
            qs = qs.filter(price_per_month__gte=float(price_min))
        except ValueError:
            pass

    if price_max:
        try:
            qs = qs.filter(price_per_month__lte=float(price_max))
        except ValueError:
            pass

    # Фильтр по тегу
    if tag_slug:
        qs = qs.filter(tags__slug=tag_slug)

    # Сортировка
    sort = request.GET.get("sort")
    if sort == "price_asc":
        qs = qs.order_by("price_per_month")
    elif sort == "price_desc":
        qs = qs.order_by("-price_per_month")
    else:
        qs = qs.order_by("-created_at")  # по умолчанию — новые сверху

    tags = Tag.objects.all()

    context = {
        "listings": qs,
        "tags": tags,
        "current_tag": tag_slug,
        "price_min": price_min or "",
        "price_max": price_max or "",
        "sort": sort or "",
    }
    return render(request, "listings/listing_list.html", context)


def listing_detail(request, pk):
    listing = get_object_or_404(Listing.objects.prefetch_related("photos", "tags"), pk=pk)
    return render(request, "listings/listing_detail.html", {"listing": listing})


def favorites(request):
    listings = Listing.objects.all().prefetch_related("tags", "photos").order_by("-created_at")
    return render(
        request,
        "listings/favorites.html",
        {
            "listings": listings,
            "is_favorites_page": True,
        },
    )
