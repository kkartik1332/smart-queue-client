import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
const [availability, setAvailability] = useState({
  Doctor: true, Bank: true, Pharmacy: true, General: true,
});

const API = 'https://smart-queue-server-aimx.onrender.com/api/queue';
const socket = io('https://smart-queue-server-aimx.onrender.com');

export default function DisplayScreen() {
  const [serving, setServing] = useState({});
  const [queues, setQueues] = useState({});
  const [time, setTime] = useState(new Date());

  const fetchQueue = async () => {
    try {
      const { data } = await axios.get(API);
      const grouped = {};
      const currentlyServing = {};
      ['Doctor','Bank','Pharmacy','General'].forEach(s => {
        grouped[s] = [];
        currentlyServing[s] = null;
      });
      data.forEach(entry => {
        if (entry.position === 0) {
          currentlyServing[entry.service] = entry;
        } else {
          if (!grouped[entry.service]) grouped[entry.service] = [];
          grouped[entry.service].push(entry);
        }
      });
      setServing(currentlyServing);
      setQueues(grouped);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    axios.get(`${API}/availability`).then(({ data }) => setAvailability(data));
socket.on('availability_updated', (data) => setAvailability(data));
    fetchQueue();
    socket.on('queue_updated', fetchQueue);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => {
      socket.off('queue_updated', fetchQueue);
      socket.off('availability_updated');
      clearInterval(timer);
    };
  }, []);

  const SERVICE_CONFIG = {
    Doctor:   { color: '#6366f1', emoji: '🩺' },
    Bank:     { color: '#0ea5e9', emoji: '🏦' },
    Pharmacy: { color: '#10b981', emoji: '💊' },
    General:  { color: '#f59e0b', emoji: '🏢' },
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.hospitalName}>🏥 SmartQueue</div>
          <div style={styles.headerSub}>Digital Queue Display</div>
        </div>
        <div style={styles.clock}>
          {time.toLocaleTimeString()}
        </div>
      </div>

      <div style={styles.grid}>
        {Object.keys(SERVICE_CONFIG).map(s => {
          const cfg = SERVICE_CONFIG[s];
          const nowServing = serving[s];
          const waiting = (queues[s] || []).length;

          return (
            <div key={s} style={{
              ...styles.serviceCard,
              borderTop: `8px solid ${cfg.color}`
            }}>
              <div style={styles.serviceHeader}>
                <span style={styles.serviceEmoji}>{cfg.emoji}</span>
                <span style={{
                  ...styles.serviceName,
                  color: cfg.color
                }}>{s}</span>
              </div>

              <div style={styles.nowServingLabel}>
  {availability[s] ? 'NOW SERVING' : '🔴 UNAVAILABLE'}
</div>

             <div style={{
  ...styles.tokenNumber,
  color: availability[s] ? cfg.color : '#ef4444'
}}>
  {availability[s] ? (nowServing ? nowServing.ticketNo || '---' : '---') : '---'}
</div>

              <div style={styles.patientName}>
                {nowServing ? nowServing.name : 'No one yet'}
              </div>

              <div style={{
                ...styles.waitingBadge,
                background: cfg.color
              }}>
                {waiting} waiting
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.footer}>
        📢 Please wait for your token number to be called
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f172a',
    color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: '#1e293b',
    borderBottom: '2px solid #334155',
  },
  hospitalName: {
    fontSize: 32,
    fontWeight: 800,
    color: '#fff',
  },
  headerSub: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  clock: {
    fontSize: 48,
    fontWeight: 700,
    color: '#6366f1',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 24,
    padding: 32,
    flex: 1,
  },
  serviceCard: {
    background: '#1e293b',
    borderRadius: 20,
    padding: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  serviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  serviceEmoji: { fontSize: 32 },
  serviceName: {
    fontSize: 24,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  nowServingLabel: {
    fontSize: 14,
    color: '#94a3b8',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  tokenNumber: {
    fontSize: 96,
    fontWeight: 900,
    letterSpacing: 4,
    lineHeight: 1,
  },
  patientName: {
    fontSize: 28,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  waitingBadge: {
    padding: '6px 20px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    marginTop: 8,
  },
  footer: {
    textAlign: 'center',
    padding: '20px',
    background: '#1e293b',
    color: '#64748b',
    fontSize: 16,
    letterSpacing: 1,
  },
};