from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date

from backend.database import get_db
from backend.models import Expense
import backend.crud as crud
import backend.gemini as gemini

router = APIRouter()

# ==================== SCHEMAS ====================

class ExpenseBase(BaseModel):
    expense_name: str = Field(..., min_length=1, max_length=255, examples=["Pizza Dinner"])
    amount: float = Field(..., gt=0, examples=[24.50])

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    expense_name: str = Field(..., min_length=1, max_length=255)
    amount: float = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    suggestion: str = Field(..., min_length=1)

class ExpenseResponse(BaseModel):
    id: int
    expense_name: str
    amount: float
    category: Optional[str] = None
    suggestion: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BudgetRequest(BaseModel):
    monthly_budget: float = Field(..., ge=0, examples=[1000.00])

class DashboardResponse(BaseModel):
    total_expenses: float
    today_expenses: float
    monthly_expenses: float
    highest_category: str
    monthly_budget: float
    budget_remaining: float

class MonthlyReportResponse(BaseModel):
    total_spending: float
    monthly_budget: float
    category_totals: dict
    highest_category: str
    ai_analysis: str
    ai_savings_suggestion: str

# ==================== ENDPOINTS ====================

@router.get("/expenses", response_model=List[ExpenseResponse])
def read_expenses(search: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get all expenses, optionally filtered by search text (name, category, or date).
    """
    try:
        expenses = crud.get_expenses(db, search=search)
        return expenses
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve expenses: {str(e)}"
        )


@router.post("/add-expense", response_model=ExpenseResponse)
def add_expense(payload: ExpenseCreate, db: Session = Depends(get_db)):
    """
    Add a new expense. Gemini is used to automatically categorize the expense
    and generate a smart savings suggestion.
    """
    try:
        # Use Gemini AI (with local fallback) to classify and suggest
        ai_res = gemini.categorize_expense(payload.expense_name, payload.amount)
        
        category = ai_res.get("category", "Other")
        suggestion = ai_res.get("suggestion", "Keep track of this spending.")
        
        db_expense = crud.create_expense(
            db=db,
            expense_name=payload.expense_name,
            amount=payload.amount,
            category=category,
            suggestion=suggestion
        )
        return db_expense
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add expense: {str(e)}"
        )


@router.put("/update-expense/{id}", response_model=ExpenseResponse)
def update_expense(id: int, payload: ExpenseUpdate, db: Session = Depends(get_db)):
    """
    Update an expense's details manually.
    """
    db_expense = crud.update_expense(
        db=db,
        expense_id=id,
        expense_name=payload.expense_name,
        amount=payload.amount,
        category=payload.category,
        suggestion=payload.suggestion
    )
    if not db_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {id} not found"
        )
    return db_expense


@router.delete("/delete-expense/{id}")
def delete_expense(id: int, db: Session = Depends(get_db)):
    """
    Delete an expense.
    """
    db_expense = crud.delete_expense(db=db, expense_id=id)
    if not db_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Expense with ID {id} not found"
        )
    return {"message": f"Expense {id} successfully deleted", "status": "success"}


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Calculate and return dashboard statistics:
    - Total expenses (all-time)
    - Today's expenses
    - Monthly expenses (current month)
    - Highest spending category (current month)
    - Budget remaining (monthly budget - current month's expenses)
    """
    try:
        all_expenses = db.query(Expense).all()
        total_expenses = sum(float(exp.amount) for exp in all_expenses)
        
        today = date.today()
        today_expenses = sum(
            float(exp.amount) for exp in all_expenses 
            if exp.created_at.date() == today
        )
        
        current_year = today.year
        current_month = today.month
        monthly_expenses_list = [
            exp for exp in all_expenses 
            if exp.created_at.year == current_year and exp.created_at.month == current_month
        ]
        monthly_expenses = sum(float(exp.amount) for exp in monthly_expenses_list)
        
        # Calculate monthly category totals
        category_totals = {}
        for exp in monthly_expenses_list:
            cat = exp.category or "Other"
            category_totals[cat] = category_totals.get(cat, 0.0) + float(exp.amount)
            
        highest_category = "N/A"
        if category_totals:
            highest_category = max(category_totals, key=category_totals.get)
            
        monthly_budget = crud.get_budget(db)
        budget_remaining = monthly_budget - monthly_expenses
        
        return {
            "total_expenses": total_expenses,
            "today_expenses": today_expenses,
            "monthly_expenses": monthly_expenses,
            "highest_category": highest_category,
            "monthly_budget": monthly_budget,
            "budget_remaining": budget_remaining
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate dashboard statistics: {str(e)}"
        )


@router.get("/monthly-report", response_model=MonthlyReportResponse)
def get_monthly_report(db: Session = Depends(get_db)):
    """
    Generate category breakdown and request Gemini AI summary/savings guidance for this month's expenses.
    """
    try:
        today = date.today()
        current_year = today.year
        current_month = today.month
        
        # Fetch current month's expenses
        monthly_expenses_list = db.query(Expense).filter(
            Expense.created_at >= datetime(current_year, current_month, 1)
        ).all()
        
        total_spending = sum(float(exp.amount) for exp in monthly_expenses_list)
        monthly_budget = crud.get_budget(db)
        
        # Group by category
        category_totals = {}
        for exp in monthly_expenses_list:
            cat = exp.category or "Other"
            category_totals[cat] = category_totals.get(cat, 0.0) + float(exp.amount)
            
        highest_category = "N/A"
        if category_totals:
            highest_category = max(category_totals, key=category_totals.get)
            
        # Get Gemini monthly breakdown analysis
        ai_analysis_dict = gemini.analyze_monthly_spending(
            total_spending=total_spending,
            monthly_budget=monthly_budget,
            highest_category=highest_category,
            category_totals=category_totals
        )
        
        return {
            "total_spending": total_spending,
            "monthly_budget": monthly_budget,
            "category_totals": category_totals,
            "highest_category": highest_category,
            "ai_analysis": ai_analysis_dict.get("analysis", "No analysis available."),
            "ai_savings_suggestion": ai_analysis_dict.get("savings_suggestion", "No recommendations available.")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to construct monthly report: {str(e)}"
        )


@router.post("/budget")
def set_monthly_budget(payload: BudgetRequest, db: Session = Depends(get_db)):
    """
    Add or update the monthly budget.
    """
    try:
        updated_budget = crud.set_budget(db, payload.monthly_budget)
        return {"monthly_budget": updated_budget, "message": "Budget successfully updated", "status": "success"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update budget: {str(e)}"
        )
