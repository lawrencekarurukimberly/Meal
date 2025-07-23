#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Mealy Food Ordering System
Tests all core functionality including authentication, meal management, orders, and payments
"""

import requests
import json
import sys
from datetime import datetime
import time

# Backend URL from frontend/.env
BASE_URL = "https://faa710bb-1261-4a33-9581-8ed9a78e68a3.preview.emergentagent.com/api"

class MealyAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.customer_token = None
        self.admin_user = None
        self.customer_user = None
        self.test_meal_id = None
        self.test_order_id = None
        self.results = {
            "authentication": {"passed": 0, "failed": 0, "details": []},
            "meal_management": {"passed": 0, "failed": 0, "details": []},
            "daily_menu": {"passed": 0, "failed": 0, "details": []},
            "order_management": {"passed": 0, "failed": 0, "details": []},
            "payment_system": {"passed": 0, "failed": 0, "details": []}
        }

    def log_result(self, category, test_name, passed, details=""):
        """Log test result"""
        if passed:
            self.results[category]["passed"] += 1
            status = "✅ PASS"
        else:
            self.results[category]["failed"] += 1
            status = "❌ FAIL"
        
        self.results[category]["details"].append(f"{status}: {test_name} - {details}")
        print(f"{status}: {test_name} - {details}")

    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None

    def get_auth_headers(self, token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {token}"}

    def test_authentication_system(self):
        """Test User Authentication System"""
        print("\n=== Testing User Authentication System ===")
        
        # Test 1: Admin Registration
        admin_data = {
            "email": "admin@mealy.com",
            "name": "Admin User",
            "password": "admin123",
            "role": "admin"
        }
        
        response = self.make_request("POST", "/auth/register", admin_data)
        if response and response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("access_token")
            self.admin_user = data.get("user")
            self.log_result("authentication", "Admin Registration", True, "Admin registered successfully")
        else:
            self.log_result("authentication", "Admin Registration", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 2: Customer Registration
        customer_data = {
            "email": "customer@mealy.com",
            "name": "Customer User",
            "password": "customer123",
            "role": "customer"
        }
        
        response = self.make_request("POST", "/auth/register", customer_data)
        if response and response.status_code == 200:
            data = response.json()
            self.customer_token = data.get("access_token")
            self.customer_user = data.get("user")
            self.log_result("authentication", "Customer Registration", True, "Customer registered successfully")
        else:
            self.log_result("authentication", "Customer Registration", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 3: Admin Login
        login_data = {
            "email": "admin@mealy.com",
            "password": "admin123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if not self.admin_token:  # Use login token if registration failed
                self.admin_token = data.get("access_token")
                self.admin_user = data.get("user")
            self.log_result("authentication", "Admin Login", True, "Admin login successful")
        else:
            self.log_result("authentication", "Admin Login", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 4: Customer Login
        login_data = {
            "email": "customer@mealy.com",
            "password": "customer123"
        }
        
        response = self.make_request("POST", "/auth/login", login_data)
        if response and response.status_code == 200:
            data = response.json()
            if not self.customer_token:  # Use login token if registration failed
                self.customer_token = data.get("access_token")
                self.customer_user = data.get("user")
            self.log_result("authentication", "Customer Login", True, "Customer login successful")
        else:
            self.log_result("authentication", "Customer Login", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 5: JWT Token Validation (Get Me endpoint)
        if self.admin_token:
            response = self.make_request("GET", "/auth/me", headers=self.get_auth_headers(self.admin_token))
            if response and response.status_code == 200:
                data = response.json()
                if data.get("role") == "admin":
                    self.log_result("authentication", "JWT Token Validation (Admin)", True, "Admin token valid")
                else:
                    self.log_result("authentication", "JWT Token Validation (Admin)", False, "Wrong role returned")
            else:
                self.log_result("authentication", "JWT Token Validation (Admin)", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 6: Invalid Login
        invalid_login = {
            "email": "admin@mealy.com",
            "password": "wrongpassword"
        }
        
        response = self.make_request("POST", "/auth/login", invalid_login)
        if response and response.status_code == 401:
            self.log_result("authentication", "Invalid Login Rejection", True, "Invalid credentials properly rejected")
        else:
            self.log_result("authentication", "Invalid Login Rejection", False, f"Expected 401, got {response.status_code if response else 'No response'}")

    def test_meal_management_api(self):
        """Test Meal Management API (Admin-only CRUD)"""
        print("\n=== Testing Meal Management API ===")
        
        if not self.admin_token:
            self.log_result("meal_management", "Admin Token Required", False, "No admin token available")
            return

        # Test 1: Create Meal (Admin)
        meal_data = {
            "name": "Ugali with Beef Stew",
            "description": "Traditional Kenyan meal with tender beef stew",
            "price": 250.0,
            "category": "Main Course",
            "image_url": "https://example.com/ugali-beef.jpg"
        }
        
        response = self.make_request("POST", "/meals", meal_data, self.get_auth_headers(self.admin_token))
        if response and response.status_code == 200:
            data = response.json()
            self.test_meal_id = data.get("id")
            self.log_result("meal_management", "Create Meal (Admin)", True, f"Meal created with ID: {self.test_meal_id}")
        else:
            self.log_result("meal_management", "Create Meal (Admin)", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 2: Get All Meals (Public)
        response = self.make_request("GET", "/meals")
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list) and len(data) > 0:
                self.log_result("meal_management", "Get All Meals", True, f"Retrieved {len(data)} meals")
            else:
                self.log_result("meal_management", "Get All Meals", True, "No meals found (empty list)")
        else:
            self.log_result("meal_management", "Get All Meals", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 3: Update Meal (Admin)
        if self.test_meal_id:
            updated_meal_data = {
                "name": "Ugali with Chicken Stew",
                "description": "Traditional Kenyan meal with tender chicken stew",
                "price": 280.0,
                "category": "Main Course",
                "image_url": "https://example.com/ugali-chicken.jpg"
            }
            
            response = self.make_request("PUT", f"/meals/{self.test_meal_id}", updated_meal_data, self.get_auth_headers(self.admin_token))
            if response and response.status_code == 200:
                self.log_result("meal_management", "Update Meal (Admin)", True, "Meal updated successfully")
            else:
                self.log_result("meal_management", "Update Meal (Admin)", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 4: Customer Cannot Create Meal
        if self.customer_token:
            response = self.make_request("POST", "/meals", meal_data, self.get_auth_headers(self.customer_token))
            if response and response.status_code == 403:
                self.log_result("meal_management", "Customer Access Denied", True, "Customer properly denied meal creation")
            else:
                self.log_result("meal_management", "Customer Access Denied", False, f"Expected 403, got {response.status_code if response else 'No response'}")

        # Test 5: Delete Meal (Admin) - Soft delete
        if self.test_meal_id:
            response = self.make_request("DELETE", f"/meals/{self.test_meal_id}", headers=self.get_auth_headers(self.admin_token))
            if response and response.status_code == 200:
                self.log_result("meal_management", "Delete Meal (Admin)", True, "Meal deleted successfully")
            else:
                self.log_result("meal_management", "Delete Meal (Admin)", False, f"Status: {response.status_code if response else 'No response'}")

    def test_daily_menu_management(self):
        """Test Daily Menu Management"""
        print("\n=== Testing Daily Menu Management ===")
        
        if not self.admin_token:
            self.log_result("daily_menu", "Admin Token Required", False, "No admin token available")
            return

        # First, create a test meal for the menu
        meal_data = {
            "name": "Pilau with Chicken",
            "description": "Spiced rice with tender chicken pieces",
            "price": 300.0,
            "category": "Main Course"
        }
        
        response = self.make_request("POST", "/meals", meal_data, self.get_auth_headers(self.admin_token))
        menu_meal_id = None
        if response and response.status_code == 200:
            menu_meal_id = response.json().get("id")

        # Test 1: Create Daily Menu (Admin)
        today = datetime.now().strftime("%Y-%m-%d")
        menu_data = {
            "date": today,
            "meal_ids": [menu_meal_id] if menu_meal_id else []
        }
        
        response = self.make_request("POST", "/daily-menu", menu_data, self.get_auth_headers(self.admin_token))
        if response and response.status_code == 200:
            self.log_result("daily_menu", "Create Daily Menu (Admin)", True, f"Daily menu created for {today}")
        else:
            self.log_result("daily_menu", "Create Daily Menu (Admin)", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 2: Get Daily Menu by Date
        response = self.make_request("GET", f"/daily-menu/{today}")
        if response and response.status_code == 200:
            data = response.json()
            if "meals" in data and "date" in data:
                self.log_result("daily_menu", "Get Daily Menu by Date", True, f"Retrieved menu for {today}")
            else:
                self.log_result("daily_menu", "Get Daily Menu by Date", False, "Invalid response format")
        else:
            self.log_result("daily_menu", "Get Daily Menu by Date", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 3: Get Today's Menu
        response = self.make_request("GET", "/daily-menu/today/menu")
        if response and response.status_code == 200:
            data = response.json()
            if "meals" in data and "date" in data:
                self.log_result("daily_menu", "Get Today's Menu", True, "Today's menu retrieved successfully")
            else:
                self.log_result("daily_menu", "Get Today's Menu", False, "Invalid response format")
        else:
            self.log_result("daily_menu", "Get Today's Menu", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 4: Customer Cannot Create Daily Menu
        if self.customer_token:
            response = self.make_request("POST", "/daily-menu", menu_data, self.get_auth_headers(self.customer_token))
            if response and response.status_code == 403:
                self.log_result("daily_menu", "Customer Access Denied", True, "Customer properly denied menu creation")
            else:
                self.log_result("daily_menu", "Customer Access Denied", False, f"Expected 403, got {response.status_code if response else 'No response'}")

    def test_order_management_system(self):
        """Test Order Management System"""
        print("\n=== Testing Order Management System ===")
        
        if not self.customer_token:
            self.log_result("order_management", "Customer Token Required", False, "No customer token available")
            return

        # First, create a meal to order
        if self.admin_token:
            meal_data = {
                "name": "Nyama Choma with Ugali",
                "description": "Grilled meat with traditional ugali",
                "price": 400.0,
                "category": "Main Course"
            }
            
            response = self.make_request("POST", "/meals", meal_data, self.get_auth_headers(self.admin_token))
            order_meal_id = None
            if response and response.status_code == 200:
                order_meal_id = response.json().get("id")

            # Test 1: Customer Places Order
            if order_meal_id:
                order_data = {
                    "meal_id": order_meal_id,
                    "quantity": 2
                }
                
                response = self.make_request("POST", "/orders", order_data, self.get_auth_headers(self.customer_token))
                if response and response.status_code == 200:
                    data = response.json()
                    self.test_order_id = data.get("id")
                    self.log_result("order_management", "Customer Places Order", True, f"Order created with ID: {self.test_order_id}")
                else:
                    self.log_result("order_management", "Customer Places Order", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 2: Customer Views Own Orders
        response = self.make_request("GET", "/orders", headers=self.get_auth_headers(self.customer_token))
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                self.log_result("order_management", "Customer Views Own Orders", True, f"Retrieved {len(data)} orders")
            else:
                self.log_result("order_management", "Customer Views Own Orders", False, "Invalid response format")
        else:
            self.log_result("order_management", "Customer Views Own Orders", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 3: Admin Views All Orders
        if self.admin_token:
            response = self.make_request("GET", "/orders", headers=self.get_auth_headers(self.admin_token))
            if response and response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("order_management", "Admin Views All Orders", True, f"Admin retrieved {len(data)} orders")
                else:
                    self.log_result("order_management", "Admin Views All Orders", False, "Invalid response format")
            else:
                self.log_result("order_management", "Admin Views All Orders", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 4: Order for Non-existent Meal
        invalid_order_data = {
            "meal_id": "non-existent-meal-id",
            "quantity": 1
        }
        
        response = self.make_request("POST", "/orders", invalid_order_data, self.get_auth_headers(self.customer_token))
        if response and response.status_code == 404:
            self.log_result("order_management", "Invalid Meal Order Rejection", True, "Non-existent meal order properly rejected")
        else:
            self.log_result("order_management", "Invalid Meal Order Rejection", False, f"Expected 404, got {response.status_code if response else 'No response'}")

    def test_payment_system(self):
        """Test Mock M-Pesa Payment Integration"""
        print("\n=== Testing Mock M-Pesa Payment System ===")
        
        if not self.customer_token or not self.test_order_id:
            self.log_result("payment_system", "Prerequisites Missing", False, "Customer token or test order ID missing")
            return

        # Test 1: Process M-Pesa Payment
        payment_data = {
            "order_id": self.test_order_id,
            "phone": "254712345678"
        }
        
        response = self.make_request("POST", "/payment/mpesa", payment_data, self.get_auth_headers(self.customer_token))
        if response and response.status_code == 200:
            data = response.json()
            if data.get("success") and data.get("transaction_id"):
                self.log_result("payment_system", "M-Pesa Payment Processing", True, f"Payment successful, Transaction ID: {data.get('transaction_id')}")
            else:
                self.log_result("payment_system", "M-Pesa Payment Processing", False, "Payment response missing required fields")
        else:
            self.log_result("payment_system", "M-Pesa Payment Processing", False, f"Status: {response.status_code if response else 'No response'}")

        # Test 2: Payment for Non-existent Order
        invalid_payment_data = {
            "order_id": "non-existent-order-id",
            "phone": "254712345678"
        }
        
        response = self.make_request("POST", "/payment/mpesa", invalid_payment_data, self.get_auth_headers(self.customer_token))
        if response and response.status_code == 404:
            self.log_result("payment_system", "Invalid Order Payment Rejection", True, "Non-existent order payment properly rejected")
        else:
            self.log_result("payment_system", "Invalid Order Payment Rejection", False, f"Expected 404, got {response.status_code if response else 'No response'}")

        # Test 3: Check Daily Revenue (Admin)
        if self.admin_token:
            response = self.make_request("GET", "/orders/today/revenue", headers=self.get_auth_headers(self.admin_token))
            if response and response.status_code == 200:
                data = response.json()
                if "total_revenue" in data and "total_orders" in data:
                    self.log_result("payment_system", "Daily Revenue Tracking", True, f"Revenue: {data.get('total_revenue')}, Orders: {data.get('total_orders')}")
                else:
                    self.log_result("payment_system", "Daily Revenue Tracking", False, "Revenue response missing required fields")
            else:
                self.log_result("payment_system", "Daily Revenue Tracking", False, f"Status: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Comprehensive Mealy Backend API Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Run test suites in order
        self.test_authentication_system()
        self.test_meal_management_api()
        self.test_daily_menu_management()
        self.test_order_management_system()
        self.test_payment_system()
        
        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("🏁 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        total_passed = 0
        total_failed = 0
        
        for category, results in self.results.items():
            passed = results["passed"]
            failed = results["failed"]
            total_passed += passed
            total_failed += failed
            
            status = "✅" if failed == 0 else "❌"
            print(f"{status} {category.replace('_', ' ').title()}: {passed} passed, {failed} failed")
            
            # Print details for failed tests
            if failed > 0:
                for detail in results["details"]:
                    if "❌ FAIL" in detail:
                        print(f"    {detail}")
        
        print("-" * 60)
        print(f"OVERALL: {total_passed} passed, {total_failed} failed")
        
        if total_failed == 0:
            print("🎉 ALL TESTS PASSED! Backend is working correctly.")
        else:
            print(f"⚠️  {total_failed} tests failed. Please review the issues above.")
        
        return total_failed == 0

if __name__ == "__main__":
    tester = MealyAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)