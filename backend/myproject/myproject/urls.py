# myproject/urls.py

from django.contrib import admin
from django.urls import path, include # Ensure 'include' is imported

urlpatterns = [
    path("admin/", admin.site.urls),
    # CHANGED: Now includes myapp's URLs under the 'api/' prefix
    path("api/", include("myapp.urls")),
]