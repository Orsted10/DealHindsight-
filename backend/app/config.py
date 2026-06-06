import os
from pydantic import BaseModel
from typing import Optional

class AppSettings(BaseModel):
    hindsight_api_key: Optional[str] = None
    hindsight_base_url: str = "http://localhost:8888"
    openai_api_key: Optional[str] = None
    groq_api_key: Optional[str] = None
    live_mode: bool = False  # False means it runs the local Hindsight / LLM mock engine

# Global active settings, loaded from environment variables by default
active_settings = AppSettings(
    hindsight_api_key=os.getenv("HINDSIGHT_API_KEY"),
    hindsight_base_url=os.getenv("HINDSIGHT_BASE_URL", "http://localhost:8888"),
    openai_api_key=os.getenv("OPENAI_API_KEY"),
    groq_api_key=os.getenv("GROQ_API_KEY"),
    live_mode=False  # Start in simulation mode by default so it runs immediately
)
