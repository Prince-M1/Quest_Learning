import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Target,
  Filter,
  BookOpen,
  Home,
  BarChart3,
  FileText,
  Flame,
  LogOut,
  ChevronLeft,
  Clock,
  TrendingUp,
  User,
  Award,
  Users
} from "lucide-react";
import StudentSidebar from "../components/shared/StudentSidebar";
import NotificationModal from "../components/shared/NotificationModal";
import { useNotification } from "../components/shared/useNotification";

export default function Progress() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("progress");
  const [filterCritical, setFilterCritical] = useState(false);
  const [hasClass, setHasClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [user, setUser] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [studentProgress, setStudentProgress] = useState([]);
  const [learnedTopics, setLearnedTopics] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [dayStreak, setDayStreak] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [quizAvg, setQuizAvg] = useState(0);
  const [classLearningSessions, setClassLearningSessions] = useState([]);
  const { notification, closeNotification } = useNotification();

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

      if (!enrollmentsResponse.ok) {
        console.warn("No enrollments found");
        setEnrollments([]);
        setHasClass(false);
        setLoading(false);
        return;
      }

      const enrollmentsData = await enrollmentsResponse.json();
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

        const classesData = allClasses.filter(c =>
          enrolledClassIds.includes((c._id || c.id).toString())
        );
        setClasses(classesData);

        // Set selected class
        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && classesData.some(c => (c._id || c.id).toString() === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (classesData.length > 0) {
          const firstClassId = (classesData[0]._id || classesData[0].id).toString();
          setSelectedClassId(firstClassId);
          localStorage.setItem('selectedClassId', firstClassId);
        }

        // Load achievements (placeholder - implement when you add achievements)
        setAchievements([]);
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
      const [curriculaRes, unitsRes, subunitsRes, progressRes] = await Promise.all([
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
        })
      ]);

      const allCurricula = await curriculaRes.json();
      const allUnits = await unitsRes.json();
      const allSubunits = await subunitsRes.json();
      const progressData = progressRes.ok ? await progressRes.json() : [];

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

        // Calculate learned topics
        const classSubunitIds = relevantSubunits.map(s => (s._id || s.id).toString());
        const learned = progressData.filter(p => {
          const pSubunitId = (p.subunit_id || '').toString();
          return classSubunitIds.includes(pSubunitId) && 
                 (p.new_session_completed === true || p.status === 'completed');
        }).length;
        setLearnedTopics(learned);

        // Day streak, time spent, quiz average - set to 0 for now (implement when learning sessions exist)
        setDayStreak(0);
        setTimeSpent(0);
        setQuizAvg(0);
        setClassLearningSessions([]);
      }
    } catch (err) {
      console.error("Failed to load class data:", err);
    }
  };

  const getUnitsWithProgress = () => {
    if (!units || !subunits || !studentProgress) return [];
    
    return units.map(unit => {
      const unitId = (unit._id || unit.id).toString();
      const unitSubunits = subunits.filter(s => {
        const subUnitId = s.unit_id;
        if (!subUnitId) return false;
        const subUnitIdStr = typeof subUnitId === 'object' ? (subUnitId._id || subUnitId).toString() : subUnitId.toString();
        return subUnitIdStr === unitId;
      });

      const completedCount = unitSubunits.filter(sub => {
        const subId = (sub._id || sub.id).toString();
        const progress = studentProgress.find(p => (p.subunit_id || '').toString() === subId);
        return progress && (progress.new_session_completed === true || progress.status === 'completed');
      }).length;

      const percentage = unitSubunits.length > 0 ? Math.round((completedCount / unitSubunits.length) * 100) : 0;
      
      return {
        name: unit.unit_name,
        subunitsLearned: completedCount,
        totalSubunits: unitSubunits.length,
        percentage
      };
    });
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

  const getWeeklyActivity = (sessions) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);
    return days.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + index);
      dayDate.setHours(0, 0, 0, 0);
      const sessionsOnDay = (sessions || []).filter(p => {
        if (!p.start_time) return false;
        const sessionDate = new Date(p.start_time);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === dayDate.getTime();
      }).length;
      return {
        day,
        active: sessionsOnDay > 0,
        concepts: sessionsOnDay
      };
    });
  };

  const weeklyActivity = getWeeklyActivity(classLearningSessions);
  const unitsWithProgress = getUnitsWithProgress();
  const classSubunitIds = subunits?.map(s => (s._id || s.id).toString()) || [];
  const totalMastered = studentProgress?.filter(p => {
    const pSubunitId = (p.subunit_id || '').toString();
    return classSubunitIds.includes(pSubunitId) && 
           (p.new_session_completed === true || p.status === 'completed');
  }).length || 0;
  const totalSubunits = subunits?.length || 0;

  const handleNavigation = (tab, route) => {
    setActiveNav(tab);
    if (route) {
      navigate(createPageUrl(route));
    }
  };

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
                <BarChart3 className="w-12 h-12 text-[#2563EB]" />
              </div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">No progress yet</h2>
              <p className="text-[#1A1A1A]/70 mb-8" style={{fontWeight: 450}}>Join a class to start tracking your learning progress</p>
              <button 
                onClick={() => navigate(createPageUrl("Classes"))}
                className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                Go to Classes
              </button>
            </div>
          </div>
        ) : (
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent mb-2">Progress Dashboard</h1>
                <p className="text-sm text-gray-600">Track your learning journey and celebrate your achievements</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-black mb-1">{totalMastered}</p>
                    <p className="text-xs text-gray-600">Concepts Mastered</p>
                  </div>
                  <User className="w-10 h-10 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-black mb-1">{dayStreak}</p>
                    <p className="text-xs text-gray-600">Day Streak</p>
                  </div>
                  <Flame className="w-10 h-10 text-orange-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-black mb-1">{timeSpent}h</p>
                    <p className="text-xs text-gray-600">This Week</p>
                  </div>
                  <Clock className="w-10 h-10 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-semibold text-black mb-1">{quizAvg}%</p>
                    <p className="text-xs text-gray-600">Quiz Average</p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Unit Progress */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Target className="w-5 h-5" />
                    <h2 className="text-lg font-semibold text-black">Unit Progress</h2>
                  </div>

                  <div className="space-y-4">
                    {unitsWithProgress.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No units available yet</p>
                      </div>
                    ) : (
                      unitsWithProgress.map((unit, index) => (
                        <div key={index} className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:shadow-md transition-all">
                          <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-black text-sm">{unit.name}</h3>
                                <p className="text-xs text-gray-500">{unit.subunitsLearned}/{unit.totalSubunits} subunits completed</p>
                              </div>
                              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{unit.percentage}%</p>
                            </div>
                            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full transition-all duration-500" style={{ width: `${unit.percentage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-black mb-4">Insights</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-black text-sm mb-2">Strongest Unit</h3>
                      <p className="font-semibold text-black text-base">
                        {unitsWithProgress.length > 0 ? unitsWithProgress.reduce((max, u) => u.percentage > max.percentage ? u : max).name : "N/A"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {unitsWithProgress.length > 0 ? unitsWithProgress.reduce((max, u) => u.percentage > max.percentage ? u : max).percentage : 0}% mastery
                      </p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="font-semibold text-black text-sm mb-2">Focus Area</h3>
                      <p className="font-semibold text-black text-base">
                        {unitsWithProgress.length > 0 ? unitsWithProgress.reduce((min, u) => u.percentage < min.percentage ? u : min).name : "N/A"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {unitsWithProgress.length > 0 ? unitsWithProgress.reduce((min, u) => u.percentage < min.percentage ? u : min).percentage : 0}% complete
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-black mb-4">Weekly Activity</h2>
                  <div className="grid grid-cols-7 gap-1 mb-6">
                    {weeklyActivity.map((day, index) => (
                      <div key={index} className="text-center">
                        <p className="text-xs text-gray-500 mb-2 font-medium">{day.day}</p>
                        <div className={`w-full h-11 rounded-lg flex items-center justify-center text-sm font-semibold ${day.active ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                          {day.concepts}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Concepts</span>
                      <span className="font-semibold text-black">{totalSubunits}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed</span>
                      <span className="font-semibold text-black">{totalMastered}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-gray-200">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-black mb-4">Achievements</h2>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-3xl font-semibold text-black mb-1">{achievements.length}</p>
                      <p className="text-xs text-gray-600 font-medium">Unlocked</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-3xl font-semibold text-black mb-1">{totalMastered}</p>
                      <p className="text-xs text-gray-600 font-medium">Topics</p>
                    </div>
                  </div>
                  {achievements.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {achievements.map(ach => (
                        <div key={ach.id} className="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-black text-xs">{ach.name}</p>
                              <p className="text-xs text-gray-600">{ach.criteria}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <p className="text-xs text-gray-600">Keep learning to unlock achievements!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        )}
      </div>

      {newAchievement && (
        <NotificationModal
          isOpen={!!newAchievement}
          onClose={() => setNewAchievement(null)}
          type="success"
          title="Achievement Unlocked! 🎉"
          message={`You earned "${newAchievement.name}" - ${newAchievement.criteria}`}
        />
      )}
    </div>
  );
}