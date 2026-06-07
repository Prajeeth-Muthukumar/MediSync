import React, { useState, useEffect, useContext } from 'react'
import { LogOut, Search, Activity, FileText, Plus, Trash2, ShieldAlert, CheckCircle, CheckCircle2, RefreshCw, UserCheck, ShieldCheck, User } from 'lucide-react'
import RodOfAsclepius from './RodOfAsclepius'
import AuthContext from '../context/AuthContext'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000') + '/api'

const ICD10_LIST = [
  { code: 'I10', display: 'Essential (primary) hypertension' },
  { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications' },
  { code: 'J45.909', display: 'Unspecified asthma, uncomplicated' },
  { code: 'M17.9', display: 'Osteoarthritis of knee, unspecified' },
  { code: 'I25.10', display: 'Atherosclerotic heart disease of native coronary artery' },
  { code: 'F32.9', display: 'Major depressive disorder, single episode, unspecified' },
  { code: 'K21.9', display: 'Gastro-esophageal reflux disease without esophagitis' },
  { code: 'N39.0', display: 'Urinary tract infection, site not specified' },
  { code: 'J06.9', display: 'Acute upper respiratory infection, unspecified' }
]

export default function DoctorDashboard() {
  const { user, logout: onLogout } = useContext(AuthContext);
  const [permittedPatients, setPermittedPatients] = useState([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [scheduleToday, setScheduleToday] = useState([])
  const [scheduleTomorrow, setScheduleTomorrow] = useState([])
    const [appointments, setAppointments] = useState([])
  const [maxPatients, setMaxPatients] = useState(5)
    const [isEditingSchedule, setIsEditingSchedule] = useState(false)
  const [patientData, setPatientData] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [followUpModal, setFollowUpModal] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0])
  const [followUpSlots, setFollowUpSlots] = useState([])
  const [bookingLoading, setBookingLoading] = useState(false)
  const [activeAppointmentId, setActiveAppointmentId] = useState(null)
  
  // Record creation states
  const [icdQuery, setIcdQuery] = useState('')
  const [selectedIcd, setSelectedIcd] = useState(null)
  const [showIcdDropdown, setShowIcdDropdown] = useState(false)
  
  // Prescription builder states
  const [medName, setMedName] = useState('')
  const [medDosage, setMedDosage] = useState('')
  const [medFrequency, setMedFrequency] = useState('')
  const [prescriptions, setPrescriptions] = useState([])

  const [clinicalNotes, setClinicalNotes] = useState('')
  const [fhirPreview, setFhirPreview] = useState(null)
  
  const [savingRecord, setSavingRecord] = useState(false)
  const [saveMessage, setSaveMessage] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingPatients(true)
      try {
        const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
          if (apptRes.ok) {
            const apptData = await apptRes.json();
            setAppointments(apptData.appointments || []);
          }

          const res = await fetch(`${API_BASE}/patients/permitted/?doctor_username=${user.username}`)
        if (res.ok) {
          const data = await res.json()
          setPermittedPatients(data.patients || [])
        }
        
        const drRes = await fetch(`${API_BASE}/doctors/list/`)
        if (drRes.ok) {
          const drData = await drRes.json()
          const me = drData.doctors.find(d => d.username === user.username)
          if (me) {
             setScheduleToday(me.schedule_today || [{start_time: me.usual_start || '09:00', end_time: me.usual_end || '17:00', specialization: me.specialty || 'General'}])
            setScheduleTomorrow(me.schedule_tomorrow || [{start_time: me.usual_start || '09:00', end_time: me.usual_end || '17:00', specialization: me.specialty || 'General'}])
          }

        
        
        if (me && me.max_patients_per_hour) {
           setMaxPatients(me.max_patients_per_hour)
        }

        }
      } catch (err) {
        console.error("Failed to load dashboard data", err)
      } finally {
        setLoadingPatients(false)
      }
    }
    fetchDashboardData()
  }, [user.username])


  const filteredIcd = ICD10_LIST.filter(item => 
    item.display.toLowerCase().includes(icdQuery.toLowerCase()) || 
    item.code.toLowerCase().includes(icdQuery.toLowerCase())
  )

  
  
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  
  const handleAddBlock = (day) => {
     if(!newStart || !newEnd) return;
     const blk = { start_time: newStart, end_time: newEnd, specialization: 'General' };
     if (day === 'today') setScheduleToday([...scheduleToday, blk]);
     if (day === 'tomorrow') setScheduleTomorrow([...scheduleTomorrow, blk]);
     setNewStart(''); setNewEnd('');
  }
  
  const handleRemoveBlock = (day, idx) => {
     if (day === 'today') setScheduleToday(scheduleToday.filter((_, i) => i !== idx));
     if (day === 'tomorrow') setScheduleTomorrow(scheduleTomorrow.filter((_, i) => i !== idx));
  }
  
  const handleAcceptReject = async (id, status) => {
    try {
      await fetch(`${API_BASE}/appointments/update_status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: id, status })
      });
      const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
      const apptData = await apptRes.json();
      setAppointments(apptData.appointments || []);
    } catch(e) {
      console.error(e)
    }
  }

  const handleUpdateCapacity = async () => {
    try {
      await fetch(`${API_BASE}/doctors/schedule/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user.username,
          max_patients_per_hour: maxPatients,
          schedule_today: scheduleToday,
          schedule_tomorrow: scheduleTomorrow
        })
      });
      alert('Capacity updated successfully!');
    } catch (e) {
      console.error(e);
    }
  }

  
  

  const handleSelectPatient = async (patient) => {
    setLoadingSearch(true)
    setActiveAppointmentId(patient.appointment_id || null)
    setSearchError('')
    setPatientData(null)
    setTimeline([])
    setSaveMessage(null)
    try {
      const res = await fetch(`${API_BASE}/patients/search/?query=${patient.patient_id}&doctor_username=${user.username}`)
      const data = await res.json()
      if (res.ok && data.has_consent) {
        setPatientData(data)
        fetchPatientTimeline(data.patient.patient_id)
      } else {
        setSearchError(data.error || 'Search failed.')
      }
    } catch (err) {
      setSearchError('Error connecting to backend server.')
    } finally {
      setLoadingSearch(false)
    }
  }

  const fetchPatientTimeline = async (patientId) => {
    try {
      const res = await fetch(`${API_BASE}/records/timeline/?patient_id=${patientId}&doctor_username=${user.username}&requester_role=doctor`)
      const data = await res.json()
      if (res.ok) {
        setTimeline(data.timeline || [])
      }
    } catch (err) {
      console.error('Error fetching timeline:', err)
    }
  }

  useEffect(() => {
    if (!patientData) {
      setFhirPreview(null)
      return
    }

    const timestamp = new Date().toISOString().split('.')[0] + 'Z'
    const encounterId = 'enc-preview-uuid'
    const conditionId = 'cond-preview-uuid'

    const entryList = [
      {
        fullUrl: `urn:uuid:${encounterId}`,
        resource: {
          resourceType: 'Encounter',
          id: encounterId,
          status: 'finished',
          class: {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: 'AMB',
            display: 'ambulatory'
          },
          subject: {
            reference: `Patient/${patientData.patient.patient_id}`,
            display: patientData.patient.name
          },
          participant: [{
            type: [{
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PPRF',
                display: 'primary performer'
              }]
            }],
            individual: {
              reference: `Practitioner/${user.license_number}`,
              display: user.name
            }
          }],
          period: { start: timestamp, end: timestamp },
          reasonCode: [{ text: clinicalNotes || '(Add clinical notes...)' }]
        }
      }
    ]

    if (selectedIcd) {
      entryList.push({
        fullUrl: `urn:uuid:${conditionId}`,
        resource: {
          resourceType: 'Condition',
          id: conditionId,
          clinicalStatus: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active'
            }]
          },
          verificationStatus: {
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed'
            }]
          },
          category: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'encounter-diagnosis',
              display: 'Encounter Diagnosis'
            }]
          }],
          code: {
            coding: [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: selectedIcd.code,
              display: selectedIcd.display
            }],
            text: selectedIcd.display
          },
          subject: {
            reference: `Patient/${patientData.patient.patient_id}`,
            display: patientData.patient.name
          },
          encounter: { reference: `Encounter/${encounterId}` },
          recordedDate: timestamp
        }
      })
    }

    prescriptions.forEach((med, idx) => {
      const medId = `medreq-preview-${idx}-uuid`
      entryList.push({
        fullUrl: `urn:uuid:${medId}`,
        resource: {
          resourceType: 'MedicationRequest',
          id: medId,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: { text: med.name },
          subject: {
            reference: `Patient/${patientData.patient.patient_id}`,
            display: patientData.patient.name
          },
          encounter: { reference: `Encounter/${encounterId}` },
          requester: {
            reference: `Practitioner/${user.license_number}`,
            display: user.name
          },
          dosageInstruction: [{ text: `${med.dosage} - ${med.frequency}` }]
        }
      })
    })

    setFhirPreview({
      resourceType: 'Bundle',
      id: 'bundle-preview-uuid',
      type: 'collection',
      timestamp: timestamp,
      entry: entryList
    })

  }, [patientData, selectedIcd, prescriptions, clinicalNotes, user])

  const addPrescriptionItem = (e) => {
    e.preventDefault()
    if (!medName || !medDosage || !medFrequency) return
    setPrescriptions([...prescriptions, { name: medName, dosage: medDosage, frequency: medFrequency }])
    setMedName('')
    setMedDosage('')
    setMedFrequency('')
  }

  const removePrescriptionItem = (index) => {
    setPrescriptions(prescriptions.filter((_, idx) => idx !== index))
  }

  const handleSaveRecord = async () => {
    if (!selectedIcd || !patientData) return
    setSavingRecord(true)
    setSaveMessage(null)

    try {
      const res = await fetch(`${API_BASE}/records/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientData.patient.patient_id,
          doctor_username: user.username,
          icd_code: selectedIcd.code,
          icd_display: selectedIcd.display,
          medications: prescriptions,
          clinical_notes: clinicalNotes
        })
      })
      const data = await res.json()

      if (res.ok) {
        setSelectedIcd(null)
        setIcdQuery('')
        setPrescriptions([])
        setClinicalNotes('')
        await fetchPatientTimeline(patientData.patient.patient_id)
        
        if (activeAppointmentId) {
            // Mark appointment completed
            await fetch(`${API_BASE}/appointments/update_status/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ appointment_id: activeAppointmentId, status: 'completed' })
            });
            // Refresh appointments list
            const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
            if (apptRes.ok) {
              const apptData = await apptRes.json();
              setAppointments(apptData.appointments || []);
            }
            setSaveMessage({ type: 'success', text: 'EHR record saved securely. The appointment is now completed.' })
            setFollowUpModal(true);
        } else {
            setSaveMessage({ type: 'success', text: 'EHR record saved securely & structured as FHIR resource!' })
        }
      } else {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save health record.' })
      }
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'Error connecting to database api.' })
    } finally {
      setSavingRecord(false)
    }
  }

  const handleRequestAccess = async () => {
    setSavingRecord(true)
    try {
      const res = await fetch(`${API_BASE}/consent/toggle/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientData.patient.patient_id,
          doctor_username: user.username,
          action: 'request'
        })
      })
      if (res.ok) {
        setPatientData(prev => ({
          ...prev,
          consent_status: 'requested'
        }))
      }
    } catch (err) {
      console.error("Error requesting consent:", err)
    } finally {
      setSavingRecord(false)
    }
  }

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
            background: 'rgba(16, 185, 129, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RodOfAsclepius size={22} color="#10b981" className="animate-heart-pulse" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>MediSync Doctor Workspace</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Logged in: <strong>{user.name}</strong> ({user.specialty}) • NPI: {user.license_number}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => window.location.href = `/profile/${user.username}`} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <User size={16} /> View My Profile
          </button>
          <button onClick={onLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        <div className="glass-panel animate-fade-in" style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '16px', 
          borderLeft: '4px solid #10b981',
          background: 'rgba(16, 185, 129, 0.04)' 
        }}>
          <ShieldCheck size={28} color="#10b981" style={{ flexShrink: 0 }} />
          <div>
            <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Verified Medical Provider Status Active</h4>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Your credentials have been successfully authenticated against the National Practitioner Registry. You are authorized to create FHIR-compliant Health Records.
            </p>
          </div>
        </div>

        

      
        <div style={{ display: 'grid', gridTemplateColumns: patientData ? '1fr' : '1fr 1fr', gap: '24px' }}>
          
          {/* LEFT COLUMN: Dashboard Overview (Hidden if a patient is selected) */}
          {!patientData && (
            <>
                {/* Appointment Requests */}
                {appointments.filter(a => a.status === 'pending').length > 0 && (
                  <section className="glass-panel animate-fade-in" style={{ padding: '24px', border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.05)', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                      <Activity size={18} /> Appointment Requests
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {appointments.filter(a => a.status === 'pending').map(appt => {
                        const dateObj = new Date(appt.time_slot);
                        return (
                          <div key={appt._id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)' }}>
                             <div>
                               <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f8fafc' }}>{appt.patient_name || appt.patient_id}</div>
                               <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
                                 {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                               </div>
                             </div>
                             <div style={{ display: 'flex', gap: '8px' }}>
                               <button onClick={() => handleAcceptReject(appt._id, 'approved')} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                 Accept
                               </button>
                               <button onClick={() => handleAcceptReject(appt._id, 'rejected')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                                 Decline
                               </button>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

              {/* Upcoming Appointments */}
              <section className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#38bdf8" /> Upcoming Appointments
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appointments.filter(a => a.status === 'approved').length > 0 ? (
                    appointments.filter(a => a.status === 'approved').map(appt => {
                      const dateObj = new Date(appt.time_slot);
                      const isToday = dateObj.toDateString() === new Date().toDateString();
                      return (
                        <div key={appt._id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                           <div>
                             <div style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#f8fafc' }}>{appt.patient_name || appt.patient_id}</div>
                             <div style={{ fontSize: '0.85rem', color: isToday ? '#34d399' : '#94a3b8', marginTop: '4px' }}>
                               {isToday ? 'Today' : dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                           </div>
                           <button onClick={() => handleSelectPatient({ patient_id: appt.patient_id, appointment_id: appt._id })} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                             View Patient
                           </button>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>No upcoming appointments scheduled.</div>
                  )}
                </div>
              </section>

              {/* My Permitted Patients */}
              <section className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="#10b981" /> My Permitted Patients
                </h3>
                {loadingPatients ? (
                  <div style={{ color: '#94a3b8' }}>Loading patients...</div>
                ) : permittedPatients.length === 0 ? (
                  <div style={{ color: '#94a3b8' }}>No patients have granted you access yet.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                    {permittedPatients.map(p => (
                      <div key={p.patient_id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#f8fafc' }}>{p.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {p.patient_id}</div>
                        </div>
                        <button onClick={() => handleSelectPatient(p)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                          Open Records
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* RIGHT COLUMN: Patient Clinical View (Shown when a patient is selected) */}
          {patientData && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                     Clinical File: {patientData.patient.name}
                   </h2>
                   <div style={{ display: 'flex', gap: '12px' }}>
                     {activeAppointmentId && (
                       <button 
                         onClick={async () => {
                            if (!window.confirm("Are you sure you want to end this appointment?")) return;
                            try {
                               await fetch(`${API_BASE}/appointments/update_status/`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ appointment_id: activeAppointmentId, status: 'completed' })
                               });
                               // Refresh appointments
                               const apptRes = await fetch(`${API_BASE}/appointments/list/?username=${user.username}&role=doctor`);
                               if (apptRes.ok) {
                                  const apptData = await apptRes.json();
                                  setAppointments(apptData.appointments || []);
                               }
                               setFollowUpModal(true);
                            } catch(e) { console.error(e) }
                         }} 
                         className="btn-primary" 
                         style={{ padding: '6px 16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#f87171' }}>
                          End Appointment
                       </button>
                     )}
                     <button onClick={() => setPatientData(null)} className="btn-secondary" style={{ padding: '6px 16px' }}>
                        Close File
                     </button>
                   </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Age</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>
                           {patientData.patient.birth_date ? Math.floor((new Date() - new Date(patientData.patient.birth_date).getTime()) / 3.15576e+10) + ' yrs' : 'N/A'}
                        </div>
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Sex</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>{patientData.patient.gender || 'N/A'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Blood Group</div>
                        <div style={{ fontWeight: 600, color: '#ef4444' }}>{patientData.patient.blood_group || 'N/A'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Weight</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{patientData.patient.weight ? `${patientData.patient.weight} kg` : 'N/A'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Height</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{patientData.patient.height ? `${patientData.patient.height} cm` : 'N/A'}</div>
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Contact</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{patientData.patient.telecom || 'N/A'}</div>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>Address</div>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{patientData.patient.address || 'N/A'}</div>
                    </div>
                </div>

              {patientData.consent_status !== 'granted' ? (
                <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171', marginBottom: '12px' }}>Access Restricted</h3>
                  <p style={{ color: '#94a3b8', marginBottom: '20px' }}>You do not have permission to view this patient's clinical timeline.</p>
                  <button onClick={handleRequestAccess} className="btn-primary" disabled={savingRecord}>
                    {savingRecord ? 'Sending Request...' : 'Request Consent'}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  
                  {/* Timeline */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Historical Timeline</h3>
                    <div className="timeline-container">
                      {timeline.length > 0 ? timeline.map(item => {
                         const fhirCond = item.fhir_bundle?.entry?.find(e => e.resource?.resourceType === 'Condition')?.resource;
                         const fhirEnc = item.fhir_bundle?.entry?.find(e => e.resource?.resourceType === 'Encounter')?.resource;
                         const fhirMeds = item.fhir_bundle?.entry?.filter(e => e.resource?.resourceType === 'MedicationRequest').map(e => e.resource) || [];
                         return (
                           <div className="timeline-item" key={item._id}>
                             <div className="timeline-badge"><Activity size={12} color="#10b981" /></div>
                             <div className="timeline-card">
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                 <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
                                   {new Date(item.created_at).toLocaleDateString()} • Dr. {item.doctor_name}
                                 </div>
                                 <button 
                                   onClick={() => alert(JSON.stringify(item.fhir_bundle, null, 2))}
                                   className="btn-secondary" 
                                   style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                                   View Raw FHIR
                                 </button>
                               </div>
                               <h4 style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', marginBottom: '4px' }}>
                                 {fhirCond ? fhirCond.code?.coding?.[0]?.display : 'Clinical Encounter'}
                               </h4>
                               <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: fhirMeds.length > 0 ? '8px' : '0' }}>
                                 {fhirEnc?.reasonCode?.[0]?.text || 'No notes provided.'}
                               </p>
                               {fhirMeds.length > 0 && (
                                 <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Prescriptions:</div>
                                    <ul style={{ margin: 0, paddingLeft: '16px', color: '#e2e8f0', fontSize: '0.8rem' }}>
                                      {fhirMeds.map((med, idx) => (
                                         <li key={idx}>
                                            {med.medicationCodeableConcept?.text}
                                            {med.dosageInstruction?.[0]?.text && ` (${med.dosageInstruction[0].text})`}
                                         </li>
                                      ))}
                                    </ul>
                                 </div>
                               )}
                             </div>
                           </div>
                         )
                      }) : (
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No historical records found.</p>
                      )}
                    </div>
                  </div>

                  {/* FHIR Builder */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                     <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>Create FHIR Record</h3>
                     
                     {saveMessage && (
                       <div style={{ padding: '12px', marginBottom: '16px', borderRadius: '8px', background: saveMessage.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: saveMessage.type === 'success' ? '#34d399' : '#f87171' }}>
                         {saveMessage.text}
                       </div>
                     )}

                     <div className="form-group">
                       <label className="form-label">Diagnosis / ICD-10 Search</label>
                       <input type="text" className="form-input" value={icdQuery} onChange={e => {setIcdQuery(e.target.value); setShowIcdDropdown(true)}} placeholder="e.g., Hypertension" />
                       {showIcdDropdown && icdQuery && (
                         <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                           {filteredIcd.map(icd => (
                             <div key={icd.code} onClick={() => {setSelectedIcd(icd); setIcdQuery(icd.display); setShowIcdDropdown(false)}} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                               <strong>{icd.code}</strong>: {icd.display}
                             </div>
                           ))}
                         </div>
                       )}
                     </div>

                       <div className="form-group" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                         <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={14}/> Prescriptions (Optional)</label>
                         <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                           <input type="text" className="form-input" style={{ flex: 2 }} placeholder="Medication Name" value={medName} onChange={e => setMedName(e.target.value)} />
                           <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Dosage (e.g. 50mg)" value={medDosage} onChange={e => setMedDosage(e.target.value)} />
                           <input type="text" className="form-input" style={{ flex: 1 }} placeholder="Frequency (e.g. 1x daily)" value={medFrequency} onChange={e => setMedFrequency(e.target.value)} />
                           <button onClick={addPrescriptionItem} className="btn-secondary" style={{ padding: '0 16px' }}>Add</button>
                         </div>
                         {prescriptions.length > 0 && (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                             {prescriptions.map((p, idx) => (
                               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
                                 <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}><strong>{p.name}</strong> - {p.dosage}, {p.frequency}</span>
                                 <button onClick={(e) => { e.preventDefault(); removePrescriptionItem(idx); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Trash2 size={14}/></button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>

                       <div className="form-group" style={{ marginTop: '16px' }}>
                         <label className="form-label">Clinical Notes</label>
                         <textarea className="form-input" value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="Symptoms and observations..." style={{ minHeight: '100px', resize: 'vertical' }} />
                       </div>

                       <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <ShieldAlert size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#fcd34d', lineHeight: '1.4' }}>
                             <strong>Warning:</strong> Signing and submitting this FHIR record will securely lock the encounter and <strong>permanently end this appointment</strong>. Your access to this clinical file will be immediately revoked unless you schedule a follow-up.
                          </p>
                       </div>

                     <button onClick={handleSaveRecord} className="btn-primary" disabled={!selectedIcd || savingRecord} style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}>
                       {savingRecord ? 'Transmitting...' : 'Sign & Submit Record'}
                     </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      {followUpModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '450px', padding: '30px' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 color="#10b981" /> Appointment Complete
            </h3>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.6' }}>
              The FHIR record was saved successfully and the current appointment is now marked as complete. Since this appointment is over, your access to {patientData.patient.name}'s file will be revoked.
            </p>
            <p style={{ color: '#cbd5e1', marginBottom: '24px', lineHeight: '1.6' }}>
              <strong>Would you like to schedule a follow-up appointment?</strong> This will immediately restore your access.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} className="form-input" style={{ width: '100%', marginBottom: '12px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                 {followUpSlots.length === 0 ? (
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center' }}>No slots available.</div>
                 ) : (
                    followUpSlots.map(slot => (
                       <div key={slot.start_time} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#f8fafc' }}>{slot.start_time} - {slot.end_time}</span>
                          {slot.remaining <= 0 ? (
                             <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>Full</span>
                          ) : (
                             <button className="btn-primary" disabled={bookingLoading} onClick={() => handleBookFollowUp(slot)} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>Book</button>
                          )}
                       </div>
                    ))
                 )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
               <button onClick={() => { setFollowUpModal(false); setPatientData(null); }} className="btn-secondary">
                  No, Close File
               </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  )
}
