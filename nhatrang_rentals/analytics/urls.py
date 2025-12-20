from django.urls import path
from .views import track_event

app_name = "analytics"

urlpatterns = [
    path("track/", track_event, name="track_event"),
]
