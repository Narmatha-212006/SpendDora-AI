import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging

from backend.database import engine, Base
from backend.routes import router as api_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Auto-create MySQL tables on application startup
try:
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")
except Exception as e:
    logger.error(f"Error during database table creation: {e}")
    logger.warning("Ensure MySQL80 is running and database 'expense_tracker' exists.")

# Instantiate FastAPI App
app = FastAPI(
    title="AI Expense Tracking Agent API",
    description="Backend services for tracking expenses, setting budgets, and receiving Gemini AI financial tips.",
    version="1.0.0"
)

# Configure CORS Middleware
# Allows request sharing if frontend and backend run on separate local ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router)

# Mount the static frontend files
# This serves index.html at GET / and local CSS/JS at relative paths
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

if os.path.exists(frontend_dir):
    logger.info(f"Mounting static frontend assets from: {frontend_dir}")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
else:
    logger.error(f"Frontend directory '{frontend_dir}' was not found. API endpoints will work, but UI will not be served.")
