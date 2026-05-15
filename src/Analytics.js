import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://smart-queue-server-aimx.onrender.com';
const API = `${API_BASE_URL}/api/queue`;

const SERVICE_CONFIG = {
  Doctor:   { color: '#6366f1', emoji: '🩺' },
  Bank:     { color: '#0ea5e9', emoji: '🏦' },
  Pharmacy: { color: '#10b981', emoji: '💊' },
  General:  { color: '#f59e0b', emoji: '🏢' },
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/analytics`).then(({ data }) => setData(data));
  }, []);

  if (!data) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24 }}>
      Loading analytics...
    </div>
  );

  const busiestHour = Object.entries(data.hourCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#4f46e5', padding: '20px 32px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>📊 Analytics Dashboard</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>Today's Queue Summary</div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          ← Back
        </button>
      </div>

      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#4f46e5' }}>{data.totalServedToday}</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Total Served Today</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#10b981' }}>
              {busiestHour ? `${busiestHour[0]}:00` : '--'}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Busiest Hour</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#f59e0b' }}>
              {Object.keys(SERVICE_CONFIG).length}
            </div>
            <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Active Services</div>
          </div>
        </div>

        {/* Per Service */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Served Per Service</h3>
          {Object.keys(SERVICE_CONFIG).map(s => {
            const cfg = SERVICE_CONFIG[s];
            const count = data.totalPerService[s] || 0;
            const max = Math.max(...Object.values(data.totalPerService), 1);
            return (
              <div key={s} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600 }}>{cfg.emoji} {s}</span>
                  <span style={{ fontWeight: 700, color: cfg.color }}>{count} served</span>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 8, height: 12 }}>
                  <div style={{
                    width: `${(count / max) * 100}%`,
                    background: cfg.color,
                    height: 12,
                    borderRadius: 8,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent History */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>Recent Patient History</h3>
          {data.history.length === 0 ? (
            <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>No patients served yet today</div>
          ) : (
            [...data.history].reverse().slice(0, 20).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ background: SERVICE_CONFIG[h.service]?.color, color: '#fff', borderRadius: 8, padding: '4px 10px', fontSize: 13, fontWeight: 700 }}>
                  {h.ticketNo}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{h.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{h.service}</div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {new Date(h.servedAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}