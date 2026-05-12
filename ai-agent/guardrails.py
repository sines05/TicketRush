import os
import requests
import re
from pydantic import BaseModel, ValidationError

LLAMAGUARD_URL = os.environ.get("LLAMAGUARD_URL")
INTERNAL_SECRET = os.environ.get("INTERNAL_SECRET", "default-secret")

class GuardrailResult(BaseModel):
    safe: bool
    reason: str = ""

def check_input_safety(message: str) -> GuardrailResult:
    """
    Check if the user input is safe using LlamaGuard or regex.
    """
    # 1. LlamaGuard check if URL is provided
    if LLAMAGUARD_URL:
        try:
            response = requests.post(
                f"{LLAMAGUARD_URL}/v1/completions",
                json={"prompt": message},
                headers={"X-Internal-Secret": INTERNAL_SECRET},
                timeout=2
            )
            if response.status_code == 200:
                data = response.json()
                # Assuming LlamaGuard returns "unsafe" in the text if it's bad
                if "unsafe" in data.get("choices", [{}])[0].get("text", "").lower():
                    return GuardrailResult(safe=False, reason="LlamaGuard detected unsafe content")
        except Exception as e:
            print(f"LlamaGuard error: {e}")

    # 2. Programmatic checks (Regex)
    if len(message) > 2000:
        return GuardrailResult(safe=False, reason="Message too long")
    
    # Check for common injection patterns
    injection_patterns = [
        r"(?i)drop\s+table",
        r"(?i)delete\s+from",
        r"(?i)insert\s+into",
        r"(?i)update\s+.*\s+set",
        r"(?i)union\s+select",
        r"(?i)system\s+override",
        r"(?i)ignore\s+previous\s+instructions",
        r"(?i)you\s+are\s+now\s+a\s+.*", # Prompt injection
    ]
    
    for pattern in injection_patterns:
        if re.search(pattern, message):
            return GuardrailResult(safe=False, reason="Potential injection or malicious instruction detected")
                
    return GuardrailResult(safe=True)

def check_output_safety(response: str) -> GuardrailResult:
    """
    Check if the AI response is safe.
    """
    # Prevent leaking sensitive patterns
    sensitive_patterns = [
        r"(?i)password\s*[:=]",
        r"(?i)api[_-]key\s*[:=]",
        r"(?i)secret\s*[:=]",
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", # Email (basic)
    ]
    
    for pattern in sensitive_patterns:
        if re.search(pattern, response):
             return GuardrailResult(safe=False, reason="Potential sensitive information leak detected in output")
         
    return GuardrailResult(safe=True)
