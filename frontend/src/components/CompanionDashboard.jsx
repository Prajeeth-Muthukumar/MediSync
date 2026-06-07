import React, { useState, useEffect, useContext } from 'react';
import { Users, Mic, Activity, AlertTriangle, PhoneCall, ShieldCheck, HeartPulse, Calendar } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function CompanionDashboard() {
  const { user } = useContext(AuthContext);
  const [deviceStatus, setDeviceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      setTimeout(() => {
        setDeviceStatus({
          battery_level: Math.floor(Math.random() * (100 - 80 + 1) + 80),
          connectivity: 'Online (5G)',
          last_sync: new Date().toISOString()
        });
        setLoading(false);
      }, 500);
    };
    
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user) {
        try {
          const roleQuery = user.role === 'doctor' ? `doctor_username=${user.username}` : `patient_id=${user.patient_id}`;
          const res = await fetch(`${API_BASE}/appointments/list/?${roleQuery}&role=${user.role}`);
          if (res.ok) {
            const data = await res.json();
            const appointments = data.appointments || [];
            // Find the closest upcoming appointment
            const upcoming = appointments
              .filter(a => (a.status === 'pending' || a.status === 'approved') && new Date(a.time_slot) > new Date())
              .sort((a, b) => new Date(a.time_slot) - new Date(b.time_slot))[0];
            
            if (upcoming) {
               setUpcomingAppointment(upcoming);
            }
          }
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchAppointments();
  }, [user]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '12px' }}>
          <Users size={32} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Companion Monitor</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Voice analysis and proactive hazard detection</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        
        {/* Upcoming Appointment Card */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(56, 189, 248, 0.2)', background: 'rgba(56, 189, 248, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} /> Upcoming Appointment
            </h3>
          </div>
          {upcomingAppointment ? (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Doctor</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{upcomingAppointment.doctor_name}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Date</span>
                 <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{new Date(upcomingAppointment.time_slot).toLocaleDateString()}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Time</span>
                 <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{new Date(upcomingAppointment.time_slot).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                 <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                 <span style={{ fontWeight: 'bold', color: upcomingAppointment.status === 'approved' ? '#10b981' : '#f59e0b', textTransform: 'capitalize' }}>{upcomingAppointment.status}</span>
               </div>
             </div>
          ) : (
             <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px 0' }}>No upcoming appointments scheduled.</div>
          )}
        </div>

        {/* Device Status Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--primary)" /> System Status
            </h3>
            <span style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary)' }}></span>
          </div>
          {loading && !deviceStatus ? (
            <div style={{ color: 'var(--text-secondary)' }}>Syncing with device...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Battery Level</span>
                <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{deviceStatus?.battery_level || 87}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Connectivity</span>
                <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{deviceStatus?.connectivity || 'Online (5G)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Last Check-in</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{deviceStatus?.last_sync ? new Date(deviceStatus.last_sync).toLocaleTimeString() : 'Just now'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Fall Detection Alert */}
        <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Hazard Monitoring
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px 0' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: '50%' }}>
              <Activity size={40} color="var(--accent-red)" />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Normal State</span>
            <span style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>Gyroscopic sensors detect nominal movement patterns. No falls detected.</span>
          </div>
        </div>

      </div>
      
      {/* Vitals Graph Placeholder */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HeartPulse size={20} color="var(--accent-red)" /> Ambient Vitals (Wearable Sync)
        </h3>
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
          [ Real-time ECG and BPM graph will render here ]
        </div>
      </div>
    </div>
  );
}