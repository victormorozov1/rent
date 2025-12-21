from django.urls import path
from . import views

app_name = "listings"

urlpatterns = [
    path("", views.listing_list, name="listing_list"),
    path("listing/<int:pk>/", views.listing_detail, name="listing_detail"),
    path("favorites/", views.favorites, name="favorites"),
    path("feedback/", views.submit_feedback, name="feedback_submit"),
]
