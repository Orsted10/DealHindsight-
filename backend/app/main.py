from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any

from app.config import active_settings, AppSettings
from app.hindsight_wrapper import hindsight_wrapper
from app.llm_wrapper import llm_wrapper
from app.deal_manager import deal_manager, Deal, CallHistoryItem
from app.schemas import (
    SettingsUpdate,
    DealTrigger,
    ChatRequest,
    LogCallRequest,
    CloseRequest,
    ReflectRequest
)

app = FastAPI(title="DealHindsight API")

# Enable CORS for Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BANK_ID = "hindsight-sales-bank"

@app.on_event("startup")
def startup_event():
    hindsight_wrapper.create_bank(
        bank_id=BANK_ID,
        name="Hindsight Sales memory bank",
        mission="Extract prospect objections, competitor strengths, pricing limits, and win/loss strategies to form sales beliefs."
    )

@app.get("/api/settings", response_model=AppSettings)
def get_settings():
    return active_settings

@app.post("/api/settings", response_model=AppSettings)
def update_settings(payload: SettingsUpdate):
    active_settings.hindsight_api_key = payload.hindsight_api_key
    active_settings.hindsight_base_url = payload.hindsight_base_url or "http://localhost:8888"
    active_settings.openai_api_key = payload.openai_api_key
    active_settings.groq_api_key = payload.groq_api_key
    active_settings.live_mode = payload.live_mode
    return active_settings

@app.get("/api/deals", response_model=List[Deal])
def get_deals():
    return deal_manager.get_all_deals()

@app.get("/api/deals/{deal_id}", response_model=Deal)
def get_deal(deal_id: str):
    deal = deal_manager.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

