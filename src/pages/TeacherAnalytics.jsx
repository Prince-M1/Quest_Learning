import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TeacherLayout from "../components/teacher/TeacherLayout";
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Users, Lightbulb, HelpCircle, PenTool, Video, ChevronDown, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export default function TeacherAnalytics() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [students, setStudents] = useState([]);
  const [questionResponses, setQuestionResponses] = useState([]);
  const [inquiryResponses, setInquiryResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedSubunit, setSelectedSubunit] = useState(null);
  const [caseStudyResponses, setCaseStudyResponses] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [videoQuestionResponses, setVideoQuestionResponses] = useState([]);
  const [attentionChecks, setAttentionChecks] = useState([]);
  const [attentionCheckResponses, setAttentionCheckResponses] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    initialGuesses: true,
    videoQuestions: false,
    quizAnalytics: false,
    caseStudy: false
  });


  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassData();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedUnit && subunits.length > 0) {
      const unitSubunits = subunits.filter(s => (s.unit_id === selectedUnit));
      if (unitSubunits.length > 0 && !selectedSubunit) {
        setSelectedSubunit("all");
      }
    }
  }, [selectedUnit, subunits]);

  useEffect(() => {
    if (selectedSubunit) {
      loadSubunitAnalytics();
    }
  }, [selectedSubunit]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      console.log("📊 [ANALYTICS] Fetching user...");
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const user = await userRes.json();
      setTeacher(user);
      console.log("📊 [ANALYTICS] User fetched:", user.email);

      const teacherId = user._id || user.id;

      // ✅ Fetch classes from MongoDB
      console.log("📊 [ANALYTICS] Fetching classes from MongoDB...");
      const classesRes = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let classesData = [];
      if (classesRes.ok) {
        classesData = await classesRes.json();
        console.log("📊 [ANALYTICS] ✅ Classes fetched:", classesData.length);
      } else {
        console.warn("📊 [ANALYTICS] ⚠️ Failed to fetch classes");
      }
      setClasses(classesData);

      const savedClassId = localStorage.getItem('teacherSelectedClassId');
      if (savedClassId && classesData.some(c => (c.id || c._id) === savedClassId)) {
        setSelectedClassId(savedClassId);
      } else if (classesData.length > 0) {
        const firstClassId = classesData[0].id || classesData[0]._id;
        setSelectedClassId(firstClassId);
        localStorage.setItem('teacherSelectedClassId', firstClassId);
      }
    } catch (err) {
      console.error("❌ [ANALYTICS] Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadClassData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const selectedClass = classes.find(c => (c.id || c._id) === selectedClassId);
      if (!selectedClass) return;

      console.log("📊 [ANALYTICS] Loading class data for:", selectedClass.class_name);

      // ✅ Fetch curriculum from MongoDB
      const curriculumRes = await fetch(`${API_BASE}/api/curriculum/${selectedClass.curriculum_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (curriculumRes.ok) {
        const curriculumData = await curriculumRes.json();
        setCurriculum(curriculumData);
        console.log("📊 [ANALYTICS] ✅ Curriculum fetched:", curriculumData.subject_name);
        
        // ✅ Fetch units from MongoDB
        const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${curriculumData.id || curriculumData._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (unitsRes.ok) {
          const unitsData = await unitsRes.json();
          setUnits(unitsData.sort((a, b) => a.unit_order - b.unit_order));
          console.log("📊 [ANALYTICS] ✅ Units fetched:", unitsData.length);

          // ✅ Fetch subunits from MongoDB
          const allSubunits = [];
          for (const unit of unitsData) {
            const subunitsRes = await fetch(`${API_BASE}/api/subunits/unit/${unit.id || unit._id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (subunitsRes.ok) {
              const unitSubunits = await subunitsRes.json();
              allSubunits.push(...unitSubunits);
            }
          }
          setSubunits(allSubunits.sort((a, b) => a.subunit_order - b.subunit_order));
          console.log("📊 [ANALYTICS] ✅ Subunits fetched:", allSubunits.length);

          if (unitsData.length > 0) {
            setSelectedUnit("all_units");
            setSelectedSubunit("all");
          }
        }
      }

      // ✅ Fetch students from MongoDB (enrollments)
      try {
        const enrollmentsRes = await fetch(`${API_BASE}/api/enrollments/class/${selectedClassId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (enrollmentsRes.ok) {
          const enrollments = await enrollmentsRes.json();
          const enrolledStudents = enrollments.map(e => ({
            id: e.student_id?._id || e.student_id?.id || e.student_id,
            full_name: e.student_full_name || e.student_id?.full_name || "Unknown",
            email: e.student_email || e.student_id?.email || ""
          }));
          setStudents(enrolledStudents);
          console.log("📊 [ANALYTICS] ✅ Students fetched from MongoDB:", enrolledStudents.length);
        } else {
          console.warn("📊 [ANALYTICS] ⚠️ Failed to fetch students");
          setStudents([]);
        }
      } catch (studentError) {
        console.warn("📊 [ANALYTICS] ⚠️ Failed to fetch students:", studentError.message);
        setStudents([]);
      }
    } catch (err) {
      console.error("❌ [ANALYTICS] Failed to load class data:", err);
    }
  };

  const loadSubunitAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      let targetSubunitIds = [];
      
      if (selectedUnit === "all_units") {
        targetSubunitIds = subunits.map(s => s.id || s._id);
      } else if (selectedSubunit === "all") {
        targetSubunitIds = subunits.filter(s => (s.unit_id === selectedUnit)).map(s => s.id || s._id);
      } else {
        targetSubunitIds = [selectedSubunit];
      }
      
      console.log("📊 [ANALYTICS] Loading analytics for", targetSubunitIds.length, "subunits");
      
      // ✅ Fetch all analytics data from MongoDB
      const [
        allQuestions,
        allQuizzes,
        allAttentionChecks,
        allCaseStudies,
        allVideos
      ] = await Promise.all([
        fetch(`${API_BASE}/api/questions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []),
        
        fetch(`${API_BASE}/api/quizzes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []),
        
        fetch(`${API_BASE}/api/attention-checks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []),
        
        fetch(`${API_BASE}/api/case-studies`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : []),
        
        fetch(`${API_BASE}/api/videos`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : [])
      ]);
      
      // ✅ Fetch responses for each student in the class
      const allQuestionResponses = [];
      const allInquiryResponses = [];
      const allAttentionCheckResponses = [];
      
      for (const student of students) {
        const studentId = student.id;
        
        // Fetch question responses for each subunit
        for (const subunitId of targetSubunitIds) {
          try {
            const qrRes = await fetch(`${API_BASE}/api/question-responses/student/${studentId}/subunit/${subunitId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (qrRes.ok) {
              const responses = await qrRes.json();
              allQuestionResponses.push(...responses);
            }
          } catch (err) {
            console.warn("Failed to fetch question responses:", err);
          }
          
          // Fetch inquiry responses
          try {
            const irRes = await fetch(`${API_BASE}/api/inquiry-responses/student/${studentId}/subunit/${subunitId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (irRes.ok) {
              const responses = await irRes.json();
              allInquiryResponses.push(...responses);
            }
          } catch (err) {
            console.warn("Failed to fetch inquiry responses:", err);
          }
          
          // Fetch attention check responses
          try {
            const acrRes = await fetch(`${API_BASE}/api/attention-check-responses/student/${studentId}/subunit/${subunitId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (acrRes.ok) {
              const responses = await acrRes.json();
              allAttentionCheckResponses.push(...responses);
            }
          } catch (err) {
            console.warn("Failed to fetch attention check responses:", err);
          }
        }
      }
      
      // Filter data for target subunits
      const relevantQuizzes = allQuizzes.filter(q => targetSubunitIds.includes(q.subunit_id));
      const relevantQuizIds = relevantQuizzes.map(q => q._id?.toString() || q.id);
      const relevantQuestions = allQuestions.filter(q => relevantQuizIds.includes(q.quiz_id));
      
      const relevantVideos = allVideos.filter(v => targetSubunitIds.includes(v.subunit_id));
      const relevantVideoIds = relevantVideos.map(v => v._id?.toString() || v.id);
      const relevantAttentionChecks = allAttentionChecks.filter(c => relevantVideoIds.includes(c.video_id));
      
      const relevantCaseStudies = allCaseStudies.filter(cs => targetSubunitIds.includes(cs.subunit_id));
      
      setQuestionResponses(allQuestionResponses);
      setInquiryResponses(allInquiryResponses);
      setQuestions(relevantQuestions);
      setAttentionChecks(relevantAttentionChecks);
      setAttentionCheckResponses(allAttentionCheckResponses);
      setCaseStudies(relevantCaseStudies);
      
      console.log("📊 [ANALYTICS] ✅ Analytics loaded - Question Responses:", allQuestionResponses.length);
      console.log("📊 [ANALYTICS] ✅ Inquiry Responses:", allInquiryResponses.length);
      console.log("📊 [ANALYTICS] ✅ Attention Check Responses:", allAttentionCheckResponses.length);
      
    } catch (err) {
      console.error("❌ [ANALYTICS] Failed to load analytics:", err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate(createPageUrl("Login"));
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    localStorage.setItem('teacherSelectedClassId', classId);
  };

  const getQuestionAnalytics = (questionId) => {
    const responses = questionResponses.filter(r => r.question_id === questionId);
    const totalResponses = responses.length;
    
    if (totalResponses === 0) return null;

    const correctCount = responses.filter(r => r.is_correct).length;
    const choiceCounts = [0, 0, 0, 0];
    
    responses.forEach(r => {
      if (r.selected_choice >= 1 && r.selected_choice <= 4) {
        choiceCounts[r.selected_choice - 1]++;
      }
    });

    return {
      totalResponses,
      correctCount,
      correctPercent: Math.round((correctCount / totalResponses) * 100),
      choiceDistribution: choiceCounts.map((count, index) => ({
        choice: index + 1,
        count,
        percent: Math.round((count / totalResponses) * 100)
      }))
    };
  };

  const getWeakQuestions = () => {
    // Combine quiz questions AND attention checks into one performance calculation
    const allQuestionStats = {};
    const uniqueStudents = new Set();
    
    // Process quiz question responses
    questionResponses.forEach(response => {
      uniqueStudents.add(response.student_id);
      const key = `quiz_${response.question_id}`;
      if (!allQuestionStats[key]) {
        allQuestionStats[key] = {
          type: 'quiz',
          questionId: response.question_id,
          total: 0,
          correct: 0,
          students: new Set(),
          incorrectChoices: {}
        };
      }
      allQuestionStats[key].total++;
      allQuestionStats[key].students.add(response.student_id);
      if (response.is_correct) {
        allQuestionStats[key].correct++;
      } else {
        const choice = response.selected_choice;
        allQuestionStats[key].incorrectChoices[choice] = 
          (allQuestionStats[key].incorrectChoices[choice] || 0) + 1;
      }
    });
    
    // Process attention check responses
    attentionCheckResponses.forEach(response => {
      uniqueStudents.add(response.student_id);
      const key = `attention_${response.attention_check_id}`;
      if (!allQuestionStats[key]) {
        allQuestionStats[key] = {
          type: 'attention',
          checkId: response.attention_check_id,
          total: 0,
          correct: 0,
          students: new Set(),
          incorrectChoices: {}
        };
      }
      allQuestionStats[key].total++;
      allQuestionStats[key].students.add(response.student_id);
      if (response.is_correct) {
        allQuestionStats[key].correct++;
      } else {
        const choice = response.selected_choice;
        allQuestionStats[key].incorrectChoices[choice] = 
          (allQuestionStats[key].incorrectChoices[choice] || 0) + 1;
      }
    });

    // Filter and format results - ONLY < 70% accuracy
    return Object.values(allQuestionStats)
      .map(stats => {
        const accuracy = (stats.correct / stats.total) * 100;
        
        if (stats.type === 'quiz') {
          const question = questions.find(q => (q._id?.toString() || q.id) === stats.questionId);
          if (!question) return null;
          
          const mostWrong = Object.entries(stats.incorrectChoices)
            .sort((a, b) => b[1] - a[1])[0];
          
          return {
            type: 'quiz',
            question: question.question_text,
            accuracy,
            totalAttempts: stats.total,
            studentCount: stats.students.size,
            mostCommonWrong: mostWrong ? question[`choice_${mostWrong[0]}`] : null,
            mostCommonWrongCount: mostWrong ? mostWrong[1] : 0,
            isCritical: accuracy < 50
          };
        } else {
          const check = attentionChecks.find(c => (c._id?.toString() || c.id) === stats.checkId);
          if (!check) return null;
          
          const mostWrong = Object.entries(stats.incorrectChoices)
            .sort((a, b) => b[1] - a[1])[0];
          
          return {
            type: 'attention',
            question: check.question,
            accuracy,
            totalAttempts: stats.total,
            studentCount: stats.students.size,
            mostCommonWrong: mostWrong ? check[`choice_${mostWrong[0].toLowerCase()}`] : null,
            mostCommonWrongCount: mostWrong ? mostWrong[1] : 0,
            isCritical: accuracy < 50
          };
        }
      })
      .filter(item => item && item.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy);
  };

  const getWeakCaseStudyQuestions = () => {
    if (caseStudyResponses.length === 0) return [];
    
    const questionStats = { a: { scores: [], answers: [] }, b: { scores: [], answers: [] }, 
                            c: { scores: [], answers: [] }, d: { scores: [], answers: [] } };
    
    caseStudyResponses.forEach(response => {
      ['a', 'b', 'c', 'd'].forEach(letter => {
        const score = response[`score_${letter}`];
        const answer = response[`answer_${letter}`];
        if (score !== undefined && score !== null) {
          questionStats[letter].scores.push(score);
          if (answer) {
            questionStats[letter].answers.push(answer);
          }
        }
      });
    });

    return ['a', 'b', 'c', 'd']
      .map(letter => {
        const scores = questionStats[letter].scores;
        if (scores.length === 0) return null;
        
        const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
        const accuracy = avgScore * 100; // Assuming scores are 0-1
        const caseStudy = caseStudies[0];
        
        return {
          letter: letter.toUpperCase(),
          question: caseStudy?.[`question_${letter}`] || `Question ${letter.toUpperCase()}`,
          accuracy,
          avgScore,
          responseCount: scores.length,
          commonAnswers: questionStats[letter].answers.slice(0, 3),
          isCritical: accuracy < 50
        };
      })
      .filter(item => item && item.accuracy < 70)
      .sort((a, b) => a.accuracy - b.accuracy);
  };

  const selectedSubunitData = subunits.find(s => (s.id || s._id) === selectedSubunit);
  const selectedUnitData = units.find(u => (u.id || u._id) === selectedUnit);
  const weakQuestions = getWeakQuestions();
  const weakCaseStudy = getWeakCaseStudyQuestions();
  const caseStudy = caseStudies[0];
  const unitSubunits = subunits.filter(s => (s.unit_id === selectedUnit));

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const [expandedMissed, setExpandedMissed] = useState({
    videoChecks: true,
    quiz: false,
    caseStudy: false
  });

  const toggleMissedSection = (section) => {
    setExpandedMissed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCaseStudyStats = () => {
    if (caseStudyResponses.length === 0) return null;
    const avgScore = caseStudyResponses.reduce((sum, r) => sum + (r.total_score || 0), 0) / caseStudyResponses.length;
    return { count: caseStudyResponses.length, avgScore: avgScore.toFixed(1) };
  };

  const csStats = getCaseStudyStats();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="analytics" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-black mb-1">Curriculum Data</h1>
          <p className="text-sm text-gray-600">Deep insights into student understanding and misconceptions</p>
        </div>

        {classes.length > 0 && (
          <div className="mb-6 flex gap-4">
            <Select value={selectedClassId || ""} onValueChange={handleClassChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id || cls._id} value={cls.id || cls._id}>
                    {cls.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {units.length > 0 && (
              <Select value={selectedUnit || ""} onValueChange={setSelectedUnit}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_units">
                    All Units
                  </SelectItem>
                  {units.map((unit) => (
                    <SelectItem key={unit.id || unit._id} value={unit.id || unit._id}>
                      {unit.unit_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedUnit !== "all_units" && unitSubunits.length > 0 && (
              <Select value={selectedSubunit || ""} onValueChange={setSelectedSubunit}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Topics
                  </SelectItem>
                  {unitSubunits.map((sub) => (
                    <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>
                      {sub.subunit_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {(selectedSubunitData || selectedSubunit === "all") && (
          <div className="space-y-4">
            {/* Weak Questions - Combined Quiz + Attention Checks */}
            <Card className="border border-gray-200 mb-4">
              <CardContent className="p-6">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-black">Performance Analytics</h2>
                  <p className="text-sm text-gray-600">
                    Only questions with &lt;70% accuracy shown • Calculated from all student responses
                  </p>
                </div>
                
                {/* Quiz + Attention Checks Combined */}
                <Collapsible open={expandedMissed.quiz} onOpenChange={() => toggleMissedSection('quiz')}>
                  <CollapsibleTrigger className="w-full mb-3">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                        <span className="font-medium text-black">Quiz & Attention Check Questions</span>
                        <Badge variant="outline" className="bg-white">{weakQuestions.length} Below 70%</Badge>
                      </div>
                      {expandedMissed.quiz ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mb-4 ml-2">
                      {weakQuestions.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">No questions below 70% accuracy</p>
                      ) : (
                        weakQuestions.map((item, idx) => (
                          <div key={idx} className={`border rounded-lg p-3 ${item.isCritical ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.type === 'quiz' ? (
                                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                                  ) : (
                                    <Video className="w-4 h-4 text-blue-600" />
                                  )}
                                  <span className="text-xs font-semibold text-gray-500 uppercase">
                                    {item.type === 'quiz' ? 'Quiz' : 'Video Check'}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-black">{item.question}</p>
                              </div>
                              <Badge className={`${item.isCritical ? 'bg-red-600' : 'bg-orange-600'} text-white ml-2`}>
                                {Math.round(item.accuracy)}% {item.isCritical && '🚨'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              {item.totalAttempts} attempts • {item.studentCount} students
                            </p>
                            {item.mostCommonWrong && (
                              <div className={`mt-2 pt-2 border-t ${item.isCritical ? 'border-red-200' : 'border-orange-200'}`}>
                                <p className="text-xs font-medium text-gray-700">Most common wrong answer ({item.mostCommonWrongCount} times):</p>
                                <p className="text-xs text-gray-600 bg-white p-1 rounded mt-1">"{item.mostCommonWrong}"</p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Case Study */}
                <Collapsible open={expandedMissed.caseStudy} onOpenChange={() => toggleMissedSection('caseStudy')}>
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100">
                      <div className="flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-black">Case Study Questions</span>
                        <Badge variant="outline" className="bg-white">{weakCaseStudy.length} Below 70%</Badge>
                      </div>
                      {expandedMissed.caseStudy ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-2 mt-3 ml-2">
                      {weakCaseStudy.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">No case study questions below 70% accuracy</p>
                      ) : (
                        weakCaseStudy.map((item, idx) => (
                          <div key={idx} className={`border rounded-lg p-3 ${item.isCritical ? 'border-red-200 bg-red-50' : 'border-purple-200 bg-purple-50'}`}>
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-black flex-1">({item.letter}) {item.question}</p>
                              <Badge className={`${item.isCritical ? 'bg-red-600' : 'bg-orange-600'} text-white ml-2`}>
                                {Math.round(item.accuracy)}% {item.isCritical && '🚨'}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">
                              {item.responseCount} student responses • Avg score: {item.avgScore.toFixed(2)}/1
                            </p>
                            {item.commonAnswers.length > 0 && (
                              <div className={`mt-2 pt-2 border-t ${item.isCritical ? 'border-red-200' : 'border-purple-200'}`}>
                                <p className="text-xs font-medium text-gray-700 mb-1">Sample student answers:</p>
                                {item.commonAnswers.map((ans, i) => (
                                  <p key={i} className="text-xs text-gray-600 bg-white p-1 rounded mb-1">• "{ans}"</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>


          </div>
        )}
      </div>
    </TeacherLayout>
  );
}