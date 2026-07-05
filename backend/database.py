from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from backend.config import DATABASE_URL

# Create the database engine
# pool_pre_ping=True checks connections and reconnects if MySQL drops idle connections
engine = create_engine(
    DATABASE_URL, 
    pool_pre_ping=True,
    pool_recycle=3600
)

# Session local factory for handling requests
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative base class for models
Base = declarative_base()

# Dependency helper to manage session lifecycle
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
