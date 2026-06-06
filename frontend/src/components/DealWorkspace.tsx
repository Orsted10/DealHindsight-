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

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep track of the active deal ID to detect true switches
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

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatHistory((prev) => [...prev, { message: userMessage, sender: 'user' }]);
    setChatLoading(true);

    fetch(`http://127.0.0.1:8000/api/deals/${deal.id}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
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
        
        // Refresh details
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
        <div style={{ padding: '12px 12px 0 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>DEAL ACCOUNT WORKSPACE</span>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: '700' }}>{deal.company_name}</h4>
          </div>
          <span className={`badge ${deal.stage === 'Closed-Won' ? 'badge-resolved' : deal.stage === 'Closed-Lost' ? 'badge-critical' : 'badge-active'}`}>
            {deal.stage}
          </span>
        </div>

        {/* Console showing call history */}
        <div className="log-terminal" style={{ color: '#fff', fontSize: '13px' }}>
          <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px', marginBottom: '8px' }}>
            📞 INTERACTION TRANSCRIPTS LOG
          </div>
          {deal.call_history.length === 0 ? (
            <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center' }}>
              No call logs loaded. Trigger a simulated meeting in the Control Room.
            </div>
          ) : (
            deal.call_history.map((call, idx) => (
              <div key={idx} style={{ marginBottom: '14px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--accent-purple)', fontWeight: '600' }}>
                  <span>{call.call_name}</span>
                  <span>{call.timestamp}</span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', lineHeight: '1.5', color: '#e0e6ed' }}>
                  {call.transcript}
                </p>
                {call.objections.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    {call.objections.map((o) => (
                      <span key={o} className="badge badge-critical" style={{ fontSize: '9px', textTransform: 'none' }}>{o}</span>
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
          <div style={{ padding: '0 12px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => setShowLogCallForm(true)}>
              📝 LOG NEW CALL TRANSCRIPT
            </button>
            <button className="btn btn-cyan" style={{ width: '100%' }} onClick={() => setShowCloseModal(true)}>
              🏆 CLOSE DEAL (WON / LOST)
            </button>
          </div>
        )}

        {isClosed && (
          <div style={{ padding: '0 12px 12px 12px' }}>
            <div className="runbook-section" style={{ borderColor: deal.stage === 'Closed-Won' ? 'var(--accent-emerald)' : 'var(--accent-ruby)', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: deal.stage === 'Closed-Won' ? 'var(--accent-emerald)' : 'var(--accent-ruby)', marginBottom: '6px' }}>
                🏁 DEAL CONCLUDED POST-SALE SUMMARY
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                {deal.win_loss_reason}
              </p>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
                💾 Experience saved to Hindsight for future objections coaching.
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
                    <div key={idx} style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border-color)' }}>
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
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Hindsight Coach */}
          <div className="agent-column hindsight">
            <div className="agent-header">
              <span>HINDSIGHT SALES COACH (With Memory)</span>
              <span className="agent-badge-pill">Persistent</span>
            </div>
            <div className="agent-chat-history">
              <div className="agent-bubble" style={{ borderColor: 'rgba(0,240,255,0.2)' }}>
                Hi! I am the memory-integrated Sales Coach. I recall prior call summaries, objections, and stakeholders from Hindsight memory before recommending tactics.
              </div>
              {chatHistory.map((chat, idx) => {
                if (chat.sender === 'user') {
                  return (
                    <div key={idx} style={{ alignSelf: 'flex-end', background: 'rgba(0, 240, 255, 0.05)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
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
            </div>
          </div>
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
                  placeholder="Paste call notes here. Mention any objections (security, soc-2, pricing, jira sync) and competitor name-drops to test extraction."
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowLogCallForm(false)}>CANCEL</button>
                <button type="submit" className="btn btn-cyan" disabled={loggingCall}>
                  {loggingCall ? 'LOGGING...' : 'LOG CALL & FACT EXTRAC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Deal Modal */}
      {showCloseModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
