import React, { useState } from 'react';

interface ControlRoomProps {
  onIncidentTriggered: () => void;
  setActiveTab: (tab: string) => void;
}

export const ControlRoom: React.FC<ControlRoomProps> = ({ onIncidentTriggered, setActiveTab }) => {
  const [triggering, setTriggering] = useState<string | null>(null);

  const handleTrigger = (dealId: string, scenario: string) => {
    setTriggering(scenario);
    fetch('http://127.0.0.1:8000/api/deals/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deal_id: dealId, scenario }),
    })
      .then((res) => res.json())
      .then(() => {
        setTriggering(null);
        onIncidentTriggered();
        setActiveTab('workspace');
      })
      .catch((err) => {
        console.error('Error triggering sales call:', err);
        setTriggering(null);
      });
  };

  const handleResetMemory = () => {
    if (window.confirm("Are you sure you want to clear Hindsight's sales memory bank? This will reset all learned objections, call transcripts, and deal statuses, returning the sales coach to a stateless, generic advisor.")) {
      fetch('http://127.0.0.1:8000/api/hindsight/clear', {
        method: 'POST',
      })
        .then(() => {
          alert("Sales memory wiped successfully!");
          onIncidentTriggered();
        })
        .catch((err) => {
          console.error('Error clearing memory:', err);
        });
    }
  };

  return (
    <div className="main-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>SALES PLAYGROUND & SIMULATOR</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Simulate client calls to feed objections and competitor intelligence into the Hindsight memory layer.
          </p>
        </div>
        <button className="btn btn-outline" style={{ borderColor: 'var(--accent-ruby)', color: 'var(--accent-ruby)' }} onClick={handleResetMemory}>
          WIPE AGENT MEMORY
        </button>
      </div>

      <div className="trigger-grid" style={{ marginTop: '20px' }}>
        {/* Acme Corp Security Call */}
        <div className="card trigger-card critical" onClick={() => !triggering && handleTrigger('deal-acme', 'security_audit')}>
          <div className="incident-header">
            <span className="badge badge-critical">SECURITY OBJECTION</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>acme-corp</span>
          </div>
          <h3 style={{ margin: '12px 0 8px 0', fontSize: '16px' }}>Audit: SOC-2 Compliance Blocker</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', minHeight: '60px' }}>
            Jane Doe VP of Engineering raises a hard legal objection. They cannot buy without a SOC-2 report, unless we isolate them in a dedicated AWS VPC.
          </p>
          <button className="btn btn-outline" style={{ width: '100%' }} disabled={triggering !== null}>
            {triggering === 'security_audit' ? 'Simulating Call...' : 'LOG CALL LOG'}
          </button>
        </div>

        {/* Globex Pricing Call */}
        <div className="card trigger-card critical" onClick={() => !triggering && handleTrigger('deal-globex', 'pricing_escalation')}>
          <div className="incident-header">
            <span className="badge badge-warning">PRICING OBJECTION</span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>globex-corp</span>
          </div>
          <h3 style={{ margin: '12px 0 8px 0', fontSize: '16px' }}>Negotiation: Budget Cap & Competitor</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0', minHeight: '60px' }}>
            Bob Smith states Globex has a hard budget cap of $95,000. He drops Competitor Y, who is offering a 25% discount bringing pricing to $90k.
          </p>
          <button className="btn btn-outline" style={{ width: '100%' }} disabled={triggering !== null}>
            {triggering === 'pricing_escalation' ? 'Simulating Call...' : 'LOG CALL LOG'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: '20px', background: 'rgba(189, 0, 255, 0.02)', borderColor: 'rgba(189, 0, 255, 0.15)' }}>
        <div className="card-title" style={{ color: 'var(--accent-purple)', fontSize: '14px' }}>💡 HACKATHON DEMO GUIDE: THE SALES COACH LEARNING LOOP</div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Follow this workflow to demonstrate Hindsight's long-term memory:
          <ol style={{ paddingLeft: '20px', marginTop: '10px' }}>
            <li>
              <strong>Clear memory</strong> using the red button above so the Sales Coach is completely fresh.
            </li>
            <li>
              Go to the <strong>Workspace</strong> tab. Under the <strong>Acme Corp</strong> deal, ask the co-pilot: <em>"How should I pitch Acme on our next call to handle objections and competitor pricing?"</em>
            </li>
            <li>
              Note that both the <em>Vanilla Sales Coach</em> and <em>Hindsight Sales Coach</em> recommend generic advice: "Highlight our benefits, ask about their budget, offer standard pricing slides."
            </li>
            <li>
              Go to the **Control Room** and click **Log Call Log** on the **Acme Corp: SOC-2 Compliance Blocker** card. (This simulates Call 2 where the blocker is raised and HubSpot/Competitor X are introduced).
            </li>
            <li>
              Return to the **Workspace** tab. Ask the exact same question: <em>"How should I pitch Acme on our next call to handle objections and competitor pricing?"</em>
            </li>
            <li>
              Observe the stark difference:
              <ul>
                <li><strong>Vanilla SRE:</strong> Still suggests generic templates ("Offer a case study, ask for their timeline").</li>
                <li><strong>Hindsight SRE:</strong> Recalls the exact objection Jane Doe raised (SOC-2 blocker), mentions Competitor X's quote of $80k, and recommends pitching a dedicated AWS VPC setup for $79k to counter Competitor X.</li>
              </ul>
            </li>
            <li>
              Now click **Close Deal as Won**. Enter a final summary of the win. This logs the final experience.
            </li>
            <li>
              Visit the **Memory Visualizer** tab. Click **Force Reflect Cycle** to watch the co-pilot consolidate beliefs: *"Acme is highly risk-averse; pitching AWS VPC isolated setups bypasses SOC-2 blockers."*
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
