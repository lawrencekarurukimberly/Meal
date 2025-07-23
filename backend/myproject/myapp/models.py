# myapp/models.py

from django.db import models
from django.contrib.auth.models import User # Import Django's built-in User model

# Your existing Item model (if you still need it, otherwise you can remove it)
class Item(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# --- MEAL MODEL ---
class Meal(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name'] # Default ordering for meals

# --- DAILY MENU MODEL ---
class DailyMenu(models.Model):
    date = models.DateField(unique=True) # Each date has one menu
    meals = models.ManyToManyField(Meal, related_name='daily_menus') # Many-to-many relationship with Meal
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Menu for {self.date}"

    class Meta:
        ordering = ['-date'] # Order by most recent date first

# --- ORDER MODEL ---
class Order(models.Model):
    # Link to the User who placed the order
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    
    order_date = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Statuses for the order lifecycle
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready for Pickup/Delivery'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Payment statuses
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('completed', 'Payment Completed'),
        ('failed', 'Payment Failed'),
    ]
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    # Optional: Customer details for non-logged-in users or specific order details
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return f"Order {self.id} by {self.user.email} on {self.order_date.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-order_date'] # Order by most recent order first

# --- ORDER ITEM MODEL (for meals within an order) ---
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    meal = models.ForeignKey(Meal, on_delete=models.SET_NULL, null=True, blank=True) # If meal is deleted, keep order item
    meal_name = models.CharField(max_length=255) # Store name in case meal is deleted
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2) # Price at time of order
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.meal_name} for Order {self.order.id}"

    @property
    def total_item_price(self):
        return self.price_at_order * self.quantity