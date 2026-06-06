import React, { useState, useEffect, useRef } from 'react';

interface CallHistoryItem {
  call_name: string;
  transcript: string;
  timestamp: string;
  objections: string[];
  competitors: string[];
}

interface Deal {
  id: string;
  company_name: string;
  deal_size: number;
  stage: string;
  win_probability: number;
  stakeholder: string;
  created_at: string;
  competitors: string[];
  active_objections: string[];
  call_history: CallHistoryItem[];
  win_loss_reason?: string;
}

interface RecalledMemory {
  id: string;
  text: string;
  type: string;
  tags: string[];
}

interface ChatHistoryItem {
  message: string;
  sender: 'user' | 'agent';
  with_memory?: string;
  without_memory?: string;
  recalled_memories?: RecalledMemory[];
}

interface DealWorkspaceProps {
  activeDeal: Deal | null;
  onRefreshDeals: () => void;
  onMemoryUpdated: () => void;
}

export const DealWorkspace: React.FC<DealWorkspaceProps> = ({
  activeDeal: initialDeal,
  onRefreshDeals,
  onMemoryUpdated,
}) => {
  const [deal, setDeal] = useState<Deal | null>(initialDeal);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Manual Call Log Form State
  const [showLogCallForm, setShowLogCallForm] = useState(false);
  const [newCallName, setNewCallName] = useState('');
  const [newCallTranscript, setNewCallTranscript] = useState('');
  const [loggingCall, setLoggingCall] = useState(false);

  // Close Deal Modal State
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeStatus, setCloseStatus] = useState<'Closed-Won' | 'Closed-Lost'>('Closed-Won');
  const [closeReason, setCloseReason] = useState('');
  const [closing, setClosing] = useState(false);

  // Quick Chat Prompts
  const quickPrompts = [
    { text: "Objections & Competitors approach", label: "⚠️ Objections" },
    { text: "Pricing strategy & budget limits", label: "💰 Pricing Strategy" },
    { text: "Summary of past sales call failures", label: "❌ Past Failures" },
    { text: "Formulate winning elevator pitch", label: "⚡ Pitch Guide" }
  ];

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevDealIdRef = useRef<string | null>(null);

  useEffect(() => {
    setDeal(initialDeal);
    const currentDealId = initialDeal ? initialDeal.id : null;
    if (currentDealId !== prevDealIdRef.current) {
      setChatHistory([]);
      setShowLogCallForm(false);
      setShowCloseModal(false);
      setNewCallName('');
      setNewCallTranscript('');
      setCloseReason('');
      prevDealIdRef.current = currentDealId;
    }
  }, [initialDeal]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deal?.call_history]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, chatLoading]);

  if (!deal) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
        <h3>No active deal selected</h3>
        <p style={{ fontSize: '13px' }}>Go to the Control Room to trigger a simulated customer meeting or select a deal from the sidebar.</p>
      </div>
    );
  }

  const triggerChat = (messageText: string) => {
    if (chatLoading) return;
    setChatHistory((prev) => [...prev, { message: messageText, sender: 'user' }]);
    setChatLoading(true);

    fetch(`http://127.0.0.1:8000/api/deals/${deal.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: messageText }),
    })
      .then((res) => res.json())
      .then((data) => {
        setChatHistory((prev) => [
          ...prev,
          {
            message: '',
            sender: 'agent',
            with_memory: data.with_memory,
            without_memory: data.without_memory,
            recalled_memories: data.recalled_memories,
          },
        ]);
        setChatLoading(false);
      })
      .catch((err) => {
        console.error('Error chatting with sales coach:', err);
        setChatLoading(false);
      });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    triggerChat(msg);
  };

  const handleLogCallSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCallName.trim() || !newCallTranscript.trim() || loggingCall) return;

    setLoggingCall(true);
    fetch(`http://127.0.0.1:8000/api/deals/${deal.id}/log_call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_name: newCallName,
        transcript: newCallTranscript,
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setLoggingCall(false);
        setShowLogCallForm(false);
        setNewCallName('');
        setNewCallTranscript('');
        
        fetch(`http://127.0.0.1:8000/api/deals/${deal.id}`)
          .then((res) => res.json())
          .then((data) => {
            setDeal(data);
            onRefreshDeals();
            onMemoryUpdated();
          });
      })
      .catch((err) => {
        console.error('Error logging call transcript:', err);
        setLoggingCall(false);
      });
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeReason.trim() || closing) return;

    setClosing(true);
    fetch(`http://127.0.0.1:8000/api/deals/${deal.id}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: closeStatus,
        reason: closeReason,
      }),
    })
      .then((res) => res.json())
      .then((closedDeal) => {
        setClosing(false);
        setShowCloseModal(false);
        setDeal(closedDeal);
        onRefreshDeals();
        onMemoryUpdated();
      })
      .catch((err) => {
        console.error('Error closing deal:', err);
        setClosing(false);
      });
  };

  const isClosed = deal.stage === 'Closed-Won' || deal.stage === 'Closed-Lost';

  return (
    <div className="workspace-grid">
      {/* Left Column: Call logs history */}
      <div className="workspace-left" style={{ borderRight: '1px solid var(--border-color)' }}>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px' }}>DEAL ACCOUNT WORKSPACE</span>
              <h4 style={{ margin: '2px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#fff' }}>{deal.company_name}</h4>
            </div>
            <span className={`badge ${deal.stage === 'Closed-Won' ? 'badge-resolved' : deal.stage === 'Closed-Lost' ? 'badge-critical' : 'badge-active'}`}>
              {deal.stage}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>DEAL VALUE</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-cyan)' }}>${deal.deal_size.toLocaleString()}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>WIN PROBABILITY</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-purple)' }}>{deal.win_probability}%</div>
            </div>
          </div>

          {deal.active_objections.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginBottom: '4px' }}>TRACKED OBJECTIONS</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {deal.active_objections.map((obj) => (
                  <span key={obj} className="badge badge-critical" style={{ fontSize: '9px', textTransform: 'none' }}>{obj}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Console showing call history */}
        <div className="log-terminal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '10px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}>📞 INTERACTION TRANSCRIPTS LOG</span>
            <span style={{ fontSize: '9px', background: 'rgba(0, 240, 255, 0.1)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px' }}>
              {deal.call_history.length} CALLS
            </span>
          </div>
          {deal.call_history.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '20px 10px', textAlign: 'center' }}>
              No call logs loaded. Go to Simulation Lab to trigger a mock client interaction.
            </div>
          ) : (
            deal.call_history.map((call, idx) => (
              <div key={idx} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.015)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600', marginBottom: '6px' }}>
                  <span>{call.call_name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>{call.timestamp}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.5', color: '#cbd5e1' }}>
                  {call.transcript}
                </p>
                {call.competitors.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--accent-orange)' }}>COMPETITORS:</span>
                    {call.competitors.map((c) => (
                      <span key={c} style={{ fontSize: '9px', color: '#fff', background: 'rgba(255, 123, 0, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Buttons for Logging new Calls and Closing Deals */}
        {!isClosed && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)' }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowLogCallForm(true)}>
              📝 LOG NEW CALL TRANSCRIPT
            </button>
            <button className="btn btn-cyan" style={{ width: '100%' }} onClick={() => setShowCloseModal(true)}>
              🏆 CLOSE DEAL (WON / LOST)
            </button>
          </div>
        )}

        {isClosed && (
          <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
            <div className="runbook-section" style={{ borderColor: deal.stage === 'Closed-Won' ? 'var(--accent-emerald)' : 'var(--accent-ruby)', background: 'rgba(255,255,255,0.01)', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: deal.stage === 'Closed-Won' ? 'var(--accent-emerald)' : 'var(--accent-ruby)', marginBottom: '6px' }}>
                🏁 DEAL CONCLUDED POST-SALE SUMMARY
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                {deal.win_loss_reason}
              </p>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                💾 Experience saved to Hindsight memory bank for subsequent deal reflection.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Center Column: Comparative Side-by-Side Chats */}
      <div className="workspace-right">
        <div className="comparison-pane">
          {/* Vanilla Coach */}
          <div className="agent-column vanilla">
            <div className="agent-header">
              <span>VANILLA SALES COACH (No Memory)</span>
              <span className="agent-badge-pill">Stateless</span>
            </div>
            <div className="agent-chat-history">
              <div className="agent-bubble">
                Hi, I'm the stateless Sales Coach. I analyze this account without historical call logs or past objections context. Ask me how to approach this client.
              </div>
              {chatHistory.map((chat, idx) => {
                if (chat.sender === 'user') {
                  return (
                    <div key={idx} style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border-color)', maxWidth: '85%' }}>
                      {chat.message}
                    </div>
                  );
                } else {
                  return (
                    <div key={idx} className="agent-bubble">
                      <div dangerouslySetInnerHTML={{ __html: formatMarkdown(chat.without_memory || '') }} />
                    </div>
                  );
                }
              })}
              {chatLoading && (
                <div className="agent-bubble" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  Stateless Coach is thinking...
                </div>
              )}
            </div>
          </div>

          {/* Hindsight Coach */}
          <div className="agent-column hindsight">
            <div className="agent-header">
              <span>HINDSIGHT SALES COACH (With Memory)</span>
              <span className="agent-badge-pill">Persistent</span>
            </div>
            <div className="agent-chat-history">
              <div className="agent-bubble" style={{ borderColor: 'rgba(0,240,255,0.15)' }}>
                Hi! I am the memory-integrated Sales Coach. I recall prior call summaries, objections, and stakeholders from Hindsight memory before recommending tactics.
              </div>
              {chatHistory.map((chat, idx) => {
                if (chat.sender === 'user') {
                  return (
                    <div key={idx} style={{ alignSelf: 'flex-end', background: 'rgba(0, 240, 255, 0.04)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(0, 240, 255, 0.2)', maxWidth: '85%' }}>
                      {chat.message}
                    </div>
                  );
                } else {
                  return (
                    <div key={idx}>
                      {chat.recalled_memories && chat.recalled_memories.length > 0 && (
                        <div className="memory-alert-container">
                          {chat.recalled_memories.map((m) => (
                            <div key={m.id} className="memory-alert">
                              <span className="memory-alert-icon">🧠 RECALLED FACT</span>
                              <div>{m.text}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="agent-bubble" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(chat.with_memory || '') }} />
                      </div>
                    </div>
                  );
                }
              })}
              {chatLoading && (
                <div className="agent-bubble" style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                  Hindsight Coach is searching memory bank...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>

        {/* Quick action prompts */}
        <div style={{ display: 'flex', gap: '8px', padding: '10px 20px', background: 'rgba(10,12,18,0.7)', overflowX: 'auto', borderBottom: '1px solid var(--border-color)' }}>
          {quickPrompts.map((qp, index) => (
            <button
              key={index}
              className="btn btn-outline"
              style={{ padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
              onClick={() => triggerChat(qp.text)}
              disabled={isClosed || chatLoading}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat Input form */}
        <form onSubmit={handleSendChat} className="chat-input-bar">
          <input
            type="text"
            className="chat-input"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask both SRE coaches how to handle pricing objections or competitors..."
            disabled={isClosed || chatLoading}
          />
          <button type="submit" className="btn btn-cyan" disabled={isClosed || chatLoading || !chatInput.trim()}>
            SEND PROMPT
          </button>
        </form>
      </div>

      {/* Manual Call Log Form Modal */}
      {showLogCallForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '450px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-cyan)' }}>
            <div className="card-title">LOG SALES CALL TRANSCRIPT</div>
            <form onSubmit={handleLogCallSubmit}>
              <div className="form-group">
                <label>Call Name / Subject</label>
                <input
                  type="text"
                  className="form-input"
                  value={newCallName}
                  onChange={(e) => setNewCallName(e.target.value)}
                  placeholder="e.g. Call 2: Technical Objection Review"
                  required
                />
              </div>
              <div className="form-group">
                <label>Call Transcript or Summary Notes</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
                  value={newCallTranscript}
                  onChange={(e) => setNewCallTranscript(e.target.value)}
                  placeholder="Paste call notes here. Mention objections (SOC-2, pricing, budget cap, jira sync) and competitor name-drops to test extraction."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowLogCallForm(false)}>CANCEL</button>
                <button type="submit" className="btn btn-cyan" disabled={loggingCall}>
                  {loggingCall ? 'LOGGING...' : 'LOG CALL & EXTRACT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Deal Modal */}
      {showCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '450px', background: 'var(--bg-secondary)', border: '1px solid var(--accent-cyan)' }}>
            <div className="card-title">CLOSE DEALS PIPELINE</div>
            <form onSubmit={handleCloseSubmit}>
              <div className="form-group">
                <label>Conclusion Status</label>
                <select
                  value={closeStatus}
                  onChange={(e) => setCloseStatus(e.target.value as any)}
                  className="form-input"
                  style={{ background: '#000', cursor: 'pointer' }}
                >
                  <option value="Closed-Won">Closed-Won (Deal Closed Successfully)</option>
                  <option value="Closed-Lost">Closed-Lost (Deal Terminated/Failed)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Win/Loss Post-Mortem Reason</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Explain why we won or lost the account (e.g. 'Jane signed won deal because we agreed to host on a dedicated AWS VPC to bypass SOC-2 auditor roadblocks, beating Competitor X's quote of $80k')."
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Stored in Hindsight to train the co-pilot for similar future accounts.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCloseModal(false)}>CANCEL</button>
                <button type="submit" className="btn btn-cyan" disabled={closing}>
                  {closing ? 'CLOSING...' : 'FINALIZE PIPELINE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

function formatMarkdown(text: string): string {
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/\n/g, '<br/>');
  return html;
}
