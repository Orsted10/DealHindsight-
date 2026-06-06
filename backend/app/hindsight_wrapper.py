import os
import json
import datetime
import uuid
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel

# Import real client. If it fails, fallback gracefully.
try:
    from hindsight_client import Hindsight
    HINDSIGHT_SDK_AVAILABLE = True
except Exception as e:
    HINDSIGHT_SDK_AVAILABLE = False
    print(f"Hindsight SDK not fully available: {e}. Fallback to mock only.")

from app.config import active_settings

# Mock Response Classes for when SDK is unavailable or we are in Simulation Mode
class MockRecallResult(BaseModel):
    id: str
    text: str
    type: Optional[str] = "fact"
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, str]] = None
    context: Optional[str] = None

class MockRecallResponse(BaseModel):
    results: List[MockRecallResult]
    entities: Optional[Dict[str, Any]] = None
    chunks: Optional[Dict[str, Any]] = None
    source_facts: Optional[Dict[str, Any]] = None

class MockReflectResponse(BaseModel):
    text: str
    structured_output: Optional[Dict[str, Any]] = None

class MockRetainResponse(BaseModel):
    success: bool
    bank_id: str
    items_count: int

# Local JSON database path for mock mode
MOCK_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "local_sales_memory.json")

def load_mock_db() -> List[Dict[str, Any]]:
    if not os.path.exists(MOCK_DB_PATH):
        # Initialize with some default business facts
        initial_facts = [
            {
                "id": "fact-1",
                "text": "Acme Corp is an enterprise prospect with 500 potential user seats deploying on AWS.",
                "type": "fact",
                "tags": ["system-info", "acme-corp"],
                "metadata": {"company": "Acme Corp"},
                "context": "Customer Profile"
            },
            {
                "id": "fact-2",
                "text": "Globex Corporation requires native bi-directional Jira ticket synchronization before onboarding.",
                "type": "fact",
                "tags": ["objection", "globex"],
                "metadata": {"company": "Globex"},
                "context": "Integration Requirements"
            }
        ]
        save_mock_db(initial_facts)
        return initial_facts
    try:
        with open(MOCK_DB_PATH, "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading local sales memory: {e}")
        return []

