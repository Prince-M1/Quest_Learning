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

// OpenAI API configuration
const OPENAI_API_KEY = "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";

// Helper function to call OpenAI API
const callOpenAI = async (prompt) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates educational content. Always respond with valid JSON only, no additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
};

// Helper function to generate images with DALL-E
const generateImage = async (prompt) => {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    })
  });

  if (!response.ok) {
    throw new Error(`DALL-E API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].url;
};

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
      // DO NOT delete or end the session here
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
    // Trim whitespace
    url = url.trim();
    
    const patterns = [
      // Standard watch URL
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      // Shortened youtu.be URL
      /(?:youtu\.be\/)([^&\n?#]+)/,
      // Embed URL
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      // Mobile URL
      /(?:m\.youtube\.com\/watch\?v=)([^&\n?#]+)/,
      // Just the video ID (11 characters)
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        console.log("Pattern matched:", pattern, "Result:", match[1]);
        return match[1];
      }
    }
    
    console.log("No pattern matched for URL:", url);
    return null;
  };

  const parseYouTubeDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const handleCreateSession = async () => {
    if (!sessionName || !subunitName || !videoUrl) {
      showWarning("Missing Information", "Please fill in all fields to create a session.");
      return;
    }

    setGenerating(true);
    try {
      console.log("Video URL entered:", videoUrl);
      const videoId = extractYouTubeVideoId(videoUrl);
      console.log("Extracted video ID:", videoId);
      
      if (!videoId) {
        showError("Invalid URL", "Please enter a valid YouTube URL. Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ");
        setGenerating(false);
        return;
      }

      // Use default duration (10 minutes = 600 seconds)
      const durationSeconds = 600;

      // Skip transcript for now (can add later with a separate API)
      const transcript = "";
      console.log("⚠️ Skipping transcript fetch - generating questions based on topic only");

      // Generate content with OpenAI API
      const difficultyInstructions = questionDifficulty === "easy" 
        ? `All ${questionCount} questions should be EASY difficulty (basic recall and understanding).`
        : questionDifficulty === "medium"
        ? `All ${questionCount} questions should be MEDIUM difficulty (application and analysis).`
        : questionDifficulty === "hard"
        ? `All ${questionCount} questions should be HARD difficulty (synthesis, evaluation, complex scenarios).`
        : questionCount === 10
        ? `Create 4 EASY, 4 MEDIUM, and 2 HARD questions.`
        : questionCount === 20
        ? `Create 8 EASY, 8 MEDIUM, and 4 HARD questions.`
        : `Create 12 EASY, 12 MEDIUM, and 6 HARD questions.`;

      console.log("🤖 Generating content with OpenAI...");

      const [questionsData, attentionChecksData, caseStudyData, inquiryData] = await Promise.all([
        callOpenAI(`Create ${questionCount} multiple-choice quiz questions for a live learning session about "${subunitName}".

${difficultyInstructions}

EASY questions: Direct recall of facts, basic conceptual understanding, simple identification
MEDIUM questions: Application to new situations, comparison/contrast, cause-and-effect
HARD questions: Multi-step reasoning, evaluation/justification, complex real-world applications

Return JSON with this structure:
{
  "questions": [
    {
      "id": "q1",
      "question_text": "Question text here?",
      "choice_1": "First option",
      "choice_2": "Second option", 
      "choice_3": "Third option",
      "choice_4": "Fourth option",
      "correct_choice": 1,
      "question_order": 1,
      "difficulty": "${questionDifficulty === 'mixed' ? 'easy or medium or hard as appropriate' : questionDifficulty}"
    }
  ]
}

Make questions engaging and suitable for a competitive live session.`),
        
        callOpenAI(`Generate multiple-choice attention check questions for a ${durationSeconds} second video about "${subunitName}".

Instructions:
1. Place ONE attention check approximately every 60 seconds of video (so a 10-min video = ~10 checks)
2. Start first check around 60 seconds, then space them evenly throughout
3. Create questions that test key concepts related to the topic
4. Each question must test comprehension of key concepts
5. Questions should be recall or comprehension-based
6. Provide 4 multiple-choice options with exactly one correct answer

Return JSON with timestamps and complete multiple-choice questions:
{
  "checks": [
    {
      "timestamp": 65,
      "question": "What is being explained right now?",
      "choice_a": "Option 1",
      "choice_b": "Option 2",
      "choice_c": "Option 3",
      "choice_d": "Option 4",
      "correct_choice": "A"
    }
  ]
}`),
        
        callOpenAI(`Create a case study scenario with one free-response question for "${subunitName}".

Return JSON:
{
  "scenario": "A realistic scenario description...",
  "question": "A thought-provoking question about the scenario..."
}`),
        
        callOpenAI(`Create an inquiry-based learning introduction for "${subunitName}".

This is the FIRST step before students watch the video. The goal is to spark curiosity and activate prior knowledge.

Generate:
1. A DALL-E 3 prompt for a curiosity-inducing image (no text in image)
2. A hook question that makes students wonder about the topic
3. A Socratic tutor system prompt that guides students through inquiry
4. The tutor's first welcoming message

Return JSON:
{
  "hook_image_prompt": "Detailed DALL-E 3 prompt for an engaging image...",
  "hook_question": "What do you think causes...?",
  "socratic_system_prompt": "You are a Socratic tutor helping students explore ${subunitName}. Guide them with questions, never give direct answers...",
  "tutor_first_message": "Welcome! Let's think about this together..."
}`)
      ]);

      const sessionCode = generateSessionCode();
      
      // Ensure each question has a unique ID
      const questionsWithIds = (questionsData.questions || []).map((q, index) => ({
        ...q,
        id: q.id || `q${index + 1}`
      }));
      
      // Generate hook image using DALL-E
      console.log("🎨 Generating hook image with DALL-E...");
      const hookImageUrl = await generateImage(inquiryData.hook_image_prompt);
      
      // ✅ GET TEACHER ID FROM STATE
      const teacherId = teacher?._id || teacher?.id;
      
      if (!teacherId) {
        showError("Authentication Error", "Unable to identify teacher. Please refresh and try again.");
        setGenerating(false);
        return;
      }
      
      console.log("👤 Teacher ID:", teacherId);
      
      // Create session in MongoDB
      const token = localStorage.getItem('token');
      
      const sessionData = {
        session_code: sessionCode,
        session_name: sessionName,
        subunit_name: subunitName,
        subunit_id: null,
        teacher_id: teacherId,
        video_url: `https://www.youtube.com/watch?v=${videoId}`,
        video_duration: durationSeconds,
        status: "waiting",
        questions: questionsWithIds,
        attention_checks: attentionChecksData.checks || [],
        case_study: caseStudyData,
        inquiry_content: {
          hook_image_url: hookImageUrl,
          hook_question: inquiryData.hook_question,
          socratic_system_prompt: inquiryData.socratic_system_prompt,
          tutor_first_message: inquiryData.tutor_first_message
        }
      };
      
      console.log("📤 Creating session with data:", sessionData);
      
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
      console.log("✅ Session created successfully:", session);
      
      setActiveSession(session);
      setShowCreateModal(false);
      setSessionName("");
      setSubunitName("");
      setVideoUrl("");
      showSuccess("Session Created", "Your live session is ready! Share the code with students.");
    } catch (err) {
      console.error("Create session error:", err);
      showError("Creation Failed", "Failed to create session. Please try again.");
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

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Topic / Subunit
                    </label>
                    <Input
                      value={subunitName}
                      onChange={(e) => setSubunitName(e.target.value)}
                      placeholder="e.g., Newton's First Law of Motion"
                      className="text-lg"
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Question Difficulty
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: "mixed", label: "Mixed", color: "blue" },
                        { value: "easy", label: "Easy", color: "green" },
                        { value: "medium", label: "Medium", color: "yellow" },
                        { value: "hard", label: "Hard", color: "red" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setQuestionDifficulty(option.value)}
                          className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                            questionDifficulty === option.value
                              ? `bg-${option.color}-600 text-white border-${option.color}-600`
                              : `bg-white text-gray-700 border-gray-300 hover:border-${option.color}-400`
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

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
                          className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                            questionCount === count
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                          }`}
                        >
                          {count} Questions
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={() => setShowCreateModal(false)}
                      variant="outline"
                      className="flex-1 border-2"
                      disabled={generating}
                    >
                      Cancel
                    </Button>
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
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Create Session
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <NotificationModal
          isOpen={notification.isOpen}
          onClose={closeNotification}
          type={notification.type}
          title={notification.title}
          message={notification.message}
        />

        {showEndSessionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEndSessionModal(false)}>
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">End Session?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to end this session? All participant data will be cleared.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndSessionModal(false)} className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                  Cancel
                </button>
                <button onClick={handleEndSession} className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium">
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}