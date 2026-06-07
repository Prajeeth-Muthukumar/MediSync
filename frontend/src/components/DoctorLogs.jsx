import React, { useState, useEffect, useContext } from 'react'
import { FileText, CheckCircle2, Activity, CheckCircle } from 'lucide-react'
import AuthContext from '../context/AuthContext'

const API_BASE = 'http://127.0.0.1:8000/api'

export default function DoctorLogs() {
  const { user } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([])
  


  useEffect(() => {
    const fetchAppts = async () => {
      try {
        const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
        if (apptRes.ok) {
           const apptData = await apptRes.json();
           setAppointments(apptData.appointments || []);
        }
      } catch(e) {}
    }
    fetchAppts()
  }, [user.username])

  const handleCompleteAppointment = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/appointments/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id, status: 'completed' })
      });
      if (res.ok) {
         const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
         const apptData = await apptRes.json();
         setAppointments(apptData.appointments || []);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '24px' }}>
      
      <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Activity size={24} color="#0ea5e9" /> Manage Appointments
          </h2>
          
          <h4 style={{ fontSize: '0.95rem', color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#fbbf24" /> To Be Done (Active Appointments)
          </h4>
          {appointments.filter(a => a.status === 'approved').length === 0 ? (
             <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>No active appointments.</div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {appointments.filter(a => a.status === 'approved').map(appt => (
                   <div key={appt._id} className="glass-panel" style={{ background: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid #fbbf24', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ color: '#fff' }}>{appt.patient_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Slot: {new Date(appt.time_slot).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', fontSize: '0.75rem' }}>
                           {appt.status.toUpperCase()}
                        </span>
                        <button onClick={() => handleCompleteAppointment(appt._id)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981' }}>
                           Mark Completed
                        </button>
                      </div>
                   </div>
                ))}
             </div>
          )}

          <h4 style={{ fontSize: '0.95rem', color: '#e2e8f0', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} color="#10b981" /> Completed Appointments
          </h4>
          {appointments.filter(a => a.status === 'completed').length === 0 ? (
             <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No completed appointments.</div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {appointments.filter(a => a.status === 'completed').map(appt => (
                   <div key={appt._id} className="glass-panel" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                      <div>
                        <strong style={{ color: '#fff', textDecoration: 'line-through' }}>{appt.patient_name}</strong>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>Slot: {new Date(appt.time_slot).toLocaleString()}</div>
                      </div>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1', fontSize: '0.75rem' }}>
                         COMPLETED
                      </span>
                   </div>
                ))}
             </div>
          )}
      </div>
      </div>
  )
}