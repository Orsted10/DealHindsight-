import os
from openai import OpenAI
from typing import List, Dict, Any, Optional
from app.config import active_settings

class LLMWrapper:
    def __init__(self):
        self._client = None

    def get_client(self) -> Optional[OpenAI]:
        if not self._client:
            api_key = active_settings.openai_api_key or active_settings.groq_api_key
            base_url = None
            
            if active_settings.groq_api_key and not active_settings.openai_api_key:
                base_url = "https://api.groq.com/openai/v1"
                api_key = active_settings.groq_api_key
                
            if api_key:
                try:
                    self._client = OpenAI(api_key=api_key, base_url=base_url)
                except Exception as e:
                    print(f"Failed to initialize OpenAI/Groq client: {e}")
        return self._client

    def generate_chat_response(
        self,
        prompt: str,
        system_prompt: str,
        model: str = "gpt-4o-mini"
    ) -> str:
        """Calls OpenAI or Groq if live_mode is enabled; otherwise fallbacks to simulated responses."""
        if active_settings.live_mode:
            client = self.get_client()
            if client:
                try:
                    target_model = model
                    if "groq" in (client.base_url or ""):
                        target_model = "llama-3.1-8b-instant"
                    
                    response = client.chat.completions.create(
                        model=target_model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.2,
                        max_tokens=1024
                    )
                    return response.choices[0].message.content or ""
                except Exception as e:
                    print(f"Live LLM call failed: {e}. Falling back to simulation.")

        return self._simulate_response(prompt, system_prompt)

    def _simulate_response(self, prompt: str, system_prompt: str) -> str:
        """Simulates sales-focused responses comparing With vs Without Memory."""
        prompt_lower = prompt.lower()
        system_lower = system_prompt.lower()
        
        with_memory = "hindsight" in system_lower or ("memory" in system_lower and "do not have access" not in system_lower) or "recalled" in system_lower
        
        # Scenario 1: Acme Corp Deal Objections
        if "acme" in prompt_lower or "jane" in prompt_lower or "soc-2" in prompt_lower or "acme" in system_lower:
            if with_memory:
                return (
                    "📊 **[Hindsight Sales Coach: 96% Historical Similarity]**\n\n"
                    "I have recalled prior call notes for **Acme Corp** from our memory bank:\n"
                    "- *Fact 1*: VP Jane Doe raised a security blocker in Call 2 regarding our lack of native SOC-2 audit reports.\n"
                    "- *Fact 2*: She mentioned comparing us to **Competitor X**, who holds SOC-2 compliance and is pushing a pricing of $80k.\n"
                    "- *Fact 3*: Our standard quote is $85k, which is currently unapproved by their legal team.\n\n"
                    "👉 **Winning Tactic:** Do NOT try to pitch generic security features. Pitch our **AWS Dedicated VPC / Isolated hosting zone** which mitigates their multi-tenant compliance risks. "
                    "Position this custom setup as a replacement for SOC-2 requirements while we complete our audit.\n\n"
                    "👉 **Pricing Tactic:** To beat Competitor X's $80k, present an isolated cluster setup at a custom price tier of **$79,000** for the first year if signed this quarter."
                )
            else:
                return (
                    "💡 **Sales Coach (No Memory Context):**\n\n"
                    "To approach the next meeting with Acme Corp, I suggest these standard sales tactics:\n"
                    "1. Focus on the core value proposition of our software to justify our $85k pricing.\n"
                    "2. Ask open-ended questions about their procurement process:\n"
                    "   * *'What are the key milestones for legal approval?'*\n"
                    "   * *'What are the evaluation criteria you are using for vendors?'*\n"
                    "3. Offer to send our standard product security datasheet or pitch decks to Jane Doe."
                )

        # Scenario 2: Globex Corporation Deal Objections
        elif "globex" in prompt_lower or "bob" in prompt_lower or "jira" in prompt_lower or "globex" in system_lower:
            if with_memory:
                return (
                    "📊 **[Hindsight Sales Coach: 92% Historical Similarity]**\n\n"
                    "I recall the active obstacles from the **Globex Corporation** logs:\n"
                    "- *Observation 1*: Bob Smith raised a hard budget cap blocker in Call 1, stating their department cap is strictly $95,000.\n"
                    "- *Observation 2*: He mentioned they are reviewing **Competitor Y**, who is offering a 25% discount (pricing of $90k).\n"
                    "- *Observation 3*: Bob is highly skeptical of our platform because they require native bi-directional Jira synchronization, which Competitor Y has.\n\n"
                    "👉 **Technical Tactic:** Bob is an IT director; present our **Jira Webhook & API integration guide** showing how they can set up a custom bi-directional sync in 10 lines of code. Do not suggest manual exports.\n\n"
                    "👉 **Negotiation Tactic:** To match their budget and counter Competitor Y's $90k, offer a custom contract tier of **$95,000** with free onboarding services ($10k value) to justify the $5k delta."
                )
            else:
                return (
                    "💡 **Sales Coach (No Memory Context):**\n\n"
                    "For your next call with Globex Corporation, follow these general negotiation templates:\n"
                    "1. Inquire about their primary technical integration bottlenecks to see if Jira is a nice-to-have or a must-have.\n"
                    "2. Explain that we support a robust REST API which can be used to connect to any external third-party software.\n"
                    "3. Present case studies of other enterprise clients who successfully integrated our platform into their workflow."
                )

        # Default fallback
        if with_memory:
            return (
                "📊 **Hindsight Sales Assistant:**\n"
                "I searched the memory bank for this company or prospect name, but found no matching call histories or objections. "
                "Since we are starting fresh with this account, I recommend running a thorough Discovery call. "
                "I will log all objections and competitors raised in the notes so we can recall them to build tailored tactics next time."
            )
        else:
            return (
                "💡 **Sales Coach (No Memory):**\n"
                "I am ready to help you prepare. Please provide the company name, pricing details, and objections. "
                "I will suggest general negotiation advice and email follow-up templates."
            )

llm_wrapper = LLMWrapper()
