from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SettingsUpdate(BaseModel):
    hindsight_api_key: Optional[str] = None
    hindsight_base_url: Optional[str] = None
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    live_mode: bool

class DealTrigger(BaseModel):
    deal_id: str
    scenario: str  # "security_audit" | "pricing_escalation"

class ChatRequest(BaseModel):
    message: str

class LogCallRequest(BaseModel):
    call_name: str
    transcript: str

class CloseRequest(BaseModel):
    status: str  # "Closed-Won" | "Closed-Lost"
    reason: str

class ReflectRequest(BaseModel):
    query: str
    tags: Optional[List[str]] = None
