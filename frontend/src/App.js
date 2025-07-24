import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';
import axios from 'axios';

// Ensure BACKEND_URL is correctly set in your environment
// For local development, it might be something like:
// REACT_APP_BACKEND_URL=http://localhost:8000
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// *** IMPORTANT: Configure Axios to send cookies with cross-origin requests ***
// This is crucial for Django's session-based authentication to work across domains/ports.
axios.defaults.withCredentials = true;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // This effect runs once when the component mounts and whenever 'token' changes.
    // It tries to fetch user data if a token exists in local storage.
    if (token) {
      // Set the Authorization header for all subsequent Axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      // If no token, ensure user is null and auth header is cleared
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]); // Dependency array: re-run if token changes

  const fetchUser = async () => {
    try {
      // Fetch current user details from the backend.
      // Ensure trailing slash for consistency with Django's APPEND_SLASH setting.
      const response = await axios.get(`${API}/auth/me/`);
      setUser(response.data); // Set user data if successful
    } catch (error) {
      console.error("Error fetching user:", error);
      // If fetching user fails (e.g., token expired or invalid), log out
      logout();
    }
  };

  const login = async (email, password) => {
    setLoading(true); // Set loading state
    try {
      // Send login credentials to the backend.
      // Ensure trailing slash for consistency with Django's APPEND_SLASH setting.
      const response = await axios.post(`${API}/auth/login/`, { email, password });
      // Destructure access_token and user data from the response
      const { access_token, user: userData } = response.data;
      
      // Store the token in local storage
      localStorage.setItem('token', access_token);
      setToken(access_token); // Update token state, which triggers fetchUser via useEffect
      setUser(userData); // Immediately set user data
      // Set the Authorization header for all subsequent Axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true }; // Indicate success
    } catch (error) {
      // Handle different types of errors from the backend (e.g., invalid credentials)
      console.error("Login error:", error.response?.data || error.message);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const register = async (email, password, name, role = 'customer') => {
    setLoading(true); // Set loading state
    try {
      // Send registration details to the backend.
      // Ensure trailing slash for consistency with Django's APPEND_SLASH setting.
      const response = await axios.post(`${API}/auth/register/`, { 
        email, password, name, role
      });
      // Destructure access_token and user data from the response
      const { access_token, user: userData } = response.data;
      
      // Store the token in local storage
      localStorage.setItem('token', access_token);
      setToken(access_token); // Update token state, which triggers fetchUser via useEffect
      setUser(userData); // Immediately set user data
      // Set the Authorization header for all subsequent Axios requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true }; // Indicate success
    } catch (error) {
      // Handle registration errors
      console.error("Registration error:", error.response?.data || error.message);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const logout = () => {
    localStorage.removeItem('token'); // Remove token from local storage
    setToken(null); // Clear token state
    setUser(null); // Clear user state
    // Remove the Authorization header from Axios defaults
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    // Provide auth context values to children components
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily access auth context values
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Header Component
// App.js (snippet)

// ... (other imports and code) ...

// Header Component
const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mealy</h1>
          </div>
          
          {user && ( // Only show logout and user info if a user is logged in
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Hello, {user.name} {/* REMOVED: ({user.role}) */}
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ... (rest of your App.js code) ...

// Login/Registration Form Component
const LoginForm = () => {
  const { login, register, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true); // Toggle between login and register forms
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'customer' // Default role for registration
  });
  const [error, setError] = useState(''); // State for displaying errors

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors on new submission

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(formData.email, formData.password, formData.name, formData.role);
    }

    if (!result.success) {
      setError(result.error); // Set error message if login/register failed
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center">
          <span className="text-white text-3xl">🍽️</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Mealy
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your favorite food ordering platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && ( // Display error message if present
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {!isLogin && ( // Name field only for registration
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            {!isLogin && ( // Role selection only for registration
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">Account Type</label>
                <select
                  id="role"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="customer">Customer</option>
                  <option value="admin">Admin/Caterer</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading} // Disable button while loading
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>

            <div className="text-center">
              <button
                type="button"
                className="font-medium text-orange-600 hover:text-orange-500"
                onClick={() => setIsLogin(!isLogin)} // Toggle between login and register
              >
                {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Customer Dashboard Component
const CustomerDashboard = () => {
  const { user } = useAuth();
  const [todaysMenu, setTodaysMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('menu'); // State for active dashboard tab
  const [loading, setLoading] = useState(false); // Loading state for actions

  useEffect(() => {
    // Fetch menu and orders when component mounts
    fetchTodaysMenu();
    fetchOrders();
  }, []);

  const fetchTodaysMenu = async () => {
    try {
      // Fetch today's menu from backend. Ensure trailing slash.
      const response = await axios.get(`${API}/daily-menu/today/menu/`);
      setTodaysMenu(response.data.meals || []); // Set menu meals, default to empty array
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      // Fetch user's orders from backend. Ensure trailing slash.
      const response = await axios.get(`${API}/orders/`);
      setOrders(response.data); // Set orders
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const placeOrder = async (mealId) => {
    setLoading(true);
    try {
      // Place a new order. Ensure trailing slash.
      await axios.post(`${API}/orders/`, { meal_id: mealId, quantity: 1 });
      await fetchOrders(); // Refresh orders list after placing order
      alert('Order placed successfully!'); // Use a custom modal/toast in production
    } catch (error) {
      alert('Error placing order: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (orderId) => {
    const phone = prompt('Enter your M-Pesa phone number (254XXXXXXXXX):');
    if (!phone) return; // If user cancels prompt

    setLoading(true);
    try {
      // Initiate M-Pesa payment. Ensure trailing slash.
      const response = await axios.post(`${API}/payment/mpesa/`, { 
        order_id: orderId,
        phone: phone
      });
      
      if (response.data.success) {
        alert(`Payment successful! Transaction ID: ${response.data.transaction_id}`);
        await fetchOrders(); // Refresh orders after successful payment
      }
    } catch (error) {
      alert('Payment failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h2>
        <p className="text-gray-600">What would you like to eat today?</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('menu')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'menu'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Today's Menu
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'orders'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Orders ({orders.length})
          </button>
        </nav>
      </div>

      {activeTab === 'menu' && ( // Today's Menu Section
        <div>
          {todaysMenu.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-gray-400 text-2xl">🍽️</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No menu available today</h3>
              <p className="text-gray-500">Check back later or contact your caterer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {todaysMenu.map((meal) => (
                <div key={meal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    {meal.image_url ? (
                      <img 
                        src={meal.image_url} 
                        alt={meal.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-6xl">🍽️</span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{meal.name}</h3>
                    <p className="text-gray-600 mb-4">{meal.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-600">KSh {meal.price}</span>
                      <button
                        onClick={() => placeOrder(meal.id)}
                        disabled={loading}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                      >
                        Order Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && ( // My Orders Section
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-gray-400 text-2xl">📦</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-500">Place your first order from today's menu!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{order.meal_name}</h3>
                      <p className="text-gray-600">Quantity: {order.quantity} × KSh {order.price}</p>
                      <p className="text-sm text-gray-500">Order Date: {order.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600 mb-2">KSh {order.total}</div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                        {order.payment_status === 'pending' && (
                          <button
                            onClick={() => processPayment(order.id)}
                            disabled={loading}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md text-sm font-medium disabled:opacity-50"
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Admin Dashboard Component
const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('meals');
  const [meals, setMeals] = useState([]);
  const [orders, setOrders] = useState([]);
  const [dailyRevenue, setDailyRevenue] = useState({ total_revenue: 0, total_orders: 0 });
  const [loading, setLoading] = useState(false);
  const [mealForm, setMealForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: ''
  });
  const [selectedMealsForMenu, setSelectedMealsForMenu] = useState([]);
  const [menuDate, setMenuDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Fetch data for admin dashboard when component mounts
    fetchMeals();
    fetchOrders();
    fetchDailyRevenue();
  }, []);

  const fetchMeals = async () => {
    try {
      // Fetch all meals. Ensure trailing slash.
      const response = await axios.get(`${API}/meals/`);
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      // Fetch all orders. Ensure trailing slash.
      const response = await axios.get(`${API}/orders/`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchDailyRevenue = async () => {
    try {
      // Fetch today's revenue. Ensure trailing slash.
      const response = await axios.get(`${API}/orders/today/revenue/`);
      setDailyRevenue(response.data);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    }
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create a new meal. Ensure trailing slash.
      await axios.post(`${API}/meals/`, { 
        ...mealForm,
        price: parseFloat(mealForm.price) // Ensure price is a number
      });
      setMealForm({ name: '', description: '', price: '', category: '', image_url: '' }); // Clear form
      await fetchMeals(); // Refresh meals list
      alert('Meal created successfully!');
    } catch (error) {
      alert('Error creating meal: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const createDailyMenu = async () => {
    if (selectedMealsForMenu.length === 0) {
      alert('Please select at least one meal for the menu');
      return;
    }

    setLoading(true);
    try {
      // Create a daily menu. Ensure trailing slash.
      await axios.post(`${API}/daily-menu/`, { 
        date: menuDate,
        meal_ids: selectedMealsForMenu
      });
      setSelectedMealsForMenu([]); // Clear selected meals
      alert('Daily menu created successfully!');
    } catch (error) {
      alert('Error creating menu: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const toggleMealSelection = (mealId) => {
    setSelectedMealsForMenu(prev => 
      prev.includes(mealId) 
        ? prev.filter(id => id !== mealId) // Remove if already selected
        : [...prev, mealId] // Add if not selected
    );
  };

  // Default food images for different categories
  const getDefaultImage = (category) => {
    const images = {
      'Main Course': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxkZWxpY2lvdXMlMjBmb29kfGVufDB8fHx8MTc1MzIxMjUzN3ww&ixlib=rb-4.1.0&q=85',
      'Burger': 'https://images.unsplash.com/photo-1600555379885-08a02224726d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHxyZXN0YXVyYW50JTIwbWVhbHN8ZW58MHx8fHwxNzUzMjEyNTU5fDA&ixlib=rb-4.1.0&q=85',
      'Dessert': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxkZWxpY2lvdXMlMjBmb29kfGVufDB8fHx8MTc1MzIxMjUzN3ww&ixlib=rb-4.1.0&q=85',
      'default': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwyfHxkZWxpY2lvdXMlMjBmb29kfGVufDB8fHx8MTc1MzIxMjUzN3ww&ixlib=rb-4.1.0&q=85'
    };
    return images[category] || images['default'];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Manage your restaurant operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">KSh {dailyRevenue.total_revenue}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Orders</p>
              <p className="text-2xl font-bold text-gray-900">{dailyRevenue.total_orders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">🍽️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Meals</p>
              <p className="text-2xl font-bold text-gray-900">{meals.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'meals', label: 'Meals', count: meals.length },
            { id: 'menu', label: 'Daily Menu' },
            { id: 'orders', label: 'Orders', count: orders.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} {tab.count && `(${tab.count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Meals Management */}
      {activeTab === 'meals' && (
        <div className="space-y-8">
          {/* Add New Meal Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Meal</h3>
            <form onSubmit={handleMealSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="mealName" className="block text-sm font-medium text-gray-700 mb-2">Meal Name</label>
                <input
                  id="mealName"
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={mealForm.name}
                  onChange={(e) => setMealForm({...mealForm, name: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="mealCategory" className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  id="mealCategory"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={mealForm.category}
                  onChange={(e) => setMealForm({...mealForm, category: e.target.value, image_url: getDefaultImage(e.target.value)})}
                >
                  <option value="">Select Category</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Burger">Burger</option>
                  <option value="Dessert">Dessert</option>
                  <option value="Beverage">Beverage</option>
                </select>
              </div>
              <div>
                <label htmlFor="mealPrice" className="block text-sm font-medium text-gray-700 mb-2">Price (KSh)</label>
                <input
                  id="mealPrice"
                  type="number"
                  step="0.01"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={mealForm.price}
                  onChange={(e) => setMealForm({...mealForm, price: e.target.value})}
                />
              </div>
              <div>
                <label htmlFor="mealImage" className="block text-sm font-medium text-gray-700 mb-2">Image URL (Optional)</label>
                <input
                  id="mealImage"
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={mealForm.image_url}
                  onChange={(e) => setMealForm({...mealForm, image_url: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="mealDescription" className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  id="mealDescription"
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  value={mealForm.description}
                  onChange={(e) => setMealForm({...mealForm, description: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Meal'}
                </button>
              </div>
            </form>
          </div>

          {/* Meals List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meals.map((meal) => (
              <div key={meal.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  {meal.image_url ? (
                    <img 
                      src={meal.image_url} 
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">🍽️</span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{meal.name}</h3>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded">
                      {meal.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{meal.description}</p>
                  <div className="text-xl font-bold text-orange-600">KSh {meal.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Menu Management */}
      {activeTab === 'menu' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Daily Menu</h3>
          
          <div className="mb-6">
            <label htmlFor="menuDate" className="block text-sm font-medium text-gray-700 mb-2">Menu Date</label>
            <input
              id="menuDate"
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
              value={menuDate}
              onChange={(e) => setMenuDate(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Select Meals for Menu ({selectedMealsForMenu.length} selected)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedMealsForMenu.includes(meal.id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => toggleMealSelection(meal.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {meal.image_url ? (
                        <img 
                          src={meal.image_url} 
                          alt={meal.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">🍽️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">{meal.name}</h5>
                      <p className="text-sm text-gray-600">KSh {meal.price}</p>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 ${
                      selectedMealsForMenu.includes(meal.id)
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedMealsForMenu.includes(meal.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={createDailyMenu}
            disabled={loading || selectedMealsForMenu.length === 0}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Daily Menu'}
          </button>
        </div>
      )}

      {/* Orders Management */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">All Orders</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.meal_name}</div>
                      <div className="text-sm text-gray-500">Qty: {order.quantity}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {/* Safely convert customer_id to string and then slice */}
                      Customer ID: {order.customer_id ? String(order.customer_id).slice(0, 8) + '...' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status === 'completed' ? 'Paid' : 'Pending Payment'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KSh {order.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const { user } = useAuth();

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {user.role === 'admin' ? <AdminDashboard /> : <CustomerDashboard />}
    </div>
  );
};

const AppWithAuth = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;