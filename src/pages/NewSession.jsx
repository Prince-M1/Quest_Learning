import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Play, CheckCircle, BookOpen, FileText, X, Sparkles, XCircle } from "lucide-react";
import SocraticTutor from "../components/newSession/SocraticTutor";
import CaseStudyChat from "../components/newSession/CaseStudyChat";
import LofiMusicPlayer from "../components/shared/LofiMusicPlayer";
import { invokeLLM } from "@/components/utils/openai";

export default function NewSession() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin, fetchMe } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const skipInquiry = urlParams.get("skipInquiry") === "true";
  const [step, setStep] = useState(skipInquiry ? "video" : "inquiry");
  const [videoProgress, setVideoProgress] = useState(0);
  const [currentCheckIndex, setCurrentCheckIndex] = useState(0);
  const [currentCheck, setCurrentCheck] = useState(null);
  const [selectedCheckAnswer, setSelectedCheckAnswer] = useState(null);
  const [showCheckFeedback, setShowCheckFeedback] = useState(false);
  const [checksCompleted, setChecksCompleted] = useState([]);
  const [canProceed, setCanProceed] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [results, setResults] = useState([]);
  const [termsChecked, setTermsChecked] = useState({});
  const [subunit, setSubunit] = useState(null);

  const [video, setVideo] = useState(null);
  const [article, setArticle] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [dbQuestions, setDbQuestions] = useState([]);
  const [attentionChecks, setAttentionChecks] = useState([]);
  const [inquirySession, setInquirySession] = useState(null);
  const [studentGuess, setStudentGuess] = useState("");
  const [showSocraticTutor, setShowSocraticTutor] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminSkip, setAdminSkip] = useState(false);
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [sessionStartTime] = useState(new Date());
  const [lastKnownTime, setLastKnownTime] = useState(0);
  const [actualVideoDuration, setActualVideoDuration] = useState(null);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [failAlertMessage, setFailAlertMessage] = useState("");
  const [reflectionText, setReflectionText] = useState("");
  const [showExitModal, setShowExitModal] = useState(false);
  const [frqScore, setFrqScore] = useState(null);
  const videoRef = useRef(null);

  const subunitId = urlParams.get("topic");
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    // Wait for AuthContext to finish hydrating /api/auth/me
    if (isLoadingAuth) return;

    // Not logged in => go login (JWT flow)
    if (!isAuthenticated) {
      navigateToLogin(window.location.pathname + window.location.search);
      return;
    }

    // Logged in => ensure we have user (extra safety)
    (async () => {
      let me = user;
      if (!me) {
        me = await fetchMe?.();
      }
      if (me) {
        loadData();
      }
    })();

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube API Ready");
      };
    }
  }, [isLoadingAuth, isAuthenticated, user, fetchMe, navigateToLogin]);

  // Initialize YouTube player
  useEffect(() => {
    if (video?.video_url && step === "video" && !youtubePlayer && !adminSkip) {
      const videoId = getYouTubeVideoId(video.video_url);
      if (!videoId) return;
      
      const initializePlayer = () => {
        const playerElement = document.getElementById('youtube-player');
        if (!playerElement) {
          setTimeout(initializePlayer, 100);
          return;
        }
        
        if (window.YT && window.YT.Player) {
          try {
            const player = new window.YT.Player('youtube-player', {
              height: '100%',
              width: '100%',
              videoId: videoId,
              playerVars: {
                controls: 0,
                modestbranding: 1,
                rel: 0,
                showinfo: 0,
                autoplay: 1,
                enablejsapi: 1,
                disablekb: 1,
                fs: 0,
                iv_load_policy: 3
              },
              events: {
                onReady: (event) => {
                  setYoutubePlayer(event.target);
                  const duration = event.target.getDuration();
                  if (duration) {
                    setActualVideoDuration(Math.floor(duration));
                  }
                  event.target.playVideo();
                  setIsVideoPlaying(true);
                },
                onStateChange: (event) => {
                  setIsVideoPlaying(event.data === 1);
                }
              }
            });
          } catch (err) {
            console.error("Failed to initialize YouTube player:", err);
          }
        } else {
          setTimeout(initializePlayer, 200);
        }
      };
      
      setTimeout(initializePlayer, 500);
    }
  }, [video, step, youtubePlayer]);

  const loadData = async () => {
    try {
      if (!user || !subunitId) {
        console.log("⚠️ No user yet or missing topic param.");
        return;
      }

      const token = localStorage.getItem('token');
      console.log("🔄 Loading session data for subunitId:", subunitId);

      if (subunitId) {
        // Fetch all data in parallel
        const [subunitRes, videoRes, inquiryRes, quizRes] = await Promise.all([
          fetch(`${API_BASE}/api/subunits`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE}/api/videos/subunit/${subunitId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE}/api/inquiry-sessions/subunit/${subunitId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE}/api/quizzes/subunit/${subunitId}?quiz_type=new_topic`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const allSubunits = subunitRes.ok ? await subunitRes.json() : [];
        const videoData = videoRes.ok ? await videoRes.json() : [];
        const inquiryData = inquiryRes.ok ? await inquiryRes.json() : null;
        const quizData = quizRes.ok ? await quizRes.json() : [];

        // Find subunit
        const subunitData = allSubunits.find(s => (s._id || s.id).toString() === subunitId);
        if (subunitData) {
          setSubunit(subunitData);
        }

        // Set video
        if (videoData.length > 0) {
          setVideo(videoData[0]);
          
          // Load attention checks
          const videoId = (videoData[0]._id || videoData[0].id).toString();
          const checksRes = await fetch(`${API_BASE}/api/attention-checks/video/${videoId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const checksData = checksRes.ok ? await checksRes.json() : [];
          setAttentionChecks(checksData);
        }

        // Set inquiry session
        if (inquiryData) {
          setInquirySession(inquiryData);
        }

        // Set quiz and questions
        if (quizData.length > 0) {
          setQuiz(quizData[0]);
          
          const quizId = (quizData[0]._id || quizData[0].id).toString();
          const questionsRes = await fetch(`${API_BASE}/api/questions/quiz/${quizId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const questionsData = questionsRes.ok ? await questionsRes.json() : [];
          setDbQuestions(questionsData);
        }
      }
    } catch (err) {
      console.error("❌ CRITICAL ERROR loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const topic = subunit?.subunit_name || "Topic";
  const [unitName, setUnitName] = useState("Unit");

  useEffect(() => {
    const loadUnitName = async () => {
      if (subunit?.unit_id) {
        try {
          const token = localStorage.getItem('token');
          const unitsRes = await fetch(`${API_BASE}/api/units`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          const units = unitsRes.ok ? await unitsRes.json() : [];
          const unit = units.find(u => (u._id || u.id).toString() === (subunit.unit_id || subunit.unitId)?.toString());
          if (unit) {
            setUnitName(unit.unit_name);
          }
        } catch (err) {
          console.error("Failed to load unit name:", err);
        }
      }
    };
    loadUnitName();
  }, [subunit]);

  const videoTotalDuration = actualVideoDuration || video?.duration_seconds || 120;
  
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    let videoId = null;
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    return videoId;
  }; 

  const keyTerms = article?.text?.split('\n\n')[0]?.split('\n').filter(Boolean).slice(0, 5) || [
    `Key concept in ${topic}`,
    `Important principle`,
    `Core methodology`,
    `Application area`,
    `Related theory`
  ];

  const resources = [
    { title: `Understanding ${topic}`, type: "Article", url: "#" },
    { title: "Additional Reading", type: "Interactive", url: "#" },
    { title: "Practice Exercises", type: "Article", url: "#" }
  ];

  // Select 4 easy, 4 medium, 2 hard questions randomly
  const questions = React.useMemo(() => {
    if (dbQuestions.length === 0) return [];
    
    const easyQuestions = dbQuestions.filter(q => q.difficulty === 'easy');
    const mediumQuestions = dbQuestions.filter(q => q.difficulty === 'medium');
    const hardQuestions = dbQuestions.filter(q => q.difficulty === 'hard');
    
    const selectedEasy = easyQuestions.sort(() => Math.random() - 0.5).slice(0, 4);
    const selectedMedium = mediumQuestions.sort(() => Math.random() - 0.5).slice(0, 4);
    const selectedHard = hardQuestions.sort(() => Math.random() - 0.5).slice(0, 2);
    
    const selectedQuestions = [...selectedEasy, ...selectedMedium, ...selectedHard];
    
    return selectedQuestions.map(q => {
      const choices = [q.choice_1, q.choice_2, q.choice_3, q.choice_4];
      const correctChoice = q.correct_choice - 1;
      
      const shuffledIndices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      const shuffledChoices = shuffledIndices.map(i => choices[i]);
      const newCorrectIndex = shuffledIndices.indexOf(correctChoice);
      
      return {
        question: q.question_text,
        options: shuffledChoices,
        correctIndex: newCorrectIndex,
        difficulty: q.difficulty,
        bonusQuestion: `Explain in detail the concept tested in this question about ${topic}. In your answer, provide specific examples, discuss real-world applications, explain the underlying principles, and describe how this relates to other concepts in the subject. Provide comprehensive reasoning for at least 100 words.`
      };
    });
  }, [dbQuestions]);

  const progress = 
    step === "inquiry" ? 25 :
    step === "video" ? 25 + (canProceed ? 25 : (videoProgress / videoTotalDuration) * 25) : 
    step === "quiz" ? 50 + (currentQuestion / questions.length) * 25 : 
    step === "article" ? 75 :
    100;

  // Track video progress and prevent seeking
  useEffect(() => {
    if (step === "video" && !adminSkip && youtubePlayer) {
      const interval = setInterval(() => {
        if (youtubePlayer && typeof youtubePlayer.getCurrentTime === 'function' && typeof youtubePlayer.getPlayerState === 'function') {
          const playerState = youtubePlayer.getPlayerState();
          const currentTime = youtubePlayer.getCurrentTime();
          
          if (currentCheck) {
            if (playerState === 1) {
              youtubePlayer.pauseVideo();
            }
            return;
          }
          
          if (currentTime > lastKnownTime + 1.5) {
            youtubePlayer.seekTo(lastKnownTime, true);
            return;
          }
          
          if (playerState === 1) {
            setVideoProgress(Math.floor(currentTime));
            setLastKnownTime(currentTime);
            
            const nextCheck = attentionChecks[currentCheckIndex];
            if (nextCheck && currentTime >= nextCheck.timestamp && !checksCompleted.includes(currentCheckIndex)) {
              youtubePlayer.pauseVideo();
              setCurrentCheck(nextCheck);
              setSelectedCheckAnswer(null);
              setShowCheckFeedback(false);
              return;
            }
            
            if (currentTime >= videoTotalDuration - 1 && checksCompleted.length === attentionChecks.length) {
              setCanProceed(true);
              clearInterval(interval);
            }
          }
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [step, currentCheckIndex, checksCompleted, canProceed, currentCheck, youtubePlayer, adminSkip, videoTotalDuration, lastKnownTime, attentionChecks]);

  const handleCheckSubmit = async () => {
    if (!selectedCheckAnswer || !currentCheck) return;
    
    const isCorrect = selectedCheckAnswer === currentCheck.correct_choice;
    
    // Save attention check response
    if (user && currentCheck && video) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/attention-check-responses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id || user.id,
            attention_check_id: currentCheck._id || currentCheck.id,
            video_id: video._id || video.id,
            subunit_id: subunitId,
            selected_choice: selectedCheckAnswer,
            is_correct: isCorrect,
            session_type: "new_topic",
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error("Failed to save attention check response:", err);
      }
    }
    
    if (!isCorrect) {
      setShowCheckFeedback(true);
      
      setTimeout(() => {
        if (youtubePlayer) {
          const checkpointTime = Math.max(0, currentCheck.timestamp - 30);
          youtubePlayer.seekTo(checkpointTime, true);
          youtubePlayer.playVideo();
        }
        
        setFailAlertMessage(`That's not quite right. Watch the content more carefully starting from around ${Math.floor(currentCheck.timestamp / 60)}:${String(Math.floor(currentCheck.timestamp % 60)).padStart(2, '0')}. Let's try again.`);
        setShowFailAlert(true);
        
        setCurrentCheck(null);
        setSelectedCheckAnswer(null);
        setShowCheckFeedback(false);
      }, 2000);
      return;
    }
    
    setShowCheckFeedback(true);
    
    setTimeout(() => {
      setChecksCompleted(prev => [...prev, currentCheckIndex]);
      setCurrentCheck(null);
      setSelectedCheckAnswer(null);
      setShowCheckFeedback(false);
      setCurrentCheckIndex(currentCheckIndex + 1);
      
      if (youtubePlayer) {
        youtubePlayer.playVideo();
      }
    }, 1500);
  };

  const handleVideoComplete = () => {
    setStep("quiz");
  };

  const handleGuessSubmit = () => {
    navigate(createPageUrl("SocraticInquiry") + `?topic=${subunitId}`);
  };

  const handleSocraticComplete = async (conversationHistory) => {
    // Don't auto-advance, let component show continue button
  };

  const handleAdminSkip = (phase) => {
    const password = prompt("Enter admin password to skip:");
    if (password === "admin") {
      if (phase === "video") {
        setAdminSkip(true);
        setCanProceed(true);
        setVideoProgress(videoTotalDuration);
        const allCheckIndices = Array.from({ length: attentionChecks.length }, (_, i) => i);
        setChecksCompleted(allCheckIndices);
      } else if (phase === "inquiry") {
        setStep("video");
      } else if (phase === "quiz") {
        const fakeResults = questions.map(() => ({ correct: true, selectedChoice: 0 }));
        setResults(fakeResults);
        setStep("article");
      } else if (phase === "article") {
        setStep("results");
      }
    } else if (password !== null) {
      alert("Incorrect password");
    }
  };

  const handleQuizComplete = () => {
    setStep("article");
  };

  const handleArticleComplete = async (frqScoreFromChat) => {
    if (frqScoreFromChat !== undefined) {
      setFrqScore(frqScoreFromChat);
    }
    setStep("results");
  };

  const handleAnswerSubmit = async () => {
    const correct = selectedAnswer === questions[currentQuestion].correctIndex;
    setResults([...results, { correct, selectedChoice: selectedAnswer }]);
    
    // Save question response
    if (user && quiz && dbQuestions[currentQuestion]) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/api/question-responses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id || user.id,
            quiz_id: quiz._id || quiz.id,
            question_id: dbQuestions[currentQuestion]._id || dbQuestions[currentQuestion].id,
            selected_choice: selectedAnswer + 1,
            is_correct: correct,
            session_type: "new_topic",
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
      handleQuizComplete();
    }
  };

  const toggleTerm = (index) => {
    setTermsChecked({ ...termsChecked, [index]: !termsChecked[index] });
  };

  const mcCorrect = results.filter(r => r.correct).length;
  const totalScore = mcCorrect;
  const termsComplete = Object.values(termsChecked).filter(Boolean).length;
  const correctAnswers = totalScore;
  
  const mcPercent = questions.length > 0 ? (mcCorrect / questions.length) * 100 : 0;
  const frqPercent = frqScore !== null ? (frqScore / 4) * 100 : 0;
  const finalScore = frqScore !== null ? Math.round(mcPercent * 0.6 + frqPercent * 0.4) : Math.round(mcPercent);

  const calculateNextReviewDate = (reviewCount) => {
    const reviewIntervals = [1, 3, 7, 14, 21, 30];
    const daysUntilNextReview = reviewIntervals[reviewCount] || 30;
    return new Date(Date.now() + daysUntilNextReview * 24 * 60 * 60 * 1000);
  };

  const handleCompleteSession = async () => {
    if (!user || !subunitId) {
      navigate(createPageUrl("LearningHub"));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const sessionEndTime = new Date();
      const totalTimeSeconds = Math.floor((sessionEndTime - sessionStartTime) / 1000);
      const scorePercent = finalScore;
      const isCompleted = finalScore >= 70;
      const nextReviewDate = isCompleted ? calculateNextReviewDate(0) : null;

      // Save quiz result
      if (quiz) {
        await fetch(`${API_BASE}/api/quiz-results`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id || user.id,
            quiz_id: quiz._id || quiz.id,
            score: scorePercent,
            correct_answers: totalScore,
            total_questions: questions.length,
            completed_at: sessionEndTime.toISOString()
          })
        });
      }

      // Save learning session
      await fetch(`${API_BASE}/api/learning-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: user._id || user.id,
          subunit_id: subunitId,
          session_type: "new_topic",
          start_time: sessionStartTime.toISOString(),
          end_time: sessionEndTime.toISOString(),
          total_time_seconds: totalTimeSeconds,
          completed: isCompleted,
          review_number: 0
        })
      });

      // Update student progress
      const progressRes = await fetch(`${API_BASE}/api/progress/student/${(user._id || user.id).toString()}/subunit/${subunitId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const progressData = {
        new_session_completed: isCompleted,
        new_session_score: scorePercent,
        learned_status: false,
        last_review_date: isCompleted ? sessionEndTime.toISOString() : null,
        next_review_date: isCompleted ? nextReviewDate.toISOString() : null,
        review_count: 0,
        urgency_status: isCompleted ? "Low" : "Medium"
      };

      if (progressRes.ok) {
        const existingProgress = await progressRes.json();
        const progressId = (existingProgress._id || existingProgress.id).toString();
        
        await fetch(`${API_BASE}/api/progress/${progressId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(progressData)
        });
      }

      window.location.href = createPageUrl("LearningHub");
    } catch (err) {
      console.error("Failed to save progress:", err);
      alert("Failed to save progress. Please try again.");
    }
  };

  // Add proper spacing here
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video || !inquirySession || !quiz || dbQuestions.length === 0) {
    console.log("⚠️ CONTENT NOT AVAILABLE - Missing required materials:");
    console.log("  Video:", video ? "✅" : "❌ MISSING");
    console.log("  Inquiry Session:", inquirySession ? "✅" : "❌ MISSING");
    console.log("  Quiz:", quiz ? "✅" : "❌ MISSING");
    console.log("  Questions:", dbQuestions.length > 0 ? `✅ (${dbQuestions.length})` : "❌ MISSING");
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <X className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Content Not Available</h2>
            <p className="text-gray-600 mb-4">This topic doesn't have learning materials yet.</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm">
              <p className="font-semibold mb-2">Missing:</p>
              <ul className="space-y-1">
                {!video && <li className="text-red-600">• Video</li>}
                {!inquirySession && <li className="text-red-600">• Inquiry Session</li>}
                {!quiz && <li className="text-red-600">• Quiz</li>}
                {dbQuestions.length === 0 && <li className="text-red-600">• Questions</li>}
              </ul>
            </div>
            <Button onClick={() => navigate(createPageUrl("LearningHub"))} className="bg-blue-600 hover:bg-blue-700">
              Return to Learning Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Clean white background */}
      <div className="fixed inset-0 bg-white"></div>
      
      <LofiMusicPlayer />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {showFailAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Needs More Detail</h3>
            </div>
            <p className="text-gray-700 mb-6 whitespace-pre-line">{failAlertMessage}</p>
            <Button
              onClick={() => setShowFailAlert(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
            >
              Continue Learning
            </Button>
          </div>
        </div>
      )}

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

      <div className="max-w-4xl mx-auto relative z-10 py-8" style={{fontFamily: '"Inter", sans-serif', fontWeight: 450}}>
        <div className="flex items-center justify-between mb-6 px-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowExitModal(true)} 
              className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-[#1A1A1A]"
            >
              Exit
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#1A1A1A]">{unitName}</h1>
              <p className="text-sm text-[#1A1A1A]/60">{topic}</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-[#3B82F6]/20 rounded-full">
            <span className="text-sm font-medium text-[#1A1A1A]">New Topic</span>
          </div>
        </div>

        <div className="mb-6 px-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1A1A1A]/60">Phase {step === "inquiry" ? "1" : step === "video" ? "2" : step === "quiz" ? "3" : step === "article" ? "4" : "5"} of 5</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#3B82F6] rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        {step === "video" && (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-[32px]">
            <CardContent className="p-0">
              <div className="p-6 border-b border-[#C4B5FD]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Play className="w-6 h-6 text-[#2563EB]" />
                    <div>
                      <h2 className="text-xl font-semibold text-[#1A1A1A]">Introduction to {topic}</h2>
                      <p className="text-sm text-[#1A1A1A]/60" style={{fontWeight: 450}}>Interactive Learning Video • {Math.floor(videoTotalDuration / 60)}:{String(Math.floor(videoTotalDuration % 60)).padStart(2, '0')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative bg-black aspect-video">
                {getYouTubeVideoId(video?.video_url) ? (
                  <>
                    <div id="youtube-player" className="w-full h-full"></div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 z-10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (youtubePlayer) {
                                if (isVideoPlaying) {
                                  youtubePlayer.pauseVideo();
                                } else {
                                  youtubePlayer.playVideo();
                                }
                              }
                            }}
                            className="text-white hover:text-gray-300 transition-colors pointer-events-auto p-1"
                          >
                            {isVideoPlaying ? (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          <span className="text-white text-xs">
                            {Math.floor(videoProgress / 60)}:{String(Math.floor(videoProgress % 60)).padStart(2, '0')} / {Math.floor(videoTotalDuration / 60)}:{String(Math.floor(videoTotalDuration % 60)).padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <div className="h-1 bg-white/30 rounded-full overflow-hidden pointer-events-none">
                        <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(videoProgress / videoTotalDuration) * 100}%` }}></div>
                      </div>
                    </div>
                    <div className="absolute inset-0 pointer-events-auto" style={{cursor: 'default'}}></div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                      <p className="text-white text-lg font-medium">Loading Video: {topic}</p>
                      <p className="text-white/70 text-sm">Progress: {Math.floor(videoProgress)}s / {videoTotalDuration}s</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                {currentCheck && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[20px] p-6 border-2 border-blue-200 mb-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-[#1A1A1A]">Attention Check</h3>
                      <div className="px-3 py-1 bg-blue-600 rounded-full">
                        <span className="text-xs font-medium text-white">Check {currentCheckIndex + 1}/{attentionChecks.length}</span>
                      </div>
                    </div>
                    
                    <p className="text-base font-medium text-[#1A1A1A] mb-4">{currentCheck.question}</p>
                    
                    <div className="space-y-2 mb-4">
                      {(() => {
                        const choices = [
                          { letter: 'A', text: currentCheck.choice_a },
                          { letter: 'B', text: currentCheck.choice_b },
                          { letter: 'C', text: currentCheck.choice_c },
                          { letter: 'D', text: currentCheck.choice_d }
                        ].filter(choice => choice.text);
                        
                        const shuffled = [...choices].sort((a, b) => {
                          const seed = currentCheckIndex;
                          return (a.letter.charCodeAt(0) + seed) % 2 === 0 ? -1 : 1;
                        });
                        
                        return shuffled.map((choice) => {
                          const isSelected = selectedCheckAnswer === choice.letter;
                          const isCorrect = choice.letter === currentCheck.correct_choice;
                          const showResult = showCheckFeedback;
                          
                          return (
                            <button
                              key={choice.letter}
                              onClick={() => !showCheckFeedback && setSelectedCheckAnswer(choice.letter)}
                              disabled={showCheckFeedback}
                              className={`w-full p-3 text-left border-2 rounded-[16px] transition-all ${
                                showResult && isCorrect
                                  ? 'border-green-500 bg-green-50'
                                  : showResult && isSelected && !isCorrect
                                  ? 'border-red-500 bg-red-50'
                                  : isSelected
                                  ? 'border-blue-600 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300 bg-white'
                              } ${showCheckFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                  showResult && isCorrect
                                    ? 'bg-green-600 text-white'
                                    : showResult && isSelected && !isCorrect
                                    ? 'bg-red-600 text-white'
                                    : isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                }`}>
                                  {choice.letter}
                                </div>
                                <span className="text-sm text-[#1A1A1A] flex-1" style={{fontWeight: 450}}>
                                  {choice.text}
                                </span>
                                {showResult && isCorrect && (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                                {showResult && isSelected && !isCorrect && (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                              </div>
                            </button>
                          );
                        });
                      })()}
                    </div>
                    
                    {!showCheckFeedback ? (
                      <Button
                        onClick={handleCheckSubmit}
                        disabled={!selectedCheckAnswer}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 font-semibold rounded-full"
                      >
                        Submit Answer
                      </Button>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-sm font-medium text-blue-600">Continuing in a moment...</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-[#1A1A1A]">Progress: {Math.floor((videoProgress / videoTotalDuration) * 100)}%</span>
                  <span className="text-sm text-[#1A1A1A]/60">Checks: {checksCompleted.length}/{attentionChecks.length}</span>
                </div>
                <div className="h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${(videoProgress / videoTotalDuration) * 100}%` }}></div>
                </div>

                <div className="bg-[#2563EB]/5 border border-[#2563EB]/20 rounded-[20px] p-4 mb-4">
                  <p className="text-sm text-[#1A1A1A] font-medium mb-1">Active Learning Required</p>
                  <p className="text-xs text-[#1A1A1A]/70" style={{fontWeight: 450}}>Watch completely and answer all attention checks to proceed</p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowExitModal(true)}
                    variant="outline"
                    className="px-6 py-3 rounded-full"
                  >
                    Exit
                  </Button>
                  <Button 
                    onClick={handleVideoComplete} 
                    disabled={!canProceed}
                    className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-3 disabled:opacity-50 font-semibold rounded-full"
                  >
                    {canProceed ? "Continue to Quiz" : "Complete video to continue"}
                  </Button>
                  <Button 
                    onClick={() => handleAdminSkip("video")}
                    variant="outline"
                    className="px-6 py-3 text-xs rounded-full"
                  >
                    Admin Skip
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "inquiry" && inquirySession && !showSocraticTutor && (
          <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-xl rounded-[32px] mx-4">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Let's Think About This...</h2>
              
              {inquirySession.hook_image_url && (
                <div className="mb-6 rounded-2xl overflow-hidden bg-white border-2 border-gray-200">
                  <img 
                    src={inquirySession.hook_image_url} 
                    alt="Hook Image"
                    onLoad={() => setImageLoaded(true)}
                    className="w-full h-auto"
                  />
                </div>
              )}

              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 mb-6">
                <p className="text-lg font-semibold text-[#1A1A1A]">
                  {inquirySession.hook_question}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGuessSubmit}
                  disabled={!imageLoaded}
                  className="flex-1 bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-5 font-semibold rounded-full"
                >
                  Start Discussion with Panda 🐼
                </Button>
                <Button 
                  onClick={() => handleAdminSkip("inquiry")}
                  variant="outline"
                  className="px-6 py-3 text-xs rounded-full"
                >
                  Admin Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "inquiry" && showSocraticTutor && inquirySession && (
          <SocraticTutor
            inquirySession={inquirySession}
            studentGuess={studentGuess}
            subunit={subunit}
            unitName={unitName}
            onComplete={(conversationHistory) => {
              handleSocraticComplete(conversationHistory);
              setStep("video");
            }}
            user={user}
          />
        )}

        {step === "article" && (
          <CaseStudyChat
            subunitName={topic}
            subunitId={subunitId}
            studentId={user?._id || user?.id}
            onComplete={(score) => handleArticleComplete(score)}
            onAdminSkip={() => {
              setFrqScore(2);
              handleAdminSkip("article");
            }}
          />
        )}

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

              <h3 className="text-lg font-semibold text-[#1A1A1A] mb-6">{questions[currentQuestion].question}</h3>

              <div className="space-y-3 mb-6">
                {questions[currentQuestion].options.map((option, index) => (
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
                  onClick={() => handleAdminSkip("quiz")}
                  variant="outline"
                  className="px-6 py-3 text-xs rounded-full"
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
              <div className="flex items-center gap-3 mb-6">
                {finalScore >= 70 ? (
                  <CheckCircle className="w-6 h-6 text-[#3B82F6]" />
                ) : (
                  <X className="w-6 h-6 text-red-500" />
                )}
                <h2 className="text-xl font-semibold text-[#1A1A1A]">
                  {finalScore >= 70 ? "Session Complete" : "Session Incomplete"}
                </h2>
              </div>

              <div className="text-center mb-8">
                <p className="text-6xl font-bold text-[#1A1A1A] mb-2">{finalScore}%</p>
                <p className="text-sm text-[#1A1A1A]/70" style={{fontWeight: 450}}>
                  {finalScore >= 70
                    ? "Great job! Your first review is scheduled for tomorrow"
                    : "You need 70% or higher to pass. Please redo the lesson."}
                </p>
                <div className="mt-4 h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden max-w-md mx-auto">
                  <div className={`h-full rounded-full ${finalScore >= 70 ? 'bg-[#3B82F6]' : 'bg-red-500'}`} style={{ width: `${finalScore}%` }}></div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="bg-gray-50 rounded-[20px] p-6 mb-6 space-y-4">
                <h3 className="font-semibold text-[#1A1A1A] mb-4">Score Breakdown</h3>
                
                {/* Multiple Choice */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Multiple Choice</p>
                    <p className="text-sm text-[#1A1A1A]/60">{mcCorrect} of {questions.length} correct</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${mcPercent >= 70 ? 'text-[#3B82F6]' : 'text-red-500'}`}>
                      {Math.round(mcPercent)}%
                    </p>
                    <p className="text-xs text-[#1A1A1A]/50">60% weight</p>
                  </div>
                </div>

                {/* Case Study FRQ */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                    <p className="font-medium text-[#1A1A1A]">Case Study (FRQ)</p>
                    <p className="text-sm text-[#1A1A1A]/60">4 questions graded</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${frqScore !== null && frqScore >= 2.8 ? 'text-[#3B82F6]' : frqScore !== null ? 'text-orange-500' : 'text-gray-400'}`}>
                      {frqScore !== null ? `${frqScore}/4` : '—'}
                    </p>
                    <p className="text-xs text-[#1A1A1A]/50">40% weight</p>
                  </div>
                </div>

                {/* Divider and Total */}
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

              {finalScore >= 70 ? (
                <Button onClick={handleCompleteSession} className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-5 font-semibold rounded-full">
                  Return to Learning Hub
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button onClick={() => window.location.reload()} className="w-full bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white py-5 font-semibold rounded-full">
                    Retry Lesson
                  </Button>
                  <Button onClick={handleCompleteSession} variant="outline" className="w-full rounded-full">
                    Exit to Learning Hub
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}