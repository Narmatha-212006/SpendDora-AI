# System prompt for expense categorization
CATEGORIZE_SYSTEM_PROMPT = """You are a Financial AI Assistant.
Your job is to categorize expenses and provide short savings suggestions.
Return only JSON.

Example:
{
"category":"Food",
"suggestion":"Reduce ordering food online."
}
"""

# Contextual categorization instruction
def get_categorize_prompt(expense_name: str, amount: float) -> str:
    return f"Categorize this expense: Name: '{expense_name}', Amount: {amount:.2f}. Return only the JSON."

# System prompt for monthly report analysis
MONTHLY_ANALYSIS_SYSTEM_PROMPT = """You are a Financial AI Assistant.
Your job is to analyze the user's monthly spending report and budget state, and then output a smart summary and saving strategy.
Return only JSON.

Format:
{
"analysis": "A brief summary of their overall monthly spending, highlight any areas of concern, and note if they are over budget.",
"savings_suggestion": "One or two high-impact, specific tips to reduce their highest spending categories."
}
"""

# Contextual monthly analysis instruction
def get_monthly_analysis_prompt(total_spending: float, monthly_budget: float, highest_category: str, category_breakdown: str) -> str:
    return f"""Analyze this monthly spending data:
- Total Budget: ${monthly_budget:.2f}
- Total Spent: ${total_spending:.2f}
- Highest Category: {highest_category}
- Category Breakdown:
{category_breakdown}

Return only the JSON with keys 'analysis' and 'savings_suggestion'."""
