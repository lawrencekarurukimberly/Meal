#!/usr/bin/env python3
"""
Test Role-Based Access Control
"""

import requests
import json

BASE_URL = "https://faa710bb-1261-4a33-9581-8ed9a78e68a3.preview.emergentagent.com/api"

def test_access_control():
    """Test that role-based access control works correctly"""
    print("🔐 Testing Role-Based Access Control")
    print("=" * 40)
    
    # Register customer
    customer_data = {
        "email": "accesstest@mealy.com",
        "name": "Access Test Customer", 
        "password": "customer123",
        "role": "customer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=customer_data, timeout=5)
    if response.status_code == 200:
        customer_token = response.json()["access_token"]
        print("✅ Customer registered")
    else:
        print(f"❌ Customer registration failed: {response.status_code}")
        return False
    
    customer_headers = {"Authorization": f"Bearer {customer_token}"}
    
    # Test 1: Customer cannot create meals
    meal_data = {
        "name": "Unauthorized Meal",
        "description": "This should fail",
        "price": 100.0,
        "category": "Test"
    }
    
    response = requests.post(f"{BASE_URL}/meals", json=meal_data, headers=customer_headers, timeout=5)
    if response.status_code == 403:
        print("✅ Customer properly denied meal creation (403)")
    else:
        print(f"❌ Expected 403, got {response.status_code}")
        return False
    
    # Test 2: Customer cannot create daily menu
    menu_data = {
        "date": "2025-07-22",
        "meal_ids": ["test-id"]
    }
    
    response = requests.post(f"{BASE_URL}/daily-menu", json=menu_data, headers=customer_headers, timeout=5)
    if response.status_code == 403:
        print("✅ Customer properly denied daily menu creation (403)")
    else:
        print(f"❌ Expected 403, got {response.status_code}")
        return False
    
    # Test 3: Customer cannot access revenue endpoint
    response = requests.get(f"{BASE_URL}/orders/today/revenue", headers=customer_headers, timeout=5)
    if response.status_code == 403:
        print("✅ Customer properly denied revenue access (403)")
    else:
        print(f"❌ Expected 403, got {response.status_code}")
        return False
    
    # Test 4: Invalid login credentials
    invalid_login = {
        "email": "accesstest@mealy.com",
        "password": "wrongpassword"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=invalid_login, timeout=5)
    if response.status_code == 401:
        print("✅ Invalid credentials properly rejected (401)")
    else:
        print(f"❌ Expected 401, got {response.status_code}")
        return False
    
    print("\n🔒 ALL ACCESS CONTROL TESTS PASSED!")
    return True

if __name__ == "__main__":
    success = test_access_control()
    if not success:
        print("\n❌ Access control tests failed")
        exit(1)
    else:
        print("\n✅ Access control is working correctly!")
        exit(0)