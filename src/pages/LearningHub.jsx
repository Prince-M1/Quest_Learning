import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Target,
  Filter,
  ChevronRight,
  BookOpen,
  Home,
  BarChart3,
  FileText,
  Flame,
  LogOut,
  ChevronLeft,
  Clock,
  Calendar,
  CheckCircle2,
  User as UserIcon,
  Users
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import StudentSidebar from "../components/shared/StudentSidebar";
import NotificationModal from "../components/shared/NotificationModal";
import { useNotification } from "../components/shared/useNotification";

export default function LearningHub() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("today");
  const [hasClass, setHasClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("learning-hub");
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [user, setUser] = useState(null);
  const [studentProgress, setStudentProgress] = useState([]);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [learnedTopics, setLearnedTopics] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [todayLearningSessions, setTodayLearningSessions] = useState([]);
  const { notification, showError, closeNotification } = useNotification();

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

      console.log('🔍 Starting loadData...');

      // Get current user
      const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.error('❌ User auth failed:', await userResponse.text());
        navigate(createPageUrl("Login"));
        return;
      }

      const currentUser = await userResponse.json();
      console.log('✅ User loaded:', currentUser);
      
      // Redirect teachers to teacher dashboard
      if (currentUser.account_type === "teacher") {
        navigate(createPageUrl("TeacherDashboard"));
        return;
      }

      localStorage.setItem('currentUser', JSON.stringify(currentUser));
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
        console.log('✅ Enrollments loaded:', enrollmentsData.length);
        console.log('📋 Raw enrollments:', enrollmentsData);
      } else {
        console.error('❌ Enrollments failed:', await enrollmentsResponse.text());
      }
      
      setEnrollments(enrollmentsData);
      setHasClass(enrollmentsData.length > 0);

      if (enrollmentsData.length > 0) {
        // Get all related data
        const classesRes = await fetch(`${API_BASE}/api/classes`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const allClasses = classesRes.ok ? await classesRes.json() : [];
        console.log('✅ All classes loaded:', allClasses.length);
        
        // Filter classes based on enrollments with null safety
        const enrolledClassIds = enrollmentsData
          .filter(e => e && e.class_id) // Filter out null enrollments
          .map(e => {
            // Handle both populated and non-populated class_id
            if (typeof e.class_id === 'object' && e.class_id !== null) {
              return (e.class_id._id || e.class_id.id)?.toString();
            }
            return e.class_id?.toString();
          })
          .filter(Boolean); // Remove undefined/null IDs
        
        console.log('📋 Enrolled class IDs:', enrolledClassIds);
        
        const validClasses = allClasses.filter(c => 
          c && (c._id || c.id) && enrolledClassIds.includes((c._id || c.id).toString())
        );
        console.log('✅ Valid enrolled classes:', validClasses.length);
        setClasses(validClasses);

        // Set selected class
        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && validClasses.some(c => (c._id || c.id).toString() === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (validClasses.length > 0) {
          const firstClassId = (validClasses[0]._id || validClasses[0].id).toString();
          setSelectedClassId(firstClassId);
          localStorage.setItem('selectedClassId', firstClassId);
        }

        // Get progress
        const progressRes = await fetch(`${API_BASE}/api/progress/student/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const progressData = progressRes.ok ? await progressRes.json() : [];
        console.log('✅ Progress loaded:', progressData.length);
        setStudentProgress(progressData);
      }
    } catch (err) {
      console.error("❌ Failed to load data:", err);
      showError("Error Loading Data", `Failed to load your learning data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      console.log('🔍 Loading class data for:', selectedClassId);

      const selectedClass = classes.find(c => (c._id || c.id).toString() === selectedClassId);
      if (!selectedClass) {
        console.error('❌ Selected class not found');
        return;
      }

      console.log('📚 Selected class:', selectedClass);

      const curriculumId = selectedClass.curriculum_id;
      if (!curriculumId) {
        console.error('❌ No curriculum_id found in class:', selectedClass);
        showError("Curriculum Missing", "This class does not have a curriculum assigned.");
        return;
      }
      
      console.log('📚 Curriculum ID:', curriculumId);

      // Get curriculum
      const curriculumRes = await fetch(`${API_BASE}/api/curriculum`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });

      if (!curriculumRes.ok) {
        const errorText = await curriculumRes.text();
        console.error('❌ Failed to fetch curriculum:', errorText);
        throw new Error('Failed to fetch curriculum');
      }

      const allCurricula = await curriculumRes.json();
      console.log('✅ All curricula loaded:', allCurricula.length);
      
      const curriculumData = allCurricula.find(c => (c._id || c.id).toString() === curriculumId?.toString());
      
      if (!curriculumData) {
        console.error('❌ Curriculum not found for ID:', curriculumId);
        showError("Curriculum Not Found", "The curriculum for this class could not be found.");
        return;
      }

      console.log('✅ Curriculum found:', curriculumData.curriculum_name);
      setCurriculum(curriculumData);

      // Get units
      const unitsRes = await fetch(`${API_BASE}/api/units`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const allUnits = unitsRes.ok ? await unitsRes.json() : [];
      const unitsData = allUnits
        .filter(u => (u.curriculum_id || u.curriculum_id)?.toString() === curriculumId.toString())
        .sort((a, b) => a.unit_order - b.unit_order);
      console.log('✅ Units loaded:', unitsData.length);
      setUnits(unitsData);

      // Get subunits
      const subunitsRes = await fetch(`${API_BASE}/api/subunits`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const allSubunits = subunitsRes.ok ? await subunitsRes.json() : [];
      const unitIds = unitsData.map(u => (u._id || u.id).toString());
      const relevantSubunits = allSubunits
        .filter(sub => unitIds.includes((sub.unit_id || sub.unit_id)?.toString()))
        .sort((a, b) => a.subunit_order - b.subunit_order);
      console.log('✅ Subunits loaded:', relevantSubunits.length);
      setSubunits(relevantSubunits);

      // Get assignments
      const assignmentsRes = await fetch(`${API_BASE}/api/assignments`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const allAssignments = assignmentsRes.ok ? await assignmentsRes.json() : [];
      const classAssignments = allAssignments.filter(a => 
        (a.class_id || a.class_id)?.toString() === selectedClassId
      );
      console.log('✅ Assignments loaded:', classAssignments.length);
      setAssignments(classAssignments);

      // Calculate learned topics
      const classSubunitIds = relevantSubunits.map(s => (s._id || s.id).toString());
      const learned = studentProgress.filter(p => 
        classSubunitIds.includes((p.subunit_id || p.subunit_id)?.toString()) && 
        (p.new_session_completed === true || p.status === 'completed')
      ).length;
      setLearnedTopics(learned);

      // Calculate day streak (set to 0 for now - needs LearningSession model)
      setDayStreak(0);
      setTodayLearningSessions([]);
      
      console.log('✅ Class data fully loaded');
    } catch (err) {
      console.error("❌ Failed to load class data:", err);
      showError("Error Loading Class", `Failed to load class data: ${err.message}`);
    }
  };

  const calculateDayStreak = (sessions) => {
    if (sessions.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessionDates = sessions
      .map(s => {
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
    if (daysSinceRecent === 1) { 
      expectedDate = today.getTime() - (1000 * 60 * 60 * 24);
    }

    for (const sessionDate of sessionDates) {
      const diff = Math.floor((expectedDate - sessionDate) / (1000 * 60 * 60 * 24));

      if (diff === 0) {
        streak++;
        expectedDate = sessionDate - (1000 * 60 * 60 * 24);
      } else if (diff > 0) {
        break;
      }
    }

    return streak;
  };

  const getAssignmentDueDate = (subunitId) => {
    const assignment = assignments.find(a => (a.subunit_id || a.subunit_id)?.toString() === subunitId.toString());
    return assignment?.due_date ? new Date(assignment.due_date) : null;
  };

  const isSubunitAssigned = (subunitId) => {
    return assignments.some(a => (a.subunit_id || a.subunit_id)?.toString() === subunitId.toString());
  };

  const getTodayNewSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return subunits
      .filter(sub => {
        const subId = (sub._id || sub.id).toString();
        const progress = studentProgress.find(p => (p.subunit_id || p.subunit_id)?.toString() === subId);
        if (progress?.new_session_completed || progress?.status === 'completed') return false;
        
        const assignment = assignments.find(a => (a.subunit_id || a.subunit_id)?.toString() === subId);
        if (!assignment?.due_date) return false;
        
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateOnly <= today;
      })
      .map(sub => {
        const subId = (sub._id || sub.id).toString();
        const unit = units.find(u => (u._id || u.id).toString() === (sub.unit_id || sub.unit_id)?.toString());
        const assignment = assignments.find(a => (a.subunit_id || a.subunit_id)?.toString() === subId);
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const daysLate = Math.max(0, Math.floor((today - dueDateOnly) / (1000 * 60 * 60 * 24)));
        
        return {
          id: subId,
          topic: sub.subunit_name,
          unit: unit?.unit_name || "Unit",
          type: "New Topic",
          status: daysLate > 0 ? "overdue" : "available",
          subunitId: subId,
          dueDate: dueDate.toISOString(),
          daysLate
        };
      });
  };

  const getReviewSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const reviews = studentProgress
      .filter(p => (p.new_session_completed || p.status === 'completed') && p.next_review_date)
      .map(p => {
        const subId = (p.subunit_id || p.subunit_id)?.toString();
        const subunit = subunits.find(s => (s._id || s.id).toString() === subId);
        if (!subunit) return null;

        const unit = units.find(u => (u._id || u.id).toString() === (subunit.unit_id || subunit.unit_id)?.toString());
        const nextReview = new Date(p.next_review_date);
        const dueDate = new Date(nextReview.getFullYear(), nextReview.getMonth(), nextReview.getDate());
        const daysLate = Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));

        return {
          id: (p._id || p.id).toString(),
          topic: subunit.subunit_name,
          unit: unit?.unit_name || "Unit",
          reviewNumber: (p.review_count || 0) + 1,
          daysLate,
          dueDate: p.next_review_date,
          status: daysLate > 0 ? "overdue" : (dueDate.getTime() === today.getTime() ? "due" : "upcoming"),
          subunitId: subId,
          nextReviewDate: dueDate
        };
      })
      .filter(Boolean)
      .filter(r => r.status === "overdue" || r.status === "due")
      .sort((a, b) => b.daysLate - a.daysLate || a.nextReviewDate - b.nextReviewDate);

    return reviews;
  };

  const getUpcomingSessions = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcoming = [];

    // Get review sessions
    const reviews = studentProgress
      .filter(p => (p.new_session_completed || p.status === 'completed') && p.next_review_date)
      .map(p => {
        const subId = (p.subunit_id || p.subunit_id)?.toString();
        const subunit = subunits.find(s => (s._id || s.id).toString() === subId);
        if (!subunit) return null;

        const unit = units.find(u => (u._id || u.id).toString() === (subunit.unit_id || subunit.unit_id)?.toString());
        const nextReview = new Date(p.next_review_date);
        const dueDate = new Date(nextReview.getFullYear(), nextReview.getMonth(), nextReview.getDate());

        if (dueDate <= today) return null;

        return {
          id: (p._id || p.id).toString(),
          topic: subunit.subunit_name,
          unit: unit?.unit_name || "Unit",
          reviewNumber: (p.review_count || 0) + 1,
          dueDate: p.next_review_date,
          status: "scheduled",
          nextReviewDate: dueDate,
          type: "review"
        };
      })
      .filter(Boolean);

    upcoming.push(...reviews);

    // Get future assigned new topics
    const futureNewTopics = subunits
      .filter(sub => {
        const subId = (sub._id || sub.id).toString();
        const progress = studentProgress.find(p => (p.subunit_id || p.subunit_id)?.toString() === subId);
        if (progress?.new_session_completed || progress?.status === 'completed') return false;
        
        const assignment = assignments.find(a => (a.subunit_id || a.subunit_id)?.toString() === subId);
        if (!assignment?.due_date) return false;
        
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        return dueDateOnly > today;
      })
      .map(sub => {
        const subId = (sub._id || sub.id).toString();
        const unit = units.find(u => (u._id || u.id).toString() === (sub.unit_id || sub.unit_id)?.toString());
        const assignment = assignments.find(a => (a.subunit_id || a.subunit_id)?.toString() === subId);
        const dueDate = new Date(assignment.due_date + 'T00:00:00');
        
        return {
          id: subId,
          topic: sub.subunit_name,
          unit: unit?.unit_name || "Unit",
          dueDate: dueDate.toISOString(),
          status: "scheduled",
          nextReviewDate: dueDate,
          type: "new"
        };
      });

    upcoming.push(...futureNewTopics);

    return upcoming.sort((a, b) => a.nextReviewDate - b.nextReviewDate);
  };

  const getCompletedSessions = (classSubunitIds) => {
    if (!classSubunitIds || !subunits || !studentProgress) return [];
    
    return studentProgress
      .filter(p => {
        const subId = (p.subunit_id || p.subunit_id)?.toString();
        return (p.new_session_completed === true || p.status === 'completed') && 
               classSubunitIds.includes(subId);
      })
      .map(p => {
        const subId = (p.subunit_id || p.subunit_id)?.toString();
        const subunit = subunits.find(s => (s._id || s.id).toString() === subId);
        if (!subunit) return null;

        const unit = units.find(u => (u._id || u.id).toString() === (subunit.unit_id || subunit.unit_id)?.toString());

        return {
          id: (p._id || p.id).toString(),
          topic: subunit.subunit_name,
          unit: unit?.unit_name || "Unit",
          completedDate: p.last_review_date || p.updated_date || p.updatedAt,
          score: p.new_session_score || p.score || 0,
          type: (p.review_count || 0) > 0 ? `Review #${p.review_count}` : "New Session"
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
  };

  const newSessions = getTodayNewSessions();
  const reviewSessions = getReviewSessions();
  const upcomingSessions = getUpcomingSessions();
  const completedSessions = getCompletedSessions(subunits.map(s => (s._id || s.id).toString()));

  const getTodayStats = (todayLearningSessions, studentProgress, classSubunitIds) => {
    if (!todayLearningSessions || !studentProgress || !classSubunitIds) {
      return { masteredToday: 0, timeSpentToday: 0 };
    }

    const masteredToday = todayLearningSessions.filter(s => {
      const subId = (s.subunit_id || s.subunit_id)?.toString();
      const progress = studentProgress.find(p => (p.subunit_id || p.subunit_id)?.toString() === subId);
      return classSubunitIds.includes(subId) && 
             (progress?.new_session_completed === true || progress?.status === 'completed');
    }).length;

    const timeSpentToday = todayLearningSessions.reduce((sum, s) => sum + (s.total_time_seconds || 0), 0);

    return {
      masteredToday,
      timeSpentToday: Math.round(timeSpentToday / 60)
    };
  };

  const todayStats = getTodayStats(todayLearningSessions, studentProgress, subunits.map(s => (s._id || s.id).toString()));
  const sessionsDueToday = newSessions.length + reviewSessions.filter(s => s.status === "due" || s.status === "overdue").length;

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

  const handleNewSessionClick = (session) => {
    navigate(createPageUrl("NewSession") + `?topic=${encodeURIComponent(session.subunitId)}`);
  };

  const handleReviewSessionClick = (session) => {
    const subunitId = session.subunitId || session.id;
    navigate(createPageUrl("PracticeSession") + `?topic=${encodeURIComponent(subunitId)}&review=${session.reviewNumber}`);
  };

  const todaySessions = [
    ...newSessions.map(s => ({ ...s, category: "new" })),
    ...reviewSessions.filter(s => s.status === "due" || s.status === "overdue").map(s => ({ ...s, category: "review" }))
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

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

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white" style={{fontFamily: '"Inter", sans-serif'}}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !hasClass ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-[#2563EB]/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Home className="w-12 h-12 text-[#2563EB]" />
              </div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Join a class first</h2>
              <p className="text-[#1A1A1A]/70 mb-8" style={{fontWeight: 450}}>You need to join a class to access your learning sessions</p>
              <button 
                onClick={() => navigate(createPageUrl("JoinClass"))}
                className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                Join a Class
              </button>
            </div>
          </div>
        ) : (
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-black mb-1">Learning Hub</h1>
            <p className="text-sm text-gray-600">Your personalized learning journey</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5" />
                      <h2 className="text-lg font-semibold text-black">Learning Sessions</h2>
                    </div>
                    <Badge variant="secondary" className="text-xs">{todaySessions.length} due</Badge>
                  </div>

                  <div className="flex gap-6 mb-6 border-b border-gray-200">
                    <button onClick={() => setActiveTab("today")} className={`pb-3 text-sm font-medium flex items-center gap-1.5 relative transition-all ${activeTab === "today" ? "text-black" : "text-gray-500"}`}>
                      <Clock className="w-4 h-4" />
                      Today
                      {activeTab === "today" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>}
                    </button>
                    <button onClick={() => setActiveTab("upcoming")} className={`pb-3 text-sm font-medium flex items-center gap-1.5 relative transition-all ${activeTab === "upcoming" ? "text-black" : "text-gray-500"}`}>
                      <Calendar className="w-4 h-4" />
                      Upcoming
                      {activeTab === "upcoming" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>}
                    </button>
                    <button onClick={() => setActiveTab("completed")} className={`pb-3 text-sm font-medium flex items-center gap-1.5 relative transition-all ${activeTab === "completed" ? "text-black" : "text-gray-500"}`}>
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                      {activeTab === "completed" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"></div>}
                    </button>
                  </div>

                  {activeTab === "today" && (
                    <div className="space-y-4">
                      {newSessions.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">New Topics</h3>
                          <div className="space-y-3">
                            {newSessions.map((session) => (
                              <div 
                                key={session.id} 
                                onClick={() => handleNewSessionClick(session)}
                                className={`flex items-center justify-between p-4 border rounded-lg hover:border-gray-400 transition-all cursor-pointer ${session.status === "overdue" ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 border rounded-lg flex items-center justify-center ${session.status === "overdue" ? "bg-red-100 border-red-200" : "bg-green-100 border-green-200"}`}>
                                    <BookOpen className={`w-5 h-5 ${session.status === "overdue" ? "text-red-600" : "text-green-600"}`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-black text-sm">{session.topic}</h3>
                                      {session.status === "overdue" ? (
                                        <Badge className="text-xs bg-red-100 text-red-700">{session.daysLate}d late</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">New</Badge>
                                      )}
                                    </div>
                                    <p className={`text-xs ${session.status === "overdue" ? "text-red-600" : "text-gray-500"}`}>
                                      {session.unit}{session.dueDate && ` • Due ${new Date(session.dueDate).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {reviewSessions.filter(s => s.status === "overdue").length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-red-600 mb-3">Overdue Reviews</h3>
                          <div className="space-y-3">
                            {reviewSessions.filter(s => s.status === "overdue").map((session) => (
                              <div 
                                key={session.id} 
                                onClick={() => handleReviewSessionClick(session)}
                                className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg hover:border-red-400 transition-all cursor-pointer"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-red-100 border border-red-200 rounded-lg flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-black text-sm">{session.topic}</h3>
                                      <Badge className="text-xs bg-red-100 text-red-700">Review #{session.reviewNumber}</Badge>
                                    </div>
                                    <p className="text-xs text-red-600">{session.unit} • {session.daysLate}d overdue</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {reviewSessions.filter(s => s.status === "due").length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Due Today</h3>
                          <div className="space-y-3">
                            {reviewSessions.filter(s => s.status === "due").map((session) => (
                              <div 
                                key={session.id} 
                                onClick={() => handleReviewSessionClick(session)}
                                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-400 transition-all cursor-pointer bg-white"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-black text-sm">{session.topic}</h3>
                                      <Badge variant="secondary" className="text-xs">Review #{session.reviewNumber}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-500">{session.unit} • Due today</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {todaySessions.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No sessions due today! 🎉</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === "upcoming" && (
                    <div className="space-y-3">
                      {upcomingSessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No upcoming sessions</p>
                        </div>
                      ) : (
                        upcomingSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-gray-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-black text-sm">{session.topic}</h3>
                                  {session.type === "review" ? (
                                    <Badge variant="secondary" className="text-xs">Review #{session.reviewNumber}</Badge>
                                  ) : (
                                    <Badge className="text-xs bg-green-100 text-green-700">New</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{session.unit} • Due {new Date(session.dueDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === "completed" && (
                    <div className="space-y-3">
                      {completedSessions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="text-sm">No completed sessions yet</p>
                        </div>
                      ) : (
                        completedSessions.map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-100 border border-green-200 rounded-lg flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-black text-sm">{session.topic}</h3>
                                  <Badge className="text-xs bg-green-100 text-green-700">{session.score}%</Badge>
                                </div>
                                <p className="text-xs text-gray-500">{session.unit} • {session.type} • {new Date(session.completedDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-black mb-4">Today's Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Topics Mastered Today</span>
                      <span className="text-sm font-semibold text-green-600">{todayStats.masteredToday}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Time Spent Today</span>
                      <span className="text-sm font-semibold text-black">{todayStats.timeSpentToday}m</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-sm text-gray-600">Sessions Due Today</span>
                      <span className="text-sm font-semibold text-black">{sessionsDueToday}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-gray-600">Current Streak</span>
                      <span className="text-sm font-semibold text-black">{dayStreak} days</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        )}
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}
