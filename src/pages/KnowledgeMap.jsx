import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Music, Flame, FileText, BookOpen, Home, BarChart3, LogOut, ChevronLeft, Circle, Dna, Leaf, Users, Beaker, Sprout, User as UserIcon } from "lucide-react";

import RadialMindmap from "../components/mindmap/RadialMindmap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import StudentSidebar from "../components/shared/StudentSidebar";
import AchievementsDisplay from "../components/student/AchievementsDisplay";

export default function KnowledgeMap() {
  const navigate = useNavigate();
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [activeNav, setActiveNav] = useState("knowledge-map");
  const [hasClass, setHasClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [user, setUser] = useState(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [learnedTopics, setLearnedTopics] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const audioRef = useRef(null);

  const audioOptions = {
    "Lo-fi Beats": "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
    "Nature Sounds": "https://cdn.pixabay.com/audio/2022/03/10/audio_4b6ba2c20d.mp3",
    "White Noise": "https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3",
    "Classical Music": "https://cdn.pixabay.com/audio/2022/03/23/audio_23f3e5640c.mp3",
    "Ambient": "https://cdn.pixabay.com/audio/2022/01/18/audio_d1718ab41b.mp3",
    "Rain Sounds": "https://cdn.pixabay.com/audio/2022/03/12/audio_b1c0e6c4e7.mp3"
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassId && user && classes.length > 0) {
      loadClassData();
    }
  }, [selectedClassId, user, classes]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      // Get current user
      const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        navigate(createPageUrl("Login"));
        return;
      }

      const currentUser = await userResponse.json();

      if (currentUser.account_type === "teacher") {
        navigate(createPageUrl("TeacherDashboard"));
        return;
      }

      setUser(currentUser);

      const userId = currentUser._id || currentUser.id;

      // Get enrollments
      const enrollmentsResponse = await fetch(`${API_BASE}/api/enrollments/student/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let enrollmentsData = [];
      if (enrollmentsResponse.ok) {
        enrollmentsData = await enrollmentsResponse.json();
      }

      setEnrollments(enrollmentsData);
      setHasClass(enrollmentsData.length > 0);

      if (enrollmentsData.length > 0) {
        // Get all classes
        const classesResponse = await fetch(`${API_BASE}/api/classes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const allClasses = await classesResponse.json();

        // Filter to enrolled classes
        const enrolledClassIds = enrollmentsData
          .map(e => {
            if (!e.class_id) return null;
            if (typeof e.class_id === 'string') return e.class_id;
            if (e.class_id._id) return e.class_id._id.toString();
            return e.class_id.toString();
          })
          .filter(Boolean);

        const validClasses = allClasses.filter(c =>
          enrolledClassIds.includes((c._id || c.id).toString())
        );
        setClasses(validClasses);

        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && validClasses.some(c => (c._id || c.id).toString() === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (validClasses.length > 0) {
          const firstClassId = (validClasses[0]._id || validClasses[0].id).toString();
          setSelectedClassId(firstClassId);
          localStorage.setItem('selectedClassId', firstClassId);
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      const selectedClass = classes.find(c => (c._id || c.id).toString() === selectedClassId);
      if (!selectedClass) return;

      const curriculumId = selectedClass.curriculum_id;

      // Fetch all data in parallel
      const [curriculaRes, unitsRes, subunitsRes, progressRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/curriculum`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/units`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/subunits`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/progress/student/${user._id || user.id}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/assignments`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ]);

      const allCurricula = await curriculaRes.json();
      const allUnits = await unitsRes.json();
      const allSubunits = await subunitsRes.json();
      const progressData = progressRes.ok ? await progressRes.json() : [];
      const allAssignments = assignmentsRes.ok ? await assignmentsRes.json() : [];

      // Find current curriculum
      const curriculumData = allCurricula.find(c => (c._id || c.id).toString() === curriculumId?.toString());

      if (curriculumData) {
        setCurriculum(curriculumData);

        // Filter units for this curriculum
        const unitsData = allUnits
          .filter(u => (u.curriculum_id || '').toString() === (curriculumData._id || curriculumData.id).toString())
          .sort((a, b) => (a.unit_order || 0) - (b.unit_order || 0));
        setUnits(unitsData);

        // Filter subunits for these units
        const unitIds = unitsData.map(u => (u._id || u.id).toString());
        const relevantSubunits = allSubunits
          .filter(sub => {
            const subUnitId = sub.unit_id;
            if (!subUnitId) return false;
            const subUnitIdStr = typeof subUnitId === 'object' ? (subUnitId._id || subUnitId).toString() : subUnitId.toString();
            return unitIds.includes(subUnitIdStr);
          })
          .sort((a, b) => (a.subunit_order || 0) - (b.subunit_order || 0));
        setSubunits(relevantSubunits);

        setStudentProgress(progressData);

        // Filter assignments for this class
        const classAssignments = allAssignments.filter(a =>
          (a.class_id || '').toString() === selectedClassId
        );
        setAssignments(classAssignments);

        // Calculate learned topics
        const classSubunitIds = relevantSubunits.map(s => (s._id || s.id).toString());
        const learned = progressData.filter(p => {
          const pSubunitId = (p.subunit_id || '').toString();
          return classSubunitIds.includes(pSubunitId) &&
            (p.new_session_completed === true || p.status === 'completed');
        }).length;
        setLearnedTopics(learned);

        // Day streak - set to 0 for now (needs LearningSession model)
        setDayStreak(0);
      }
    } catch (err) {
      console.error("Failed to load class data:", err);
    }
  };

  const calculateDayStreak = (sessions) => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = sessions
      .map((s) => {
        const date = new Date(s.start_time);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort((a, b) => b - a);

    if (sessionDates.length === 0) return 0;

    const mostRecentDate = sessionDates[0];
    const daysSinceRecent = Math.floor((today.getTime() - mostRecentDate) / (1000 * 60 * 60 * 24));

    if (daysSinceRecent > 1) return 0;

    let streak = 0;
    let expectedDate = today.getTime();

    for (const sessionDate of sessionDates) {
      const diff = Math.floor((expectedDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (diff === 0 || diff === 1) {
        streak++;
        expectedDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentUser");
    navigate(createPageUrl("Login"));
  };

  const handleNavigation = (tab, route) => {
    setActiveNav(tab);
    if (route) {
      navigate(createPageUrl(route));
    }
  };

  const handleAudioSelect = (audio) => {
    if (selectedAudio === audio) {
      setSelectedAudio(null);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } else {
      setSelectedAudio(audio);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.src = audioOptions[audio];
        audioRef.current.loop = true;
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch((err) => console.log("Audio play failed:", err));
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <StudentSidebar
        activeNav={activeNav}
        classes={classes}
        selectedClassId={selectedClassId}
        onClassChange={(val) => {
          setSelectedClassId(val);
          localStorage.setItem('selectedClassId', val);
        }}
        user={user} 
      />

      <div className="flex-1 flex flex-col">
        <style>{`
          @keyframes audioWave {
            0%, 100% { height: 8px; }
            50% { height: 24px; }
          }
          @keyframes audioWave2 {
            0%, 100% { height: 12px; }
            50% { height: 20px; }
          }
          @keyframes audioWave3 {
            0%, 100% { height: 6px; }
            50% { height: 22px; }
          }
          .wave-bar:nth-child(1) { animation: audioWave 0.8s ease-in-out infinite; }
          .wave-bar:nth-child(2) { animation: audioWave2 0.9s ease-in-out infinite 0.1s; }
          .wave-bar:nth-child(3) { animation: audioWave3 0.7s ease-in-out infinite 0.2s; }
          .wave-bar:nth-child(4) { animation: audioWave 0.85s ease-in-out infinite 0.3s; }
        `}</style>
        
        <audio ref={audioRef} />
        
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-blue-50/30 to-indigo-50/30 flex items-center justify-center">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : hasClass ? (
            curriculum && units.length > 0 ? (
              <div className="bg-slate-50 w-full h-full flex flex-col overflow-y-auto">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full max-w-6xl px-4 py-8">
                    <AchievementsDisplay studentId={user?._id || user?.id} />
                    <div className="flex items-center justify-center">
                      <RadialMindmap
                        curriculum={curriculum}
                        units={units}
                        subunits={subunits}
                        studentProgress={studentProgress}
                        assignments={assignments}
                        onSubunitClick={(subunit) => {
                          const subId = (subunit._id || subunit.id).toString();
                          const isAssigned = assignments.some(a => (a.subunit_id || '').toString() === subId);
                          if (isAssigned) {
                            navigate(createPageUrl("NewSession") + `?topic=${subId}`);
                          }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600">Loading curriculum...</p>
              </div>
            )
          ) : (
            <NoClassState navigate={navigate} />
          )}
        </div>
      </div>
    </div>
  );
}

function NoClassState({ navigate }) {
  return (
    <div className="flex items-center justify-center h-full" style={{ fontFamily: '"Inter", sans-serif' }}>
      <div className="text-center max-w-md px-8">
        <div className="w-24 h-24 bg-[#2563EB]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <BookOpen className="w-12 h-12 text-[#2563EB]" />
        </div>
        <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Welcome to Quest Learning</h2>
        <p className="text-[#1A1A1A]/70 mb-8 text-lg" style={{ fontWeight: 450 }}>Join a class to start your learning journey and unlock your knowledge map</p>
        <Button
          onClick={() => navigate(createPageUrl("Classes"))}
          className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Users className="w-5 h-5 mr-2" />
          Go to Classes
        </Button>
      </div>
    </div>
  );
}