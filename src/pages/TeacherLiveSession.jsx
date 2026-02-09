import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeacherLayout from "../components/teacher/TeacherLayout";
import {
  Video,
  Users,
  Play,
  Square,
  Loader2,
  Copy,
  CheckCircle,
  AlertCircle,
  Trophy,
  TrendingUp,
  Eye
} from "lucide-react";
import NotificationModal from "../components/shared/NotificationModal";
import { useNotification } from "../components/shared/useNotification";

export default function TeacherLiveSession() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
 
  // Session creation state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [subunitName, setSubunitName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [questionDifficulty, setQuestionDifficulty] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(10);
 
  // Active session state
  const [activeSession, setActiveSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState(0);
  const { notification, showError, showSuccess, showWarning, closeNotification } = useNotification();

  // Use ref to track if component is mounted (prevents cleanup on unmount)
  const isMounted = useRef(true);
  const pollingInterval = useRef(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    isMounted.current = true;
    loadTeacher();

    // Cleanup function - ONLY clear interval, DON'T delete session
    return () => {
      isMounted.current = false;
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
      console.log("🔄 Component unmounting - session will persist");
    };
  }, []);

  useEffect(() => {
    // Clear any existing interval
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    // Start polling if there's an active session
    if (activeSession && isMounted.current) {
      console.log("📡 Starting session data polling");
      pollingInterval.current = setInterval(() => {
        if (isMounted.current) {
          loadSessionData();
        }
      }, 2000);
    }

    // Cleanup interval on effect cleanup
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    };
  }, [activeSession]);

  const loadTeacher = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("❌ No auth token found");
        navigate('/login');
        return;
      }

      console.log("👤 Loading teacher data...");
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userRes.ok) {
        throw new Error('Failed to load user data');
      }

      const user = await userRes.json();
      console.log("✅ Teacher loaded:", user.email);
      setTeacher(user);
     
      // Check if teacher has an active session (MongoDB)
      console.log("🔍 Checking for existing sessions...");
      const sessionsRes = await fetch(`${API_BASE}/api/live-sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
     
      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        console.log("📊 Found sessions:", sessions.length);
       
        if (sessions.length > 0) {
          const activeSessionData = sessions[0];
          console.log("✅ Restoring active session:", activeSessionData.session_code);
          setActiveSession(activeSessionData);
          setSessionStarted(activeSessionData.status === "active");
          await loadSessionData(activeSessionData.session_code);
        } else {
          console.log("ℹ️ No active sessions found");
        }
      }
    } catch (err) {
      console.error("❌ Error loading teacher:", err);
      showError("Error Loading", "Failed to load teacher data. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const loadSessionData = async (sessionCode = null) => {
    const code = sessionCode || activeSession?.session_code;
    if (!code) return;
   
    try {
      const token = localStorage.getItem('token');
      const [partsRes, respsRes] = await Promise.all([
        fetch(`${API_BASE}/api/live-sessions/code/${code}/participants`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/api/live-sessions/code/${code}/responses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
     
      if (partsRes.ok && respsRes.ok) {
        const parts = await partsRes.json();
        const resps = await respsRes.json();
       
        if (isMounted.current) {
          setParticipants(parts.sort((a, b) => b.score - a.score));
          setResponses(resps);
        }
      }
    } catch (err) {
      const now = Date.now();
      if (now - lastErrorTime > 10000 && isMounted.current) {
        console.warn("⚠️ Failed to load session data:", err);
        setLastErrorTime(now);
      }
    }
  };

  const generateSessionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const extractYouTubeVideoId = (url) => {
    url = url.trim();
   
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
   
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log("✅ Pattern matched:", pattern, "Result:", match[1]);
        return match[1];
      }
    }
   
    console.log("❌ No pattern matched for URL:", url);
    return null;
  };

  const handleCreateSession = async () => {
    if (!sessionName || !subunitName || !videoUrl) {
      showWarning("Missing Information", "Please fill in all fields to create a session.");
      return;
    }

    setGenerating(true);
    try {
      console.log("🎬 Video URL entered:", videoUrl);
      const videoId = extractYouTubeVideoId(videoUrl);
      console.log("🎬 Extracted video ID:", videoId);
     
      if (!videoId) {
        showError("Invalid URL", "Please enter a valid YouTube URL. Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        setGenerating(false);
        return;
      }

      const teacherId = teacher?._id || teacher?.id;
     
      if (!teacherId) {
        showError("Authentication Error", "Unable to identify teacher. Please refresh and try again.");
        setGenerating(false);
        return;
      }

      const token = localStorage.getItem('token');

      // ✅ Call backend to generate AI content
      console.log("🤖 Calling backend to generate AI content...");
      const aiResponse = await fetch(`${API_BASE}/api/ai/generate-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionName,
          subunitName,
          videoUrl,
          questionDifficulty,
          questionCount
        })
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error("❌ AI generation failed:", errorData);
        throw new Error(errorData.error || 'Failed to generate session content');
      }

      const aiData = await aiResponse.json();
      console.log("✅ AI content generated successfully");

      // Ensure each question has a unique ID
      const questionsWithIds = (aiData.questions || []).map((q, index) => ({
        ...q,
        id: q.id || `q${index + 1}`
      }));

      const sessionCode = generateSessionCode();
     
      // Create session in MongoDB
      const sessionData = {
        session_code: sessionCode,
        session_name: sessionName,
        subunit_name: subunitName,
        subunit_id: null,
        teacher_id: teacherId,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        video_duration: 600,
        status: "waiting",
        questions: questionsWithIds,
        attention_checks: aiData.attentionChecks || [],
        case_study: aiData.caseStudy,
        inquiry_content: aiData.inquiry
      };
     
      console.log("📤 Creating session in database...");
     
      const createRes = await fetch(`${API_BASE}/api/live-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sessionData)
      });

      if (!createRes.ok) {
        const errorText = await createRes.text();
        console.error("❌ Server error:", errorText);
        throw new Error('Failed to create session');
      }

      const session = await createRes.json();
      console.log("✅ Session created successfully:", session.session_code);
     
      setActiveSession(session);
      setShowCreateModal(false);
      setSessionName("");
      setSubunitName("");
      setVideoUrl("");
      showSuccess("Session Created", "Your live session is ready! Share the code with students.");
    } catch (err) {
      console.error("❌ Create session error:", err);
      showError("Creation Failed", err.message || "Failed to create session. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleStartSession = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log("▶️ Starting session:", activeSession.session_code);
     
      const updateRes = await fetch(`${API_BASE}/api/live-sessions/${activeSession._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "active" })
      });

      if (!updateRes.ok) {
        throw new Error('Failed to start session');
      }

      const updatedSession = await updateRes.json();
      console.log("✅ Session started successfully");
     
      setSessionStarted(true);
      setActiveSession(updatedSession);
      showSuccess("Session Started", "Students can now proceed with the learning activities!");
    } catch (err) {
      console.error("❌ Error starting session:", err);
      showError("Start Failed", "Failed to start session. Please try again.");
    }
  };

  const handleEndSession = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log("🛑 Ending session:", activeSession.session_code);
     
      const deleteRes = await fetch(`${API_BASE}/api/live-sessions/${activeSession._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to end session');
      }

      console.log("✅ Session ended successfully");
     
      setActiveSession(null);
      setParticipants([]);
      setResponses([]);
      setSessionStarted(false);
      setShowEndSessionModal(false);
      showSuccess("Session Ended", "The session has been ended and all data has been cleared.");
    } catch (err) {
      console.error("❌ Error ending session:", err);
      showError("End Failed", "Failed to end session. Please try again.");
    }
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(activeSession.session_code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const getQuestionStats = () => {
    if (!activeSession || !activeSession.questions) return [];
   
    return activeSession.questions.map(q => {
      const questionResponses = responses.filter(r => r.question_id === q.id);
      const correctCount = questionResponses.filter(r => r.is_correct).length;
      const totalCount = questionResponses.length;
      const accuracy = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
     
      return {
        ...q,
        totalResponses: totalCount,
        correctResponses: correctCount,
        accuracy: accuracy,
        needsReview: totalCount >= participants.length / 2 && accuracy < 70
      };
    });
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="live" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto p-8">
        {!activeSession ? (
        // No Active Session - Show Create Button
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Live Sessions</h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Create engaging live learning experiences for your students with real-time leaderboards and instant feedback.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6"
          >
            <Play className="w-5 h-5 mr-2" />
            Create Live Session
          </Button>
        </div>
        ) : !sessionStarted ? (
          // Waiting Room
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-2xl">Waiting Room</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{activeSession.session_name}</h2>
                  <p className="text-gray-600">{activeSession.subunit_name}</p>
                </div>

                <div className="bg-gray-900 rounded-2xl p-8 mb-8">
                  <p className="text-sm text-gray-400 text-center mb-2">Session Code</p>
                  <div className="flex items-center justify-center gap-4">
                    <h1 className="text-6xl font-bold text-white tracking-widest">{activeSession.session_code}</h1>
                    <Button
                      onClick={copySessionCode}
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      {codeCopied ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                    </Button>
                  </div>
                </div>

                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-full">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">{participants.length}</span>
                    <span className="text-gray-600">participants joined</span>
                  </div>
                </div>

                {participants.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">Participants:</h3>
                    <div className="flex flex-wrap gap-2">
                      {participants.map(p => (
                        <Badge key={p._id} variant="outline" className="text-sm">
                          {p.display_name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handleStartSession}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-lg py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Session
                  </Button>
                  <Button
                    onClick={() => setShowEndSessionModal(true)}
                    variant="outline"
                    className="px-6 border-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Active Session - Dashboard
          <div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{activeSession.session_name}</h1>
                <p className="text-gray-600">{activeSession.subunit_name}</p>
              </div>
              <Button
                onClick={() => setShowEndSessionModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Square className="w-4 h-4 mr-2" />
                End Session
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Leaderboard */}
              <Card className="border-2 border-indigo-200">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                    Live Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {participants.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>Waiting for participants...</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {participants.map((p, index) => (
                        <div key={p._id} className={`p-4 flex items-center gap-4 ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{p.display_name}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                p.current_phase === "completed" ? "bg-green-100 text-green-700 border-green-300" :
                                p.current_phase === "quiz" ? "bg-purple-100 text-purple-700 border-purple-300" :
                                p.current_phase === "video" ? "bg-blue-100 text-blue-700 border-blue-300" :
                                p.current_phase === "inquiry" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                                "bg-gray-100 text-gray-600 border-gray-300"
                              }`}
                            >
                              {p.current_phase === "completed" ? "✓ Completed" :
                               p.current_phase === "quiz" ? "Quiz" :
                               p.current_phase === "video" ? "Watching Video" :
                               p.current_phase === "inquiry" ? "Inquiry" :
                               "Waiting"}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {p.score}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Question Analytics */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Question Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 max-h-[500px] overflow-y-auto">
                  {getQuestionStats().map((stat, index) => (
                    <div key={stat.id} className={`mb-4 p-4 rounded-lg border-2 ${
                      stat.needsReview ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">
                          Q{index + 1}: {stat.question_text}
                        </p>
                        {stat.needsReview && (
                          <Badge className="bg-red-600 text-white ml-2">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Review
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stat.accuracy >= 70 ? 'bg-green-500' : stat.accuracy >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${stat.accuracy}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${stat.accuracy >= 70 ? 'text-green-600' : stat.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stat.accuracy.toFixed(0)}%
                          </p>
                          <p className="text-xs text-gray-600">{stat.totalResponses}/{participants.length}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {getQuestionStats().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Eye className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p>No responses yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Create Session Modal - RESTORED BEAUTIFUL BUTTON DESIGN */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sticky top-0 z-10">
                <CardTitle className="text-2xl">Create Live Session</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Name
                    </label>
                    <Input
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="e.g., Friday Quiz - Newton's Laws"
                      className="text-lg"
                      disabled={generating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic / Subunit
                    </label>
                    <Input
                      value={subunitName}
                      onChange={(e) => setSubunitName(e.target.value)}
                      placeholder="e.g., Newton's Third Law"
                      className="text-lg"
                      disabled={generating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      YouTube Video URL
                    </label>
                    <Input
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="text-lg"
                      disabled={generating}
                    />
                  </div>

                  {/* BEAUTIFUL BUTTON GRID FOR DIFFICULTY */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Question Difficulty
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: "mixed", label: "Mixed", bgClass: "bg-blue-600", borderClass: "border-blue-600", hoverClass: "hover:border-blue-400" },
                        { value: "easy", label: "Easy", bgClass: "bg-green-600", borderClass: "border-green-600", hoverClass: "hover:border-green-400" },
                        { value: "medium", label: "Medium", bgClass: "bg-yellow-600", borderClass: "border-yellow-600", hoverClass: "hover:border-yellow-400" },
                        { value: "hard", label: "Hard", bgClass: "bg-red-600", borderClass: "border-red-600", hoverClass: "hover:border-red-400" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setQuestionDifficulty(option.value)}
                          disabled={generating}
                          className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                            questionDifficulty === option.value
                              ? `${option.bgClass} text-white ${option.borderClass}`
                              : `bg-white text-gray-700 border-gray-300 ${option.hoverClass}`
                          } ${generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* BEAUTIFUL BUTTON GRID FOR QUESTION COUNT */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Number of Questions
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[10, 20, 30].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setQuestionCount(count)}
                          disabled={generating}
                          className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                            questionCount === count
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                          } ${generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {count} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      onClick={handleCreateSession}
                      disabled={generating || !sessionName || !subunitName || !videoUrl}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating Content...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5 mr-2" />
                          Create Session
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowCreateModal(false)}
                      disabled={generating}
                      variant="outline"
                      className="px-8 border-2"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* End Session Confirmation Modal */}
        {showEndSessionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-xl text-red-600">End Session?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Are you sure you want to end this session? This will disconnect all participants and clear the session data.
                </p>
                <div className="flex gap-4">
                  <Button
                    onClick={handleEndSession}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    End Session
                  </Button>
                  <Button
                    onClick={() => setShowEndSessionModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notification Modal */}
        {notification && (
          <NotificationModal
            type={notification.type}
            title={notification.title}
            message={notification.message}
            onClose={closeNotification}
          />
        )}
      </div>
    </TeacherLayout>
  );
}