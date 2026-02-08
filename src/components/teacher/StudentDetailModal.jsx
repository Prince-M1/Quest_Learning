import React, { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

export default function StudentDetailModal({ 
  open, 
  onClose, 
  student, 
  units, 
  subunits, 
  progressData 
}) {
  const [expandedUnits, setExpandedUnits] = useState({});
  const [expandedSubunits, setExpandedSubunits] = useState({});
  const [subunitSessionType, setSubunitSessionType] = useState({});
  const [questionResponses, setQuestionResponses] = useState({});
  const [questions, setQuestions] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (open && student) {
      loadQuestionData();
    }
  }, [open, student]);

  const loadQuestionData = async () => {
    try {
      // MongoDB API: Fetch all questions, quizzes, and responses in parallel
      const [questionsRes, quizzesRes, responsesRes] = await Promise.all([
        axios.get(`${API_URL}/questions`, getAuthHeaders()),
        axios.get(`${API_URL}/quizzes`, getAuthHeaders()),
        axios.get(`${API_URL}/question-responses/student/${student.id}`, getAuthHeaders())
      ]);
      
      setQuestions(questionsRes.data);
      setQuizzes(quizzesRes.data);
      
      // Group responses by subunit
      const grouped = {};
      responsesRes.data.forEach(r => {
        const subunitId = r.subunit_id._id || r.subunit_id;
        if (!grouped[subunitId]) grouped[subunitId] = [];
        grouped[subunitId].push(r);
      });
      setQuestionResponses(grouped);
    } catch (err) {
      console.error("Failed to load question data:", err);
    }
  };

  if (!student) return null;

  const studentProgress = progressData.filter(p => 
    (p.student_id._id || p.student_id) === (student._id || student.id)
  );

  const getSubunitProgress = (subunitId) => {
    return studentProgress.find(p => 
      (p.subunit_id._id || p.subunit_id) === subunitId
    );
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const toggleSubunit = (subunitId) => {
    setExpandedSubunits(prev => ({ ...prev, [subunitId]: !prev[subunitId] }));
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
    const responses = questionResponses[subunitId] || [];
    return responses.filter(r => r.session_type === (sessionType === "new_topic" ? "new_topic" : "review"));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <span className="font-bold text-indigo-600">{student.name?.charAt(0) || student.full_name?.charAt(0)}</span>
            </div>
            <div>
              <div>{student.name || student.full_name}</div>
              <div className="text-sm font-normal text-gray-500">{student.email}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {units.map(unit => {
            const unitId = unit._id || unit.id;
            const unitSubunits = subunits.filter(s => 
              (s.unit_id._id || s.unit_id) === unitId
            );
            const completedCount = unitSubunits.filter(s => {
              const subunitId = s._id || s.id;
              return getSubunitProgress(subunitId)?.new_session_completed;
            }).length;

            return (
              <Collapsible 
                key={unitId} 
                open={expandedUnits[unitId]} 
                onOpenChange={() => toggleUnit(unitId)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 hover:border-indigo-300 transition-all">
                    <div className="flex items-center gap-3">
                      {expandedUnits[unitId] ? (
                        <ChevronDown className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-indigo-600" />
                      )}
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      <span className="font-semibold text-gray-900">{unit.unit_name}</span>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {completedCount}/{unitSubunits.length} completed
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="pl-8 pr-4 py-3 space-y-3">
                    {unitSubunits.map(subunit => {
                      const subunitId = subunit._id || subunit.id;
                      const progress = getSubunitProgress(subunitId);
                      const currentSessionType = subunitSessionType[subunitId] || "new_topic";
                      const sessionData = getSessionData(subunitId, currentSessionType);
                      const responses = getSubunitResponses(subunitId, currentSessionType);

                      return (
                        <Collapsible
                          key={subunitId}
                          open={expandedSubunits[subunitId]}
                          onOpenChange={() => toggleSubunit(subunitId)}
                        >
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-all">
                                <div className="flex items-center gap-2">
                                  {expandedSubunits[subunitId] ? (
                                    <ChevronDown className="w-4 h-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-500" />
                                  )}
                                  <span className="font-medium text-gray-900 text-sm">{subunit.subunit_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {progress?.new_session_completed ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-gray-300" />
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {progress?.review_count || 0} reviews
                                  </Badge>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                              <div className="p-3 bg-gray-50 border-t border-gray-200">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="text-sm text-gray-600">Session:</span>
                                  <Select
                                    value={currentSessionType}
                                    onValueChange={(val) => setSubunitSessionType(prev => ({ ...prev, [subunitId]: val }))}
                                  >
                                    <SelectTrigger className="w-40 h-8 text-sm">
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
                                </div>

                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-gray-700">Status:</span>
                                    <div className="flex items-center gap-2">
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

                                  {responses.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Question Responses:</p>
                                      <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {responses.map((response, idx) => {
                                          const questionId = response.question_id._id || response.question_id;
                                          const question = questions.find(q => (q._id || q.id) === questionId);
                                          return (
                                            <div 
                                              key={response._id || idx} 
                                              className={`p-2 rounded text-sm ${response.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
                                            >
                                              <div className="flex items-start gap-2">
                                                {response.is_correct ? (
                                                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                                                ) : (
                                                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                                )}
                                                <span className="text-gray-700 line-clamp-2">
                                                  {question?.question_text || `Question ${idx + 1}`}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {responses.length === 0 && sessionData.completed && (
                                    <p className="text-sm text-gray-500">No detailed responses available</p>
                                  )}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}