def save_mock_db(data: List[Dict[str, Any]]):
    try:
        with open(MOCK_DB_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving local sales memory: {e}")

class HindsightWrapper:
    def __init__(self):
        self._client = None

    def get_client(self) -> Optional[Any]:
        if not HINDSIGHT_SDK_AVAILABLE:
            return None
        if not self._client and active_settings.hindsight_api_key:
            try:
                os.environ["HINDSIGHT_API_KEY"] = active_settings.hindsight_api_key
                self._client = Hindsight(base_url=active_settings.hindsight_base_url)
            except Exception as e:
                print(f"Failed to initialize live Hindsight client: {e}")
        return self._client

    def create_bank(self, bank_id: str, name: str, mission: str) -> Dict[str, Any]:
        """Creates or configures a memory bank."""
        if active_settings.live_mode and HINDSIGHT_SDK_AVAILABLE:
            client = self.get_client()
            if client:
                try:
                    res = client.create_bank(bank_id=bank_id, name=name, mission=mission)
                    return {"success": True, "bank_id": bank_id, "live": True, "details": str(res)}
                except Exception as e:
                    print(f"Live create_bank failed: {e}. Falling back to simulation.")
        
        # Mock create_bank
        db = load_mock_db()
        print(f"[Simulation] Created Sales Memory Bank: '{bank_id}' (Name: {name}, Mission: {mission})")
        return {"success": True, "bank_id": bank_id, "live": False}

    def retain(
        self,
        bank_id: str,
        content: str,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, str]] = None,
        context: Optional[str] = None
    ) -> Any:
        """Stores a new memory unit in the bank."""
        if active_settings.live_mode and HINDSIGHT_SDK_AVAILABLE:
            client = self.get_client()
            if client:
                try:
                    res = client.retain(
                        bank_id=bank_id,
                        content=content,
                        tags=tags,
                        metadata=metadata,
                        context=context
                    )
                    return res
                except Exception as e:
                    print(f"Live retain failed: {e}. Falling back to simulation.")

        # Mock retain
        db = load_mock_db()
        new_item = {
            "id": f"mem-{str(uuid.uuid4())[:8]}",
            "text": content,
            "type": metadata.get("type", "experience") if metadata else "experience",
            "tags": tags or [],
            "metadata": metadata or {},
            "context": context or "Sales Call Summary Feed",
            "timestamp": datetime.datetime.now().isoformat()
        }
        db.append(new_item)
        save_mock_db(db)
        
        print(f"[Simulation] Retained Sales Experience in Bank '{bank_id}': {content[:60]}...")
        return MockRetainResponse(success=True, bank_id=bank_id, items_count=1)

    def recall(
        self,
        bank_id: str,
        query: str,
        tags: Optional[List[str]] = None,
        limit: int = 5
    ) -> Any:
        """Recalls relevant memories matching the query and tags."""
        if active_settings.live_mode and HINDSIGHT_SDK_AVAILABLE:
            client = self.get_client()
            if client:
                try:
                    res = client.recall(
                        bank_id=bank_id,
                        query=query,
                        tags=tags
                    )
                    return res
                except Exception as e:
                    print(f"Live recall failed: {e}. Falling back to simulation.")

        # Mock recall
        db = load_mock_db()
        results = []
        
        query_words = set(query.lower().split()) if query else set()
        
        for item in db:
            # Tag match check
            if tags:
                item_tags = item.get("tags", [])
                # Match tags (e.g. acme-corp or globex)
                if not any(t in item_tags for t in tags):
                    continue
            
            text = item.get("text", "").lower()
            overlap = sum(1 for w in query_words if w in text)
            
            if tags:
                overlap += 2
                
            if overlap > 0 or not query:
                results.append((overlap, item))
                
        # Sort by relevance score
        results.sort(key=lambda x: x[0], reverse=True)
        
        response_results = []
        for score, item in results[:limit]:
            response_results.append(
                MockRecallResult(
                    id=item["id"],
                    text=item["text"],
                    type=item.get("type", "fact"),
                    tags=item.get("tags", []),
                    metadata=item.get("metadata", {}),
                    context=item.get("context", "")
                )
            )
            
        print(f"[Simulation] Recalled {len(response_results)} items for query '{query}' in Bank '{bank_id}'")
        return MockRecallResponse(results=response_results)

    def reflect(
        self,
        bank_id: str,
        query: str,
        tags: Optional[List[str]] = None
    ) -> Any:
        """Reflects on memories in the bank to synthesize beliefs or high-level observations."""
        if active_settings.live_mode and HINDSIGHT_SDK_AVAILABLE:
            client = self.get_client()
            if client:
                try:
                    res = client.reflect(
                        bank_id=bank_id,
                        query=query,
                        tags=tags
                    )
                    return res
                except Exception as e:
                    print(f"Live reflect failed: {e}. Falling back to simulation.")

        # Mock reflect
        db = load_mock_db()
        
        reflection_text = (
            "### Hindsight Sales Objection reflection\n\n"
            "Based on the sales logs across pipeline accounts, I have synthesized the following:\n\n"
            "1. **Core Blocker Pattern**: Security and compliance audits (specifically lack of native SOC-2 audit reports) are consistently raised "
            "by VP-level engineering stakeholders when comparing us to Competitor X. This is a primary risk for accounts in the AWS workspace.\n\n"
            "2. **Effective Objection Handle**: In the Acme deal, standard pricing guides did not move the needle. However, positioning our "
            "AWS dedicated VPC environment and offering custom network isolation bypasses the need for an immediately finalized SOC-2 report.\n\n"
            "3. **Evolving Product Belief**: Prospects are comparing our pricing tiers directly with Competitor X ($80k vs our $85k). A 10% pilot discount "
            "combined with VPC dedicated features achieves a 95% closure rate on enterprise deals."
        )
        
        return MockReflectResponse(
            text=reflection_text,
            structured_output={
                "identified_patterns": [
                    "Security audit SOC-2 blocker raised by VP Engineering",
                    "Competitor X beats us on SOC-2 availability"
                ],
                "recommended_action": "Position dedicated network/VPC isolation instead of standard multi-tenant, and offer a $19.5k custom tier.",
                "system_health_belief": "Enterprise buyers object to multi-tenant security profiles. Native VPC pitches win."
            }
        )

    def list_memories(self, bank_id: str) -> List[Dict[str, Any]]:
        """Returns all raw memories in the bank (convenience method for UI visualizer)."""
        if active_settings.live_mode and HINDSIGHT_SDK_AVAILABLE:
            client = self.get_client()
            if client:
                try:
                    res = client.list_memories(bank_id=bank_id)
                    items = []
                    if hasattr(res, "items"):
                        for item in res.items:
                            items.append({
                                "id": getattr(item, "id", ""),
                                "text": getattr(item, "text", ""),
                                "type": getattr(item, "type", "fact"),
                                "tags": getattr(item, "tags", []),
                                "metadata": getattr(item, "metadata", {}),
                                "context": getattr(item, "context", "")
                            })
                    return items
                except Exception as e:
                    print(f"Live list_memories failed: {e}. Falling back to simulation database.")
        
        return load_mock_db()

hindsight_wrapper = HindsightWrapper()
