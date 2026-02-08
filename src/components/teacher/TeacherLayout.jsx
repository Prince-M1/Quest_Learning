import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BookOpen, 
  Users, 
  BarChart3,
  LogOut,
  ChevronLeft,
  TrendingUp,
  GraduationCap,
  FileText
} from "lucide-react";

export default function TeacherLayout({ children, activeNav, user, onSignOut }) {
  const navigate = useNavigate();
  
  // 🔧 SIMPLIFIED: Check subscription tier from user prop (now properly updated by AuthContext)
  const isPremium = useMemo(() => {
    const hasPremiumTier = user?.subscription_tier === 'premium';
    const hasTrial = user?.subscription_status === 'trial';
    const accessGranted = hasPremiumTier || hasTrial;

    console.group("💎 [PREMIUM ACCESS CHECK]");
    console.log("User Object:", user);
    console.log("Subscription Tier:", user?.subscription_tier);
    console.log("Subscription Status:", user?.subscription_status);
    console.log("RESULT:", accessGranted ? "✅ ACCESS GRANTED" : "🔒 LOCKED");
    console.groupEnd();

    return accessGranted;
  }, [user]);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    try {
      // 🔧 FIX: Use _id or id to handle MongoDB format
      const teacherId = user._id || user.id;
      console.log("📚 [LAYOUT] Loading classes for teacherId:", teacherId);
      
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const classData = await response.json();
        setClasses(classData);
        console.log("✅ [LAYOUT] Classes loaded:", classData.length);
        
        const savedClassId = localStorage.getItem('teacherSelectedClassId');
        if (savedClassId && classData.some(c => (c.id || c._id) === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (classData.length > 0) {
          const firstId = classData[0].id || classData[0]._id;
          setSelectedClassId(firstId);
          localStorage.setItem('teacherSelectedClassId', firstId);
        }
      }
    } catch (err) {
      console.error("❌ [LAYOUT] Failed to load classes:", err);
    }
  };

  const handleNavigation = (nav, route) => {
    if (route) {
      navigate(createPageUrl(route));
    }
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    localStorage.setItem('teacherSelectedClassId', classId);
  };

  // 🔧 REDIRECT TO PRICING: When user clicks locked features
  const handlePremiumFeatureClick = (route) => {
    if (isPremium) {
      navigate(createPageUrl(route));
    } else {
      navigate(createPageUrl("Pricing"));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left Sidebar */}
      <div className="w-64 bg-[#1E40AF] text-white flex flex-col border-r border-[#1E40AF]" style={{fontFamily: '"Inter", sans-serif'}}>
        {/* Back Button / Sign Out trigger */}
        <button onClick={onSignOut} className="p-4 hover:bg-white/10 transition-all flex items-center gap-2 m-2">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="px-5 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911eeb0f3daa2d191a2a8fa/d20f054a3_Untitleddesign21.png" alt="Quest Learning" className="w-12 h-auto" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">Quest Learning</h1>
              <p className="text-xs text-white/70">Teacher Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {/* LIVE SESSIONS */}
          <button 
            onClick={() => handleNavigation("live", "TeacherLiveSession")} 
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "live" ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Live Sessions</span>
          </button>

          {/* DASHBOARD */}
          <button 
            onClick={() => handleNavigation("dashboard", "TeacherDashboard")} 
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "dashboard" ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          {/* CURRICULUM - Conditional Locking */}
          <button 
            onClick={() => handlePremiumFeatureClick("TeacherCurricula")}
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "curricula" ? "bg-white/20" : isPremium ? "hover:bg-white/10" : "opacity-40 cursor-not-allowed"}`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="flex-1 text-left">Curriculum</span>
            {!isPremium && <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          </button>

          {/* CLASSES */}
          <button 
            onClick={() => handleNavigation("classes", "TeacherClasses")} 
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "classes" ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <Users className="w-4 h-4" />
            <span>Classes</span>
          </button>

          {/* ANALYSIS - Conditional Locking */}
          <button 
            onClick={() => handlePremiumFeatureClick("TeacherAnalytics")} 
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "analysis" ? "bg-white/20" : isPremium ? "hover:bg-white/10" : "opacity-40 cursor-not-allowed"}`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="flex-1 text-left">Analytics</span>
            {!isPremium && <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
          </button>

          {/* SETTINGS */}
          <button 
            onClick={() => handleNavigation("settings", "TeacherSettings")} 
            className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "settings" ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Settings</span>
          </button>
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm">
              {(user?.name || user?.full_name)?.charAt(0)?.toUpperCase() || "T"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{user?.name || user?.full_name || "Teacher"}</p>
              <p className="text-xs text-white/60 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={onSignOut} className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 justify-center text-xs font-medium">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-white" style={{fontFamily: '"Inter", sans-serif'}}>
        {children && React.cloneElement(children, { selectedClassId })}
      </div>
    </div>
  );
}
