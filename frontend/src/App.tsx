import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { DealWorkspace } from './components/DealWorkspace';
import { MemoryVisualizer } from './components/MemoryVisualizer';
import { ControlRoom } from './components/ControlRoom';
import { Settings } from './components/Settings';

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

function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [hindsightLive, setHindsightLive] = useState<boolean>(false);
  const [memoryUpdated, setMemoryUpdated] = useState<number>(Date.now());

  const activeDealRef = useRef<Deal | null>(activeDeal);
  
  useEffect(() => {
    activeDealRef.current = activeDeal;
  }, [activeDeal]);

  const fetchDealsAndSettings = () => {
    // Fetch Settings
    fetch('http://127.0.0.1:8000/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setHindsightLive(data.live_mode);
      })
      .catch((err) => console.error('Error fetching settings status:', err));

    // Fetch Deals list
    fetch('http://127.0.0.1:8000/api/deals')
      .then((res) => res.json())
      .then((data: Deal[]) => {
        setDeals(data);
        
        // Find if our currently selected deal still exists in the fresh list
        const currentDealId = activeDealRef.current?.id;
        const updatedDeal = data.find((d) => d.id === currentDealId);
        
        if (updatedDeal) {
          setActiveDeal(updatedDeal);
        } else if (!currentDealId) {
          // Only auto-select the first active deal on initial load (when no deal is selected yet)
          const firstActive = data.find((d) => d.stage !== 'Closed-Won' && d.stage !== 'Closed-Lost');
          if (firstActive) {
            setActiveDeal(firstActive);
          }
        }
      })
      .catch((err) => console.error('Error fetching deals list:', err));
  };

  useEffect(() => {
    fetchDealsAndSettings();
    const interval = setInterval(fetchDealsAndSettings, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeDeals = deals.filter((d) => d.stage !== 'Closed-Won' && d.stage !== 'Closed-Lost');
  const closedDeals = deals.filter((d) => d.stage === 'Closed-Won' || d.stage === 'Closed-Lost');
  const closedWonDeals = deals.filter((d) => d.stage === 'Closed-Won');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            deals={deals}
            activeDealsCount={activeDeals.length}
            closedWonCount={closedWonDeals.length}
            hindsightLive={hindsightLive}
            setActiveTab={setActiveTab}
            onSelectDeal={setActiveDeal}
          />
        );
      case 'workspace':
        return (
          <DealWorkspace
            activeDeal={activeDeal}
            onRefreshDeals={fetchDealsAndSettings}
            onMemoryUpdated={() => setMemoryUpdated(Date.now())}
          />
        );
      case 'memory-visualizer':
        return <MemoryVisualizer lastUpdated={memoryUpdated} />;
      case 'control-room':
        return (
          <ControlRoom
            onIncidentTriggered={fetchDealsAndSettings}
            setActiveTab={setActiveTab}
          />
        );
      case 'settings':
        return <Settings onSettingsSaved={fetchDealsAndSettings} />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <h1>DealHindsight</h1>
          <span className="brand-badge">Sales Objection Intelligence</span>
        </div>
        <div className="nav-links">
          <button className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            DASHBOARD
          </button>
          <button className={`nav-button ${activeTab === 'workspace' ? 'active' : ''}`} onClick={() => setActiveTab('workspace')}>
            DEAL WORKSPACE {activeDeals.length > 0 && <span style={{ background: 'var(--accent-cyan)', color: '#000', padding: '1px 5px', fontSize: '9px', borderRadius: '50%', marginLeft: '4px', fontWeight: 'bold' }}>{activeDeals.length}</span>}
          </button>
          <button className={`nav-button ${activeTab === 'memory-visualizer' ? 'active' : ''}`} onClick={() => setActiveTab('memory-visualizer')}>
            MEMORY VISUALIZER
          </button>
          <button className={`nav-button ${activeTab === 'control-room' ? 'active' : ''}`} onClick={() => setActiveTab('control-room')}>
            SIMULATION LAB
          </button>
          <button className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            SETTINGS
          </button>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="dashboard-content">
        {/* Left Sidebar */}
        <aside className="sidebar">
          {/* Active deals list */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '8px', letterSpacing: '0.5px' }}>
              💼 ACTIVE PIPELINE ({activeDeals.length})
            </div>
            {activeDeals.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                No active deals
              </div>
            ) : (
              activeDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`incident-item ${activeDeal?.id === deal.id && activeTab === 'workspace' ? 'active-item' : ''}`}
                  onClick={() => {
                    setActiveDeal(deal);
                    setActiveTab('workspace');
                  }}
                >
                  <div className="incident-header">
                    <span className="incident-title" style={{ fontSize: '13.5px' }}>{deal.company_name}</span>
                    <span className="badge badge-warning" style={{ scale: '0.85', fontSize: '9px' }}>{deal.stage}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Value: ${deal.deal_size.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>

          {/* Closed deals list */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-emerald)', marginBottom: '8px', letterSpacing: '0.5px' }}>
              🏁 CLOSED DEALS ({closedDeals.length})
            </div>
            {closedDeals.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center' }}>
                No concluded accounts
              </div>
            ) : (
              closedDeals.map((deal) => (
                <div
                  key={deal.id}
                  className={`incident-item ${activeDeal?.id === deal.id && activeTab === 'workspace' ? 'active-item' : ''}`}
                  onClick={() => {
                    setActiveDeal(deal);
                    setActiveTab('workspace');
                  }}
                >
                  <div className="incident-header">
                    <span className="incident-title" style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>{deal.company_name}</span>
                    <span className={`badge ${deal.stage === 'Closed-Won' ? 'badge-resolved' : 'badge-critical'}`} style={{ scale: '0.85', fontSize: '9px' }}>
                      {deal.stage === 'Closed-Won' ? 'Won' : 'Lost'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Value: ${deal.deal_size.toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Viewport */}
        <main style={{ overflow: 'hidden', height: '100%' }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
