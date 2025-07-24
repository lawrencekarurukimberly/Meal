import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import './App.css';
import axios from 'axios';

// Utility function for classNames
const cn = (...classes) => classes.filter(Boolean).join(' ');

// MagicLoader Component
const MagicLoader = ({
  size = 200,
  particleCount = 1,
  speed = 1,
  hueRange = [0, 360],
  className
}) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const particlesRef = useRef([]);
  const tickRef = useRef(0);
  const globalAngleRef = useRef(0);
  const globalRotationRef = useRef(0);

  const createParticle = useCallback((centerX, centerY, tick, minSize) => {
    return {
      radius: 7,
      x: centerX + Math.cos(tick / 20) * minSize / 2,
      y: centerY + Math.sin(tick / 20) * minSize / 2,
      angle: globalRotationRef.current + globalAngleRef.current,
      speed: 0,
      accel: 0.01,
      decay: 0.01,
      life: 1
    };
  }, []);

  const stepParticle = useCallback((particle, index) => {
    particle.speed += particle.accel;
    particle.x += Math.cos(particle.angle) * particle.speed * speed;
    particle.y += Math.sin(particle.angle) * particle.speed * speed;
    particle.angle += Math.PI / 64;
    particle.accel *= 1.01;
    particle.life -= particle.decay;

    if (particle.life <= 0) {
      particlesRef.current.splice(index, 1);
    }
  }, [speed]);

  const drawParticle = useCallback((ctx, particle, index, tick) => {
    const hue = hueRange[0] + ((tick + (particle.life * 120)) % (hueRange[1] - hueRange[0]));
    ctx.fillStyle = ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${particle.life})`;
    
    ctx.beginPath();
    if (particlesRef.current[index - 1]) {
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particlesRef.current[index - 1].x, particlesRef.current[index - 1].y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, Math.max(0.001, particle.life * particle.radius), 0, Math.PI * 2);
    ctx.fill();

    const sparkleSize = Math.random() * 1.25;
    const sparkleX = particle.x + ((Math.random() - 0.5) * 35) * particle.life;
    const sparkleY = particle.y + ((Math.random() - 0.5) * 35) * particle.life;
    ctx.fillRect(Math.floor(sparkleX), Math.floor(sparkleY), sparkleSize, sparkleSize);
  }, [hueRange]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const minSize = Math.min(rect.width, rect.height) * 0.5;

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push(createParticle(centerX, centerY, tickRef.current, minSize));
    }

    particlesRef.current.forEach((particle, index) => {
      stepParticle(particle, index);
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach((particle, index) => {
      drawParticle(ctx, particle, index, tickRef.current);
    });

    globalRotationRef.current += Math.PI / 6 * speed;
    globalAngleRef.current += Math.PI / 6 * speed;
    tickRef.current++;

    animationRef.current = requestAnimationFrame(animate);
  }, [createParticle, stepParticle, drawParticle, particleCount, speed]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    ctx.scale(dpr, dpr);
    ctx.globalCompositeOperation = 'lighter';

    particlesRef.current = [];
    tickRef.current = 0;
    globalAngleRef.current = 0;
    globalRotationRef.current = 0;
  }, [size]);

  useEffect(() => {
    setupCanvas();
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [setupCanvas, animate]);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{
          width: size,
          height: size
        }}
      />
    </div>
  );
};

// Carousel3D Component
const Carousel3D = ({
  items,
  autoRotate = true,
  rotateInterval = 4000,
  cardHeight = 450,
  title = "Today's Specials",
  subtitle = "Featured Meals",
  tagline = "Discover delicious dishes available today, crafted with fresh ingredients to satisfy your cravings.",
  isMobileSwipe = true,
  placeOrder
}) => {
  const [active, setActive] = useState(0);
  const carouselRef = useRef(null);
  const [isInView, setIsInView] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const minSwipeDistance = 50;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (autoRotate && isInView && !isHovering) {
      const interval = setInterval(() => {
        setActive((prev) => (prev + 1) % items.length);
      }, rotateInterval);
      return () => clearInterval(interval);
    }
  }, [isInView, isHovering, autoRotate, rotateInterval, items.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    if (carouselRef.current) observer.observe(carouselRef.current);
    return () => observer.disconnect();
  }, []);

  const onTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
    setTouchEnd(null);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      setActive((prev) => (prev + 1) % items.length);
    } else if (distance < -minSwipeDistance) {
      setActive((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  const getCardAnimationClass = (index) => {
    if (index === active) return "scale-100 opacity-100 z-20";
    if (index === (active + 1) % items.length)
      return "translate-x-[40%] scale-95 opacity-60 z-10";
    if (index === (active - 1 + items.length) % items.length)
      return "translate-x-[-40%] scale-95 opacity-60 z-10";
    return "scale-90 opacity-0";
  };

  return (
    <section className="bg-gray-50 min-w-full mx-auto">
      <div className="w-full px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
          <h3 className="text-xl text-gray-600 mt-2">{subtitle}</h3>
          <p className="text-gray-500 mt-2">{tagline}</p>
        </div>

        <div
          className="relative overflow-hidden"
          style={{ height: `${cardHeight + 50}px` }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onTouchStart={isMobileSwipe ? onTouchStart : null}
          onTouchMove={isMobileSwipe ? onTouchMove : null}
          onTouchEnd={isMobileSwipe ? onTouchEnd : null}
          ref={carouselRef}
        >
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
            {items.map((item, index) => (
              <div
                key={item.id}
                className={`absolute top-0 w-full max-w-md transform transition-all duration-500 ${getCardAnimationClass(index)}`}
              >
                <div
                  className="overflow-hidden bg-white border border-gray-200 shadow-sm hover:shadow-md flex flex-col"
                  style={{ height: `${cardHeight}px` }}
                >
                  <div
                    className="relative bg-black p-6 flex items-center justify-center h-48 overflow-hidden"
                    style={{
                      backgroundImage: `url(${item.imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/50" />
                    <div className="relative z-10 text-center text-white">
                      <h3 className="text-2xl font-bold mb-2">{item.brand.toUpperCase()}</h3>
                      <div className="w-12 h-1 bg-white mx-auto mb-2" />
                      <p className="text-sm">{item.title}</p>
                    </div>
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-bold mb-1 text-gray-900">{item.title}</h3>
                    <p className="text-gray-500 text-sm font-medium mb-2">{item.brand}</p>
                    <p className="text-gray-600 text-sm flex-grow">{item.description}</p>

                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-gray-50 text-gray-600 rounded-full text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => placeOrder(item.id)}
                        disabled={item.isLoading}
                        className="flex items-center justify-center w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                      >
                        {item.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <MagicLoader size={20} particleCount={1} speed={1} hueRange={[200, 240]} />
                            <span>Ordering...</span>
                          </div>
                        ) : (
                          <span>Order Now</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!isMobile && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-gray-500 hover:bg-white z-30 shadow-md transition-all hover:scale-110"
                onClick={() => setActive((prev) => (prev - 1 + items.length) % items.length)}
                aria-label="Previous"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center text-gray-500 hover:bg-white z-30 shadow-md transition-all hover:scale-110"
                onClick={() => setActive((prev) => (prev + 1) % items.length)}
                aria-label="Next"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center space-x-3 z-30">
            {items.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  active === idx ? "bg-gray-500 w-5" : "bg-gray-200 hover:bg-gray-300"
                }`}
                onClick={() => setActive(idx)}
                aria-label={`Go to item ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Ensure BACKEND_URL is correctly set in your environment
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

// Configure Axios to send cookies with cross-origin requests
axios.defaults.withCredentials = true;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setUser(null);
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me/`);
      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user:", error);
      logout();
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login/`, { email, password });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, name, role = 'customer') => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register/`, { 
        email, password, name, role
      });
      const { access_token, user: userData } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return { success: true };
    } catch (error) {
      console.error("Registration error:", error.response?.data || error.message);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Header Component
const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mealy</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">Hello, {user.name}</span>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                onClick={() => document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' })}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Login/Registration Form Component
const LoginForm = () => {
  const { login, register, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'customer'
  });
  const [error, setError] = useState('');
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    let timer;
    if (loading) {
      timer = setTimeout(() => {
        setShowLoader(true);
      }, 500);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let result;
    if (isLogin) {
      result = await login(formData.email, formData.password);
    } else {
      result = await register(formData.email, formData.password, formData.name, formData.role);
    }

    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <section id="auth-section" className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="mx-auto w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-3xl">🍽️</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign In to Mealy' : 'Join Mealy Today'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your favorite food ordering platform
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {showLoader ? (
              <div className="flex justify-center items-center h-64">
                <MagicLoader size={100} particleCount={2} speed={1} hueRange={[20, 60]} />
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                {!isLogin && (
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

                {!isLogin && (
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
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    className="font-medium text-orange-600 hover:text-orange-500"
                    onClick={() => setIsLogin(!isLogin)}
                  >
                    {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// Customer Dashboard Component
const CustomerDashboard = () => {
  const { user } = useAuth();
  const [todaysMenu, setTodaysMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('menu');
  const [loadingMeals, setLoadingMeals] = useState({});

  useEffect(() => {
    fetchTodaysMenu();
    fetchOrders();
  }, []);

  const fetchTodaysMenu = async () => {
    try {
      const response = await axios.get(`${API}/daily-menu/today/menu/`);
      setTodaysMenu(response.data.meals || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const placeOrder = async (mealId) => {
    setLoadingMeals(prev => ({ ...prev, [mealId]: true }));
    try {
      const [response] = await Promise.all([
        axios.post(`${API}/orders/`, { meal_id: mealId, quantity: 1 }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      await fetchOrders();
      alert('Order placed successfully!');
    } catch (error) {
      alert('Error placing order: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoadingMeals(prev => ({ ...prev, [mealId]: false }));
    }
  };

  const processPayment = async (orderId) => {
    const phone = prompt('Enter your M-Pesa phone number (254XXXXXXXXX):');
    if (!phone) return;

    setLoadingMeals(prev => ({ ...prev, [orderId]: true }));
    try {
      const [response] = await Promise.all([
        axios.post(`${API}/payment/mpesa/`, { 
          order_id: orderId,
          phone: phone
        }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      
      if (response.data.success) {
        alert(`Payment successful! Transaction ID: ${response.data.transaction_id}`);
        await fetchOrders();
      }
    } catch (error) {
      alert('Payment failed: ' + (error.response?.data?.detail || 'Unknown error'));
    } finally {
      setLoadingMeals(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const carouselItems = todaysMenu.map((meal) => ({
    id: meal.id,
    title: meal.name,
    brand: meal.category || "Mealy Special",
    description: meal.description,
    tags: [meal.category || "Special", `KSh ${meal.price}`],
    imageUrl: meal.image_url || "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
    isLoading: loadingMeals[meal.id] || false
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h2>
        <p className="text-gray-600">What would you like to eat today?</p>
      </div>

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

      {activeTab === 'menu' && (
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
            <Carousel3D
              items={carouselItems}
              cardHeight={450}
              autoRotate={true}
              rotateInterval={4000}
              isMobileSwipe={true}
              placeOrder={placeOrder}
            />
          )}
        </div>
      )}

      {activeTab === 'orders' && (
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
                            disabled={loadingMeals[order.id] || false}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md text-sm font-medium disabled:opacity-50"
                          >
                            {loadingMeals[order.id] ? (
                              <div className="flex items-center space-x-2">
                                <MagicLoader size={16} particleCount={1} speed={1} hueRange={[160, 200]} />
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <span>Pay Now</span>
                            )}
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
    fetchMeals();
    fetchOrders();
    fetchDailyRevenue();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await axios.get(`${API}/meals/`);
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchDailyRevenue = async () => {
    try {
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
      await axios.post(`${API}/meals/`, { 
        ...mealForm,
        price: parseFloat(mealForm.price)
      });
      setMealForm({ name: '', description: '', price: '', category: '', image_url: '' });
      await fetchMeals();
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
      await axios.post(`${API}/daily-menu/`, { 
        date: menuDate,
        meal_ids: selectedMealsForMenu
      });
      setSelectedMealsForMenu([]);
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
        ? prev.filter(id => id !== mealId)
        : [...prev, mealId]
    );
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Admin Dashboard</h2>
        <p className="text-gray-600">Manage your restaurant operations</p>
      </div>

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

      {activeTab === 'meals' && (
        <div className="space-y-8">
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

// Landing Page Component
const LandingPage = () => {
  const sampleMenuItems = [
    {
      id: 1,
      title: "Grilled Chicken Supreme",
      brand: "Main Course",
      description: "Juicy grilled chicken breast served with herb-roasted vegetables and creamy mashed potatoes.",
      tags: ["Main Course", "KSh 1200"],
      imageUrl: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d",
      isLoading: false
    },
    {
      id: 2,
      title: "Classic Cheeseburger",
      brand: "Burger",
      description: "A delicious beef patty with melted cheddar, fresh lettuce, tomato, and our special sauce.",
      tags: ["Burger", "KSh 800"],
      imageUrl: "https://images.unsplash.com/photo-1600555379885-08a02224726d",
      isLoading: false
    },
    {
      id: 3,
      title: "Chocolate Lava Cake",
      brand: "Dessert",
      description: "Warm chocolate cake with a gooey center, served with vanilla ice cream.",
      tags: ["Dessert", "KSh 600"],
      imageUrl: "https://images.unsplash.com/photo-1551024601-bec78aea704b",
      isLoading: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-orange-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Discover Delicious Meals with Mealy</h1>
            <p className="text-lg mb-6">Order from a curated selection of fresh, flavorful dishes delivered right to your door.</p>
            <button
              className="bg-white text-orange-500 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
              onClick={() => document.getElementById('auth-section').scrollIntoView({ behavior: 'smooth' })}
            >
              Get Started
            </button>
          </div>
          <div className="md:w-1/2">
            <img
              src="https://images.unsplash.com/photo-1600891964599-f61ba0e24092"
              alt="Delicious meal"
              className="w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Choose Mealy?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🍴</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Curated Menus</h3>
              <p className="text-gray-600">Daily menus crafted with fresh ingredients from top local restaurants.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Fast Delivery</h3>
              <p className="text-gray-600">Quick and reliable delivery to satisfy your cravings in no time.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💳</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-gray-600">Easy and secure payment options, including M-Pesa integration.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Menu Section */}
      <section className="py-16">
        <Carousel3D
          items={sampleMenuItems}
          cardHeight={450}
          autoRotate={true}
          rotateInterval={4000}
          isMobileSwipe={true}
          placeOrder={() => alert('Please sign in to place an order')}
        />
      </section>

      {/* Authentication Section */}
      <LoginForm />

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🍽️</span>
                </div>
                <h1 className="text-2xl font-bold">Mealy</h1>
              </div>
              <p className="text-sm mt-2">Your favorite food ordering platform</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-400 hover:text-white">About</a>
              <a href="#" className="text-gray-400 hover:text-white">Contact</a>
              <a href="#" className="text-gray-400 hover:text-white">Privacy</a>
              <a href="#" className="text-gray-400 hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const App = () => {
  const { user } = useAuth();

  if (!user) {
    return <LandingPage />;
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