import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Users, 
  BookOpen, 
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Trophy,
  Medal,
  Award
} from "lucide-react";
import SubunitProgressModal from "../components/teacher/SubunitProgressModal";

export default function TeacherClassDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const classId = urlParams.get("id");

  const [classData, setClassData] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassData();
    
    // Poll for updates every 5 seconds (replaces real-time subscriptions)
    const interval = setInterval(() => {
      loadClassData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [classId]);

  const loadClassData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      // Fetch all data in parallel
      const [classRes, curriculaRes, unitsRes, subunitsRes, enrollmentsRes, progressRes] = await Promise.all([
        fetch(`${API_BASE}/api/classes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/curriculum`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/units`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/subunits`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/enrollments/class/${classId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/progress`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => ({ ok: false })) // Progress endpoint might not exist yet
      ]);

      const allClasses = classRes.ok ? await classRes.json() : [];
      const allCurricula = curriculaRes.ok ? await curriculaRes.json() : [];
      const allUnits = unitsRes.ok ? await unitsRes.json() : [];
      const allSubunits = subunitsRes.ok ? await subunitsRes.json() : [];
      const enrollmentsData = enrollmentsRes.ok ? await enrollmentsRes.json() : [];
      const allProgress = progressRes.ok ? await progressRes.json() : [];

      // Find the specific class
      const classInfo = allClasses.find(c => 
        (c._id || c.id).toString() === classId
      );

      if (!classInfo) {
        console.error('Class not found');
        setLoading(false);
        return;
      }

      setClassData(classInfo);

      // Find curriculum
      const curr = allCurricula.find(c => 
        (c._id || c.id).toString() === (classInfo.curriculum_id || classInfo.curriculumId)?.toString()
      );

      if (curr) {
        setCurriculum(curr);
        
        const currId = (curr._id || curr.id).toString();

        // Filter units for this curriculum
        const unitsData = allUnits
          .filter(u => (u.curriculum_id || u.curriculumId)?.toString() === currId)
          .sort((a, b) => (a.unit_order || 0) - (b.unit_order || 0));
        setUnits(unitsData);

        // Filter subunits for these units
        const unitIds = unitsData.map(u => (u._id || u.id).toString());
        const filteredSubunits = allSubunits
          .filter(sub => unitIds.includes((sub.unit_id || sub.unitId)?.toString()))
          .sort((a, b) => (a.subunit_order || 0) - (b.subunit_order || 0));
        setSubunits(filteredSubunits);
      }

      setEnrollments(enrollmentsData);

      if (enrollmentsData.length > 0) {
        // Create student objects from enrollment data
const classStudents = enrollmentsData.map(enrollment => {
  // Handle case where student_id might be an object or a string
  const studentId = typeof enrollment.student_id === 'object' 
    ? (enrollment.student_id._id || enrollment.student_id.id) 
    : enrollment.student_id;
  
  return {
    id: studentId,
    _id: studentId,
    full_name: enrollment.student_full_name,
    email: enrollment.student_email
  };
});
        setStudents(classStudents);

        // Filter progress for students in this class
        const studentIds = enrollmentsData.map(e => e.student_id?.toString());
        const relevantProgress = allProgress.filter(p => 
          studentIds.includes(p.student_id?.toString())
        );
        setProgressData(relevantProgress);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load class data:", err);
      setLoading(false);
    }
  };

  const getAverageProgress = (subunitId) => {
    const subunitProgress = progressData.filter(p => 
      (p.subunit_id || p.subunitId)?.toString() === subunitId.toString()
    );
    if (subunitProgress.length === 0) return 0;
    const total = subunitProgress.reduce((sum, p) => sum + (p.progress_percentage || 0), 0);
    return Math.round(total / subunitProgress.length);
  };

  const getStudentProgress = (studentId, subunitId) => {
    const progress = progressData.find(p => 
      (p.student_id || p.studentId)?.toString() === studentId.toString() && 
      (p.subunit_id || p.subunitId)?.toString() === subunitId.toString()
    );
    return progress?.progress_percentage || 0;
  };

  const getStudentTotalProgress = (studentId) => {
    const studentProgressItems = progressData.filter(p => 
      (p.student_id || p.studentId)?.toString() === studentId.toString()
    );
    if (studentProgressItems.length === 0) return 0;
    const total = studentProgressItems.reduce((sum, p) => sum + (p.progress_percentage || 0), 0);
    return Math.round(total / studentProgressItems.length);
  };

  const getLeaderboardData = () => {
    return students.map(student => ({
      ...student,
      totalProgress: getStudentTotalProgress(student.id || student._id),
      completedSubunits: progressData.filter(p => 
        (p.student_id || p.studentId)?.toString() === (student.id || student._id).toString() && 
        (p.progress_percentage || 0) >= 100
      ).length
    })).sort((a, b) => b.totalProgress - a.totalProgress);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: '"Inter", sans-serif' }}>
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(createPageUrl("TeacherClasses"))}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {classData?.class_name}
                    </h1>
                    <p className="text-sm text-gray-600">{curriculum?.subject_name} • {enrollments.length} Students</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg px-4 py-2">
                <p className="text-xs text-gray-600">Join Code</p>
                <p className="text-xl font-bold text-indigo-600 tracking-wider">{classData?.join_code}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <Tabs defaultValue="mindmap" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl shadow-md mb-8">
              <TabsTrigger 
                value="mindmap" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Progress
              </TabsTrigger>
              <TabsTrigger 
                value="students" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Users className="w-4 h-4 mr-2" />
                Students
              </TabsTrigger>
              <TabsTrigger 
                value="leaderboard" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Trophy className="w-4 h-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mindmap">
              <ClassProgressMindmap 
                units={units}
                subunits={subunits}
                students={students}
                progressData={progressData}
              />
            </TabsContent>

            <TabsContent value="students">
              <StudentProgressBlocks 
                students={students}
                subunits={subunits}
                units={units}
                progressData={progressData}
                classId={classId}
              />
            </TabsContent>

            <TabsContent value="leaderboard">
              <ClassLeaderboard 
                students={students}
                progressData={progressData}
                subunits={subunits}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function ClassProgressMindmap({ units, subunits, students, progressData }) {
  const [sessionFilter, setSessionFilter] = useState("new_topic");

  // Calculate max review count in class
  const maxReviewCount = Math.max(
    0,
    ...progressData.map(p => p.review_count || 0)
  );
  const [selectedSubunit, setSelectedSubunit] = useState(null);

  const getCompletionRate = (subunitId) => {
    if (students.length === 0) return 0;
    
    let completedCount = 0;
    students.forEach(student => {
      const studentIdStr = (student.id || student._id).toString();
      const subunitIdStr = subunitId.toString();
      
      const progress = progressData.find(p => 
        (p.student_id || p.studentId)?.toString() === studentIdStr && 
        (p.subunit_id || p.subunitId)?.toString() === subunitIdStr
      );
      
      if (!progress) return;
      
      if (sessionFilter === "new_topic") {
        if (progress.new_session_completed) completedCount++;
      } else {
        const reviewNum = parseInt(sessionFilter.replace("review_", ""));
        if ((progress.review_count || 0) >= reviewNum) completedCount++;
      }
    });
    
    return Math.round((completedCount / students.length) * 100);
  };

  const sessionLabel = sessionFilter === "new_topic" ? "Learn Session" : `Review ${sessionFilter.replace("review_", "")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Class Completion by Session Type</h2>
        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new_topic">Learn Session</SelectItem>
            {Array.from({ length: Math.max(5, maxReviewCount) }, (_, i) => (
              <SelectItem key={`review_${i + 1}`} value={`review_${i + 1}`}>
                Review {i + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6">
        {units.map((unit, index) => {
          const unitId = (unit._id || unit.id).toString();
          const unitSubunits = subunits.filter(s => 
            (s.unit_id || s.unitId)?.toString() === unitId
          );
          const avgCompletion = unitSubunits.length > 0
            ? Math.round(unitSubunits.reduce((sum, s) => sum + getCompletionRate(s._id || s.id), 0) / unitSubunits.length)
            : 0;

          return (
            <Card key={unitId} className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{unit.unit_name}</h2>
                      <p className="text-indigo-100 text-sm">{sessionLabel} Completion Rate</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{avgCompletion}%</div>
                    <div className="text-indigo-100 text-sm">{unitSubunits.length} topics</div>
                  </div>
                </div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500 shadow-lg"
                    style={{ width: `${avgCompletion}%` }}
                  />
                </div>
              </div>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unitSubunits.map((subunit) => {
                    const subunitId = (subunit._id || subunit.id).toString();
                    const completionRate = getCompletionRate(subunitId);
                    
                    const completedStudents = students.filter(student => {
                      const studentIdStr = (student.id || student._id).toString();
                      const progress = progressData.find(p => 
                        (p.student_id || p.studentId)?.toString() === studentIdStr && 
                        (p.subunit_id || p.subunitId)?.toString() === subunitId
                      );
                      
                      if (!progress) return false;
                      if (sessionFilter === "new_topic") return progress.new_session_completed;
                      const reviewNum = parseInt(sessionFilter.replace("review_", ""));
                      return (progress.review_count || 0) >= reviewNum;
                    }).length;

                    return (
                      <div 
                        key={subunitId} 
                        onClick={() => setSelectedSubunit(subunit)}
                        className="bg-gradient-to-br from-gray-50 to-indigo-50 border-2 border-indigo-100 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-sm">{subunit.subunit_name}</h3>
                          <div className="text-2xl font-bold text-indigo-600">{completionRate}%</div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                          <div 
                            className={`h-full rounded-full transition-all ${completionRate >= 70 ? 'bg-green-500' : completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500">{completedStudents}/{students.length} students completed</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <SubunitProgressModal
        open={!!selectedSubunit}
        onClose={() => setSelectedSubunit(null)}
        subunit={selectedSubunit}
        sessionType={sessionFilter}
        students={students}
        progressData={progressData}
      />
    </div>
  );
}

function StudentProgressBlocks({ students, subunits, units, progressData, classId }) {
  const navigate = useNavigate();

const handleStudentClick = (student) => {
  console.log("🔍 STUDENT OBJECT:", student);
  console.log("🔍 student.id:", student.id);
  console.log("🔍 student._id:", student._id);
  console.log("🔍 typeof student.id:", typeof student.id);
  
  const studentId = student.id || student._id;
  console.log("🔍 FINAL studentId:", studentId);
  console.log("🔍 typeof FINAL studentId:", typeof studentId);
  
  navigate(createPageUrl("TeacherStudentDetail") + `?studentId=${studentId}&classId=${classId}`);
};

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Students</h2>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => {
          const studentId = (student.id || student._id).toString();
          
          return (
            <Card 
              key={studentId} 
              onClick={() => handleStudentClick(student)}
              className="border-0 shadow-lg bg-white hover:shadow-xl transition-all cursor-pointer overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center font-bold text-lg text-white">
                    {student.full_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{student.full_name}</h3>
                    <p className="text-sm text-gray-500 truncate">{student.email}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {students.length === 0 && (
        <Card className="border-0 shadow-md">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No students enrolled</h3>
            <p className="text-gray-600">Share the join code with students to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClassLeaderboard({ students, progressData, subunits }) {
  const getStudentStats = (studentId) => {
    const studentIdStr = studentId.toString();
    const subunitIds = subunits.map(s => (s._id || s.id).toString());
    
    const studentProgress = progressData.filter(p => 
      (p.student_id || p.studentId)?.toString() === studentIdStr && 
      subunitIds.includes((p.subunit_id || p.subunitId)?.toString())
    );
    
    const completedCount = studentProgress.filter(p => p.new_session_completed === true).length;

    let scores = [];
    studentProgress.forEach(p => {
      if (p.new_session_completed === true && p.new_session_score) {
        scores.push(p.new_session_score);
      }
      if (p.last_review_score) {
        scores.push(p.last_review_score);
      }
    });

    const avgScore = scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
      : 0;

    return { completedCount, avgScore };
  };

  const leaderboard = students
    .map(student => {
      const studentId = student.id || student._id;
      const stats = getStudentStats(studentId);
      return {
        ...student,
        completedSubunits: stats.completedCount,
        avgScore: stats.avgScore
      };
    })
    .sort((a, b) => b.completedSubunits - a.completedSubunits || b.avgScore - a.avgScore);

  if (leaderboard.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No students yet</h3>
          <p className="text-gray-600">Students will appear here once they join and start learning</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
      
      {leaderboard.map((student, index) => {
        const studentId = (student.id || student._id).toString();
        
        return (
          <Card key={studentId} className={`border-0 shadow-lg transition-all ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-white' : 'bg-white'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-200 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-indigo-100 text-indigo-700'
                }`}>
                  {index === 0 ? <Trophy className="w-7 h-7" /> :
                   index === 1 ? <Medal className="w-7 h-7" /> :
                   index === 2 ? <Award className="w-7 h-7" /> :
                   index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-black text-lg truncate">{student.full_name}</h3>
                  <p className="text-sm text-gray-600 truncate">{student.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-black">{student.completedSubunits}</p>
                  <p className="text-sm text-gray-600">topics completed</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-indigo-600">{student.avgScore}%</p>
                  <p className="text-sm text-gray-600">avg score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}