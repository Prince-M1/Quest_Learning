import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Brain, Award, CheckCircle, XCircle, RefreshCw, Play, Clock, X, FileText } from "lucide-react";
import LofiMusicPlayer from "../components/shared/LofiMusicPlayer";
import CaseStudyChat from "../components/newSession/CaseStudyChat";


export default function PracticeSession() {
  const navigate = useNavigate();
  const [step, setStep] = useState("quiz");
  const [recallText, setRecallText] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answeredCorrectly, setAnsweredCorrectly] = useState(false);
  const [bonusAnswer, setBonusAnswer] = useState("");
  const [results, setResults] = useState([]);
  const [user, setUser] = useState(null);
  const [subunit, setSubunit] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [canProceed, setCanProceed] = useState(false);
  const [adminSkip, setAdminSkip] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [dbQuestions, setDbQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [frqScore, setFrqScore] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const subunitId = urlParams.get("topic");
  const unit = urlParams.get("unit") || "Unit";
  const reviewNumber = parseInt(urlParams.get("review")) || 0;

  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user from MongoDB
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (userRes.ok) {
        const currentUser = await userRes.json();
        setUser(currentUser);
      }

      if (subunitId) {
        // Fetch subunit from MongoDB
        const subunitRes = await fetch(`${API_BASE}/api/subunits/${subunitId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (subunitRes.ok) {
          const subunitData = await subunitRes.json();
          setSubunit(subunitData);
        }

        // Fetch video from MongoDB
        const videosRes = await fetch(`${API_BASE}/api/videos/subunit/${subunitId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (videosRes.ok) {
          const videoData = await videosRes.json();
          if (videoData.length > 0) {
            setVideo(videoData[0]);
          }
        }

        // Fetch quiz from MongoDB
        const quizzesRes = await fetch(`${API_BASE}/api/quizzes/subunit/${subunitId}?quiz_type=new_topic`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (quizzesRes.ok) {
          const quizData = await quizzesRes.json();
          if (quizData.length > 0) {
            setQuiz(quizData[0]);
            
            // Fetch questions for this quiz
            const questionsRes = await fetch(`${API_BASE}/api/questions/quiz/${quizData[0]._id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (questionsRes.ok) {
              const questionsData = await questionsRes.json();
              // Get all questions and randomly select 10
              if (questionsData.length > 0) {
                const shuffled = questionsData.sort(() => Math.random() - 0.5);
                setDbQuestions(shuffled.slice(0, Math.min(10, shuffled.length)));
              }
            }
          }
        }
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoading(false);
    }
  };

  const topic = subunit?.subunit_name || "Topic";
  const [unitName, setUnitName] = useState("Unit");
  const videoTotalDuration = video?.duration_seconds || 120;

  useEffect(() => {
    const loadUnitName = async () => {
      if (subunit?.unit_id) {
        try {
          const unitRes = await fetch(`${API_BASE}/api/units/${subunit.unit_id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (unitRes.ok) {
            const unitData = await unitRes.json();
            setUnitName(unitData.unit_name);
          }
        } catch (err) {
          console.error("Failed to load unit name:", err);
        }
      }
    };
    loadUnitName();
  }, [subunit]);
  
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;
    
    let videoId = null;
    
    // Handle youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    }
    // Handle youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    // Handle youtube.com/embed/VIDEO_ID
    else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    
    return videoId ? `https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0&showinfo=0` : null;
  };
  
  const progress = step === "quiz" ? ((currentQuestion + 1) / 10) * 100 : 100;

  const shuffleChoices = (options, correctIndex) => {
    const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const shuffledOptions = shuffledIndices.map(i => options[i]);
    const newCorrectIndex = shuffledIndices.indexOf(correctIndex);
    return { options: shuffledOptions, correctIndex: newCorrectIndex };
  };

  // Use database questions with randomized selection
  const questions = React.useMemo(() => {
    if (dbQuestions.length === 0) return [];
    
    // Already randomized 10 questions from loadData
    return dbQuestions.map(q => {
      const choices = [q.choice_1, q.choice_2, q.choice_3, q.choice_4];
      const correctChoice = q.correct_choice - 1;
      
      // Shuffle choices and track new correct index
      const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const shuffledChoices = shuffledIndices.map(i => choices[i]);
      const newCorrectIndex = shuffledIndices.indexOf(correctChoice);
      
      return {
        question: q.question_text,
        options: shuffledChoices,
        correctIndex: newCorrectIndex,
        difficulty: q.difficulty
      };
    });
  }, [dbQuestions]);

  const handleAnswerSubmit = async () => {
    const correct = selectedAnswer === questions[currentQuestion].correctIndex;
    setAnsweredCorrectly(correct);
    setResults([...results, { question: currentQuestion, mcqCorrect: correct, frqSubmitted: false, selectedChoice: selectedAnswer }]);
    
    // Save question response to MongoDB
    if (user && quiz && dbQuestions[currentQuestion]) {
      try {
        await fetch(`${API_BASE}/api/question-responses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id,
            quiz_id: quiz._id,
            question_id: dbQuestions[currentQuestion]._id,
            selected_choice: selectedAnswer + 1,
            is_correct: correct,
            session_type: "review",
            subunit_id: subunitId
          })
        });
      } catch (err) {
        console.error("Failed to save question response:", err);
      }
    }
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setStep("results");
    }
  };

  const handleQuizSkip = () => {
    const password = prompt("Enter admin password to skip:");
    if (password === "admin") {
      setStep("case_study");
    } else if (password !== null) {
      alert("Incorrect password");
    }
  };

  const mcCorrect = results.filter(r => r.mcqCorrect).length;
  const mcPercent = questions.length > 0 ? (mcCorrect / questions.length) * 100 : 0;
  const finalScore = Math.round(mcPercent);

  const handleCompleteSession = async () => {
    if (!user || !subunitId) {
      navigate(createPageUrl("LearningHub"));
      return;
    }

    try {
      // Save quiz result to MongoDB
      if (quiz) {
        await fetch(`${API_BASE}/api/quiz-results`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id,
            quiz_id: quiz._id,
            score: finalScore,
            correct_answers: mcCorrect,
            total_questions: questions.length,
            completed_at: new Date().toISOString()
          })
        });
      }

      // Save learning session to MongoDB
      const sessionEnd = new Date();
      const sessionStart = new Date(sessionEnd.getTime() - 10 * 60 * 1000);
      await fetch(`${API_BASE}/api/learning-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: user._id,
          subunit_id: subunitId,
          session_type: "review",
          start_time: sessionStart.toISOString(),
          end_time: sessionEnd.toISOString(),
          total_time_seconds: 10 * 60,
          completed: finalScore >= 70,
          review_number: reviewNumber
        })
      });

      // Update student progress in MongoDB
      const progressRes = await fetch(`${API_BASE}/api/progress/student/${user._id}/subunit/${subunitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let currentReviewCount = 0;
      let progressId = null;

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        if (progressData) {
          currentReviewCount = progressData.review_count || 0;
          progressId = progressData._id;
        }
      }

      if (finalScore >= 70) {
        const reviewCount = currentReviewCount + 1;
        // Spaced repetition: 1, 3, 7, 14, 21, 30 days, then every 30 days
        const reviewIntervals = [1, 3, 7, 14, 21, 30];
        const daysUntilNext = reviewCount < reviewIntervals.length 
          ? reviewIntervals[reviewCount] 
          : 30; // Every 30 days after the 6th review
        const nextReviewDate = new Date(Date.now() + daysUntilNext * 24 * 60 * 60 * 1000);

        if (progressId) {
          await fetch(`${API_BASE}/api/progress/${progressId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              learned_status: true,
              last_review_date: new Date().toISOString(),
              last_review_score: finalScore,
              next_review_date: nextReviewDate.toISOString(),
              review_count: reviewCount,
              urgency_status: "Low"
            })
          });
        }
      } else {
        // Failed review - retry in 1 day without incrementing review count
        const nextReviewDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (progressId) {
          await fetch(`${API_BASE}/api/progress/${progressId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              last_review_date: new Date().toISOString(),
              last_review_score: finalScore,
              next_review_date: nextReviewDate.toISOString(),
              urgency_status: "Critical"
            })
          });
        }
      }

      // Navigate and force refresh
      window.location.href = createPageUrl("LearningHub");
    } catch (err) {
      console.error("Failed to save progress:", err);
      alert("Failed to save progress. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#1A1A1A]/60 font-medium">Loading practice session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <LofiMusicPlayer />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Exit Session?</h3>
            </div>
            <p className="text-gray-700 mb-6">Are you sure you want to exit? You'll need to restart this session from the beginning.</p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowExitModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => navigate(createPageUrl("LearningHub"))}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
              >
                Exit Session
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto" style={{fontFamily: '"Inter", sans-serif'}}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowExitModal(true)} className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-[#1A1A1A]">
              Exit
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#1A1A1A]">{unitName}</h1>
              <p className="text-sm text-[#1A1A1A]/60">{topic}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#C4B5FD]/20 rounded-full">
            <span className="text-sm font-medium text-[#1A1A1A]">Review #{reviewNumber}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1A1A1A]/60">Progress</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {step === "quiz" && (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-[32px]">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center">
                    <span className="text-[#2563EB] font-semibold">{currentQuestion + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-[#1A1A1A]">Question {currentQuestion + 1} of {questions.length}</span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-6">{questions[currentQuestion]?.question}</h3>

              <div className="space-y-3 mb-6">
              {questions[currentQuestion]?.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(index)}
                  className={`w-full p-4 text-left border-2 rounded-[20px] transition-all ${
                    selectedAnswer === index
                      ? "border-[#3B82F6] bg-[#3B82F6]/10"
                      : "border-[#C4B5FD]/30 hover:border-[#C4B5FD]/50 bg-white"
                  }`}
                >
                  <span className="text-sm text-[#1A1A1A]" style={{fontWeight: 450}}>{option.replace(/\.$/, '')}</span>
                </button>
              ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAnswerSubmit}
                  disabled={selectedAnswer === null}
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-5 font-semibold rounded-full"
                >
                  Submit Answer
                </Button>
                <Button 
                  onClick={handleQuizSkip}
                  variant="outline"
                  className="px-6 py-5 text-xs rounded-full"
                >
                  Admin Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "results" && (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-[32px]">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Award className="w-6 h-6 text-[#2563EB]" />
                  <h2 className="text-xl font-semibold text-[#1A1A1A]">Quiz Results</h2>
                </div>
              </div>

              <div className="text-center mb-8">
                <p className="text-6xl font-bold text-[#1A1A1A] mb-2">{finalScore}%</p>
                <p className="text-sm text-[#1A1A1A]/70" style={{fontWeight: 450}}>
                  {finalScore >= 70
                    ? "Great job! You've successfully completed this review"
                    : "You need 70% or higher to pass this review"}
                </p>
                <div className="mt-4 h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden max-w-md mx-auto">
                  <div className={`h-full rounded-full ${finalScore >= 70 ? 'bg-[#3B82F6]' : 'bg-red-500'}`} style={{ width: `${finalScore}%` }}></div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[20px] p-6 mb-6 space-y-4">
                <h3 className="font-semibold text-[#1A1A1A] mb-4">Score Breakdown</h3>
                
                <div className="border-t-2 border-[#1A1A1A]/20 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#1A1A1A]">Final Score</p>
                    <p className={`text-3xl font-bold ${finalScore >= 70 ? 'text-[#3B82F6]' : 'text-red-500'}`}>
                      {finalScore}%
                    </p>
                  </div>
                  <p className="text-xs text-[#1A1A1A]/50 mt-1">
                    {finalScore >= 70 ? "Passing (70% required)" : "Below passing threshold (70% required)"}
                  </p>
                </div>
              </div>

              <Button onClick={handleCompleteSession} className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-5 font-semibold rounded-full">
                Complete Review Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}