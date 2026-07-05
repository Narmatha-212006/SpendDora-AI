from sqlalchemy import Column, Integer, String, Numeric, DateTime, Text, func
from backend.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    expense_name = Column(String(255), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    category = Column(String(100), nullable=True)
    suggestion = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

class Budget(Base):
    __tablename__ = "budget"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    monthly_budget = Column(Numeric(10, 2), nullable=False, default=0.00)
