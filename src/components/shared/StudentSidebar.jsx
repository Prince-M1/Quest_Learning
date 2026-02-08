import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Home, BarChart3, Flame, LogOut, ChevronLeft, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StudentSidebar({ 
  activeNav, 
  classes, 
  selectedClassId, 
  onClassChange, 
  user 
}) {
  const navigate = useNavigate();

  // ✅ Extract name from email if no name field exists
  const getStudentName = () => {
    if (user?.name) return user.name;
    if (user?.full_name) return user.full_name;
    if (user?.email) {
      // Extract username from email (e.g., "nylaelise" from "nylaelise@gmail.com")
      const username = user.email.split('@')[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
    return "Student";
  };

  // ✅ Get initial from name or email
  const getStudentInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "?";
  };

  // ✅ Fixed: No more Base44
  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("selectedClassId");
    navigate(createPageUrl("Login"));
  };

  const handleNavigation = (tab, route) => {
    if (route) {
      navigate(createPageUrl(route));
    }
  };

  return (
    <div className="w-64 bg-[#1E40AF] text-white flex flex-col border-r border-[#1E40AF]" style={{fontFamily: '"Inter", sans-serif'}}>
      <button onClick={handleSignOut} className="p-4 hover:bg-white/10 transition-all flex items-center gap-2 m-2">
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="px-5 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911eeb0f3daa2d191a2a8fa/d20f054a3_Untitleddesign21.png" alt="Quest Learning" className="w-12 h-auto" />
          <div>
            <h1 className="text-sm font-bold tracking-tight">Quest Learning</h1>
            <p className="text-xs text-white/70">Redefining Education</p>
          </div>
        </div>
      </div>

      {classes.length > 0 && (
        <div className="p-4 border-b border-white/10">
          <Select value={selectedClassId} onValueChange={onClassChange}>
            <SelectTrigger className="w-full bg-white/10 border-0 text-white hover:bg-white/20 rounded-lg transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => {
                const classId = (cls._id || cls.id).toString(); // ✅ Handle both _id and id
                return (
                  <SelectItem key={classId} value={classId}>
                    {cls.class_name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <button onClick={() => handleNavigation("live-session", "StudentLiveSession")} className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "live-session" ? "bg-white/20" : "hover:bg-white/10"}`}>
          <Flame className="w-4 h-4 flex-shrink-0" />
          <span>Live Session</span>
        </button>

        <button onClick={() => handleNavigation("knowledge-map", "KnowledgeMap")} className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "knowledge-map" ? "bg-white/20" : "hover:bg-white/10"}`}>
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span>Knowledge Map</span>
        </button>

        <button onClick={() => handleNavigation("learning-hub", "LearningHub")} className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "learning-hub" ? "bg-white/20" : "hover:bg-white/10"}`}>
          <Home className="w-4 h-4 flex-shrink-0" />
          <span>Learning Hub</span>
        </button>
        
        <button onClick={() => handleNavigation("progress", "Progress")} className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "progress" ? "bg-white/20" : "hover:bg-white/10"}`}>
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span>Progress</span>
        </button>
        
        <button onClick={() => handleNavigation("classes", "Classes")} className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all text-sm font-medium rounded-lg mb-1 ${activeNav === "classes" ? "bg-white/20" : "hover:bg-white/10"}`}>
          <Users className="w-4 h-4 flex-shrink-0" />
          <span>Classes</span>
        </button>
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm">
            {getStudentInitial()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{getStudentName()}</p>
            <p className="text-xs text-white/60 truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={handleSignOut} className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 justify-center text-xs font-medium">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
