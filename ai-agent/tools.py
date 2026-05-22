import json
import requests
import logging
from langchain_core.tools import tool

# Basic logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BACKEND_URL = "http://backend:8080/api/v1"

@tool
def SearchEvents(query: str) -> str:
    """
    Tìm kiếm sự kiện theo từ khóa cụ thể như tên ca sĩ (Sơn Tùng, Jack), thể loại hoặc chủ đề.
    Dùng tool này KHI VÀ CHỈ KHI người dùng cung cấp một từ khóa cụ thể để tìm kiếm.
    """
    try:
        logger.info(f"Searching events with query: {query}")
        url = f"{BACKEND_URL}/events?q={query}"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        logger.error(f"Error in SearchEvents: {e}")
        return json.dumps({"error": str(e)})

@tool
def GetUpcomingEvents(query: str = "") -> str:
    """
    Lấy danh sách các sự kiện mới nhất, sắp tới hoặc sắp diễn ra.
    Dùng tool này khi người dùng hỏi 'mới nhất', 'sắp tới', 'có show nào mới' hoặc 'có gì hay sắp tới'.
    """
    try:
        logger.info("Fetching upcoming events")
        url = f"{BACKEND_URL}/events"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        logger.error(f"Error in GetUpcomingEvents: {e}")
        return json.dumps({"error": str(e)})

@tool
def GetTrendingEvents(query: str = "") -> str:
    """
    Lấy danh sách các sự kiện đang HOT, thịnh hành hoặc phổ biến nhất.
    Dùng tool này khi người dùng hỏi 'trending', 'hot', 'top events' hoặc 'nhiều người xem'.
    """
    try:
        logger.info("Fetching trending events")
        url = f"{BACKEND_URL}/events/trending"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        logger.error(f"Error in GetTrendingEvents: {e}")
        return json.dumps({"error": str(e)})

@tool
def GetFeaturedEvents(query: str = "") -> str:
    """
    Lấy danh sách các sự kiện nổi bật được đề xuất bởi TicketRush.
    Dùng tool này cho các yêu cầu chung chung như 'đề xuất cho tôi' hoặc 'có gì xem không'.
    """
    try:
        logger.info("Fetching featured events")
        url = f"{BACKEND_URL}/events/featured"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        logger.error(f"Error in GetFeaturedEvents: {e}")
        return json.dumps({"error": str(e)})

@tool
def GetEventDetails(event_id: str) -> str:
    """
    Lấy thông tin chi tiết của một sự kiện cụ thể qua ID.
    Dùng tool này khi cần biết thêm về giá vé, mô tả chi tiết của một show.
    """
    try:
        logger.info(f"Fetching details for event: {event_id}")
        url = f"{BACKEND_URL}/events/{event_id}"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", {}))
    except Exception as e:
        logger.error(f"Error in GetEventDetails: {e}")
        return json.dumps({"error": str(e)})

@tool
def GetPastEvents(query: str = "") -> str:
    """
    Xem lại các sự kiện đã diễn ra trong quá khứ (6 tháng qua).
    """
    try:
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        six_months_ago = (now - timedelta(days=180)).strftime('%Y-%m-%d')
        yesterday = (now - timedelta(days=1)).strftime('%Y-%m-%d')
        
        url = f"{BACKEND_URL}/events?date_from={six_months_ago}&date_to={yesterday}"
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        return json.dumps(data.get("data", []))
    except Exception as e:
        logger.error(f"Error in GetPastEvents: {e}")
        return json.dumps({"error": str(e)})

tools = [
    SearchEvents,
    GetUpcomingEvents,
    GetTrendingEvents,
    GetFeaturedEvents,
    GetPastEvents,
    GetEventDetails
]
