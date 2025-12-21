import json

from django.db.models import Case, When
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST

from .models import FeedbackRequest, Listing, Tag

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
    ids_param = request.GET.get("ids", "")

    listings = Listing.objects.all().prefetch_related("tags", "photos").order_by("-created_at")

    if ids_param:
        raw_ids = [value.strip() for value in ids_param.split(",") if value.strip()]
        favorite_ids = []

        for raw_id in raw_ids:
            try:
                favorite_ids.append(int(raw_id))
            except ValueError:
                continue

        if favorite_ids:
            order_preserved = Case(*[When(id=pk, then=pos) for pos, pk in enumerate(favorite_ids)])
            listings = (
                Listing.objects.filter(id__in=favorite_ids)
                .prefetch_related("tags", "photos")
                .order_by(order_preserved)
            )
        else:
            listings = Listing.objects.none()

    return render(
        request,
        "listings/favorites.html",
        {
            "listings": listings,
            "is_favorites_page": True,
        },
    )


@require_POST
def submit_feedback(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return JsonResponse({"status": "error", "error": "invalid_json"}, status=400)

    name = (data.get("name") or "").strip()
    contact = (data.get("contact") or "").strip()
    message = (data.get("message") or "").strip()
    user_id = (data.get("user_id") or "").strip() or None

    if not name or not contact or not message:
        return JsonResponse({"status": "error", "error": "missing_fields"}, status=400)

    FeedbackRequest.objects.create(
        name=name,
        contact=contact,
        message=message,
        user_id=user_id,
    )

    return JsonResponse({"status": "ok"})
