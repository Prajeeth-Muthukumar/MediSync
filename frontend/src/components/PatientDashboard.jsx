import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, User, ShieldCheck, Lock, Unlock, Search, CheckCircle2, AlertCircle, RefreshCw, Activity, MapPin, Phone } from 'lucide-react'
import RodOfAsclepius from './RodOfAsclepius'
import AuthContext from '../context/AuthContext'

const API_BASE = 'http://127.0.0.1:8000/api'

function PatientDashboard() {
  const { user, logout: onLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  
  useEffect(() => {
    if (user && user.role === 'patient') {
       const fetchNotifs = async () => {
          try {
             const res = await fetch(`${API_BASE}/notifications/list/?patient_id=${user.patient_id}`)
             if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications || [])
             }
          } catch(e) {}
       }
       fetchNotifs()
    }
  }, [user])
  
  const handleMarkRead = async (id) => {
     try {
       await fetch(`${API_BASE}/notifications/read/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notification_id: id })
       })
       setNotifications(notifications.filter(n => n._id !== id))
     } catch(e) {}
  }

  useEffect(() => {
    if (user?.role === 'doctor') {
      navigate('/doctor');
    }
  }, [user, navigate]);
  const [doctorsList, setDoctorsList] = useState([])
  
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [actionMessage, setActionMessage] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState(null)
  const [doctorSlots, setDoctorSlots] = useState([])
  const [notifications, setNotifications] = useState([])
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0])
  const [bookingLoading, setBookingLoading] = useState(false)
  
  const [appointments, setAppointments] = useState([])
  
  // Geolocation and filtering state
  const [specialtyFilter, setSpecialtyFilter] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [calculatingLocation, setCalculatingLocation] = useState(false)


  useEffect(() => {
    fetchDoctorsAndConsents()
    // eslint-disable-next-line
  }, [])

  const fetchDoctorsAndConsents = async () => {
    setLoadingDoctors(true)
    try {
      
      const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=patient`)
      if (apptRes.ok) {
        const apptData = await apptRes.json()
        setAppointments(apptData.appointments || [])
      }

      const res = await fetch(`${API_BASE}/doctors/list/?patient_id=${user.patient_id}`)
      const data = await res.json()
      
      if (res.ok) {
        const doctors = data.doctors || []
        setDoctorsList(doctors)


      }
    } catch (err) {
      console.error('Error fetching doctors/consents:', err)
    } finally {
      setLoadingDoctors(false)
    }
  }


  
  
  useEffect(() => {
    if (selectedDoctorForBooking) {
       const fetchSlots = async () => {
         try {
           const res = await fetch(`${API_BASE}/appointments/slots/?doctor_username=${selectedDoctorForBooking.username}&date=${slotDate}`)
           if (res.ok) {
             const data = await res.json()
             setDoctorSlots(data.slots || [])
           }
         } catch(e) {}
       }
       fetchSlots()
    }
  }, [selectedDoctorForBooking, slotDate])

  const handleViewSlots = (dr) => {
    navigate('/profile/' + dr.username)
  }


  const handleBookSlot = async (slot) => {
    if (slot.remaining <= 0) return;
    setBookingLoading(true)
    try {
      const res = await fetch(`${API_BASE}/appointments/book/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.patient_id,
          doctor_username: selectedDoctorForBooking.username,
          time_slot: slot.slot_prefix + ':00:00Z'
        })
      })
      const data = await res.json()
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Appointment securely booked!' })
        setSelectedDoctorForBooking(null)
      } else {
        setActionMessage({ type: 'error', text: data.error || 'Failed to book.' })
      }
    } catch (e) {
      setActionMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setBookingLoading(false)
    }
  }

  
  const getUniqueSpecialties = () => {
    const specialties = new Set(doctorsList.map(dr => dr.specialty).filter(Boolean));
    return Array.from(specialties).sort();
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // Radius of earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      0.5 - Math.cos(dLat)/2 + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      (1 - Math.cos(dLon))/2;
    return R * 2 * Math.asin(Math.sqrt(a));
  };

  const handleFindClosest = () => {
    setCalculatingLocation(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setCalculatingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setCalculatingLocation(false);
      },
      (error) => {
        setLocationError("Unable to retrieve your location");
        setCalculatingLocation(false);
      }
    );
  };


  const filteredDoctors = doctorsList.filter(dr => {
    const matchesSearch = 
      (dr.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
      (dr.username || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (dr.specialty && dr.specialty.toLowerCase().includes((searchQuery || '').toLowerCase()));
    
    const matchesSpecialty = specialtyFilter === '' || dr.specialty === specialtyFilter;
    
    return matchesSearch && matchesSpecialty;
  }).map(dr => {
    if (userLocation && dr.clinic_lat && dr.clinic_lng) {
      return { ...dr, distance: calculateDistance(userLocation.lat, userLocation.lng, dr.clinic_lat, dr.clinic_lng) };
    }
    return dr;
  }).sort((a, b) => {
    if (userLocation) {
       const distA = a.distance ?? 999999;
       const distB = b.distance ?? 999999;
       return distA - distB;
    }
    return 0;
  });


  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 40px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        background: 'rgba(30, 41, 59, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="pulse-glow" style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '8px', 
            background: 'rgba(56, 189, 248, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RodOfAsclepius size={22} color="#38bdf8" className="animate-heart-pulse" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Find Doctors & Manage Access</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Welcome back, <strong>{user.name}</strong> • ID: {user.patient_id}
            </span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {actionMessage && (
          <div className="animate-fade-in" style={{ 
            padding: '16px', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
            color: actionMessage.type === 'success' ? '#34d399' : '#f87171'
          }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {actionMessage.text}
          </div>
        )}

        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#38bdf8" /> Upcoming Appointments
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {appointments.filter(a => a.status === 'approved' || a.status === 'pending').length > 0 ? (
              appointments.filter(a => a.status === 'approved' || a.status === 'pending').map(appt => {
                const dateObj = new Date(appt.time_slot);
                const isToday = dateObj.toDateString() === new Date().toDateString();
                return (
                  <div key={appt._id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                     <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div>
                         <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f8fafc' }}>{appt.doctor_name}</div>
                         <div style={{ fontSize: '0.85rem', color: isToday ? '#34d399' : '#94a3b8', marginTop: '4px' }}>
                           {isToday ? 'Today' : dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                       </div>
                       <div style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 8px', borderRadius: '12px', background: appt.status === 'pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: appt.status === 'pending' ? '#fbbf24' : '#34d399' }}>
                         {appt.status === 'pending' ? 'Pending Approval' : 'Confirmed'}
                       </div>
                     </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No upcoming appointments scheduled.</div>
            )}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
             <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
               <Search size={18} color="#38bdf8" /> Search for Doctors
             </h3>
             
             <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
               <input 
                 type="text" 
                 className="form-input" 
                 placeholder="Search by name or username..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 style={{ minWidth: '200px' }}
               />
               <select 
                 className="form-input" 
                 value={specialtyFilter} 
                 onChange={e => setSpecialtyFilter(e.target.value)}
                 style={{ minWidth: '200px', cursor: 'pointer' }}
               >
                 <option value="">All Specializations</option>
                 {getUniqueSpecialties().map(spec => (
                   <option key={spec} value={spec}>{spec}</option>
                 ))}
               </select>
               <button 
                 onClick={handleFindClosest} 
                 className="btn-secondary" 
                 disabled={calculatingLocation}
                 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
               >
                 <MapPin size={16} /> 
                 {calculatingLocation ? 'Locating...' : (userLocation ? 'Update Location' : 'Find Closest Clinic')}
               </button>
             </div>
             {locationError && <div style={{ color: '#ef4444', fontSize: '0.85rem', width: '100%', marginTop: '8px' }}>{locationError}</div>}

          </div>

          {loadingDoctors ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              Loading verified providers...
            </div>
          ) : filteredDoctors.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>No matching doctors found in the system.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {filteredDoctors.map(dr => {
                return (
                  <div key={dr.username} style={{ 
                    background: 'rgba(15, 23, 42, 0.4)', 
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '20px', 
                    borderRadius: '12px',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                      <div style={{ 
                        width: '48px', height: '48px', borderRadius: '50%', 
                        background: 'rgba(56, 189, 248, 0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#38bdf8'
                      }}>
                        <User size={24} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>{dr.name}</h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <span style={{ color: '#38bdf8' }}>{dr.specialty}</span> • NPI: {dr.license_number}
                        </p>
                        {dr.telecom && (
                           <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Phone size={12} /> {dr.telecom}
                           </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                           <MapPin size={12} /> {dr.clinic_address || 'Address not provided'}
                        </div>
                        {dr.distance !== undefined && dr.distance !== null && (
                           <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px', fontWeight: 600 }}>
                              {dr.distance.toFixed(1)} miles away
                           </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginTop: '12px' }}>
                      <button onClick={() => navigate(`/profile/${dr.username}`)} className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '0.85rem', justifyContent: 'center' }}>
                        View Profile & Book
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      

      </main>

    </div>
  )
}

export default PatientDashboard
