import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronRight, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  Video,
  HelpCircle,
  PenTool
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeacherStudentDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const studentId = urlParams.get("studentId");
  const classId = urlParams.get("classId");

  const [student, setStudent] = useState(null);
  const [classData, setClassData] = useState(null);
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [progressData, setProgressData] = useState([]);
  const [questionResponses, setQuestionResponses] = useState([]);
  const [inquiryResponses, setInquiryResponses] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [learningSessions, setLearningSessions] = useState([]);
  const [caseStudyResponses, setCaseStudyResponses] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [attentionChecks, setAttentionChecks] = useState([]);
  const [attentionCheckResponses, setAttentionCheckResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedSubunits, setExpandedSubunits] = useState({});
  const [subunitSessionType, setSubunitSessionType] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      console.log('🔍 Loading student detail data...');

      // Load enrollment to get student info
      const enrollmentRes = await fetch(`${API_BASE}/api/enrollments?studentId=${studentId}&classId=${classId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (enrollmentRes.ok) {
        const enrollment = await enrollmentRes.json();
        setStudent({
          id: enrollment.student_id,
          full_name: enrollment.student_full_name,
          email: enrollment.student_email
        });
      }

      // Load all data in parallel
      const [
        classesRes,
        curriculaRes,
        unitsRes,
        subunitsRes,
        progressRes,
        questionResponsesRes,
        inquiryResponsesRes,
        questionsRes,
        quizzesRes,
        learningSessionsRes,
        caseStudyResponsesRes,
        caseStudiesRes,
        attentionChecksRes,
        attentionCheckResponsesRes
      ] = await Promise.all([
        fetch(`${API_BASE}/api/classes`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/curriculum`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/units`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/subunits`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/progress/student/${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/question-responses/student/${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/inquiry-responses/student/${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/questions`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/quizzes`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/learning-sessions`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).catch(() => ({ ok: false })),
        fetch(`${API_BASE}/api/case-study-responses/student/${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/case-studies`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/attention-checks`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        }),
        fetch(`${API_BASE}/api/attention-check-responses/student/${studentId}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        })
      ]);

      // Parse all responses
      const allClasses = classesRes.ok ? await classesRes.json() : [];
      const allCurricula = curriculaRes.ok ? await curriculaRes.json() : [];
      const allUnits = unitsRes.ok ? await unitsRes.json() : [];
      const allSubunits = subunitsRes.ok ? await subunitsRes.json() : [];
      const progress = progressRes.ok ? await progressRes.json() : [];
      const responses = questionResponsesRes.ok ? await questionResponsesRes.json() : [];
      const inquiries = inquiryResponsesRes.ok ? await inquiryResponsesRes.json() : [];
      const allQuestions = questionsRes.ok ? await questionsRes.json() : [];
      const allQuizzes = quizzesRes.ok ? await quizzesRes.json() : [];
      const sessions = learningSessionsRes.ok ? await learningSessionsRes.json() : [];
      const csResponses = caseStudyResponsesRes.ok ? await caseStudyResponsesRes.json() : [];
      const allCaseStudies = caseStudiesRes.ok ? await caseStudiesRes.json() : [];
      const allChecks = attentionChecksRes.ok ? await attentionChecksRes.json() : [];
      const acResponses = attentionCheckResponsesRes.ok ? await attentionCheckResponsesRes.json() : [];

      console.log('✅ Student responses loaded:', {
        questionResponses: responses.length,
        caseStudyResponses: csResponses.length,
        attentionCheckResponses: acResponses.length
      });

      // Find class
      const classInfo = allClasses.find(c => (c._id || c.id).toString() === classId);
      setClassData(classInfo);

      if (classInfo) {
        // Find curriculum
        const curr = allCurricula.find(c => 
          (c._id || c.id).toString() === (classInfo.curriculum_id || classInfo.curriculumId)?.toString()
        );
        setCurriculum(curr);

        if (curr) {
          const currId = (curr._id || curr.id).toString();
          
          // Filter units
          const unitsData = allUnits
            .filter(u => (u.curriculum_id || u.curriculumId)?.toString() === currId)
            .sort((a, b) => (a.unit_order || 0) - (b.unit_order || 0));
          setUnits(unitsData);

          // Filter subunits
          const unitIds = unitsData.map(u => (u._id || u.id).toString());
          const filteredSubunits = allSubunits
            .filter(sub => unitIds.includes((sub.unit_id || sub.unitId)?.toString()))
            .sort((a, b) => (a.subunit_order || 0) - (b.subunit_order || 0));
          setSubunits(filteredSubunits);
        }
      }

      setProgressData(progress);
      setQuestionResponses(responses);
      setInquiryResponses(inquiries);
      setQuestions(allQuestions);
      setQuizzes(allQuizzes);
      setLearningSessions(sessions);
      setCaseStudyResponses(csResponses);
      setCaseStudies(allCaseStudies);
      setAttentionChecks(allChecks);
      setAttentionCheckResponses(acResponses);

    } catch (err) {
      console.error("❌ Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleSubunit = (subunitId) => {
    setExpandedSubunits(prev => ({ ...prev, [subunitId]: !prev[subunitId] }));
  };

  const getSubunitProgress = (subunitId) => {
    return progressData.find(p => (p.subunit_id || p.subunitId)?.toString() === subunitId.toString());
  };

  const getSessionData = (subunitId, sessionType) => {
    const progress = getSubunitProgress(subunitId);
    if (!progress) return { completed: false, score: null };

    if (sessionType === "new_topic") {
      return {
        completed: progress.new_session_completed || false,
        score: progress.new_session_score || null
      };
    } else {
      const reviewNum = parseInt(sessionType.replace("review_", ""));
      const completed = progress.review_count >= reviewNum;
      const score = reviewNum === progress.review_count ? progress.last_review_score : null;
      return { completed, score };
    }
  };

  const getSubunitResponses = (subunitId, sessionType) => {
    return questionResponses.filter(r => 
      (r.subunit_id || r.subunitId)?.toString() === subunitId.toString() && 
      r.session_type === (sessionType === "new_topic" ? "new_topic" : "review")
    );
  };

  const getInquiryResponse = (subunitId) => {
    return inquiryResponses.find(r => (r.subunit_id || r.subunitId)?.toString() === subunitId.toString());
  };

  const getCaseStudyResponse = (subunitId) => {
    return caseStudyResponses.find(r => (r.subunit_id || r.subunitId)?.toString() === subunitId.toString());
  };

  const getCaseStudy = (subunitId) => {
    return caseStudies.find(cs => (cs.subunit_id || cs.subunitId)?.toString() === subunitId.toString());
  };

  const getAttentionCheckResponses = (subunitId) => {
    return attentionCheckResponses.filter(ac => (ac.subunit_id || ac.subunitId)?.toString() === subunitId.toString());
  };

  const getOverallAvgScore = () => {
    const classSubunitIds = subunits.map(s => (s._id || s.id).toString());
    let scores = [];
    progressData.forEach(p => {
      const pSubunitId = (p.subunit_id || p.subunitId)?.toString();
      if (classSubunitIds.includes(pSubunitId)) {
        if (p.new_session_completed && p.new_session_score) {
          scores.push(p.new_session_score);
        }
        if (p.last_review_score) {
          scores.push(p.last_review_score);
        }
      }
    });
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const avgScore = getOverallAvgScore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{ fontFamily: '"Inter", sans-serif' }}>
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(createPageUrl("TeacherClassDetail") + `?id=${classId}`)}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Class
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Student Info Card */}
          <Card className="border-0 shadow-xl bg-white mb-8 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold">
                  {student?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{student?.full_name}</h1>
                  <p className="text-indigo-100">{student?.email}</p>
                  <p className="text-indigo-200 text-sm mt-1">{classData?.class_name} • {curriculum?.subject_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">{avgScore !== null ? `${avgScore}%` : '—'}</div>
                  <p className="text-indigo-100 text-sm">Overall Average</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Units and Subunits */}
          <div className="space-y-4">
            {units.map(unit => {
              const unitId = (unit._id || unit.id).toString();
              const unitSubunits = subunits.filter(s => (s.unit_id || s.unitId)?.toString() === unitId);
              const completedCount = unitSubunits.filter(s => 
                getSubunitProgress(s._id || s.id)?.new_session_completed
              ).length;

              return (
                <Card key={unitId} className="border-0 shadow-lg bg-white overflow-hidden">
                  <Collapsible 
                    open={expandedUnits[unitId]} 
                    onOpenChange={() => toggleUnit(unitId)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-5 hover:bg-gray-50 transition-all">
                        <div className="flex items-center gap-4">
                          {expandedUnits[unitId] ? (
                            <ChevronDown className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-indigo-600" />
                          )}
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-indigo-600" />
                          </div>
                          <div className="text-left">
                            <h2 className="text-lg font-bold text-gray-900">{unit.unit_name}</h2>
                            <p className="text-sm text-gray-500">{unitSubunits.length} topics</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-indigo-600 border-indigo-200 bg-indigo-50">
                          {completedCount}/{unitSubunits.length} completed
                        </Badge>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t border-gray-100 p-4 space-y-3">
                        {unitSubunits.map(subunit => {
                          const subunitId = (subunit._id || subunit.id).toString();
                          const progress = getSubunitProgress(subunitId);
                          const currentSessionType = subunitSessionType[subunitId] || "new_topic";
                          const sessionData = getSessionData(subunitId, currentSessionType);
                          const responses = getSubunitResponses(subunitId, currentSessionType);

                          return (
                            <Card key={subunitId} className="border border-gray-200 shadow-sm">
                              <Collapsible
                                open={expandedSubunits[subunitId]}
                                onOpenChange={() => toggleSubunit(subunitId)}
                              >
                                <CollapsibleTrigger className="w-full">
                                  <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-all">
                                    <div className="flex items-center gap-3">
                                      {expandedSubunits[subunitId] ? (
                                        <ChevronDown className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-500" />
                                      )}
                                      <span className="font-medium text-gray-900">{subunit.subunit_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {progress?.new_session_completed ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                      ) : (
                                        <XCircle className="w-5 h-5 text-gray-300" />
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {progress?.review_count || 0} reviews
                                      </Badge>
                                    </div>
                                  </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                                    {/* Session Selector */}
                                    <div className="flex items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700">View Session:</span>
                                      <Select
                                        value={currentSessionType}
                                        onValueChange={(val) => setSubunitSessionType(prev => ({ ...prev, [subunitId]: val }))}
                                      >
                                        <SelectTrigger className="w-40 h-9 text-sm bg-white">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="new_topic">Learn Session</SelectItem>
                                          <SelectItem value="review_1">Review 1</SelectItem>
                                          <SelectItem value="review_2">Review 2</SelectItem>
                                          <SelectItem value="review_3">Review 3</SelectItem>
                                          <SelectItem value="review_4">Review 4</SelectItem>
                                          <SelectItem value="review_5">Review 5</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <div className="ml-auto flex items-center gap-2">
                                        {sessionData.completed ? (
                                          <Badge className="bg-green-600 text-white">Completed</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-500">Not Started</Badge>
                                        )}
                                        {sessionData.score !== null && (
                                          <Badge className={`${sessionData.score >= 70 ? 'bg-green-600' : 'bg-orange-500'} text-white`}>
                                            {sessionData.score}%
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Content Tabs for Learn Session */}
                                    {currentSessionType === "new_topic" && sessionData.completed && (
                                      <Tabs defaultValue="attention" className="w-full">
                                        <TabsList className="grid w-full grid-cols-3 mb-4">
                                          <TabsTrigger value="attention" className="text-sm">
                                            <Video className="w-4 h-4 mr-2" />
                                            Attention
                                          </TabsTrigger>
                                          <TabsTrigger value="quiz" className="text-sm">
                                            <HelpCircle className="w-4 h-4 mr-2" />
                                            Quiz
                                          </TabsTrigger>
                                          <TabsTrigger value="casestudy" className="text-sm">
                                            <PenTool className="w-4 h-4 mr-2" />
                                            Case Study
                                          </TabsTrigger>
                                        </TabsList>

                                        {/* Attention Checks Tab */}
                                        <TabsContent value="attention">
                                          {(() => {
                                            const acResps = getAttentionCheckResponses(subunitId);
                                            if (acResps.length === 0) {
                                              return (
                                                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                                                  <Video className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                  <p className="text-sm">No attention check responses recorded</p>
                                                </div>
                                              );
                                            }

                                            const sortedChecks = [...acResps].sort((a, b) => {
                                              if (a.is_correct === b.is_correct) return 0;
                                              return a.is_correct ? 1 : -1;
                                            });

                                            return (
                                              <div className="bg-white rounded-xl p-4 border border-gray-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <Video className="w-5 h-5 text-blue-500" />
                                                  <h4 className="font-semibold text-gray-900">Attention Checks</h4>
                                                  <Badge variant="outline" className="ml-auto">
                                                    {acResps.filter(v => v.is_correct).length}/{acResps.length} correct
                                                  </Badge>
                                                </div>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                  {sortedChecks.map((acResp, idx) => {
                                                    const check = attentionChecks.find(c => (c._id || c.id)?.toString() === (acResp.attention_check_id)?.toString());
                                                    return (
                                                      <div 
                                                        key={idx} 
                                                        className={`p-3 rounded-lg ${
                                                          acResp.is_correct 
                                                            ? 'bg-green-50 border border-green-200' 
                                                            : 'bg-red-50 border border-red-200'
                                                        }`}
                                                      >
                                                        <div className="flex items-start gap-2">
                                                          {acResp.is_correct ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                          ) : (
                                                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                          )}
                                                          <div className="flex-1">
                                                            <p className="text-sm text-gray-900 font-medium mb-1">
                                                              {check?.question || `Check ${idx + 1}`}
                                                            </p>
                                                            <p className="text-xs text-gray-700 bg-white p-2 rounded">
                                                              Selected: {acResp.selected_choice}
                                                              {check && !acResp.is_correct && (
                                                                <span className="text-green-600 ml-2">
                                                                  (Correct: {check.correct_choice})
                                                                </span>
                                                              )}
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </TabsContent>

                                        {/* Quiz Tab */}
                                        <TabsContent value="quiz">
                                          {(() => {
                                            if (responses.length === 0) {
                                              return (
                                                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                                                  <HelpCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                  <p className="text-sm">No quiz responses recorded</p>
                                                </div>
                                              );
                                            }

                                            const sortedResponses = [...responses].sort((a, b) => {
                                              if (a.is_correct === b.is_correct) return 0;
                                              return a.is_correct ? 1 : -1;
                                            });

                                            return (
                                              <div className="bg-white rounded-xl p-4 border border-gray-200">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <HelpCircle className="w-5 h-5 text-blue-500" />
                                                  <h4 className="font-semibold text-gray-900">Quiz Responses</h4>
                                                  <Badge variant="outline" className="ml-auto">
                                                    {responses.filter(r => r.is_correct).length}/{responses.length} correct
                                                  </Badge>
                                                </div>
                                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                                  {sortedResponses.map((response, idx) => {
                                                    const question = questions.find(q => (q._id || q.id)?.toString() === (response.question_id)?.toString());
                                                    return (
                                                      <div 
                                                        key={response._id || response.id || idx} 
                                                        className={`p-3 rounded-lg ${
                                                          response.is_correct 
                                                            ? 'bg-green-50 border border-green-200' 
                                                            : 'bg-red-50 border border-red-200'
                                                        }`}
                                                      >
                                                        <div className="flex items-start gap-2">
                                                          {response.is_correct ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                          ) : (
                                                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                          )}
                                                          <div className="flex-1">
                                                            <p className="text-sm text-gray-900 font-medium">
                                                              {question?.question_text || `Question ${idx + 1}`}
                                                            </p>
                                                            {question && (
                                                              <p className="text-xs text-gray-600 mt-1">
                                                                Selected: {question[`choice_${response.selected_choice}`]}
                                                                {!response.is_correct && (
                                                                  <span className="text-green-600 ml-2">
                                                                    (Correct: {question[`choice_${question.correct_choice}`]})
                                                                  </span>
                                                                )}
                                                              </p>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </TabsContent>

                                        {/* Case Study Tab */}
                                        <TabsContent value="casestudy">
                                          {(() => {
                                            const csResponse = getCaseStudyResponse(subunitId);
                                            const caseStudy = getCaseStudy(subunitId);

                                            if (!csResponse) {
                                              return (
                                                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-xl">
                                                  <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                  <p className="text-sm">No case study response recorded</p>
                                                </div>
                                              );
                                            }

                                            return (
                                              <div className="bg-white rounded-xl p-4 border border-purple-200">
                                                <div className="flex items-center justify-between mb-4">
                                                  <div className="flex items-center gap-2">
                                                    <PenTool className="w-5 h-5 text-purple-500" />
                                                    <h4 className="font-semibold text-gray-900">Case Study Responses</h4>
                                                  </div>
                                                  <Badge className={`${csResponse.total_score >= 2.8 ? 'bg-green-600' : 'bg-orange-500'} text-white`}>
                                                    {csResponse.total_score}/4
                                                  </Badge>
                                                </div>

                                                <div className="space-y-4 max-h-80 overflow-y-auto">
                                                  {['a', 'b', 'c', 'd'].map((letter) => {
                                                    const questionKey = `question_${letter}`;
                                                    const answerKey = `answer_${letter}`;
                                                    const scoreKey = `score_${letter}`;
                                                    const feedbackKey = `feedback_${letter}`;

                                                    const questionText = caseStudy?.[questionKey] || `Question ${letter.toUpperCase()}`;
                                                    const correctAnswer = caseStudy?.[`answer_${letter}`] || "";
                                                    const studentAnswer = csResponse[answerKey];
                                                    const score = csResponse[scoreKey] || 0;
                                                    const feedback = csResponse[feedbackKey] || "";
                                                    const isCorrect = score >= 0.7;

                                                    return (
                                                      <div key={letter} className={`rounded-lg p-3 border-2 ${
                                                        isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                                                      }`}>
                                                        <div className="flex items-start justify-between mb-2">
                                                          <p className="text-xs font-semibold text-gray-900 mb-1">
                                                            ({letter.toUpperCase()}) {questionText}
                                                          </p>
                                                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                                            {isCorrect ? (
                                                              <CheckCircle className="w-5 h-5 text-green-600" />
                                                            ) : (
                                                              <XCircle className="w-5 h-5 text-red-500" />
                                                            )}
                                                            <Badge className={`${isCorrect ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                                                              {score.toFixed(1)}/1
                                                            </Badge>
                                                          </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                          <div className="bg-white p-2 rounded border border-gray-200">
                                                            <p className="text-xs font-medium text-gray-600 mb-1">Student Answer:</p>
                                                            <p className="text-sm text-gray-900">
                                                              {studentAnswer || <span className="italic text-gray-400">No answer provided</span>}
                                                            </p>
                                                          </div>

                                                          {!isCorrect && correctAnswer && (
                                                            <div className="bg-green-50 p-2 rounded border border-green-200">
                                                              <p className="text-xs font-medium text-green-700 mb-1">Expected Answer:</p>
                                                              <p className="text-sm text-green-900">{correctAnswer}</p>
                                                            </div>
                                                          )}

                                                          {feedback && (
                                                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                                              <p className="text-xs font-medium text-blue-700 mb-1">AI Feedback:</p>
                                                              <p className="text-sm text-blue-900">{feedback}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </TabsContent>
                                      </Tabs>
                                    )}

                                    {/* Review Session Quiz Responses */}
                                    {currentSessionType !== "new_topic" && responses.length > 0 && (
                                      <div className="bg-white rounded-xl p-4 border border-gray-200">
                                        <div className="flex items-center gap-2 mb-3">
                                          <HelpCircle className="w-5 h-5 text-blue-500" />
                                          <h4 className="font-semibold text-gray-900">Review Quiz Responses</h4>
                                          <Badge variant="outline" className="ml-auto">
                                            {responses.filter(r => r.is_correct).length}/{responses.length} correct
                                          </Badge>
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                          {responses.map((response, idx) => {
                                            const question = questions.find(q => (q._id || q.id)?.toString() === (response.question_id)?.toString());
                                            return (
                                              <div 
                                                key={response._id || response.id || idx} 
                                                className={`p-3 rounded-lg ${
                                                  response.is_correct 
                                                    ? 'bg-green-50 border border-green-200' 
                                                    : 'bg-red-50 border border-red-200'
                                                }`}
                                              >
                                                <div className="flex items-start gap-2">
                                                  {response.is_correct ? (
                                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                                  ) : (
                                                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                  )}
                                                  <div className="flex-1">
                                                    <p className="text-sm text-gray-900 font-medium">
                                                      {question?.question_text || `Question ${idx + 1}`}
                                                    </p>
                                                    {question && (
                                                      <p className="text-xs text-gray-600 mt-1">
                                                        Selected: {question[`choice_${response.selected_choice}`]}
                                                        {!response.is_correct && (
                                                          <span className="text-green-600 ml-2">
                                                            (Correct: {question[`choice_${question.correct_choice}`]})
                                                          </span>
                                                        )}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* No Data Message */}
                                    {!sessionData.completed && responses.length === 0 && (
                                      <div className="text-center py-6 text-gray-500">
                                        <p>No data available for this session yet</p>
                                      </div>
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}