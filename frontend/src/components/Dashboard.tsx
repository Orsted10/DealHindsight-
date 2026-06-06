import React from 'react';

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

interface DashboardProps {
  deals: Deal[];
  activeDealsCount: number;
  closedWonCount: number;
  hindsightLive: boolean;
  setActiveTab: (tab: string) => void;
  onSelectDeal: (deal: Deal) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  deals,
  activeDealsCount,
  closedWonCount,
  hindsightLive,
  setActiveTab,
  onSelectDeal,
}) => {
  // Extract recent calls
  const allCalls: { call: CallHistoryItem; company: string; deal: Deal }[] = [];
  deals.forEach((d) => {
    d.call_history.forEach((c) => {
      allCalls.push({ call: c, company: d.company_name, deal: d });
    });
  });
  
  const recentCalls = allCalls
    .sort((a, b) => b.call.timestamp.localeCompare(a.call.timestamp))
    .slice(0, 5);

  // Calculate total pipeline value
  const pipelineValue = deals
    .filter((d) => d.stage !== 'Closed-Won' && d.stage !== 'Closed-Lost')
    .reduce((acc, curr) => acc + curr.deal_size, 0);

  // Win rate percentage
  const totalClosed = deals.filter((d) => d.stage === 'Closed-Won' || d.stage === 'Closed-Lost').length;
  const winRate = totalClosed > 0 ? `${Math.round((closedWonCount / totalClosed) * 100)}%` : "100% (Baseline)";

  const systemStatus = activeDealsCount > 0 ? "PIPELINE ACTIVE" : "PIPELINE EMPTY";
  const systemStatusColor = activeDealsCount > 0 ? 'var(--accent-cyan)' : 'var(--accent-orange)';

  const handleDealClick = (deal: Deal) => {
    onSelectDeal(deal);
    setActiveTab('workspace');
  };

  return (
    <div className="main-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>SALES COMMAND DASHBOARD</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Real-time pipeline monitoring, call logging analytics, and Hindsight-powered sales strategy tracking.
          </p>
        </div>
        
        <div className="sim-indicator">
          <span className={`indicator-dot ${hindsightLive ? 'live' : 'sim'}`} />
          <span style={{ color: hindsightLive ? 'var(--accent-emerald)' : 'var(--accent-orange)' }}>
            {hindsightLive ? 'LIVE HINDSIGHT CLOUD' : 'SIMULATION MODE (OFFLINE)'}
          </span>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="stats-banner" style={{ marginTop: '10px' }}>
        <div className="card stat-item" style={{ borderLeft: `3px solid ${systemStatusColor}` }}>
          <span className="stat-value" style={{ color: systemStatusColor }}>{systemStatus}</span>
          <span className="stat-label">PIPELINE STATE</span>
        </div>
        <div className="card stat-item">
          <span className="stat-value">${pipelineValue.toLocaleString()}</span>
          <span className="stat-label">ACTIVE PIPELINE VALUE</span>
        </div>
        <div className="card stat-item">
          <span className="stat-value">{activeDealsCount}</span>
          <span className="stat-label">ACTIVE PROSPECTS</span>
        </div>
        <div className="card stat-item" style={{ borderRight: '3px solid var(--accent-purple)' }}>
          <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>{winRate}</span>
          <span className="stat-label">WIN PROBABILITY RATE</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginTop: '10px' }}>
        {/* Left Card: Deals Pipeline list */}
        <div className="card">
          <div className="card-title">ACTIVE SALES PIPELINE ACCOUNTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {deals.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center' }}>No accounts active.</div>
            ) : (
              deals.map((d) => (
                <div
                  key={d.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '10px', cursor: 'pointer' }}
                  onClick={() => handleDealClick(d)}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{d.company_name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>VP Stakeholder: {d.stakeholder}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '700' }}>${d.deal_size.toLocaleString()}</span>
                    <span className={`badge ${d.stage === 'Closed-Won' ? 'badge-resolved' : d.stage === 'Closed-Lost' ? 'badge-critical' : 'badge-active'}`}>
                      {d.stage}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Card: Call log activities */}
        <div className="card">
          <div className="card-title">RECENT INTERACTIONS LOG</div>
          {recentCalls.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '180px', color: 'var(--text-secondary)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
              <span>No calls logged yet.</span>
              <button className="btn btn-outline" style={{ marginTop: '10px' }} onClick={() => setActiveTab('control-room')}>
                GO SIMULATE A CALL
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recentCalls.map((item, idx) => (
                <div
                  key={idx}
                  style={{ background: 'rgba(255,255,255,0.015)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                  onClick={() => handleDealClick(item.deal)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600' }}>{item.company}</div>
                    <span style={{ fontSize: '11px', color: 'var(--accent-purple)' }}>{item.call.call_name}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {item.call.transcript}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
