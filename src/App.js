import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Clock, ChevronRight, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { io } from 'socket.io-client';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DisplayScreen from './DisplayScreen';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://smart-queue-server-aimx.onrender.com';
const API = `${API_BASE_URL}/api/queue`;
const socket = io(API_BASE_URL);
const styles = {
  card: { padding: 20, background: 'white', borderRadius: 16, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  input: { padding: '10px 16px', borderRadius: 8, border: '1px solid #e2e8f0', flex: 1 },
  btn: { padding: '10px 20px', borderRadius: 8, background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 },
  ticketCard: {
    marginTop: 16, padding: 20,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    borderRadius: 16, textAlign: 'center',
    color: '#fff', fontSize: 14
  },
  ticketNumber: {
    fontSize: 48, fontWeight: 800,
    letterSpacing: 4, margin: '8px 0'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0,
    width: '100%', height: '100%',
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    width: 320,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  }
};

const SERVICE_CONFIG = {
  Doctor: { color: 'var(--color-doctor)', bg: 'var(--bg-doctor)', emoji: '🩺' },
  Bank: { color: 'var(--color-bank)', bg: 'var(--bg-bank)', emoji: '🏦' },
  Pharmacy: { color: 'var(--color-pharmacy)', bg: 'var(--bg-pharmacy)', emoji: '💊' },
  General: { color: 'var(--color-general)', bg: 'var(--bg-general)', emoji: '🏢' },
};

const WAIT_PER_PERSON = 5; // minutes

function MainApp() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [myTicket, setMyTicket] = useState(null);
  const [password, setPassword] = useState('');


  
  const login = async () => {
  try {
    const { data } = await axios.post(
      'https://smart-queue-server-aimx.onrender.com/api/auth/login',
      { password }
    );
    localStorage.setItem('token', data.token);
    setIsAdmin(true);
    setShowLogin(false);
    setPassword('');
  } catch {
    alert('Wrong password!');
    setPassword('');
  }
};
  const [queues, setQueues] = useState({});
  const [name, setName] = useState('');
  const [service, setService] = useState('Doctor');
  const [serving, setServing] = useState({});
  const [loading, setLoading] = useState(false);
  const [joinedId, setJoinedId] = useState(null);
  const [activeTab, setActiveTab] = useState('Doctor');

const [availability, setAvailability] = useState({
  Doctor: true, Bank: true, Pharmacy: true, General: true,
});

useEffect(() => {
  axios.get(`${API}/availability`).then(({ data }) => setAvailability(data));
  socket.on('availability_updated', (data) => setAvailability(data));
  return () => socket.off('availability_updated');}, []);
  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await axios.get(API);
      // Group by service
      const grouped = {};
      const currentlyServing = {};
      Object.keys(SERVICE_CONFIG).forEach(s => {
        grouped[s] = [];
        currentlyServing[s] = null;
      });
      data.forEach(entry => {
        if (!grouped[entry.service]) grouped[entry.service] = [];
        if (entry.position === 0) currentlyServing[entry.service] = entry;
        else grouped[entry.service].push(entry);
      });
      Object.keys(grouped).forEach(s =>
        grouped[s].sort((a, b) => a.position - b.position)
      );
      setQueues(grouped);
      setServing(currentlyServing);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    socket.on('queue_updated', fetchQueue);
    return () => socket.off('queue_updated', fetchQueue);
  }, [fetchQueue]);

  const joinQueue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post(API, { name, service });
      setJoinedId(data._id);
      setMyTicket(data.ticketNo);
      setName('');
      fetchQueue();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const toggleAvailability = async (svc) => {
    const newValue = !availability[svc];
    try {
      await axios.post(`${API}/availability`, { service: svc, value: newValue });
      setAvailability(prev => ({
        ...prev,
        [svc]: newValue
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to update availability');
    }
  };
  const playBeep = () => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + 0.5);
};

  const callNext = async (svc) => {
    playBeep();
    try {
      await axios.post(`${API}/next`, { service: svc });
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const cancelEntry = async (id) => {
    try {
      await axios.delete(`${API}/${id}`);
      if (joinedId === id) setJoinedId(null);
      fetchQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const waitTime = (position) => `~${(position - 1) * WAIT_PER_PERSON} min`;

  return (
    <div className="page-container">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo-wrapper">
            <div className="logo-icon">
              <Users size={28} />
            </div>
            <span className="logo-text">SmartQueue</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12}}>
            {showLogout && (
  <div style={styles.modalOverlay}>
    <div style={styles.modalCard}>
      <h3 style={{marginBottom: 8, fontSize: 18, fontWeight: 700}}>
        🔓 Logout
      </h3>
      <p style={{marginBottom: 20, color: '#6b7280', fontSize: 14}}>
        Are you sure you want to logout?
      </p>
      <div style={{display:'flex', gap:8}}>
        <button
          style={{...styles.btn, flex:1, background:'#ef4444'}}
          onClick={() => {
            setIsAdmin(false);
            localStorage.removeItem('token');
            setShowLogout(false);
          }}
        >
          Yes Logout
        </button>
        <button
          onClick={() => setShowLogout(false)}
          style={{
            flex:1, padding:'10px 20px',
            background:'#f3f4f6',
            border:'none', borderRadius:10,
            cursor:'pointer', fontWeight:600
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
          {/* Admin Login Popup */}
{showLogin && (
  <div style={styles.modalOverlay}>
    <div style={styles.modalCard}>
      <h3 style={{marginBottom: 16, fontSize: 18, fontWeight: 700}}>
        🔐 Staff Login
      </h3>
      <input
        type="password"
        placeholder="Enter staff password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && login()}
        style={{...styles.input, marginBottom: 12, width: '100%'}}
      />
      <div style={{display:'flex', gap:8}}>
        <button
          style={{...styles.btn, flex:1}}
          onClick={login}
        >
          Login
        </button>
        <button
          onClick={() => setShowLogin(false)}
          style={{
            flex:1, padding:'10px 20px',
            background:'#f3f4f6',
            border:'none', borderRadius:10,
            cursor:'pointer', fontWeight:600
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
  <span style={styles.headerSub}>
    Real-time Queue Management
  </span>
  {!isAdmin ? (
    <button
      onClick={() => setShowLogin(true)}
      style={{
        background: 'rgba(255,255,255,0.1)',
        border: 'none',
        color: 'rgba(255,255,255,0.3)',
        padding: '6px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 18
      }}
      title="Staff Login"
    >
      ⚙️
    </button>
  ) : (
    <button
      onClick={() => setShowLogout(true)}
      style={{
        background: 'rgba(255,255,255,0.2)',
        border: 'none',
        color: '#fff',
        padding: '6px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: 600
      }}
    >
      🔓 Logout
    </button>
  )}
</div>
        </div>
      </header>

      <main className="main-container">
        
        
        {/* Join Card */}
        <div className="glass-card">
          <h2 className="card-title">Join a Queue</h2>
          <div className="join-form">
            <input
              className="input-field"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && joinQueue()}
            />
            <select
              className="select-field"
              value={service}
              onChange={e => setService(e.target.value)}
            >
              {Object.keys(SERVICE_CONFIG).map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button
  className="btn-primary"
  onClick={joinQueue}
  disabled={loading || !availability[service]}
>
  {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> 
  : !availability[service] ? '🔴 Unavailable' : 'Join Queue'}
</button>
          </div>
          <AnimatePresence>
            {joinedId && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="success-banner"
              >
                <CheckCircle size={20} /> You're in the queue!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {myTicket && (
          <div style={styles.ticketCard}>
            🎟️ Your Ticket Number
            <div style={styles.ticketNumber}>{myTicket}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Please wait for your number to be called
            </div>
          </div>
        )}

        {/* Service Tabs */}
        <div className="tabs-container">
          {Object.keys(SERVICE_CONFIG).map(s => {
            const cfg = SERVICE_CONFIG[s];
            const isActive = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`tab-btn ${isActive ? 'active' : ''} ${!availability[s] ? 'tab-disabled' : ''}`}
                style={isActive ? { color: cfg.color } : {}}
              >
                {cfg.emoji} {s}
                <span className="tab-badge">
                  {(queues[s] || []).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Service Panel */}
        <AnimatePresence mode="wait">
          {Object.keys(SERVICE_CONFIG).map(s => {
            if (s !== activeTab) return null;
            const cfg = SERVICE_CONFIG[s];
            const list = queues[s] || [];
            const nowServing = serving[s];

            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
              >
                {/* Now Serving */}
                <div className="serving-card" style={{ borderColor: cfg.color, color: cfg.color }}>
                  <div className="serving-header">
                    <div className="serving-label">
                      {cfg.emoji} Now Serving — {s}
                    </div>
                  </div>
                  <div className="serving-content">
                    {nowServing ? (
                      <div className="serving-name">{nowServing.name}</div>
                    ) : (
                      <div className="serving-empty">No one being served yet</div>
                    )}
                   {isAdmin && (
  <div style={{ display: 'flex', gap: 8 }}>
    <button
      className="btn-next"
      style={{ background: cfg.color }}
      onClick={() => callNext(s)}
    >
      Call Next <ChevronRight size={16} />
    </button>
    <button
      onClick={() => toggleAvailability(s)}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        background: availability[s] ? '#fee2e2' : '#dcfce7',
        color: availability[s] ? '#ef4444' : '#16a34a',
      }}
    >
      {availability[s] ? '🔴 Mark Unavailable' : '🟢 Mark Available'}
    </button>
  </div>
)}
                  </div>
                </div>

                {/* Queue List */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 className="card-title">
                    Queue List
                    <span className="badge">
                      {list.length} waiting
                    </span>
                  </h3>

                  {list.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state">
                      Queue is empty 🎉
                    </motion.div>
                  ) : (
                    <motion.div layout className="queue-list">
                      <AnimatePresence>
                        {list.map((entry) => (
                          <motion.div
                            layout
                            key={entry._id}
                            initial={{ opacity: 0, scale: 0.95, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95, x: 20 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="queue-item"
                            style={{
                              background: entry._id === joinedId ? cfg.bg : '#fff',
                              borderLeftColor: entry._id === joinedId ? cfg.color : 'transparent',
                            }}
                          >
                            <div className="queue-pos" style={{ background: cfg.color }}>
                              #{entry.position}
                            </div>
                            <div className="queue-info">
                              <div className="queue-name">
                                {entry.name}
                                {entry._id === joinedId &&
                                  <span className="you-badge">You</span>}
                              </div>
                              <div className="queue-meta">
                                <Clock size={14} /> {waitTime(entry.position)} wait
                              </div>
                            </div>
                            {isAdmin && (
                              <button
                                className="btn-delete"
                                onClick={() => cancelEntry(entry._id)}
                                title="Cancel"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/display" element={<DisplayScreen />} />
      </Routes>
    </BrowserRouter>
  );
}