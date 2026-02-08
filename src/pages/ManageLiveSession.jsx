import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TeacherLayout from "../components/teacher/TeacherLayout";
import VideoSearchModal from "../components/teacher/VideoSearchModal";
import { ArrowLeft, Video, Loader2, Rocket } from "lucide-react";

export default function ManageLiveSession() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [questionDifficulty, setQuestionDifficulty] = useState("mixed");
  const [questionCount, setQuestionCount] = useState(10);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userRes.ok) {
        navigate(createPageUrl("Login"));
        return;
      }

      const user = await userRes.json();
      setTeacher(user);

      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sessionId');
      const difficulty = params.get('difficulty') || 'mixed';
      const count = parseInt(params.get('count')) || 10;
      
      setQuestionDifficulty(difficulty);
      setQuestionCount(count);
      
      if (!sessionId) {
        navigate(createPageUrl("TeacherLiveSession"));
        return;
      }

      const sessionRes = await fetch(`${API_BASE}/api/live-sessions/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sessionRes.ok) {
        navigate(createPageUrl("TeacherLiveSession"));
        return;
      }

      const sessionData = await sessionRes.json();
      setSession(sessionData);
      
      // Check if content is complete
      const contentComplete = sessionData.video_url && 
                            sessionData.questions && 
                            sessionData.questions.length > 0;
      setHasContent(contentComplete);
      
      if (!contentComplete) {
        setShowVideoModal(true);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelected = async () => {
    setShowVideoModal(false);
    await loadSession();
  };

  const handleLaunchSession = async () => {
    setLaunching(true);
    try {
      const token = localStorage.getItem('token');
      const sessionId = (session._id || session.id).toString();
      
      // Update session status to waiting (ready for students)
      await fetch(`${API_BASE}/api/live-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: "waiting" })
      });
      
      // Navigate to live session page
      navigate(createPageUrl("TeacherLiveSession"));
    } catch (err) {
      console.error("Failed to launch session:", err);
      alert("Failed to launch session");
      setLaunching(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    navigate(createPageUrl("Login"));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <TeacherLayout activeNav="live" user={teacher} onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(createPageUrl("TeacherLiveSession"))}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Live Sessions
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{session.session_name}</h1>
            <p className="text-gray-600">{session.subunit_name}</p>
          </div>

          {!hasContent ? (
            <Card className="border-2 border-blue-200">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Video className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Video & Generate Content</h2>
                <p className="text-gray-600 mb-6">
                  Choose a YouTube video and let AI generate quiz questions, case study, and attention checks
                </p>
                <Button
                  onClick={() => setShowVideoModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6"
                >
                  <Video className="w-5 h-5 mr-2" />
                  Select Video
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                          Ready to Launch
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          {session.questions?.length || 0} Questions
                        </Badge>
                        <Badge variant="outline" className="text-sm">
                          {session.attention_checks?.length || 0} Attention Checks
                        </Badge>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Generated Successfully</h2>
                      <p className="text-gray-700 mb-6">
                        Your live session is ready with video, quiz questions, case study, and attention checks.
                      </p>
                      <div className="flex gap-4">
                        <Button
                          onClick={handleLaunchSession}
                          disabled={launching}
                          className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-6"
                        >
                          {launching ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Launching...
                            </>
                          ) : (
                            <>
                              <Rocket className="w-5 h-5 mr-2" />
                              Launch Live Session
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowVideoModal(true)}
                          variant="outline"
                          className="border-2 border-blue-300 text-blue-700 hover:bg-blue-50 px-6"
                        >
                          Review & Edit Content
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Session Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Session Code</p>
                      <p className="text-2xl font-bold text-blue-600">{session.session_code}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Topic</p>
                      <p className="text-lg font-semibold text-gray-900">{session.subunit_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {showVideoModal && session && (
            <VideoSearchModal
              subunit={{ id: session._id || session.id, subunit_name: session.subunit_name }}
              curriculumName={session.session_name}
              onClose={() => setShowVideoModal(false)}
              onVideoSelected={handleVideoSelected}
              existingContent={hasContent ? {
                video: {
                  videoId: session.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1],
                  title: session.subunit_name,
                  summary: session.subunit_name,
                  url: session.video_url
                },
                questions: session.questions || [],
                inquiryContent: session.inquiry_content || {
                  hook_image_prompt: "",
                  hook_question: "",
                  hook_image_url: "",
                  socratic_system_prompt: "",
                  tutor_first_message: ""
                },
                caseStudy: session.case_study || {}
              } : null}
              isLiveSession={true}
              sessionId={session._id || session.id}
              liveSessionDifficulty={questionDifficulty}
              liveSessionQuestionCount={questionCount}
            />
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}