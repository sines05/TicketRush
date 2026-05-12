import os
from typing import Union, Dict, Any
from langchain_core.messages import HumanMessage, AIMessage
from graph import app

def process_chat_message(message: str, thread_id: str = "default", user_id: str = None) -> Union[str, Dict[str, Any]]:
    """
    Process a chat message using the LangGraph state machine.
    """
    config = {"configurable": {"thread_id": thread_id}}
    
    try:
        # Initialize state with the user message
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "safety_check": True,
            "intent": "undetermined",
            "final_response": "",
            "ui_components": [],
            "user_id": user_id
        }
        
        # Run the graph
        final_state = app.invoke(initial_state, config=config)
        
        # If a final_response was set by safety or verify nodes, use it
        if final_state.get("final_response"):
            return {
                "reply": final_state["final_response"],
                "ui_components": []
            }
            
        # Otherwise, return the last AI message and any UI components
        reply = "I'm sorry, I couldn't generate a response."
        for message in reversed(final_state["messages"]):
            if isinstance(message, AIMessage) and getattr(message, "content", None):
                reply = message.content
                break
                
        return {
            "reply": reply,
            "ui_components": final_state.get("ui_components", [])
        }
        
    except Exception as e:
        print(f"Error in process_chat_message: {e}")
        return {
            "reply": f"Error processing message: {str(e)}",
            "ui_components": []
        }
