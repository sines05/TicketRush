import os
import json
from typing import TypedDict, Annotated, List, Union, Optional
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg import Connection

from tools import tools
from prompts import SYSTEM_PROMPT
from guardrails import check_input_safety, check_output_safety

# Define the state
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    safety_check: bool
    intent: str
    final_response: str
    ui_components: List[dict]
    user_id: Optional[str]

# Initialize the LLM. Prefer Google Gemini when a Google API key is provided.
google_api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
openai_api_key = os.environ.get("OPENAI_API_KEY")

if google_api_key:
    llm = ChatGoogleGenerativeAI(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        google_api_key=google_api_key,
    )
elif openai_api_key:
    llm = ChatOpenAI(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        api_key=openai_api_key,
    )
else:
    llm = None

llm_with_tools = llm.bind_tools(tools) if llm else None

# Define nodes
def safety_node(state: AgentState):
    last_message = state["messages"][-1].content
    result = check_input_safety(last_message)
    return {"safety_check": result.safe, "final_response": result.reason if not result.safe else ""}

def intent_node(state: AgentState):
    # For simplicity, we'll let the LLM decide intent via tool calling or direct response
    # but we could have a dedicated intent classification step here.
    return {"intent": "undetermined"}

def call_model(state: AgentState):
    if llm_with_tools is None:
        return {
            "messages": [
                AIMessage(
                    content="Trợ lý ảo chưa được cấu hình API key. Vui lòng đặt GOOGLE_API_KEY, GEMINI_API_KEY hoặc OPENAI_API_KEY trên server."
                )
            ],
            "ui_components": [],
        }

    # Ensure system message is present but doesn't break tool sequence
    messages = state["messages"]
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    
    response = llm_with_tools.invoke(messages)
    
    # Extract UI components from tool messages in the current turn
    ui_components = []
    for m in reversed(state["messages"]):
        if isinstance(m, AIMessage):
            break
        if isinstance(m, ToolMessage):
            try:
                data = json.loads(m.content)
                if m.name in ["SearchEvents", "GetTrendingEvents", "GetFeaturedEvents"]:
                    if isinstance(data, list):
                        for item in data:
                            ui_components.append({
                                "type": "event_card",
                                "data": {
                                    "name": item.get("title") or item.get("name") or "Unknown Event",
                                    "date": item.get("start_time") or item.get("date") or "TBA",
                                    "location": item.get("location", "TBA"),
                                    "slug": item.get("slug", ""),
                                    "image_url": item.get("banner_url") or item.get("image_url") or "https://via.placeholder.com/300x200?text=No+Image"
                                }
                            })
                elif m.name == "GetEventDetails":
                    if isinstance(data, dict):
                        ui_components.append({
                            "type": "event_card",
                            "data": {
                                "name": data.get("title") or data.get("name") or "Unknown Event",
                                "date": data.get("start_time") or data.get("date") or "TBA",
                                "location": data.get("location", "TBA"),
                                "slug": data.get("slug", ""),
                                "image_url": data.get("banner_url") or data.get("image_url") or "https://via.placeholder.com/300x200?text=No+Image"
                            }
                        })
            except Exception:
                continue
        
    return {"messages": [response], "ui_components": ui_components}

def verify_node(state: AgentState):
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.content:
        result = check_output_safety(last_message.content)
        if not result.safe:
            return {"final_response": "I'm sorry, but I cannot provide that information for safety reasons."}
    return {}

# Define the graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("safety", safety_node)
workflow.add_node("agent", call_model)
workflow.add_node("tools", ToolNode(tools))
workflow.add_node("verify", verify_node)

# Set entry point
workflow.set_entry_point("safety")

# Define edges
def after_safety(state: AgentState):
    if state["safety_check"]:
        return "agent"
    return END

workflow.add_conditional_edges("safety", after_safety)

def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return "verify"

workflow.add_conditional_edges("agent", should_continue)
workflow.add_edge("tools", "agent")
workflow.add_edge("verify", END)

# Compile the graph
DB_URL = os.environ.get("AI_DB_URL", "postgres://user:password@ai-db:5432/ai_state")

def get_app():
    try:
        # Use PostgresSaver as requested
        # Note: In a real environment, we should use a connection pool.
        # For this implementation, we'll connect directly.
        conn = Connection.connect(DB_URL, autocommit=True)
        checkpointer = PostgresSaver(conn)
        # Ensure tables are created
        checkpointer.setup()
        return workflow.compile(checkpointer=checkpointer)
    except Exception as e:
        print(f"Failed to initialize PostgresSaver: {e}. Falling back to MemorySaver.")
        from langgraph.checkpoint.memory import MemorySaver
        return workflow.compile(checkpointer=MemorySaver())

app = get_app()
