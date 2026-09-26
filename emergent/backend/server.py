from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import jwt
import os
import logging
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional


# --- Setup ---
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
JWT_ALG = 'HS256'
JWT_EXPIRES_DAYS = 30

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)

app = FastAPI(title="ClearBook API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
log = logging.getLogger("clearbook")


# --- Helpers ---
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def make_token(user_id: str) -> str:
    payload = {"sub": user_id, "iat": datetime.now(timezone.utc), "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": uid})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def user_out(u: dict) -> dict:
    return {"id": u["id"], "name": u["name"], "email": u["email"], "currency": u.get("currency", "INR")}


# --- Models ---
class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    currency: Optional[str] = None

class ExpenseIn(BaseModel):
    amount: float
    category: str
    date: str
    note: Optional[str] = ""

class IncomeIn(BaseModel):
    amount: float
    source: str
    date: str
    note: Optional[str] = ""

class BudgetIn(BaseModel):
    category: str
    limit: float

class GoalIn(BaseModel):
    name: str
    target: float
    saved: float = 0
    deadline: Optional[str] = ""
    color: Optional[str] = "#10b981"


# --- Seed data helper ---
def seed_for(user_id: str):
    today = datetime.now(timezone.utc).date()
    def d(offset):
        return (today + timedelta(days=offset)).isoformat()
    expenses = [
        ("e1", d(-1), 480, "food", "Zomato dinner"),
        ("e2", d(-2), 220, "transport", "Uber to office"),
        ("e3", d(-3), 1899, "shopping", "Nykaa skincare"),
        ("e4", d(-4), 349, "entertainment", "Netflix"),
        ("e5", d(-5), 2450, "bills", "Electricity bill"),
        ("e6", d(-6), 620, "food", "Groceries"),
        ("e7", d(-7), 180, "transport", "Metro card recharge"),
        ("e8", d(-9), 4200, "travel", "Weekend trip"),
        ("e9", d(-10), 890, "health", "Pharmacy"),
        ("e10", d(-12), 260, "food", "Coffee & snacks"),
    ]
    incomes = [
        (d(-1), 65000, "salary", "Monthly salary"),
        (d(-8), 12000, "freelance", "Website project"),
        (d(-15), 3200, "invest", "Dividend"),
    ]
    budgets = [
        ("food", 6000), ("transport", 2500), ("shopping", 4000), ("bills", 5000), ("entertainment", 2000),
    ]
    goals = [
        ("Emergency Fund", 200000, 85000, "2026-06-30", "#10b981"),
        ("Goa Trip", 40000, 22500, "2026-02-15", "#6366f1"),
        ("New MacBook", 150000, 42000, "2026-09-01", "#f59e0b"),
    ]
    return (
        [{"id": str(uuid.uuid4()), "user_id": user_id, "amount": a, "category": c, "date": dt, "note": n, "created_at": now_iso()} for _, dt, a, c, n in expenses],
        [{"id": str(uuid.uuid4()), "user_id": user_id, "amount": a, "source": s, "date": dt, "note": n, "created_at": now_iso()} for dt, a, s, n in incomes],
        [{"id": str(uuid.uuid4()), "user_id": user_id, "category": c, "limit": l} for c, l in budgets],
        [{"id": str(uuid.uuid4()), "user_id": user_id, "name": n, "target": t, "saved": sv, "deadline": dl, "color": co} for n, t, sv, dl, co in goals],
    )


# --- Routes: health ---
@api.get("/")
async def root():
    return {"message": "ClearBook API", "ok": True}


# --- Routes: auth ---
@api.post("/auth/signup")
async def signup(body: SignupIn):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already in use")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "name": body.name.strip() or "You",
        "email": email,
        "password_hash": pwd_ctx.hash(body.password),
        "currency": "INR",
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    exp, inc, bud, gls = seed_for(uid)
    if exp: await db.expenses.insert_many(exp)
    if inc: await db.incomes.insert_many(inc)
    if bud: await db.budgets.insert_many(bud)
    if gls: await db.goals.insert_many(gls)
    return {"token": make_token(uid), "user": user_out(doc)}

