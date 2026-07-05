import json
import logging
import re
import google.generativeai as genai
from backend.config import GEMINI_API_KEY, IS_GEMINI_CONFIGURED
from backend.prompts import (
    CATEGORIZE_SYSTEM_PROMPT,
    get_categorize_prompt,
    MONTHLY_ANALYSIS_SYSTEM_PROMPT,
    get_monthly_analysis_prompt
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini client if API key is present
if IS_GEMINI_CONFIGURED:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API successfully configured.")
    except Exception as e:
        logger.error(f"Failed to configure Gemini API client: {e}")
else:
    logger.warning("Gemini API key is not configured. Falling back to local classification engine.")


def clean_json_response(text: str) -> dict:
    """
    Cleans response text from Gemini in case it contains markdown blocks and parses it to a dict.
    """
    text = text.strip()
    # Remove markdown code blocks if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text)
        text = re.sub(r"```$", "", text)
        text = text.strip()
    return json.loads(text)


def local_fallback_categorize(expense_name: str, amount: float) -> dict:
    """
    Local heuristic fallback to classify expenses and generate suggestions when Gemini is unavailable.
    """
    name_lower = expense_name.lower()
    
    # Food keyword rules
    if any(k in name_lower for k in ["pizza", "burger", "coffee", "restaurant", "food", "sushi", "groceries", "supermarket", "starbucks", "mcdonald", "cafe", "dinner", "lunch", "eat"]):
        return {
            "category": "Food",
            "suggestion": "Cook meals at home more frequently and reduce ordering online."
        }
    # Transport keyword rules
    elif any(k in name_lower for k in ["uber", "lyft", "taxi", "train", "bus", "gas", "subway", "flight", "ticket", "metro", "fuel"]):
        return {
            "category": "Transport",
            "suggestion": "Optimize your travel paths, use public transport, or carpool where possible."
        }
    # Electronics keyword rules
    elif any(k in name_lower for k in ["laptop", "phone", "monitor", "charger", "keyboard", "headphones", "software", "mouse", "computer", "ipad", "gadget"]):
        return {
            "category": "Electronics",
            "suggestion": "Defer hardware purchases and search for open-source software alternatives."
        }
    # Entertainment keyword rules
    elif any(k in name_lower for k in ["movie", "netflix", "spotify", "concert", "game", "steam", "theater", "cinema", "show", "club", "bar"]):
        return {
            "category": "Entertainment",
            "suggestion": "Audit active subscription plans and search for free local recreational activities."
        }
    # Shopping keyword rules
    elif any(k in name_lower for k in ["amazon", "shirt", "shoes", "jacket", "mall", "clothes", "target", "walmart", "ebay", "clothing", "dress"]):
        return {
            "category": "Shopping",
            "suggestion": "Implement a 48-hour cool-off period before completing non-essential shopping carts."
        }
    # Bills & Utilities keyword rules
    elif any(k in name_lower for k in ["rent", "electricity", "water", "gas bill", "utility", "insurance", "internet", "phone bill", "power"]):
        return {
            "category": "Bills & Utilities",
            "suggestion": "Review service tiers, request loyalty discounts, and conserve household energy."
        }
    # Default category fallback
    else:
        return {
            "category": "Other",
            "suggestion": "Track this miscellaneous purchase closely to assess if it was necessary."
        }


def categorize_expense(expense_name: str, amount: float) -> dict:
    """
    Categorizes an expense and yields a savings suggestion using Gemini, with a local fallback.
    """
    if not IS_GEMINI_CONFIGURED:
        logger.info("Using local fallback categorization engine.")
        return local_fallback_categorize(expense_name, amount)

    try:
        # Use gemini-1.5-flash for fast and cheap responses
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = get_categorize_prompt(expense_name, amount)
        
        response = model.generate_content(
            contents=prompt,
            # We pass the system prompt within the request context to ensure strict instruction following
            generation_config={
                "response_mime_type": "application/json",
                "system_instruction": CATEGORIZE_SYSTEM_PROMPT
            }
        )
        
        data = clean_json_response(response.text)
        
        # Validate keys
        if "category" in data and "suggestion" in data:
            return {
                "category": data["category"].strip().title(),
                "suggestion": data["suggestion"].strip()
            }
        else:
            raise KeyError("Missing required JSON keys in Gemini response.")

    except Exception as e:
        logger.error(f"Gemini API categorization failed: {e}. Falling back to local analyzer.")
        return local_fallback_categorize(expense_name, amount)


def analyze_monthly_spending(total_spending: float, monthly_budget: float, highest_category: str, category_totals: dict) -> dict:
    """
    Analyzes monthly spending habits and returns overall analysis and savings advice.
    """
    # Format category totals as a readable string list for the prompt
    category_breakdown = "\n".join([f"- {cat}: ${amt:.2f}" for cat, amt in category_totals.items()])
    
    # Standard local fallback response
    local_analysis = f"You spent a total of ${total_spending:.2f} this month out of a ${monthly_budget:.2f} budget. "
    if monthly_budget > 0 and total_spending > monthly_budget:
        local_analysis += f"WARNING: You have exceeded your budget by ${(total_spending - monthly_budget):.2f}! Your highest spending area was '{highest_category}'."
        local_suggestion = f"Immediate action: Pause discretionary spending under '{highest_category}' and shopping to bring your accounts back in balance."
    elif monthly_budget > 0:
        remaining = monthly_budget - total_spending
        local_analysis += f"Great job! You have kept within your budget, with ${remaining:.2f} remaining. Your main expense driver was '{highest_category}'."
        local_suggestion = f"Consider shifting your remaining ${remaining:.2f} into a dedicated savings or investment account to build long-term wealth."
    else:
        local_analysis += f"Your primary expense driver was '{highest_category}'."
        local_suggestion = "Establish a monthly budget target to track savings percentages and limit unplanned outflows."

    if not IS_GEMINI_CONFIGURED:
        return {
            "analysis": local_analysis,
            "savings_suggestion": local_suggestion
        }

    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = get_monthly_analysis_prompt(total_spending, monthly_budget, highest_category, category_breakdown)
        
        response = model.generate_content(
            contents=prompt,
            generation_config={
                "response_mime_type": "application/json",
                "system_instruction": MONTHLY_ANALYSIS_SYSTEM_PROMPT
            }
        )
        
        data = clean_json_response(response.text)
        
        return {
            "analysis": data.get("analysis", local_analysis),
            "savings_suggestion": data.get("savings_suggestion", local_suggestion)
        }

    except Exception as e:
        logger.error(f"Gemini API monthly analysis failed: {e}. Using local fallback.")
        return {
            "analysis": local_analysis,
            "savings_suggestion": local_suggestion
        }
