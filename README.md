# DealHindsight: AI Sales Deal Intelligence & Objection Tracker

DealHindsight is a sales-negotiation intelligence co-pilot powered by **Vectorize Hindsight**. 

During complex, multi-week B2B sales cycles (e.g., selling enterprise platforms to Acme Corp, Globex, etc.), prospects raise various objections (security audits, budget caps, missing integrations) and drop competitors (HubSpot, Salesforce, Competitor X). Sales reps waste critical hours re-reading CRM summaries before calls. 

DealHindsight solves this by providing AI sales agents with long-term, persistent memory. Using Hindsight's `retain` and `recall` APIs, DealHindsight remembers every objection raised, competitor pricing cited, and stakeholder concern mentioned in previous calls. When a rep asks how to approach a meeting, the co-pilot instantly recalls the deal history and recommends winning response tactics based on what worked in past deals.

---

## Key Features

1. **Before/After Comparative Workspace:** Chat with two coaches side-by-side:
   - **Vanilla Sales Coach (No Memory):** Stateless agent that repeats boilerplate sales templates (e.g., "be polite", "ask for budget") regardless of prior calls.
   - **Hindsight Sales Coach (With Memory):** Memory-integrated agent that recalls prior call logs, warns against tactics that failed, and recommends targeted objection handles.
2. **Interactive Call Log & Objections Ingestion:** Simulates call logs via the Sandbox Lab, or logs call transcripts manually. It automatically extracts objections and competitors and saves them using Hindsight `retain`.
3. **Evolving Strategic Sales Beliefs:** Reflects on the memory bank (Hindsight `reflect` API) to synthesize high-level strategic observations (e.g., detecting product integration bottlenecks and identifying top competitor pricing).
4. **Hindsight Memory Visualizer:** An interactive UI displaying Hindsight's memory bank:
   - **World Facts:** Core prospect profile metadata.
   - **Experiences:** Historic sales call logs and closed deal post-mortems.
   - **Evolving Beliefs:** Consolidated strategic rules formed through reflection.
5. **Dual Mode Execution:**
   - **Simulation Mode (Offline-friendly):** Runs out-of-the-box using a local JSON memory engine (`local_sales_memory.json`).
   - **Live Mode:** Toggles to real Hindsight Cloud instances and live OpenAI/Groq API keys in the settings panel.

---

## Technology Stack

- **Backend:** Python, FastAPI, Uvicorn, Pydantic, Hindsight-Client Python SDK.
- **Frontend:** React, Vite, TypeScript, Vanilla CSS (Premium Dark Glassmorphism Design).
- **LLM Access:** OpenAI, Groq, or fallback simulated intelligence.

---

## Installation & Setup

### Prerequisites
- Python 3.11.0+
- Node.js v22.19.0+ and npm

### 1. Run Backend Server
In a terminal, navigate to the `backend` folder and run:
```powershell
pip install -r requirements.txt
python run.py
```
The backend API will start at `http://127.0.0.1:8000`.

### 2. Run Frontend Dashboard
In a separate terminal, navigate to the `frontend` folder and run:
```powershell
npm install
npm run dev
```
The React dashboard will boot up at `http://localhost:5173`. Open this URL in your browser.

---

## Guided Sandbox Demo: The Learning Curve

To experience how the agent adapts, run this scenario:

1. **Reset Memory:** Go to **Simulation Lab** -> click **Wipe Agent Memory** to start with a blank database.
2. **Initial Question:** Open **Workspace**, select **Acme Corp**, and ask:
   > *"How should I approach pricing and competitors on the next call?"*
   - Note that both coaches suggest generic advice ("ask about budget, show standard decks").
3. **Log Blocker Call:** Go to **Simulation Lab** -> click **Log Call Log** on **Audit: SOC-2 Compliance Blocker** (simulates Call 2 where the blocker is raised and Competitor X is introduced).
4. **Test Co-Pilot Memory:** Return to **Workspace** and ask the same question:
   > *"How should I approach pricing and competitors on the next call?"*
   - **Vanilla Sales Coach:** Continues suggesting boilerplate templates (forgetful).
   - **Hindsight Sales Coach:** Warns you that VP Jane Doe raised SOC-2 compliance as a legal blocker, notes that Competitor X is quoting $80k, and recommends pitching an isolated AWS VPC hosting zone for $79,000 first year.
5. **Conclude Deal:** In the workspace right sidebar, click **Close Deal (Won / Lost)**. Select **Closed-Won** and save a summary. This triggers a Hindsight `retain` outcome.
6. **Force Reflection:** In the **Memory Visualizer** tab, click **Force Reflect Cycle** to watch the co-pilot consolidate beliefs: *"Acme Corp is risk-averse; pitching VPC network isolation is effective in bypassing SOC-2 blockers."*
