import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Calendar, Clock, ArrowLeft, Star, Award, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { Edit3, Save } from 'lucide-react';
import AuthContext from '../context/AuthContext';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api';

export default function DoctorProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [credInput, setCredInput] = useState('');
  const [clinicAddressInput, setClinicAddressInput] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (doctor) {
      setBioInput(doctor.bio || '');
      setCredInput(doctor.credentials || '');
    }
  }, [doctor]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/doctors/profile/update/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          bio: bioInput,
          credentials: credInput,
          clinic_address: clinicAddressInput,
          usual_start: startInput,
          usual_end: endInput,
          clinic_lat: doctor.clinic_lat || (40.7128 + (Math.random() * 0.2 - 0.1)),
          clinic_lng: doctor.clinic_lng || (-74.0060 + (Math.random() * 0.2 - 0.1))
        })
      });
      if (res.ok) {
        setDoctor({ ...doctor, bio: bioInput, credentials: credInput, clinic_address: clinicAddressInput, usual_start: startInput, usual_end: endInput });
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingProfile(false);
    }
  };

  const [confirmingSlot, setConfirmingSlot] = useState(null);

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      try {
        const res = await fetch(`${API_BASE}/doctors/list/`);
        if (res.ok) {
          const data = await res.json();
          const dr = data.doctors.find(d => d.username === username);
          setDoctor(dr);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDoctorInfo();
  }, [username]);

  useEffect(() => {
    if (doctor) {
       const fetchSlots = async () => {
         try {
           const patientParam = user ? `&patient_id=${user.patient_id || user.username}` : '';
           const res = await fetch(`${API_BASE}/appointments/slots/?doctor_username=${doctor.username}&date=${slotDate}${patientParam}`);
           if (res.ok) {
             const data = await res.json();
             setDoctorSlots(data.slots || []);
           }
         } catch(e) {}
       };
       fetchSlots();
    }
  }, [doctor, slotDate]);

  const handleBookSlot = async (slot) => {
    if (slot.remaining <= 0) return;
    setBookingLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`${API_BASE}/appointments/book/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.patient_id || user.username,
          doctor_username: doctor.username,
          time_slot: slot.slot_prefix + ':00:00Z'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Appointment securely booked! It is pending approval.' });
        const patientParam = user ? `&patient_id=${user.patient_id || user.username}` : '';
        const resSlots = await fetch(`${API_BASE}/appointments/slots/?doctor_username=${doctor.username}&date=${slotDate}${patientParam}`);
        if (resSlots.ok) {
           const slotData = await resSlots.json();
           setDoctorSlots(slotData.slots || []);
        }
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to book.' });
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#cbd5e1', textAlign: 'center' }}>Loading provider profile...</div>;
  }

  if (!doctor) {
    return <div style={{ padding: '40px', color: '#ef4444', textAlign: 'center' }}>Provider not found.</div>;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '30px' }} className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', width: 'fit-content' }}>
          <ArrowLeft size={16} /> Back
        </button>
        {user && user.username === doctor.username && (
          <button onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)} disabled={savingProfile} className={isEditing ? "btn-primary" : "btn-secondary"} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             {isEditing ? <><Save size={16} /> {savingProfile ? 'Saving...' : 'Save Profile'}</> : <><Edit3 size={16} /> Edit Profile</>}
          </button>
        )}
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
         <div style={{ height: '180px', background: 'linear-gradient(135deg, #0f172a 0%, #0284c7 100%)', position: 'relative' }}></div>
         
         <div style={{ padding: '0 40px 40px 40px', position: 'relative' }}>
            <div style={{ 
               width: '120px', height: '120px', borderRadius: '50%', background: '#1e293b', 
               border: '4px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center',
               position: 'absolute', top: '-60px', left: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
               <User size={60} color="#38bdf8" />
            </div>

            <div style={{ marginLeft: '140px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
               <div>
                  <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                     {doctor.name}
                     <ShieldCheck size={24} color="#10b981" title="Verified Provider" />
                  </h1>
                  <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#38bdf8', fontWeight: 500 }}>
                     {doctor.specialty}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', color: '#94a3b8', fontSize: '0.9rem' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Award size={16}/> Board Certified</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Star size={16} color="#fbbf24"/> 4.9/5 Average Rating</span>
                     {doctor.total_appointments && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}><Users size={16}/> {doctor.total_appointments} Appointments</span>
                     )}
                  </div>
               </div>
               
               <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>National Provider Identifier</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#e2e8f0' }}>{doctor.license_number}</div>
               </div>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="glass-panel" style={{ padding: '30px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', margin: 0 }}>About</h3>
               </div>
               {isEditing ? (
                  <textarea 
                    className="form-input" 
                    value={bioInput} 
                    onChange={e => setBioInput(e.target.value)} 
                    style={{ minHeight: '150px', width: '100%', resize: 'vertical' }}
                  />
               ) : (
                  <p style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                    {doctor.bio ? doctor.bio : `${doctor.name} is a highly respected specialist in ${doctor.specialty} with a dedication to patient-centered care. They combine evidence-based practices with a compassionate approach to ensure the best health outcomes.`}
                  </p>
               )}
            </div>
            
            <div className="glass-panel" style={{ padding: '30px' }}>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', color: '#f8fafc' }}>Credentials & Highlights</h3>
               {isEditing ? (
                  <textarea 
                    className="form-input" 
                    value={credInput} 
                    onChange={e => setCredInput(e.target.value)} 
                    placeholder="Enter credentials on separate lines"
                    style={{ minHeight: '150px', width: '100%', resize: 'vertical' }}
                  />
               ) : (
                  <ul style={{ color: '#cbd5e1', lineHeight: '1.8', fontSize: '0.95rem', paddingLeft: '20px' }}>
                    {doctor.credentials ? (
                      doctor.credentials.split('\n').filter(c => c.trim()).map((cred, idx) => (
                         <li key={idx}>{cred}</li>
                      ))
                    ) : (
                      <>
                        <li>Graduated with honors from a top-tier medical institution.</li>
                        <li>Completed rigorous residency training in {doctor.specialty}.</li>
                        <li>Active member of the National Medical Council.</li>
                      </>
                    )}
                  </ul>
               )}
            </div>


            <div className="glass-panel" style={{ padding: '30px' }}>
               <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '20px', color: '#f8fafc' }}>Clinic Details & Timings</h3>
               {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                     <div>
                       <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Primary Clinic Address</label>
                       <input type="text" className="form-input" value={clinicAddressInput} onChange={e => setClinicAddressInput(e.target.value)} placeholder="123 Health Ave..." />
                     </div>
                     <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Usual Start Time</label>
                          <input type="time" className="form-input" value={startInput} onChange={e => setStartInput(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Usual End Time</label>
                          <input type="time" className="form-input" value={endInput} onChange={e => setEndInput(e.target.value)} />
                        </div>
                     </div>
                  </div>
               ) : (
                  <div style={{ color: '#cbd5e1', fontSize: '0.95rem' }}>
                    {doctor.telecom && (
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>Contact Number:</span> {doctor.telecom}
                    </div>
                    )}
                    <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>Address:</span> {doctor.clinic_address || 'Address not provided'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>Timings:</span> 
                       {doctor.usual_start || '09:00'} - {doctor.usual_end || '17:00'} (Daily)
                    </div>
                  </div>
               )}
            </div>
         </div>

         {true && (
           <div className="glass-panel" style={{ padding: '30px', position: 'sticky', top: '20px', alignSelf: 'start', borderTop: '4px solid #38bdf8' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '8px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} color="#38bdf8" /> Book Appointment
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '20px' }}>Select an available time slot to request a consultation.</p>
              
              {actionMessage && (
                <div style={{ 
                  padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px',
                  background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  color: actionMessage.type === 'success' ? '#34d399' : '#f87171'
                }}>
                  {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {actionMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                 <button onClick={() => setSlotDate(new Date().toISOString().split('T')[0])} className="btn-secondary" style={{ flex: 1, background: slotDate === new Date().toISOString().split('T')[0] ? 'rgba(14, 165, 233, 0.2)' : 'transparent', color: slotDate === new Date().toISOString().split('T')[0] ? '#38bdf8' : '#cbd5e1' }}>Today</button>
                 <button onClick={() => {
                    const tmrw = new Date(); tmrw.setDate(tmrw.getDate() + 1);
                    setSlotDate(tmrw.toISOString().split('T')[0]);
                 }} className="btn-secondary" style={{ flex: 1, background: slotDate !== new Date().toISOString().split('T')[0] ? 'rgba(14, 165, 233, 0.2)' : 'transparent', color: slotDate !== new Date().toISOString().split('T')[0] ? '#38bdf8' : '#cbd5e1' }}>Tomorrow</button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
                 {doctorSlots.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No slots available for this date.</div>
                 ) : (
                    doctorSlots.map(slot => (
                       <div key={slot.start_time} style={{ 
                         padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', 
                         display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                         border: '1px solid rgba(255,255,255,0.05)'
                       }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {slot.start_time} - {slot.end_time}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: slot.remaining > 0 ? '#10b981' : '#ef4444' }}>
                               {slot.remaining} {slot.remaining === 1 ? 'slot' : 'slots'} available
                            </div>
                          </div>
                          
                          {slot.user_status === 'pending' ? (
                            <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                              Pending
                            </div>
                          ) : slot.user_status === 'approved' ? (
                            <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                              Approved
                            </div>
                          ) : confirmingSlot && confirmingSlot.slot_prefix === slot.slot_prefix ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                               <button onClick={() => setConfirmingSlot(null)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.8rem' }}>Cancel</button>
                               <button onClick={() => { setConfirmingSlot(null); handleBookSlot(slot); }} className="btn-primary" disabled={bookingLoading} style={{ padding: '6px 10px', fontSize: '0.8rem', background: '#10b981', color: '#fff' }}>
                                 {bookingLoading ? '...' : 'Confirm'}
                               </button>
                            </div>
                          ) : slot.remaining <= 0 ? (
                            <div style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                              Full
                            </div>
                          ) : (
                            <button 
                              className="btn-primary" 
                              disabled={bookingLoading} 
                              onClick={() => {
                                if (!user) {
                                   setActionMessage({ type: 'error', text: 'You must be logged in to book an appointment.' });
                                   return;
                                }
                                if (user.username === doctor.username) {
                                   setActionMessage({ type: 'error', text: 'You cannot book an appointment with yourself.' });
                                   return;
                                }
                                setConfirmingSlot(slot);
                              }}
                              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                            >
                               Book Slot
                            </button>
                          )}
                       </div>
))
                 )}
              </div>
           </div>
         )}
      </div>

      {confirmingSlot && (
         <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '24px', textAlign: 'center' }}>
               <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#f8fafc' }}>Confirm Appointment</h3>
               <p style={{ color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.6' }}>
                  Are you sure you want to book an appointment with <strong>Dr. {doctor.name.replace('Dr. ', '')}</strong> on <strong style={{color:'#38bdf8'}}>{slotDate}</strong> from <strong style={{color:'#38bdf8'}}>{confirmingSlot.start_time}</strong> to <strong style={{color:'#38bdf8'}}>{confirmingSlot.end_time}</strong>?
               </p>
               <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button onClick={() => { handleBookSlot(confirmingSlot); setConfirmingSlot(null); }} className="btn-primary" style={{ padding: '8px 24px', flex: 1, justifyContent: 'center' }}>
                     Yes, Book it
                  </button>
                  <button onClick={() => setConfirmingSlot(null)} className="btn-secondary" style={{ padding: '8px 24px', flex: 1, justifyContent: 'center' }}>
                     Cancel
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
