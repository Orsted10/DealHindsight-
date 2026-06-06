import React, { useState, useEffect } from 'react';

interface MemoryItem {
  id: string;
  text: string;
  type: string;
  tags: string[];
  metadata?: Record<string, string>;
  context?: string;
  timestamp?: string;
}

interface MemoryVisualizerProps {
  lastUpdated: number;
}

export const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({ lastUpdated }) => {
  const [memories, setMemories] = useState<{
    facts: MemoryItem[];
    experiences: MemoryItem[];
    beliefs: MemoryItem[];
  }>({ facts: [], experiences: [], beliefs: [] });
  const [loading, setLoading] = useState(true);
  const [reflecting, setReflecting] = useState(false);

  const fetchMemories = () => {
    fetch('http://127.0.0.1:8000/api/hindsight/memories')
      .then((res) => res.json())
      .then((data) => {
        setMemories(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching sales memories:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMemories();
  }, [lastUpdated]);

  const handleReflect = () => {
    setReflecting(true);
    fetch('http://127.0.0.1:8000/api/hindsight/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "Identify recurring sales objections and objection-handling tactics that succeeded.",
        tags: ["acme-corp", "globex", "objection"]
      }),
    })
      .then((res) => res.json())
      .then(() => {
        setReflecting(false);
        fetchMemories();
      })
      .catch((err) => {
        console.error('Reflection failed:', err);
        setReflecting(false);
      });
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading Hindsight Memory Bank...</div>;
  }

  return (
    <div className="main-view">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800' }}>
            HINDSIGHT SALES MEMORY VISUALIZER
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Explore the structured database schema inside the active sales memory bank: World Facts, Call logs, and consolidated Sales Beliefs.
          </p>
        </div>
        <button className="btn btn-purple" onClick={handleReflect} disabled={reflecting}>
          {reflecting ? 'Reflecting...' : 'FORCE REFLECT CYCLE'}
        </button>
      </div>

      <div className="memory-dashboard">
        {/* World Facts Column */}
        <div className="memory-col">
          <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--accent-cyan)' }}>
            🌐 WORLD FACTS ({memories.facts.length})
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '-5px 0 10px 0' }}>
            Static prospect parameters, seat counts, and core tech stacks.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memories.facts.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center' }}>No facts stored.</div>
            ) : (
              memories.facts.map((fact) => (
                <div key={fact.id} className="memory-card">
                  <div style={{ fontWeight: '500', lineHeight: '1.4' }}>{fact.text}</div>
                  <div className="memory-meta">
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>ID: {fact.id}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {fact.tags.map((t) => (
                        <span key={t} className="memory-tag">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agent Experiences Column */}
        <div className="memory-col">
          <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: '#bd00ff' }}>
            💾 CALL LOGS & EXPERIENCES ({memories.experiences.length})
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '-5px 0 10px 0' }}>
            Dynamic records of sales transcripts, objections raised, and deal outcomes.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memories.experiences.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No call log history retained. Trigger a call in the Control Room to populate!
              </div>
            ) : (
              memories.experiences.map((exp) => (
                <div key={exp.id} className="memory-card" style={{ borderLeft: '2px solid var(--accent-purple)' }}>
                  <div style={{ fontSize: '12.5px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{exp.text}</div>
                  <div className="memory-meta" style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '10px' }}>ID: {exp.id}</span>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {exp.tags.map((t) => (
                        <span key={t} className="memory-tag memory-tag-glow">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Evolving Beliefs Column */}
        <div className="memory-col">
          <div className="card-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', color: 'var(--accent-orange)' }}>
            🧠 SALES STRATEGY BELIEFS ({memories.beliefs.length})
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '-5px 0 10px 0' }}>
            Negotiation principles and objection-handling rules synthesized via reflection.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memories.beliefs.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '20px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                No beliefs consolidated yet. Force reflection once call history is present.
              </div>
            ) : (
              memories.beliefs.map((belief) => (
                <div key={belief.id} className="memory-card" style={{ borderLeft: '2px solid var(--accent-orange)' }}>
                  <div style={{ fontStyle: 'italic', fontWeight: '500', lineHeight: '1.5' }}>{belief.text}</div>
                  <div className="memory-meta">
                    <span>ID: {belief.id}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {belief.tags.map((t) => (
                        <span key={t} className="memory-tag" style={{ border: '1px solid rgba(255,123,0,0.2)', color: 'var(--accent-orange)', background: 'rgba(255,123,0,0.05)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
