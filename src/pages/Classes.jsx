import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen,
  Plus,
  GraduationCap,
  Users,
  Calendar,
  CheckCircle,
  Clock
} from "lucide-react";
import StudentSidebar from "../components/shared/StudentSidebar";

export default function Classes() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("classes");
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [joiningClass, setJoiningClass] = useState(false);
  const [error, setError] = useState("");
  const [studentProgress, setStudentProgress] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [learnedTopics, setLearnedTopics] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [subunits, setSubunits] = useState([]);
  const [units, setUnits] = useState([]);
  const [assignments, setAssignments] = useState([]); // NEW: Store assignments

  useEffect(() => {
    loadData();
    
    // Poll for updates every 30 seconds to catch new assignments
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedClassId && user && classes.length > 0) {
      loadClassData();
    }
  }, [selectedClassId, user, classes, studentProgress]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      console.log('🔍 Loading classes data...');

      // Get current user
      const userResponse = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        console.error('❌ User auth failed');
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

      if (!enrollmentsResponse.ok) {
        console.warn("No enrollments found");
        setEnrollments([]);
        setLoading(false);
        return;
      }

      const enrollmentsData = await enrollmentsResponse.json();
      console.log('✅ Enrollments loaded:', enrollmentsData.length);
      console.log('📋 Raw enrollments:', enrollmentsData);
      setEnrollments(enrollmentsData);

      if (enrollmentsData.length > 0) {
        // Get enrolled class IDs
        const enrolledClassIds = enrollmentsData
          .filter(e => e && e.class_id)
          .map(e => {
            if (typeof e.class_id === 'string') return e.class_id;
            if (typeof e.class_id === 'object' && e.class_id !== null) {
              return (e.class_id._id || e.class_id.id)?.toString();
            }
            return null;
          })
          .filter(Boolean);

        console.log('📋 Enrolled class IDs:', enrolledClassIds);

        // Get all related data in parallel - INCLUDING ASSIGNMENTS
        const [classesRes, curriculaRes, progressRes, unitsRes, subunitsRes, assignmentsRes] = await Promise.all([
          fetch(`${API_BASE}/api/classes`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_BASE}/api/curriculum`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_BASE}/api/progress/student/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_BASE}/api/units`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          fetch(`${API_BASE}/api/subunits`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
          }),
          // FIXED: Fetch assignments for all enrolled classes
          fetch(`${API_BASE}/api/assignments/classes`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ classIds: enrolledClassIds })
          }).catch(err => {
            console.error('❌ Failed to fetch assignments:', err);
            return { ok: false };
          })
        ]);

        const allClasses = classesRes.ok ? await classesRes.json() : [];
        const allCurricula = curriculaRes.ok ? await curriculaRes.json() : [];
        const progressData = progressRes.ok ? await progressRes.json() : [];
        const allUnits = unitsRes.ok ? await unitsRes.json() : [];
        const allSubunits = subunitsRes.ok ? await subunitsRes.json() : [];
        const assignmentsData = assignmentsRes.ok ? await assignmentsRes.json() : [];

        console.log('✅ All classes loaded:', allClasses.length);
        console.log('✅ All curricula loaded:', allCurricula.length);
        console.log('✅ Progress loaded:', progressData.length);
        console.log('✅ Units loaded:', allUnits.length);
        console.log('✅ Subunits loaded:', allSubunits.length);
        console.log('✅ Assignments loaded:', assignmentsData.length);

        // Filter classes based on enrollments
        const classesData = allClasses.filter(c => 
          c && (c._id || c.id) && enrolledClassIds.includes((c._id || c.id).toString())
        );
        console.log('✅ Valid enrolled classes:', classesData.length);
        setClasses(classesData);

        // Get unique curricula for enrolled classes
        const curriculaIds = [...new Set(
          classesData
            .map(c => c.curriculum_id?.toString())
            .filter(Boolean)
        )];
        
        const curriculaData = allCurricula.filter(c => 
          c && (c._id || c.id) && curriculaIds.includes((c._id || c.id).toString())
        );
        console.log('✅ Relevant curricula:', curriculaData.length);
        setCurricula(curriculaData);
        
        setStudentProgress(progressData);
        setUnits(allUnits);
        setSubunits(allSubunits);
        setAssignments(assignmentsData); // FIXED: Store assignments

        // Set selected class
        const savedClassId = localStorage.getItem('selectedClassId');
        if (savedClassId && classesData.some(c => (c._id || c.id).toString() === savedClassId)) {
          setSelectedClassId(savedClassId);
        } else if (classesData.length > 0) {
          const firstClassId = (classesData[0]._id || classesData[0].id).toString();
          setSelectedClassId(firstClassId);
          localStorage.setItem('selectedClassId', firstClassId);
        }
      }
    } catch (err) {
      console.error("❌ Failed to load data:", err);
      setError("Failed to load classes. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async () => {
    try {
      const selectedClass = classes.find(c => (c._id || c.id).toString() === selectedClassId);
      if (!selectedClass) {
        console.warn('⚠️ Selected class not found');
        return;
      }

      const curriculumData = curricula.find(c => 
        (c._id || c.id).toString() === selectedClass.curriculum_id?.toString()
      );
      
      if (!curriculumData) {
        console.warn('⚠️ Curriculum not found for class');
        return;
      }

      const curriculumId = (curriculumData._id || curriculumData.id).toString();
      
      // Get units for this curriculum
      const unitsData = units
        .filter(u => (u.curriculum_id)?.toString() === curriculumId)
        .sort((a, b) => (a.unit_order || 0) - (b.unit_order || 0));
      
      // Get subunits for these units
      const unitIds = unitsData.map(u => (u._id || u.id).toString());
      const relevantSubunits = subunits
        .filter(sub => unitIds.includes((sub.unit_id)?.toString()))
        .sort((a, b) => (a.subunit_order || 0) - (b.subunit_order || 0));
      
      const classSubunitIds = relevantSubunits.map(s => (s._id || s.id).toString());

      // Calculate learned topics (class specific)
      const learned = studentProgress.filter(p =>
        classSubunitIds.includes((p.subunit_id)?.toString()) && 
        (p.new_session_completed === true || p.status === 'completed')
      ).length;
      
      console.log('📊 Learned topics for class:', learned);
      setLearnedTopics(learned);

      // Day streak calculation - needs LearningSession endpoint
      setDayStreak(0);

    } catch (err) {
      console.error("❌ Failed to load class data for sidebar:", err);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      setError("Please enter a join code");
      return;
    }

    setJoiningClass(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      console.log('🔍 Joining class with code:', joinCode);

      // Find class by join code
      const classResponse = await fetch(
        `${API_BASE}/api/classes/join-code/${joinCode.toUpperCase().trim()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!classResponse.ok) {
        setError("Invalid join code. Please check and try again.");
        setJoiningClass(false);
        return;
      }

      const classToJoin = await classResponse.json();
      console.log('✅ Found class:', classToJoin);
      
      const userId = user._id || user.id;
      const classId = classToJoin._id || classToJoin.id;

      // Check if already enrolled
      const enrollmentCheckResponse = await fetch(
        `${API_BASE}/api/enrollments/student/${userId}/class/${classId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (enrollmentCheckResponse.ok) {
        setError("You're already enrolled in this class!");
        setJoiningClass(false);
        return;
      }

      // Create enrollment
      const enrollmentResponse = await fetch(`${API_BASE}/api/enrollments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: userId,
          class_id: classId,
          student_full_name: user.name || user.full_name || user.email,
          student_email: user.email,
          enrollment_date: new Date().toISOString()
        })
      });

      if (!enrollmentResponse.ok) {
        throw new Error("Failed to create enrollment");
      }

      console.log('✅ Enrollment created');

      // Initialize progress if curriculum exists
      if (classToJoin.curriculum_id) {
        try {
          await fetch(`${API_BASE}/api/progress/initialize`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              student_id: userId,
              curriculum_id: classToJoin.curriculum_id
            })
          });
          console.log('✅ Progress initialized');
        } catch (progressErr) {
          console.warn("⚠️ Progress initialization failed, but enrollment succeeded");
        }
      }

      setJoinCode("");
      setError("");
      await loadData();
      console.log('✅ Successfully joined class!');
    } catch (err) {
      console.error("❌ Failed to join class:", err);
      setError("Failed to join class. Please try again.");
    } finally {
      setJoiningClass(false);
    }
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

  const getCurriculumName = (curriculumId) => {
    if (!curriculumId) return "Unknown";
    const curriculum = curricula.find(c => 
      (c._id || c.id).toString() === curriculumId.toString()
    );
    return curriculum?.subject_name || curriculum?.curriculum_name || "Unknown";
  };

  const getClassProgress = (classId) => {
    const classObj = classes.find(c => (c._id || c.id).toString() === classId.toString());
    if (!classObj || !classObj.curriculum_id) return 0;

    const curriculum = curricula.find(c => 
      (c._id || c.id).toString() === classObj.curriculum_id.toString()
    );
    if (!curriculum) return 0;

    const curriculumId = (curriculum._id || curriculum.id).toString();

    const curriculumUnits = units.filter(u => 
      (u.curriculum_id)?.toString() === curriculumId
    );

    const unitIds = curriculumUnits.map(u => (u._id || u.id).toString());
    const curriculumSubunits = subunits.filter(sub => 
      unitIds.includes((sub.unit_id)?.toString())
    );

    if (curriculumSubunits.length === 0) return 0;

    const subunitIds = curriculumSubunits.map(s => (s._id || s.id).toString());

    const completedCount = studentProgress.filter(p => 
      subunitIds.includes((p.subunit_id)?.toString()) && 
      (p.new_session_completed === true || p.status === 'completed')
    ).length;

    return Math.round((completedCount / curriculumSubunits.length) * 100);
  };

  // NEW: Get assignments for a specific class
  const getClassAssignments = (classId) => {
    return assignments.filter(a => a.class_id === classId);
  };

  // NEW: Check if assignment is overdue
  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // NEW: Check if assignment is completed
  const isAssignmentCompleted = (assignment) => {
    const progress = studentProgress.find(p => 
      (p.subunit_id)?.toString() === assignment.subunit_id?.toString()
    );
    return progress?.new_session_completed === true;
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
        ) : (
          <div className="max-w-5xl mx-auto p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-black mb-1">My Classes</h1>
              <p className="text-sm text-gray-600">View and manage your enrolled classes</p>
            </div>

            {/* Join Class Card */}
            <Card className="border border-gray-200 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Plus className="w-5 h-5 text-black" />
                  <h2 className="text-lg font-semibold text-black">Join a New Class</h2>
                </div>
                <p className="text-sm text-gray-600 mb-4">Enter the 6-character code provided by your teacher</p>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g., ABC123)"
                    maxLength={6}
                    className="flex-1 uppercase tracking-widest font-semibold"
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinClass()}
                  />
                  <Button
                    onClick={handleJoinClass}
                    disabled={joiningClass || !joinCode.trim()}
                    className="bg-black hover:bg-black/90 text-white"
                  >
                    {joiningClass ? "Joining..." : "Join Class"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Classes */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-black mb-4">Enrolled Classes ({classes.length})</h2>
            </div>

            {classes.length === 0 ? (
              <Card className="border border-gray-200">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Yet</h3>
                  <p className="text-gray-600">Use the join code above to enroll in your first class</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {classes.map((classItem) => {
                  const classId = (classItem._id || classItem.id).toString();
                  
                  const enrollment = enrollments.find(e => {
                    if (!e || !e.class_id) return false;
                    const enrollmentClassId = typeof e.class_id === 'string' 
                      ? e.class_id 
                      : (e.class_id._id || e.class_id.id)?.toString();
                    return enrollmentClassId === classId;
                  });
                  
                  const progress = getClassProgress(classId);
                  const classAssignments = getClassAssignments(classId); // NEW
                  const pendingAssignments = classAssignments.filter(a => !isAssignmentCompleted(a)); // NEW
                  const overdueAssignments = pendingAssignments.filter(a => isOverdue(a.due_date)); // NEW
                  
                  return (
                    <Card key={classId} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-black">
                                  {classItem.class_name || "Unnamed Class"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {getCurriculumName(classItem.curriculum_id)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {progress}% Complete
                          </Badge>
                        </div>

                        {/* NEW: Show assignments */}
                        {classAssignments.length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-semibold text-blue-900">
                                {pendingAssignments.length} Pending Assignment{pendingAssignments.length !== 1 ? 's' : ''}
                              </span>
                              {overdueAssignments.length > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {overdueAssignments.length} Overdue
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              {classAssignments.slice(0, 3).map(assignment => {
                                const subunit = subunits.find(s => 
                                  (s._id || s.id).toString() === assignment.subunit_id?.toString()
                                );
                                const completed = isAssignmentCompleted(assignment);
                                const overdue = isOverdue(assignment.due_date);
                                
                                return (
                                  <div key={assignment.id || assignment._id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      {completed ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <Clock className={`w-3 h-3 ${overdue ? 'text-red-600' : 'text-gray-400'}`} />
                                      )}
                                      <span className={completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                                        {subunit?.subunit_name || 'Unknown Topic'}
                                      </span>
                                    </div>
                                    <span className={`${overdue && !completed ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                      Due {new Date(assignment.due_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Overall Progress</span>
                            <span className="text-xs font-medium text-gray-900">{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-black rounded-full transition-all" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>
                              Joined {enrollment?.enrollment_date 
                                ? new Date(enrollment.enrollment_date).toLocaleDateString() 
                                : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            <span>Code: {classItem.join_code || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}