import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Sparkles } from "lucide-react";
import { invokeLLM } from "@/components/utils/openai";

export default function CaseStudyChat({ subunitName, onComplete, onAdminSkip, subunitId, studentId }) {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [caseStudy, setCaseStudy] = useState(null);
  const [studentAnswers, setStudentAnswers] = useState([]);
  const [grading, setGrading] = useState(false);
  const [showingResults, setShowingResults] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadCaseStudy();
  }, []);

  const loadCaseStudy = async () => {
    setLoading(true);
    try {
      // Try to load existing case study from database
      if (subunitId) {
        const existing = await base44.entities.CaseStudy.filter({ subunit_id: subunitId });
        if (existing.length > 0) {
          const data = existing[0];
          setCaseStudy(data);
          initializeMessages(data);
          setLoading(false);
          return;
        }
      }
      
      // No existing case study, generate one dynamically
      generateCaseStudy();
    } catch (err) {
      console.error("Failed to load case study:", err);
      generateCaseStudy();
    }
  };

  const initializeMessages = (data) => {
    setMessages([
      {
        role: "assistant",
        content: `**Scenario:**\n${data.scenario}`
      },
      {
        role: "assistant",
        content: `**(a)** ${data.question_a.replace(/^\([a-d]\)\s*/i, '')}`
      }
    ]);
  };

  const generateCaseStudy = async () => {
    try {
      const fallback = {
        scenario: `A team of researchers is investigating ${subunitName} in a laboratory setting. They need your help analyzing their observations and drawing conclusions.`,
        question_a: `Based on what you learned about ${subunitName}, identify the key variables in this scenario and explain how they relate to each other.`,
        question_b: `Calculate or estimate the expected outcome using the principles of ${subunitName}. Show your reasoning.`,
        question_c: `If one of the conditions changed, how would that affect the results? Explain using the concepts you learned.`,
        question_d: `A colleague claims that the observed results contradict the theory. Explain why this statement may be incomplete or incorrect, referencing specific principles.`
      };
      setCaseStudy(fallback);
      initializeMessages(fallback);
    } finally {
      setLoading(false);
    }
  };

  const getNextQuestion = (index) => {
    if (!caseStudy) return null;
    const questions = [
      { label: "(a)", text: caseStudy.question_a },
      { label: "(b)", text: caseStudy.question_b },
      { label: "(c)", text: caseStudy.question_c },
      { label: "(d)", text: caseStudy.question_d }
    ];
    return questions[index];
  };

  const gradeAllAnswers = async (answers) => {
    setGrading(true);
    try {
      const gradingResult = await invokeLLM({
        prompt: `You are grading a student's free response answers to a case study about "${subunitName}".

  Case Study Scenario: ${caseStudy?.scenario}

  COMPARE each student answer against the expected/model answer. Grade based on how well the student's response matches the key concepts in the expected answer.

  Student Answers vs Expected Answers:

  (a) Question: ${caseStudy?.question_a}
  EXPECTED ANSWER: ${caseStudy?.answer_a || "No expected answer provided"}
  STUDENT ANSWER: ${answers[0] || "SKIPPED - NO ANSWER"}

  (b) Question: ${caseStudy?.question_b}
  EXPECTED ANSWER: ${caseStudy?.answer_b || "No expected answer provided"}
  STUDENT ANSWER: ${answers[1] || "SKIPPED - NO ANSWER"}

  (c) Question: ${caseStudy?.question_c}
  EXPECTED ANSWER: ${caseStudy?.answer_c || "No expected answer provided"}
  STUDENT ANSWER: ${answers[2] || "SKIPPED - NO ANSWER"}

  (d) Question: ${caseStudy?.question_d}
  EXPECTED ANSWER: ${caseStudy?.answer_d || "No expected answer provided"}
  STUDENT ANSWER: ${answers[3] || "SKIPPED - NO ANSWER"}

  Grade each answer on a scale of 0-1 by comparing to the expected answer:
  - 0 = SKIPPED, blank, completely incorrect, or misses all key concepts from expected answer
  - 0.5 = partial credit (captures some key concepts from expected answer but incomplete or partially correct)
  - 1 = full credit (captures the main concepts from expected answer, even if worded differently)

  IMPORTANT: 
  - If an answer is empty, blank, just whitespace, or says things like "idk", "skip", "I don't know", give it 0 points.
  - Focus on whether the student demonstrates understanding of the KEY CONCEPTS in the expected answer.
  - Exact wording is not required - conceptual accuracy matters.

  For EACH question, provide:
  - score (0, 0.5, or 1)
  - feedback (brief explanation of what they got right/wrong and why)

  Return JSON with:
  - scores_a, scores_b, scores_c, scores_d (each 0, 0.5, or 1)
  - feedback_a, feedback_b, feedback_c, feedback_d (brief explanations)
  - total_score (sum of all scores, 0-4)`,
        response_json_schema: {
          type: "object",
          properties: {
            scores_a: { type: "number" },
            scores_b: { type: "number" },
            scores_c: { type: "number" },
            scores_d: { type: "number" },
            feedback_a: { type: "string" },
            feedback_b: { type: "string" },
            feedback_c: { type: "string" },
            feedback_d: { type: "string" },
            total_score: { type: "number" }
          }
        }
      });

      return gradingResult;
    } catch (err) {
      console.error("Failed to grade FRQ:", err);
      return { total_score: 2, scores_a: 0.5, scores_b: 0.5, scores_c: 0.5, scores_d: 0.5, feedback_a: "", feedback_b: "", feedback_c: "", feedback_d: "" };
    } finally {
      setGrading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage = currentInput.trim();
    setCurrentInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    
    // If showing results, handle as follow-up question
    if (showingResults) {
      setLoading(true);
      try {
        const aiResponse = await invokeLLM({
          prompt: `You are Quest Panda helping a student understand their case study results.

Student's question: "${userMessage}"

Context - Their scores and feedback:
(a) ${scoreBreakdown?.scores_a}/1 - ${scoreBreakdown?.feedback_a}
(b) ${scoreBreakdown?.scores_b}/1 - ${scoreBreakdown?.feedback_b}
(c) ${scoreBreakdown?.scores_c}/1 - ${scoreBreakdown?.feedback_c}
(d) ${scoreBreakdown?.scores_d}/1 - ${scoreBreakdown?.feedback_d}

Provide a helpful, concise response (2-3 sentences) addressing their question. Be encouraging and educational.`
        });
        
        setMessages(prev => [...prev, { role: "assistant", content: aiResponse }]);
      } catch (err) {
        console.error("Failed to answer question:", err);
        setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble answering right now. Feel free to ask another question or continue!" }]);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    const newAnswers = [...studentAnswers, userMessage];
    setStudentAnswers(newAnswers);
    setLoading(true);

    const nextQuestionIndex = currentQuestionIndex + 1;

    // Add panda response
    setTimeout(async () => {
      const nextQ = getNextQuestion(nextQuestionIndex);
      if (nextQuestionIndex < 4 && nextQ) {
        // More questions to ask
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `**${nextQ.label}** ${nextQ.text.replace(/^\([a-d]\)\s*/i, '')}`
          }
        ]);
        setCurrentQuestionIndex(nextQuestionIndex);
        setLoading(false);
      } else {
        // All questions answered - grade them
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: `**Grading your responses...** 📝`
          }
        ]);
        
        const gradingResult = await gradeAllAnswers(newAnswers);
        setFinalScore(gradingResult.total_score);
        setScoreBreakdown(gradingResult);
        
        // Save case study response
        if (studentId && subunitId) {
          try {
            await base44.entities.CaseStudyResponse.create({
              student_id: studentId,
              subunit_id: subunitId,
              case_study_id: caseStudy?.id || "",
              answer_a: newAnswers[0] || "",
              answer_b: newAnswers[1] || "",
              answer_c: newAnswers[2] || "",
              answer_d: newAnswers[3] || "",
              total_score: gradingResult.total_score
            });
          } catch (err) {
            console.error("Failed to save case study response:", err);
          }
        }
        
        const feedbackMessage = `**Your Case Study Score: ${gradingResult.total_score}/4** 🌟

Here's how you did on each part:

**(a)** ${gradingResult.scores_a}/1 - ${gradingResult.feedback_a}

**(b)** ${gradingResult.scores_b}/1 - ${gradingResult.feedback_b}

**(c)** ${gradingResult.scores_c}/1 - ${gradingResult.feedback_c}

**(d)** ${gradingResult.scores_d}/1 - ${gradingResult.feedback_d}

Feel free to ask me questions about any of these answers before we continue!`;
        
        setMessages(prev => [
          ...prev.slice(0, -1),
          {
            role: "assistant",
            content: feedbackMessage
          }
        ]);
        setShowingResults(true);
        setLoading(false);
      }
    }, 800);
  };

  const progress = ((currentQuestionIndex + 1) / 4) * 100;

  if (loading && messages.length === 0) {
    return (
      <Card className="border-0 shadow-2xl mx-auto max-w-3xl bg-white/95 backdrop-blur-xl rounded-[32px]">
        <CardContent className="p-12 text-center">
          <div className="w-16 h-16 bg-[#C4B5FD]/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-3xl">🐼</span>
          </div>
          <p className="text-lg text-[#1A1A1A]/70">Quest Panda is preparing your case study...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-2xl mx-auto max-w-3xl bg-white/95 backdrop-blur-xl rounded-[32px]">
      <CardContent className="p-8">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1A1A1A]/60">Case Study Progress</span>
            <span className="text-sm font-medium text-[#1A1A1A]">Question {currentQuestionIndex + 1} of 4</span>
          </div>
          <div className="h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#86EFAC] rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#C4B5FD]/20 rounded-full flex items-center justify-center border-2 border-[#C4B5FD]/40">
            <span className="text-xl">🐼</span>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Case Study</h2>
        </div>

        <div className="bg-gradient-to-br from-white to-[#FFEBE0]/20 rounded-[28px] p-6 mb-6 max-h-[400px] overflow-y-auto border-2 border-[#C4B5FD]/20">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}
              >
                <div className="flex items-start gap-3 max-w-[85%]">
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-9 h-9 bg-[#C4B5FD]/20 rounded-full flex items-center justify-center border-2 border-[#C4B5FD]/40">
                      <span className="text-lg">🐼</span>
                    </div>
                  )}
                  <div
                    className={`rounded-[20px] p-5 text-base ${
                      message.role === "user"
                        ? "bg-[#86EFAC]/90 text-[#1A1A1A] shadow-lg"
                        : "bg-white text-[#1A1A1A] shadow-lg border-2 border-[#C4B5FD]/20"
                    }`}
                    style={{fontWeight: 450}}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content.split(/(\*\*.*?\*\*)/).map((part, i) => {
                        if (part.startsWith("**") && part.endsWith("**")) {
                          return <strong key={i}>{part.slice(2, -2)}</strong>;
                        }
                        return <span key={i}>{part}</span>;
                      })}
                    </div>
                  </div>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-9 h-9 bg-[#86EFAC] rounded-full flex items-center justify-center shadow-lg text-[#1A1A1A] font-bold text-xs">
                      You
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 bg-[#C4B5FD]/20 rounded-full flex items-center justify-center border-2 border-[#C4B5FD]/40">
                    <span className="text-lg">🐼</span>
                  </div>
                  <div className="bg-white border-2 border-[#C4B5FD]/20 p-5 rounded-[20px] shadow-lg">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#C4B5FD] animate-pulse" />
                      <span className="text-[#1A1A1A]/70 text-base" style={{fontWeight: 450}}>Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {showingResults ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <Textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Ask a question about your answers..."
                className="flex-1 h-20 rounded-[20px] border-3 border-[#C4B5FD]/50 focus:border-[#86EFAC] bg-white resize-none text-base p-4 placeholder:text-[#1A1A1A]/40 text-[#1A1A1A]"
                style={{fontWeight: 450}}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={loading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !currentInput.trim()}
                className="bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] px-8 rounded-full shadow-xl transform transition-all hover:scale-105 h-20"
              >
                {loading ? (
                  <Sparkles className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <Button
              onClick={() => onComplete(finalScore)}
              className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-4 font-semibold rounded-full"
            >
              Continue to Results
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Textarea
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 h-20 rounded-[20px] border-3 border-[#C4B5FD]/50 focus:border-[#86EFAC] bg-white resize-none text-base p-4 placeholder:text-[#1A1A1A]/40 text-[#1A1A1A]"
              style={{fontWeight: 450}}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !currentInput.trim()}
              className="bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] px-8 rounded-full shadow-xl transform transition-all hover:scale-105 h-20"
            >
              {loading ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        )}

        {onAdminSkip && (
          <div className="mt-4 flex justify-end">
            <Button 
              onClick={onAdminSkip}
              variant="outline"
              className="px-6 py-2 text-xs rounded-full"
            >
              Admin Skip
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}