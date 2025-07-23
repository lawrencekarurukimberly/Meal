#!/usr/bin/env python3
"""
Simple Backend API Test to verify core functionality
"""

import requests
import json
from datetime import datetime

BASE_URL = "https://faa710bb-1261-4a33-9581-8ed9a78e68a3.preview.emergentagent.com/api"

def test_core_flow():
    """Test the complete user flow"""
    print("🧪 Testing Core Mealy Backend Flow")
    print("=" * 50)
    
    # 1. Register Admin
    admin_data = {
        "email": "testadmin@mealy.com",
        "name": "Test Admin",
        "password": "admin123",
        "role": "admin"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=admin_data, timeout=5)
    if response.status_code == 200:
        admin_token = response.json()["access_token"]
        print("✅ Admin registration successful")
    else:
        print(f"❌ Admin registration failed: {response.status_code}")
        return False
    
    # 2. Register Customer
    customer_data = {
        "email": "testcustomer@mealy.com", 
        "name": "Test Customer",
        "password": "customer123",
        "role": "customer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=customer_data, timeout=5)
    if response.status_code == 200:
        customer_token = response.json()["access_token"]
        print("✅ Customer registration successful")
    else:
        print(f"❌ Customer registration failed: {response.status_code}")
        return False
    
    # 3. Admin creates meal
    meal_data = {
        "name": "Test Meal",
        "description": "A test meal",
        "price": 200.0,
        "category": "Main Course"
    }
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BASE_URL}/meals", json=meal_data, headers=headers, timeout=5)
    if response.status_code == 200:
        meal_id = response.json()["id"]
        print("✅ Meal creation successful")
    else:
        print(f"❌ Meal creation failed: {response.status_code}")
        return False
    
    # 4. Admin creates daily menu
    today = datetime.now().strftime("%Y-%m-%d")
    menu_data = {
        "date": today,
        "meal_ids": [meal_id]
    }
    
    response = requests.post(f"{BASE_URL}/daily-menu", json=menu_data, headers=headers, timeout=5)
    if response.status_code == 200:
        print("✅ Daily menu creation successful")
    else:
        print(f"❌ Daily menu creation failed: {response.status_code}")
        return False
    
    # 5. Customer places order
    order_data = {
        "meal_id": meal_id,
        "quantity": 1
    }
    
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    response = requests.post(f"{BASE_URL}/orders", json=order_data, headers=customer_headers, timeout=5)
    if response.status_code == 200:
        order_id = response.json()["id"]
        print("✅ Order placement successful")
    else:
        print(f"❌ Order placement failed: {response.status_code}")
        return False
    
    # 6. Customer processes payment
    payment_data = {
        "order_id": order_id,
        "phone": "254712345678"
    }
    
    response = requests.post(f"{BASE_URL}/payment/mpesa", json=payment_data, headers=customer_headers, timeout=5)
    if response.status_code == 200:
        transaction_id = response.json()["transaction_id"]
        print(f"✅ Payment processing successful: {transaction_id}")
    else:
        print(f"❌ Payment processing failed: {response.status_code}")
        return False
    
    # 7. Admin checks revenue
    response = requests.get(f"{BASE_URL}/orders/today/revenue", headers=headers, timeout=5)
    if response.status_code == 200:
        revenue_data = response.json()
        print(f"✅ Revenue tracking successful: {revenue_data['total_revenue']} KES")
    else:
        print(f"❌ Revenue tracking failed: {response.status_code}")
        return False
    
    print("\n🎉 ALL CORE FUNCTIONALITY TESTS PASSED!")
    return True

if __name__ == "__main__":
    success = test_core_flow()
    if not success:
        print("\n❌ Some tests failed")
        exit(1)
    else:
        print("\n✅ Backend is fully functional!")
        exit(0)