import React, { useState, useContext } from 'react';
import { CheckCircle, AlertCircle, Activity, Stethoscope, User, ArrowRight } from 'lucide-react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState('login'); // 'login', 'register_doctor', 'register_patient'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
    const [usualStart, setUsualStart] = useState('09:00');
    const [usualEnd, setUsualEnd] = useState('17:00');
  
  // Doctor specific fields
  const [specialty, setSpecialty] = useState('');
  const [npiLicense, setNpiLicense] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
        setError("Please enter all required fields.");
        return;
    }
    setLoading(true);
    setError("");

    try {
      let endpoint = '';
      let payload = {};

      if (authMode === 'login') {
          endpoint = '/auth/login/';
          payload = { username, password };
      } else if (authMode === 'register_patient') {
          endpoint = '/auth/register-patient/';
          payload = { username, password, name, gender, birth_date: birthDate, blood_group: bloodGroup, weight, height, telecom: '', address: '' };
      } else if (authMode === 'register_doctor') {
          endpoint = '/auth/register-doctor/';
          payload = { username, password, name, specialty, license_number: npiLicense, usual_start: usualStart, usual_end: usualEnd };
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
          login(data.user);
          if (data.user.role === 'doctor') {
              navigate('/doctor');
          } else {
              navigate('/');
          }
      } else {
          setError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setError("An error occurred connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#020617', padding: '20px' }}>
      <div style={{ padding: '40px', width: '100%', maxWidth: '450px', background: '#0f172a', borderRadius: '16px', color: '#fff', border: '1px solid #1e293b', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
        
        {/* Logo Section */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={32} color="#38bdf8" />
          </div>
        </div>
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.75rem', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          MediSync
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '32px', color: '#94a3b8', fontSize: '0.95rem' }}>
          {authMode === 'login' ? 'Secure Unified Health Platform' : 'Join the Interoperable Network'}
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '3px solid #ef4444', padding: '12px', marginBottom: '20px', borderRadius: '4px', fontSize: '0.85rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Tab Selection */}
        <div style={{ display: 'flex', background: '#1e293b', padding: '4px', borderRadius: '8px', marginBottom: '24px' }}>
          <button 
            onClick={() => setAuthMode('login')}
            style={{ flex: 1, padding: '10px', background: authMode === 'login' ? '#38bdf8' : 'transparent', color: authMode === 'login' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Login
          </button>
          <button 
            onClick={() => setAuthMode('register_patient')}
            style={{ flex: 1, padding: '10px', background: authMode === 'register_patient' ? '#38bdf8' : 'transparent', color: authMode === 'register_patient' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
          >
            <User size={14}/> Patient
          </button>
          <button 
            onClick={() => setAuthMode('register_doctor')}
            style={{ flex: 1, padding: '10px', background: authMode === 'register_doctor' ? '#38bdf8' : 'transparent', color: authMode === 'register_doctor' ? '#0f172a' : '#cbd5e1', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
          >
            <Stethoscope size={14}/> Provider
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {authMode !== 'login' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Full Name</label>
              <input 
                required
                placeholder="e.g. John Doe"
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Username</label>
            <input 
              required
              placeholder="e.g. jdoe99"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Password</label>
            <input 
              required
              type="password"
              placeholder="••••••••"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
            />
          </div>

          {authMode === 'register_doctor' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>Medical Specialization / Domain</label>
                <input 
                  required
                  placeholder="e.g. Cardiology"
                  value={specialty} 
                  onChange={(e) => setSpecialty(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>NPI / Medical License Number</label>
                <input 
                  required
                  placeholder="e.g. 1234567890"
                  value={npiLicense} 
                  onChange={(e) => setNpiLicense(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff', outline: 'none' }}
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '12px', 
              padding: '14px', 
              background: '#38bdf8', 
              color: '#0f172a', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', 
              fontSize: '1rem', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Authenticating...' : (authMode === 'login' ? 'Sign In to Portal' : 'Create Account')} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}