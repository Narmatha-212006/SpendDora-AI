from sqlalchemy.orm import Session
from sqlalchemy import or_, func, String
from backend.models import Expense, Budget
from datetime import datetime

# ==================== EXPENSE CRUD ====================

def get_expense(db: Session, expense_id: int):
    """
    Retrieve a single expense by ID.
    """
    return db.query(Expense).filter(Expense.id == expense_id).first()


def get_expenses(db: Session, search: str = None):
    """
    Retrieve all expenses, optionally filtered by a search query string matching
    expense name, category, or created date.
    """
    query = db.query(Expense)
    if search:
        search_filter = f"%{search}%"
        # Search by expense_name, category, or cast created_at timestamp to string
        query = query.filter(
            or_(
                Expense.expense_name.ilike(search_filter),
                Expense.category.ilike(search_filter),
                func.cast(Expense.created_at, String).ilike(search_filter)
            )
        )
    # Order by created_at descending (latest first)
    return query.order_by(Expense.created_at.desc()).all()


def create_expense(db: Session, expense_name: str, amount: float, category: str, suggestion: str):
    """
    Insert a new expense into the database.
    """
    db_expense = Expense(
        expense_name=expense_name,
        amount=amount,
        category=category,
        suggestion=suggestion
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def update_expense(db: Session, expense_id: int, expense_name: str, amount: float, category: str, suggestion: str):
    """
    Update an existing expense in the database.
    """
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        return None
    
    db_expense.expense_name = expense_name
    db_expense.amount = amount
    db_expense.category = category
    db_expense.suggestion = suggestion
    
    db.commit()
    db.refresh(db_expense)
    return db_expense


def delete_expense(db: Session, expense_id: int):
    """
    Delete an expense by ID.
    """
    db_expense = get_expense(db, expense_id)
    if not db_expense:
        return None
    
    db.delete(db_expense)
    db.commit()
    return db_expense


# ==================== BUDGET CRUD ====================

def get_budget(db: Session) -> float:
    """
    Retrieve the current monthly budget from the database. 
    If no budget row exists, initializes a default 0.00 budget.
    """
    budget_row = db.query(Budget).first()
    if not budget_row:
        budget_row = Budget(monthly_budget=0.00)
        db.add(budget_row)
        db.commit()
        db.refresh(budget_row)
    return float(budget_row.monthly_budget)


def set_budget(db: Session, monthly_budget: float) -> float:
    """
    Update the monthly budget or insert a new one if not present.
    """
    budget_row = db.query(Budget).first()
    if not budget_row:
        budget_row = Budget(monthly_budget=monthly_budget)
        db.add(budget_row)
    else:
        budget_row.monthly_budget = monthly_budget
    
    db.commit()
    db.refresh(budget_row)
    return float(budget_row.monthly_budget)
