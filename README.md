# AI Expense Tracking Agent

ApexWealth AI Expense Tracking Agent is a full-stack, production-ready expense management system. It utilizes FastAPI, MySQL, and Google Gemini AI (with a built-in heuristic local fallback) to automatically classify expenses and provide smart saving suggestions, rendering them in a beautiful, responsive dark-themed dashboard

## 🚀 Key Features
- **Auto-Categorization**: Enter an expense name (e.g. *Pizza*, *Uber*, *Laptop*) and Gemini AI will automatically categorize it (e.g. *Food*, *Transport*, *Electronics*)
- **Smart Savings Advice**: Get tailored, short savings recommendations for every logged item.
- **Interactive Dashboard**: Track total, today's, and monthly spending aggregates, monitor remaining budget allowances, and view top categories.
- **Exceeded Budget Protection**: Enter a monthly spending limit. If your monthly expenses surpass this allowance, a warnings banner flashes red.
- **Dynamic Charting**: Renders spending distribution dynamically with Chart.js (Pie and Bar comparisons).
- **Universal History Ledger**: Search through all logged expenses by description, category, or timestamp instantly
- **Full CRUD Support**: Add, update, view, or delete records

---

## 🛠️ Technology Stack
- **Backend Framework**: Python 3.11 with FastAPI & Uvicorn
- **ORM & Driver**: SQLAlchemy & PyMySQL
- **AI Engine**: Google Gemini API (`gemini-1.5-flash`) via `google-generativeai`
- **Database**: MySQL Server 8.0
- **Frontend Layer**: Vanilla HTML5, CSS3 (Glassmorphism, custom micro-interactions), and JavaScript
- **Visualization**: Chart.js

---

## 📁 File Structure
```
ExpenseTracking/
├── backend/
│   ├── config.py       # Configuration and Environment variable reader
│   ├── database.py     # SQLAlchemy Engine and Session configuration
│   ├── models.py       # SQLAlchemy Schema (Expenses and Budget)
│   ├── prompts.py      # Prompt templates for Gemini
│   ├── gemini.py       # Google Gemini API wrapper & Local heuristic classifier
│   ├── crud.py         # SQLAlchemy DB database operations
│   ├── routes.py       # FastAPI Endpoint Routes and Schemas
│   └── main.py         # App initialization & static serving
├── frontend/
│   ├── index.html      # Dashboard and Forms Layout
│   ├── style.css       # Premium Dark Styles and Custom Animations
│   └── script.js       # Dynamic UI State, API Fetchers, Chart.js managers
├── requirements.txt    # Python Dependencies list
└── README.md           # Documentation
```

---

## 🛢️ MySQL Database Configuration

The application expects a MySQL server running locally on port `3306` with a database named `expense_tracker`.

### Tables Schema
The tables are initialized automatically by SQLAlchemy on app startup, but their logical schema is:

#### Table: `expenses`
- `id` (INT, Primary Key, Auto Increment)
- `expense_name` (VARCHAR 255, Not Null)
- `amount` (DECIMAL 10,2, Not Null)
- `category` (VARCHAR 100)
- `suggestion` (TEXT)
- `created_at` (TIMESTAMP, Default CURRENT_TIMESTAMP)

#### Table: `budget`
- `id` (INT, Primary Key, Auto Increment)
- `monthly_budget` (DECIMAL 10,2, Not Null, Default 0.00)

---

## 🚀 Installation & Running

### Prerequisites
- Python 3.11 installed
- MySQL Server running locally (default credentials: User `root`, Password `global` or configured in system environment)

### Step 1: Clone and Navigate to Directory
```powershell
cd c:\Users\New\Desktop\ExpenseTracking
```

### Step 2: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 3: Configure environment settings (Optional)
If you want to use the Google Gemini API, configure the `GEMINI_API_KEY` environment variable in your terminal session, or modify `backend/config.py` directly:
```powershell
$env:GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_KEY"
```
*Note: If no Gemini key is provided, the application will activate a smart local fallback classifier, so the app remains fully functional.*

### Step 4: Run the Server
Launch the FastAPI application using Uvicorn:
```powershell
uvicorn backend.main:app --reload
```

### Step 5: View the Web App
Open your web browser and navigate to:
[http://localhost:8000](http://localhost:8000)

---

## 📡 API Documentation
Once the server is running, interactive API docs can be viewed at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Redoc UI: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Endpoint Summary
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves index.html dashboard |
| `GET` | `/expenses` | Get all expenses (supports `search` parameter) |
| `POST` | `/add-expense` | Log new expense (Gemini categorizes & suggests tips) |
| `PUT` | `/update-expense/{id}` | Update expense details (name, amount, category, suggestion) |
| `DELETE` | `/delete-expense/{id}` | Delete transaction |
| `GET` | `/monthly-report` | Retrieve category breakdown & AI-generated reports |
| `GET` | `/dashboard` | Retrieve aggregates for cards and charts |
| `POST` | `/budget` | Set/Update monthly spending budget limit |


