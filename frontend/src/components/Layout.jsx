import React, { useContext } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, Activity, Users, MapPin, BrainCircuit } from 'lucide-react';

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020617', color: '#f8fafc' }}>
      <header style={{ padding: '16px 24px', background: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#38bdf8', fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity /> MediSync
        </Link>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', fontSize: '0.9rem' }}>
          {user?.role === 'doctor' && <Link to="/doctor" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16}/> Provider Portal</Link>}
          {user?.role === 'doctor' && <Link to="/doctor-logs" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16}/> My Appointments</Link>}
          {user?.role !== 'doctor' && <Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Activity size={16}/> Find Doctors</Link>}
          <Link to="/donor" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16}/> Resource Mapping</Link>
          {user?.role !== 'doctor' && <Link to="/companion" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={16}/> Companion Care</Link>}
          <Link to="/ai" style={{ color: '#cbd5e1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}><BrainCircuit size={16}/> AI Orchestrator</Link>
          <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  );
}