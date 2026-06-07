import React, { useState, useRef, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { Bot, Send, User, Sparkles, BrainCircuit, Activity } from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/ai';

export default function AiAssistant() {
  const { user } = useContext(AuthContext);
  const isDoctor = user?.role === 'doctor';
  const initialMsg = isDoctor 
    ? `Hello Dr. ${user?.name || ''}! I am your Clinical AI Assistant. I can help analyze literature, and remind you of your work hours. How can I assist you?`
    : 'Hello! I am your MediSync Health AI. I can suggest health tips, find doctors, and estimate costs. How can I help you today?';

  const [messages, setMessages] = useState([
    { role: 'assistant', text: initialMsg }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (isDoctor && (input.toLowerCase().includes('schedule') || input.toLowerCase().includes('hours'))) {
      const hrMsg = 'Based on your profile, your registered work blocks are usually 09:00 - 12:00 and 15:00 - 17:00. Make sure to review your dashboard for live updates!';
      setMessages(prev => [...prev, { role: 'user', text: input }, { role: 'assistant', text: hrMsg }]);
      setInput('');
      return;
    }

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMsg, patient_id: "P-1001" })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', text: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: "I'm sorry, I'm having trouble connecting to the AI core right now." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Network error while reaching the AI core." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ padding: '20px 24px', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '12px' }}>
          <BrainCircuit size={28} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>AI Orchestrator</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={12}/> Intelligent Health Triage</p>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            {msg.role === 'assistant' && (
              <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
                <Bot size={20} color="var(--primary)" />
              </div>
            )}
            
            <div style={{ 
              background: msg.role === 'user' ? 'var(--primary)' : 'rgba(0,0,0,0.2)', 
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
              padding: '16px', 
              borderRadius: '16px',
              borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
              borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.05)' : 'none',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              lineHeight: '1.5'
            }}>
              {msg.text}
            </div>

            {msg.role === 'user' && (
              <div style={{ background: 'var(--accent-blue)', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
                <User size={20} color="#fff" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
              <Activity size={20} color="var(--primary)" />
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', borderTopLeftRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              Analyzing medical context...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about symptoms, insurance coverage, or local specialists..."
          style={{ flex: 1, padding: '16px 20px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.5)', color: 'var(--text-primary)', outline: 'none', fontSize: '1rem' }}
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '50%', width: '54px', height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer', opacity: (!input.trim() || loading) ? 0.5 : 1, transition: 'all 0.2s' }}
        >
          <Send size={24} />
        </button>
      </form>
    </div>
  );
}