from django.contrib import admin, messages
from .models import Meal, Item


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "category", "created_at")
    search_fields = ("name", "category")
    actions = ["really_delete_selected"]

    def really_delete_selected(self, request, queryset):
        for obj in queryset:
            obj.delete()

        self.message_user(
            request, "The selected meals have been deleted.", messages.SUCCESS
        )

    really_delete_selected.short_description = "Delete selected meals"


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("name", "description", "created_at")
    search_fields = ("name",)