@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not pwd_ctx.verify(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": make_token(user["id"]), "user": user_out(user)}

@api.get("/me")
async def me(user=Depends(get_current_user)):
    return {"user": user_out(user)}

@api.patch("/me")
async def update_me(body: ProfileUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in body.dict().items() if v is not None}
    if upd:
        if "email" in upd:
            upd["email"] = upd["email"].lower().strip()
            other = await db.users.find_one({"email": upd["email"], "id": {"$ne": user["id"]}})
            if other:
                raise HTTPException(status_code=400, detail="Email already in use")
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    fresh = await db.users.find_one({"id": user["id"]})
    return {"user": user_out(fresh)}


# --- Generic CRUD helpers ---
async def list_items(coll, user_id):
    cur = coll.find({"user_id": user_id}, {"_id": 0, "user_id": 0})
    return await cur.to_list(2000)

async def insert_item(coll, user_id, data: dict):
    doc = {"id": str(uuid.uuid4()), "user_id": user_id, **data, "created_at": now_iso()}
    await coll.insert_one(doc)
    doc.pop("_id", None); doc.pop("user_id", None)
    return doc

async def update_item(coll, user_id, item_id, data: dict):
    res = await coll.update_one({"id": item_id, "user_id": user_id}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    doc = await coll.find_one({"id": item_id, "user_id": user_id}, {"_id": 0, "user_id": 0})
    return doc

async def delete_item(coll, user_id, item_id):
    res = await coll.delete_one({"id": item_id, "user_id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# --- Expenses ---
@api.get("/expenses")
async def get_expenses(user=Depends(get_current_user)):
    return await list_items(db.expenses, user["id"])

@api.post("/expenses")
async def add_expense(body: ExpenseIn, user=Depends(get_current_user)):
    return await insert_item(db.expenses, user["id"], body.dict())

@api.put("/expenses/{item_id}")
async def edit_expense(item_id: str, body: ExpenseIn, user=Depends(get_current_user)):
    return await update_item(db.expenses, user["id"], item_id, body.dict())

@api.delete("/expenses/{item_id}")
async def remove_expense(item_id: str, user=Depends(get_current_user)):
    return await delete_item(db.expenses, user["id"], item_id)


# --- Incomes ---
@api.get("/incomes")
async def get_incomes(user=Depends(get_current_user)):
    return await list_items(db.incomes, user["id"])

@api.post("/incomes")
async def add_income(body: IncomeIn, user=Depends(get_current_user)):
    return await insert_item(db.incomes, user["id"], body.dict())

@api.put("/incomes/{item_id}")
async def edit_income(item_id: str, body: IncomeIn, user=Depends(get_current_user)):
    return await update_item(db.incomes, user["id"], item_id, body.dict())

@api.delete("/incomes/{item_id}")
async def remove_income(item_id: str, user=Depends(get_current_user)):
    return await delete_item(db.incomes, user["id"], item_id)


# --- Budgets ---
@api.get("/budgets")
async def get_budgets(user=Depends(get_current_user)):
    return await list_items(db.budgets, user["id"])

@api.post("/budgets")
async def add_budget(body: BudgetIn, user=Depends(get_current_user)):
    # replace existing budget for the same category
    await db.budgets.delete_many({"user_id": user["id"], "category": body.category})
    return await insert_item(db.budgets, user["id"], body.dict())

@api.put("/budgets/{item_id}")
async def edit_budget(item_id: str, body: BudgetIn, user=Depends(get_current_user)):
    return await update_item(db.budgets, user["id"], item_id, body.dict())

@api.delete("/budgets/{item_id}")
async def remove_budget(item_id: str, user=Depends(get_current_user)):
    return await delete_item(db.budgets, user["id"], item_id)


# --- Goals ---
@api.get("/goals")
async def get_goals(user=Depends(get_current_user)):
    return await list_items(db.goals, user["id"])

@api.post("/goals")
async def add_goal(body: GoalIn, user=Depends(get_current_user)):
    return await insert_item(db.goals, user["id"], body.dict())

@api.put("/goals/{item_id}")
async def edit_goal(item_id: str, body: GoalIn, user=Depends(get_current_user)):
    return await update_item(db.goals, user["id"], item_id, body.dict())

@api.delete("/goals/{item_id}")
async def remove_goal(item_id: str, user=Depends(get_current_user)):
    return await delete_item(db.goals, user["id"], item_id)


# --- Summary ---
@api.get("/summary")
async def summary(user=Depends(get_current_user)):
    expenses = await list_items(db.expenses, user["id"])
    incomes = await list_items(db.incomes, user["id"])
    total_income = sum(x["amount"] for x in incomes)
    total_expense = sum(x["amount"] for x in expenses)
    savings_rate = round(((total_income - total_expense) / total_income) * 100) if total_income else 0

    by_cat = {}
    for e in expenses:
        by_cat[e["category"]] = by_cat.get(e["category"], 0) + e["amount"]
    by_category = [{"category": k, "amount": v} for k, v in by_cat.items()]

    # Weekly = last 7 unique dates aggregated
    expenses_sorted = sorted(expenses, key=lambda x: x["date"], reverse=True)
    weekly = [{"day": e["date"], "amount": e["amount"]} for e in expenses_sorted[:7]]

    # Year trend by month (last 12 months)
    trend = {}
    for i in incomes:
        m = (i["date"] or "")[:7]; trend.setdefault(m, {"income": 0, "expenses": 0}); trend[m]["income"] += i["amount"]
    for e in expenses:
        m = (e["date"] or "")[:7]; trend.setdefault(m, {"income": 0, "expenses": 0}); trend[m]["expenses"] += e["amount"]
    year_trend = [{"month": k, "income": v["income"], "expenses": v["expenses"], "savings": v["income"] - v["expenses"]} for k, v in sorted(trend.items())]

    # Spend score: 100 - min(90, spend/income*100)
    score = 78
    if total_income:
        ratio = total_expense / total_income
        score = max(20, min(100, round(100 - ratio * 60)))
    tier = "Great" if score >= 75 else "Good" if score >= 55 else "Watch"

    return {
        "totalIncome": total_income,
        "totalExpense": total_expense,
        "remaining": total_income - total_expense,
        "savingsRate": savings_rate,
        "byCategory": by_category,
        "weekly": weekly,
        "yearTrend": year_trend,
        "spendScore": {"score": score, "trend": 6, "tier": tier},
    }


# --- Mount ---
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
