/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CoursePlayer from './pages/CoursePlayer';
import AdminDashboard from './pages/AdminDashboard';
import CourseManagement from './pages/CourseManagement';
import About from './pages/About';
import Terms from './pages/Terms';
import Contact from './pages/Contact';
import Courses from './pages/Courses';
import InstructorProfile from './pages/InstructorProfile';
import ProtectedRoute from './components/ProtectedRoute';
import Marquee from './components/Marquee';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const isConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-navy-dark text-white flex items-center justify-center p-8 text-center">
        <div className="max-w-md glass p-12 rounded-3xl">
          <h1 className="text-2xl font-bold mb-4 gold-gradient tracking-widest">需要配置 Supabase</h1>
          <p className="text-white/60 mb-8 leading-relaxed">
            請在環境變數中設定 <code className="text-gold">VITE_SUPABASE_URL</code> 與 <code className="text-gold">VITE_SUPABASE_ANON_KEY</code> 以啟用平台功能。
          </p>
          <div className="text-xs text-white/20 border-t border-white/5 pt-6">
            凝聚力學院 Cohesion Academy
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-navy-dark text-white selection:bg-gold selection:text-navy-dark">
          <Navbar />
          <Marquee />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/management" 
                element={
                  <ProtectedRoute requiredRole="instructor">
                    <CourseManagement />
                  </ProtectedRoute>
                } 
              />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/course/:id" element={<CoursePlayer />} />
              <Route path="/instructor/:id" element={<InstructorProfile />} />
              <Route path="/courses" element={<Courses />} />
            </Routes>
          </AnimatePresence>
          
          <footer className="py-20 border-t border-white/5 mt-20">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h2 className="text-2xl font-bold gold-gradient tracking-widest mb-8">凝聚力學院</h2>
              <div className="flex justify-center space-x-8 mb-12 text-sm text-white/40">
                <Link to="/about" className="hover:text-gold transition-colors">關於我們</Link>
                <Link to="/terms" className="hover:text-gold transition-colors">服務條款</Link>
                <Link to="/contact" className="hover:text-gold transition-colors">聯繫我們</Link>
              </div>
              <p className="text-white/20 text-xs">
                © 2026 凝聚力學院 Cohesion Academy. All Rights Reserved.
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
