import json
import requests
from langchain_core.tools import Tool

def get_events(query: str) -> str:
    """
    Useful for finding events based on a query.
    """
    try:
        url = f"http://backend:8080/api/v1/events?q={query}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_trending_events(_: str = "") -> str:
    """
    Useful for getting trending events.
    """
    try:
        url = "http://backend:8080/api/v1/events/trending"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_featured_events(_: str = "") -> str:
    """
    Useful for getting featured events.
    """
    try:
        url = "http://backend:8080/api/v1/events/featured"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_event_details(event_id: str) -> str:
    """
    Useful for getting details about a specific event by its ID.
    """
    try:
        url = f"http://backend:8080/api/v1/events/{event_id}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", {}))
    except Exception as e:
        return json.dumps({"error": str(e)})

def get_past_events(_: str = "") -> str:
    """
    Useful for getting past events from the last 6 months.
    """
    try:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        six_months_ago = (now - timedelta(days=180)).strftime('%Y-%m-%d')
        yesterday = (now - timedelta(days=1)).strftime('%Y-%m-%d')
        
        url = f"http://backend:8080/api/v1/events?date_from={six_months_ago}&date_to={yesterday}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        return json.dumps({"error": str(e)})

tools = [
    Tool(
        name="SearchEvents",
        func=get_events,
        description="Use this ONLY when the user provides a specific keyword or name to search for. Do not use for generic requests like 'show me events' or 'what is hot'."
    ),
    Tool(
        name="GetTrendingEvents",
        func=get_trending_events,
        description="Use this when the user asks for 'hot', 'trending', 'popular', or 'top' events."
    ),
    Tool(
        name="GetFeaturedEvents",
        func=get_featured_events,
        description="Use this when the user asks for 'any events', 'recommendations', or generic 'events' without a specific search term."
    ),
    Tool(
        name="GetPastEvents",
        func=get_past_events,
        description="Use this when the user asks for 'past events', 'history', 'finished events', or wants to see what happened in the last few months."
    ),
    Tool(
        name="GetEventDetails",
        func=get_event_details,
        description="Useful for when you need to get details about a specific event. Input should be the event ID."
    )
]
