import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Login from './components/Login';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import DoctorProfile from './components/DoctorProfile';
import DoctorLogs from './components/DoctorLogs';
import DonorNetwork from './components/DonorNetwork';
import CompanionDashboard from './components/CompanionDashboard';
import AiAssistant from './components/AiAssistant';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<PatientDashboard />} />
            <Route path="doctor" element={<DoctorDashboard />} />
            <Route path="profile/:username" element={<DoctorProfile />} />
            <Route path="doctor-logs" element={<DoctorLogs />} />
            <Route path="donor" element={<DonorNetwork />} />
            <Route path="companion" element={<CompanionDashboard />} />
            <Route path="ai" element={<AiAssistant />} />
          </Route>
        </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;