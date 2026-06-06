import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CallHistoryItem(BaseModel):
    call_name: str
    transcript: str
    timestamp: str
    objections: List[str]
    competitors: List[str]

class Deal(BaseModel):
    id: str
    company_name: str
    deal_size: int  # in USD
    stage: str  # "Discovery" | "Technical Review" | "Negotiation" | "Closed-Won"
    win_probability: int  # percentage
    stakeholder: str
    created_at: str
    competitors: List[str]
    active_objections: List[str]
    call_history: List[CallHistoryItem] = []
    win_loss_reason: Optional[str] = None

class DealManager:
    def __init__(self):
        self._deals: Dict[str, Deal] = {}
        self._initialize_default_deals()

    def _initialize_default_deals(self):
        timestamp = (datetime.datetime.now() - datetime.timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")
        
        # Acme Corp Deal
        acme_id = "deal-acme"
        self._deals[acme_id] = Deal(
            id=acme_id,
            company_name="Acme Corp",
            deal_size=85000,
            stage="Discovery",
            win_probability=45,
            stakeholder="Jane Doe (VP of Engineering)",
            created_at=timestamp,
            competitors=["Competitor X", "HubSpot"],
            active_objections=["Pricing too high", "Lacks SOC-2 Compliance"],
            call_history=[
                CallHistoryItem(
                    call_name="Call 1: Discovery Intro",
                    transcript="Jane Doe stated Acme has 500 seats. They run on AWS. Jane raised concerns about security and asked if we have SOC-2 compliance. Jane also mentioned they are comparing us to Competitor X who quoted them a pricing of $80k. We stated our enterprise tier is $85k.",
                    timestamp=timestamp,
                    objections=["Lacks SOC-2 Compliance"],
                    competitors=["Competitor X"]
                )
            ]
        )

        # Globex Corp Deal
        globex_id = "deal-globex"
        self._deals[globex_id] = Deal(
            id=globex_id,
            company_name="Globex Corporation",
            deal_size=120000,
            stage="Technical Review",
            win_probability=60,
            stakeholder="Bob Smith (Director of IT)",
            created_at=timestamp,
            competitors=["Competitor Y"],
            active_objections=["Lacks Jira Integration", "Budget Cap limit"],
            call_history=[
                CallHistoryItem(
                    call_name="Call 1: Architecture Review",
                    transcript="Bob asked if we integrate with Jira natively. He mentioned Competitor Y has a native Jira sync. Bob also raised pricing concerns, saying their budget cap is $100k, and our quote is $120k.",
                    timestamp=timestamp,
                    objections=["Lacks Jira Integration", "Budget Cap limit"],
                    competitors=["Competitor Y"]
                )
            ]
        )

    def get_all_deals(self) -> List[Deal]:
        return list(self._deals.values())

    def get_deal(self, deal_id: str) -> Optional[Deal]:
        return self._deals.get(deal_id)

    def log_call(self, deal_id: str, call_name: str, transcript: str) -> CallHistoryItem:
        deal = self._deals.get(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Simple extraction of objections and competitors for logs
        objections = []
        competitors = []
        
        trans_lower = transcript.lower()
        if "soc-2" in trans_lower or "security" in trans_lower:
            objections.append("Lacks SOC-2 Compliance")
        if "pricing" in trans_lower or "budget" in trans_lower or "cost" in trans_lower:
            objections.append("Budget Cap limit")
        if "jira" in trans_lower or "integrate" in trans_lower:
            objections.append("Lacks Jira Integration")
            
        for comp in ["Competitor X", "Competitor Y", "HubSpot", "Salesforce"]:
            if comp.lower() in trans_lower:
                competitors.append(comp)

        call_item = CallHistoryItem(
            call_name=call_name,
            transcript=transcript,
            timestamp=timestamp,
            objections=objections,
            competitors=competitors
        )
        deal.call_history.append(call_item)
        
        # Update active objections & competitors on the deal profile
        for obj in objections:
            if obj not in deal.active_objections:
                deal.active_objections.append(obj)
        for comp in competitors:
            if comp not in deal.competitors:
                deal.competitors.append(comp)

        return call_item

    def trigger_call_event(self, deal_id: str, scenario: str) -> CallHistoryItem:
        deal = self._deals.get(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        transcript = ""
        call_name = ""
        
        if scenario == "security_audit":
            call_name = f"Call {len(deal.call_history) + 1}: Security Objections Audit"
            transcript = (
                "Jane Doe initiated a review call. Jane stated that their legal department has marked our lack of native SOC-2 audit reports as a blocker. "
                "She stated: 'Acme Corp cannot proceed with procurement without SOC-2 or an isolated dedicated hosting zone.' "
                "Jane mentioned Competitor X has SOC-2 and is pushing them to sign."
            )
        elif scenario == "pricing_escalation":
            call_name = f"Call {len(deal.call_history) + 1}: Pricing Escalation"
            transcript = (
                "Bob Smith called to discuss pricing. He stated Globex has a hard budget cap of $95,000 for this project line. "
                "He mentioned: 'We are reviewing Competitor Y's offer, they gave us a 25% discount bringing their pricing to $90k.' "
                "Bob requested our absolute best discount to win the approval."
            )
        else:
            call_name = f"Call {len(deal.call_history) + 1}: General Status Sync"
            transcript = "General check-in call. The client is still evaluating the platform internally and security questionnaires are in progress."

        return self.log_call(deal_id, call_name, transcript)

    def close_deal(self, deal_id: str, status: str, reason: str) -> Deal:
        deal = self._deals.get(deal_id)
        if not deal:
            raise ValueError("Deal not found")

        deal.stage = status  # "Closed-Won" | "Closed-Lost"
        deal.win_loss_reason = reason
        deal.win_probability = 100 if status == "Closed-Won" else 0
        return deal

deal_manager = DealManager()
