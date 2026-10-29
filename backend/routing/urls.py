from django.urls import path
from .views import plan_route, health

urlpatterns = [path("health/", health), path("route-plan/", plan_route)]
