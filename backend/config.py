import os
from dotenv import load_dotenv

# Load environment variables from .env file if available
load_dotenv()

# Database Configurations
# Read from environment variables if present (as set in workspace system), or fallback to standard default values
DB_USER = os.getenv("DB_USER_DEV", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD_DEV", "global")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "expense_tracker")

# Create SQLAlchemy Database URL
# Standard MySQL connection using pymysql dialect
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# Gemini API Key Configurations
# Users can set GEMINI_API_KEY as an env variable or write it below
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "YOUR_GEMINI_API_KEY")

# Flag to determine if Gemini is configured (user replaced the placeholder)
IS_GEMINI_CONFIGURED = GEMINI_API_KEY not in ("", "YOUR_GEMINI_API_KEY", None)
