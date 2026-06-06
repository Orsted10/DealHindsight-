import React, { useState, useEffect } from 'react';

interface SettingsProps {
  onSettingsSaved: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onSettingsSaved }) => {
  const [settings, setSettings] = useState({
    hindsight_api_key: '',
    hindsight_base_url: 'http://localhost:8888',
    openai_api_key: '',
    groq_api_key: '',
    live_mode: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings({
          hindsight_api_key: data.hindsight_api_key || '',
          hindsight_base_url: data.hindsight_base_url || 'http://localhost:8888',
          openai_api_key: data.openai_api_key || '',
          groq_api_key: data.groq_api_key || '',
          live_mode: data.live_mode,
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching settings:', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage('');

    fetch('http://127.0.0.1:8000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
      .then((res) => res.json())
      .then(() => {
        setSaving(false);
        setStatusMessage('✅ Settings saved successfully!');
        onSettingsSaved();
        setTimeout(() => setStatusMessage(''), 3000);
      })
      .catch((err) => {
        console.error('Error saving settings:', err);
        setSaving(false);
        setStatusMessage('❌ Failed to save settings.');
      });
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading environment settings...</div>;
  }

  return (
    <div className="main-view" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-title">SYSTEM CONFIGURATION</div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <input
              type="checkbox"
              id="live_mode"
              name="live_mode"
              checked={settings.live_mode}
              onChange={handleChange}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label htmlFor="live_mode" style={{ fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: settings.live_mode ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                Enable Live Mode
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                When checked, targets real Hindsight Cloud/Docker servers and live LLM APIs. Unchecked runs offline in Simulation Mode.
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>Hindsight API Key</label>
            <input
              type="password"
              name="hindsight_api_key"
              value={settings.hindsight_api_key}
              onChange={handleChange}
              placeholder="e.g. hs_..."
              className="form-input"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Get from Hindsight Cloud billing panel. (Enter promo code MEMHACK6 for $50 free credits).
            </span>
          </div>

          <div className="form-group">
            <label>Hindsight Base URL</label>
            <input
              type="text"
              name="hindsight_base_url"
              value={settings.hindsight_base_url}
              onChange={handleChange}
              placeholder="http://localhost:8888"
              className="form-input"
            />
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Set to http://localhost:8888 for local Docker, or your Hindsight Cloud instance URL.
            </span>
          </div>

          <div className="form-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              name="openai_api_key"
              value={settings.openai_api_key}
              onChange={handleChange}
              placeholder="e.g. sk-..."
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Groq API Key (Fast free-tier fallback)</label>
            <input
              type="password"
              name="groq_api_key"
              value={settings.groq_api_key}
              onChange={handleChange}
              placeholder="e.g. gsk_..."
              className="form-input"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
            <button type="submit" className="btn btn-cyan" disabled={saving}>
              {saving ? 'Saving...' : 'SAVE SETTINGS'}
            </button>
            {statusMessage && <div style={{ fontSize: '13px', fontWeight: '600' }}>{statusMessage}</div>}
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: '20px', background: 'rgba(0, 240, 255, 0.02)', borderColor: 'rgba(0, 240, 255, 0.15)' }}>
        <div className="card-title" style={{ color: 'var(--accent-cyan)', fontSize: '14px' }}>ℹ️ DEMO NOTICE</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
          <strong>No API keys? No problem!</strong> Leave "Enable Live Mode" unchecked and save. 
          The application will activate our local mock simulation of the Vectorize Hindsight Engine. 
          You can test the entire "Before" vs "After" learning scenario, trigger outages, run scripts, 
          and watch the agent construct long-term beliefs.
        </p>
      </div>
    </div>
  );
};
