from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Mealy Food Ordering API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_super_secret_fallback_key') # TODO: Change this fallback in production!
JWT_ALGORITHM = "HS256"

class UserRole(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.CUSTOMER

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MealCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None

class DailyMenu(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    meal_ids: List[str]
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyMenuCreate(BaseModel):
    date: str
    meal_ids: List[str]

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    meal_id: str
    meal_name: str
    price: float
    quantity: int = 1
    total: float
    status: str = "pending"
    date: str
    payment_status: str = "pending"
    payment_method: str = "mpesa"
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    meal_id: str
    quantity: int = 1

class PaymentRequest(BaseModel):
    order_id: str
    phone: str

class PaymentResponse(BaseModel):
    success: bool
    message: str
    transaction_id: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Authentication Routes
@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        password_hash=hashed_password
    )
    
    await db.users.insert_one(user.dict())
    
    # Create token
    access_token = create_access_token(data={"sub": user.id, "email": user.email, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(id=user.id, email=user.email, name=user.name, role=user.role)
    }

@api_router.post("/auth/login", response_model=dict)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"], "email": user["email"], "role": user["role"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(id=user["id"], email=user["email"], name=user["name"], role=user["role"])
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"]
    )

# Meal Management Routes (Admin only)
@api_router.post("/meals", response_model=Meal)
async def create_meal(meal_data: MealCreate, admin_user: dict = Depends(get_admin_user)):
    meal = Meal(**meal_data.dict())
    await db.meals.insert_one(meal.dict())
    return meal

@api_router.get("/meals", response_model=List[Meal])
async def get_meals():
    meals = await db.meals.find({"available": True}).to_list(1000)
    return [Meal(**meal) for meal in meals]

@api_router.put("/meals/{meal_id}", response_model=Meal)
async def update_meal(meal_id: str, meal_data: MealCreate, admin_user: dict = Depends(get_admin_user)):
    existing_meal = await db.meals.find_one({"id": meal_id})
    if not existing_meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    updated_meal = meal_data.dict()
    await db.meals.update_one({"id": meal_id}, {"$set": updated_meal})
    
    updated_meal = await db.meals.find_one({"id": meal_id})
    return Meal(**updated_meal)

@api_router.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str, admin_user: dict = Depends(get_admin_user)):
    result = await db.meals.update_one({"id": meal_id}, {"$set": {"available": False}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"message": "Meal deleted successfully"}

# Daily Menu Routes
@api_router.post("/daily-menu", response_model=DailyMenu)
async def create_daily_menu(menu_data: DailyMenuCreate, admin_user: dict = Depends(get_admin_user)):
    # Check if menu for this date already exists
    existing_menu = await db.daily_menus.find_one({"date": menu_data.date})
    if existing_menu:
        # Update existing menu
        await db.daily_menus.update_one(
            {"date": menu_data.date},
            {"$set": {"meal_ids": menu_data.meal_ids}}
        )
        updated_menu = await db.daily_menus.find_one({"date": menu_data.date})
        return DailyMenu(**updated_menu)
    else:
        # Create new menu
        daily_menu = DailyMenu(
            date=menu_data.date,
            meal_ids=menu_data.meal_ids,
            created_by=admin_user["id"]
        )
        await db.daily_menus.insert_one(daily_menu.dict())
        return daily_menu

@api_router.get("/daily-menu/{date}")
async def get_daily_menu(date: str):
    daily_menu = await db.daily_menus.find_one({"date": date})
    if not daily_menu:
        return {"meals": [], "date": date}
    
    # Get meal details
    meals = []
    for meal_id in daily_menu["meal_ids"]:
        meal = await db.meals.find_one({"id": meal_id, "available": True})
        if meal:
            meals.append(Meal(**meal))
    
    return {"meals": meals, "date": date}

@api_router.get("/daily-menu/today/menu")
async def get_todays_menu():
    today = datetime.now().strftime("%Y-%m-%d")
    return await get_daily_menu(today)

# Order Routes
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    # Get meal details
    meal = await db.meals.find_one({"id": order_data.meal_id, "available": True})
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    total = meal["price"] * order_data.quantity
    today = datetime.now().strftime("%Y-%m-%d")
    
    order = Order(
        customer_id=current_user["id"],
        meal_id=order_data.meal_id,
        meal_name=meal["name"],
        price=meal["price"],
        quantity=order_data.quantity,
        total=total,
        date=today
    )
    
    await db.orders.insert_one(order.dict())
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        # Admin can see all orders
        orders = await db.orders.find().sort("created_at", -1).to_list(1000)
    else:
        # Customer sees only their orders
        orders = await db.orders.find({"customer_id": current_user["id"]}).sort("created_at", -1).to_list(1000)
    
    return [Order(**order) for order in orders]

@api_router.get("/orders/today/revenue")
async def get_daily_revenue(admin_user: dict = Depends(get_admin_user)):
    today = datetime.now().strftime("%Y-%m-%d")
    orders = await db.orders.find({"date": today, "payment_status": "completed"}).to_list(1000)
    
    total_revenue = sum(order["total"] for order in orders)
    total_orders = len(orders)
    
    return {
        "date": today,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "orders": [Order(**order) for order in orders]
    }

# Mock M-Pesa Payment Routes
@api_router.post("/payment/mpesa", response_model=PaymentResponse)
async def process_mpesa_payment(payment_data: PaymentRequest, current_user: dict = Depends(get_current_user)):
    # Get order details
    order = await db.orders.find_one({"id": payment_data.order_id, "customer_id": current_user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Mock M-Pesa processing - always successful for demo
    transaction_id = f"MPESA_{uuid.uuid4().hex[:8].upper()}"
    
    # Update order payment status
    await db.orders.update_one(
        {"id": payment_data.order_id},
        {"$set": {"payment_status": "completed", "status": "confirmed"}}
    )
    
    # Save transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "order_id": payment_data.order_id,
        "customer_id": current_user["id"],
        "amount": order["total"],
        "phone": payment_data.phone,
        "transaction_id": transaction_id,
        "status": "success",
        "payment_method": "mpesa",
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    return PaymentResponse(
        success=True,
        message="Payment processed successfully",
        transaction_id=transaction_id
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # TODO: Restrict this to your frontend's domain in production!
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Connecting to MongoDB...")
    # Create indexes for frequently queried fields
    await db.users.create_index("email", unique=True)
    await db.meals.create_index("id", unique=True)
    await db.daily_menus.create_index("date", unique=True)
    await db.orders.create_index("customer_id")
    await db.orders.create_index("date")
    logger.info("MongoDB connected and indexes ensured.")

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Closing MongoDB connection...")
    client.close()
    logger.info("MongoDB connection closed.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    