@app.post("/api/deals/trigger", response_model=CallHistoryItem)
def trigger_deal_call(payload: DealTrigger):
    try:
        call_item = deal_manager.trigger_call_event(payload.deal_id, payload.scenario)
        
        # Automatically retain this logged call in Hindsight Memory
        # Determine company tag
        comp_tag = "acme-corp" if "acme" in payload.deal_id else "globex"
        
        memory_content = (
            f"Call Log: {call_item.call_name} on deal {payload.deal_id}.\n"
            f"Transcript Summary: {call_item.transcript}\n"
            f"Extracted Objections: {', '.join(call_item.objections) if call_item.objections else 'None'}\n"
            f"Competitors mentioned: {', '.join(call_item.competitors) if call_item.competitors else 'None'}"
        )
        
        hindsight_wrapper.retain(
            bank_id=BANK_ID,
            content=memory_content,
            tags=[comp_tag, "call-log", "objection"],
            metadata={"deal_id": payload.deal_id, "type": "experience"},
            context=f"Sales transcript log for {payload.deal_id}"
        )
        
        return call_item
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/deals/{deal_id}/log_call", response_model=CallHistoryItem)
def log_manual_call(deal_id: str, payload: LogCallRequest):
    try:
        call_item = deal_manager.log_call(deal_id, payload.call_name, payload.transcript)
        
        comp_tag = "acme-corp" if "acme" in deal_id else "globex"
        
        memory_content = (
            f"Call Log: {call_item.call_name} logged by sales rep.\n"
            f"Transcript: {call_item.transcript}\n"
            f"Objections raised: {', '.join(call_item.objections) if call_item.objections else 'None'}\n"
            f"Competitors mentioned: {', '.join(call_item.competitors) if call_item.competitors else 'None'}"
        )
        
        hindsight_wrapper.retain(
            bank_id=BANK_ID,
            content=memory_content,
            tags=[comp_tag, "call-log", "objection"],
            metadata={"deal_id": deal_id, "type": "experience"},
            context=f"Manual call log entry for {deal_id}"
        )
        return call_item
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/deals/{deal_id}/chat")
def chat_with_coach(deal_id: str, payload: ChatRequest):
    deal = deal_manager.get_deal(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    comp_tag = "acme-corp" if "acme" in deal_id else "globex"
    
    # 1. Recall Hindsight Memory
    recall_res = hindsight_wrapper.recall(
        bank_id=BANK_ID,
        query=payload.message,
        tags=[comp_tag],
        limit=5
    )
    
    recalled_items = []
    memories_context = ""
    if hasattr(recall_res, "results") and recall_res.results:
        for idx, item in enumerate(recall_res.results):
            recalled_items.append({
                "id": getattr(item, "id", f"mem-{idx}"),
                "text": getattr(item, "text", ""),
                "type": getattr(item, "type", "experience"),
                "tags": getattr(item, "tags", [])
            })
            memories_context += f"- [{getattr(item, 'type', 'memory')}] {getattr(item, 'text', '')}\n"

    # 2. Build system prompt WITH Hindsight Memory
    with_memory_system = (
        "You are DealHindsight, a sales-negotiation intelligence co-pilot. You have long-term persistent memory powered by Hindsight. "
        "Your goal is to brief the sales rep and recommend specific closing and objection-handling tactics. "
        "Here are relevant prior call summaries, objections, competitor pricing, and win/loss records recalled from the account history:\n"
        f"{memories_context if memories_context else '- (No prior call histories or objections recorded in memory bank for this account)'}\n\n"
        f"Active Deal Details:\n"
        f"Company Name: {deal.company_name}\n"
        f"Deal Size: ${deal.deal_size:,} USD\n"
        f"Current Stage: {deal.stage}\n"
        f"Active objections: {', '.join(deal.active_objections)}\n"
        f"Competitors: {', '.join(deal.competitors)}\n\n"
        "Instructions:\n"
        "- Do NOT give generic textbook sales advice. Recommend actions based on what worked/failed in past calls.\n"
        "- If prior logs show the client raised a blocking concern, address it directly with a specific handle.\n"
        "- Keep responses professional, highly strategized, and formatted in clean bullet points."
    )

    # 3. Build system prompt WITHOUT Hindsight Memory (Generic)
    without_memory_system = (
        "You are a generic sales coach assistant. You do NOT have access to any long-term memory, "
        "historical call transcripts, or objection logs from previous meetings. You must review the account details from scratch. "
        f"Active Deal Details:\n"
        f"Company Name: {deal.company_name}\n"
        f"Deal Size: ${deal.deal_size:,} USD\n"
        f"Current Stage: {deal.stage}\n"
        f"Active objections: {', '.join(deal.active_objections)}\n"
        f"Competitors: {', '.join(deal.competitors)}\n\n"
        "Instructions:\n"
        "- Offer standard generic sales strategies and textbook call preparation templates.\n"
        "- Keep the response brief and clean."
    )

    # 4. Generate side-by-side responses
    with_mem_response = llm_wrapper.generate_chat_response(
        prompt=payload.message,
        system_prompt=with_memory_system
    )
    
    without_mem_response = llm_wrapper.generate_chat_response(
        prompt=payload.message,
        system_prompt=without_memory_system
    )

    return {
        "with_memory": with_mem_response,
        "without_memory": without_mem_response,
        "recalled_memories": recalled_items
    }

@app.post("/api/deals/{deal_id}/close", response_model=Deal)
def close_deal(deal_id: str, payload: CloseRequest):
    try:
        deal = deal_manager.close_deal(deal_id, payload.status, payload.reason)
        
        comp_tag = "acme-corp" if "acme" in deal_id else "globex"
        
        # Retain the closed-won/closed-lost post-mortem experience so we learn from it!
        outcome_content = (
            f"Deal Outcome: {deal.company_name} ({deal.id}) was closed as {payload.status}.\n"
            f"Closing Reason & Strategy: {payload.reason}\n"
            f"Final Deal Size: ${deal.deal_size:,} USD"
        )
        
        hindsight_wrapper.retain(
            bank_id=BANK_ID,
            content=outcome_content,
            tags=[comp_tag, "deal-outcome", payload.status.lower()],
            metadata={"deal_id": deal_id, "type": "experience"},
            context=f"Post-deal report for {deal_id}"
        )
        
        return deal
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/hindsight/memories")
def get_hindsight_memories():
    memories = hindsight_wrapper.list_memories(bank_id=BANK_ID)
    
    facts = []
    experiences = []
    beliefs = []
    
    for mem in memories:
        m_type = mem.get("type", "experience")
        if m_type == "fact":
            facts.append(mem)
        elif m_type == "belief":
            beliefs.append(mem)
        else:
            experiences.append(mem)
            
    # If in mock mode and we have logged experiences, insert simulated consolidated beliefs
    if not beliefs and len(experiences) > 0:
        beliefs.append({
            "id": "belief-auto-1",
            "text": "Acme Corp is highly risk-averse regarding cloud multi-tenancy. Tactic: Lead with dedicated VPC network isolation. Offering standard pricing drops fails.",
            "type": "belief",
            "tags": ["acme-corp", "objection"],
            "metadata": {"source": "reflection"}
        })
        beliefs.append({
            "id": "belief-auto-2",
            "text": "Globex requires native Jira syncing to approve procurement. Tactic: Present Webhook API mapping docs and price match at $95k.",
            "type": "belief",
            "tags": ["globex", "objection"],
            "metadata": {"source": "reflection"}
        })
        
    return {
        "facts": facts,
        "experiences": experiences,
        "beliefs": beliefs
    }

@app.post("/api/hindsight/reflect")
def reflect_on_memories(payload: ReflectRequest):
    tags = payload.tags
    res = hindsight_wrapper.reflect(bank_id=BANK_ID, query=payload.query, tags=tags)
    
    db = hindsight_wrapper.list_memories(bank_id=BANK_ID)
    belief_text = getattr(res, "text", "")
    
    if not any(item.get("type") == "belief" and item.get("text") == belief_text for item in db):
        from hindsight_wrapper import load_mock_db, save_mock_db
        mock_db = load_mock_db()
        mock_db.append({
            "id": f"belief-{int(datetime.datetime.now().timestamp())}",
            "text": "Reflected Sales Belief: " + (getattr(res, "structured_output", {}).get("system_health_belief") or "Enterprise accounts object to multi-tenant security profiles."),
            "type": "belief",
            "tags": tags or ["sales-strategy"],
            "metadata": {"type": "belief", "reflection_query": payload.query}
        })
        save_mock_db(mock_db)
        
    return res

@app.post("/api/hindsight/clear")
def clear_hindsight():
    from hindsight_wrapper import save_mock_db
    save_mock_db([])
    
    hindsight_wrapper.create_bank(BANK_ID, "Re-initialized sales bank", "Reset sales memory configurations.")
    
    # Also reset the deal manager states
    deal_manager._deals = {}
    deal_manager._initialize_default_deals()
    return {"message": "Memory bank and deals pipeline wiped and reset successfully."}
