import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ArrowRight } from "lucide-react";

export default function SocraticInquiry() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inquirySession, setInquirySession] = useState(null);
  const [subunit, setSubunit] = useState(null);
  const [user, setUser] = useState(null);
  const [studentGuess, setStudentGuess] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [waitingForTutor, setWaitingForTutor] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const messagesEndRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const subunitId = urlParams.get("topic");
  const isLiveSession = urlParams.get("live") === "true";
  const sessionCode = urlParams.get("code");
  const [liveSessionId, setLiveSessionId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [conversationHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      // Get current user
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const currentUser = await userRes.json();
      setUser(currentUser);

      if (isLiveSession && sessionCode) {
        // Load inquiry content from LiveSession
        const liveSessionRes = await fetch(`${API_BASE}/api/live-sessions/code/${sessionCode}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (liveSessionRes.ok) {
          const liveSession = await liveSessionRes.json();
          setLiveSessionId(liveSession._id || liveSession.id);
          
          if (liveSession.inquiry_content) {
            setInquirySession(liveSession.inquiry_content);
            setSubunit({ subunit_name: liveSession.subunit_name });
            
            // Initialize with tutor's first message
            setConversationHistory([
              { role: "assistant", content: liveSession.inquiry_content.tutor_first_message }
            ]);
          }
        }
      } else if (subunitId) {
        // Regular curriculum flow
        const subunitRes = await fetch(`${API_BASE}/api/subunits/${subunitId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (subunitRes.ok) {
          const subunitData = await subunitRes.json();
          setSubunit(subunitData);
        }

        const inquiryRes = await fetch(`${API_BASE}/api/inquiry-sessions/subunit/${subunitId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (inquiryRes.ok) {
          const inquiryData = await inquiryRes.json();
          setInquirySession(inquiryData);
          
          // Initialize with tutor's first message
          setConversationHistory([
            { role: "assistant", content: inquiryData.tutor_first_message }
          ]);
        }
      }
    } catch (err) {
      console.error("Failed to load inquiry data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialGuessSubmit = () => {
    if (studentGuess.trim().length < 10) return;
    
    setConversationHistory([
      ...conversationHistory,
      { role: "user", content: studentGuess }
    ]);
    setStudentGuess("");
    setQuestionCount(1);
    
    // Get first Socratic response
    handleSocraticResponse(studentGuess);
  };

  const handleMessageSubmit = () => {
    if (currentMessage.trim().length < 5) return;
    
    const newHistory = [
      ...conversationHistory,
      { role: "user", content: currentMessage }
    ];
    setConversationHistory(newHistory);
    setCurrentMessage("");
    setQuestionCount(questionCount + 1);
    
    handleSocraticResponse(currentMessage);
  };

  const handleSocraticResponse = async (userMessage) => {
    setWaitingForTutor(true);

    try {
      // Check if this is the last question (4th)
      const isLastQuestion = questionCount >= 3;

      // NOTE: This still uses base44 for LLM integration
      // You would need to implement your own LLM API endpoint or keep using base44 for this
      const prompt = `You are a Socratic tutor helping a student explore: "${subunit?.subunit_name}"

APPROACH:
${conversationHistory.length === 0 
  ? `Start by presenting a relatable, real-world scenario that connects to the topic. Make it:
  - Concrete and visual (something they can picture)
  - Relevant to everyday life
  - Intriguing enough to spark curiosity

  Then ask ONE simple question about what they notice or think about the scenario.`
  : `Continue building on the scenario and their previous responses.`}

GUIDELINES:
- Ask ONE clear question at a time
- Keep questions grounded in the original scenario
- Use everyday language, not academic jargon
- Celebrate insights ("Good observation!", "Interesting thought!")
- If stuck, refocus them on a specific detail from the scenario
- Questions should feel like natural curiosity, not a test

CONVERSATION SO FAR:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

${conversationHistory.length > 0 ? `STUDENT'S LATEST: ${userMessage}` : ''}

${isLastQuestion 
  ? `This is the final exchange. Respond warmly:
  1. Acknowledge their thinking with specific praise
  2. Connect their discoveries back to the original scenario
  3. Transition: "You've explored this really well! Let's watch the video to see the full picture."
  DO NOT ask another question.`
  : conversationHistory.length === 0
  ? `Create an engaging scenario and ask your first question.`
  : `Based on their response, ask your next question that:
  - Deepens their thinking about WHY or HOW
  - References specific details from the scenario
  - Builds naturally on what they just said

  Your next question:`}`;

      // TODO: Replace with your own LLM endpoint
      // For now, you'll need to keep using base44.integrations.Core.InvokeLLM
      // OR implement your own OpenAI/Anthropic API call here
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/llm/invoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });

      const data = await response.json();
      const aiResponse = data.response || "I'm here to help you explore this topic. What are your thoughts?";
      
      setConversationHistory(prev => [
        ...prev,
        { role: "assistant", content: aiResponse }
      ]);
    } catch (error) {
      console.error("Failed to get tutor response:", error);
      // Fallback response
      setConversationHistory(prev => [
        ...prev,
        { role: "assistant", content: "That's an interesting thought! Can you tell me more about what makes you think that?" }
      ]);
    } finally {
      setWaitingForTutor(false);
    }
  };

  const handleComplete = async () => {
    const token = localStorage.getItem('token');
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Save inquiry response (only for regular curriculum flow, not live sessions)
    if (!isLiveSession && user && inquirySession && conversationHistory.length > 0) {
      try {
        const inquirySessionId = inquirySession._id || inquirySession.id;
        
        await fetch(`${API_BASE}/api/inquiry-responses`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: user._id || user.id,
            subunit_id: subunitId,
            inquiry_session_id: inquirySessionId,
            initial_guess: conversationHistory.find(msg => msg.role === "user")?.content || "",
            conversation_history: conversationHistory
          })
        });
      } catch (err) {
        console.error("Failed to save inquiry response:", err);
      }
    }
    
    // Navigate to appropriate next step
    if (isLiveSession && sessionCode) {
      // Update phase to "video" before navigating
      try {
        const participantRes = await fetch(`${API_BASE}/api/live-session-participants/session/${sessionCode}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (participantRes.ok) {
          const participants = await participantRes.json();
          const myParticipant = participants.find(p => {
            const pStudentId = p.student_id?._id || p.student_id?.id || p.student_id;
            const userId = user?._id || user?.id;
            return pStudentId?.toString() === userId?.toString();
          });
          
          if (myParticipant) {
            await fetch(`${API_BASE}/api/live-session-participants/${myParticipant._id || myParticipant.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                current_phase: "video"
              })
            });
          }
        }
      } catch (err) {
        console.error("Failed to update phase:", err);
      }
      
      window.location.href = createPageUrl("StudentLiveSession") + `?rejoined=true&code=${sessionCode}`;
    } else {
      navigate(createPageUrl("NewSession") + `?topic=${subunitId}&skipInquiry=true`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!inquirySession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Inquiry session not available</p>
            <Button onClick={() => navigate(createPageUrl("LearningHub"))} className="mt-4">
              Return to Learning Hub
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canProceed = questionCount >= 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl border-0 shadow-2xl bg-white">
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">Socratic Inquiry</h1>
                <p className="text-blue-100">{subunit?.subunit_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-100">Questions</p>
                <p className="text-3xl font-bold">{questionCount}/4</p>
              </div>
            </div>
          </div>

          {/* Initial Guess Input */}
          {conversationHistory.length === 1 && (
            <div className="p-8">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6 mb-6">
                <p className="text-xl font-semibold text-gray-900 mb-4">
                  {inquirySession.hook_question}
                </p>
                <Textarea
                  value={studentGuess}
                  onChange={(e) => setStudentGuess(e.target.value)}
                  placeholder="Share your initial thoughts... (minimum 10 characters)"
                  className="min-h-[120px] mb-3"
                />
                <div className="flex justify-between items-center text-sm text-gray-600 mb-4">
                  <span>{studentGuess.length} characters</span>
                  <span className={studentGuess.length >= 10 ? "text-blue-600 font-semibold" : ""}>
                    {studentGuess.length >= 10 ? "Ready!" : `${10 - studentGuess.length} more needed`}
                  </span>
                </div>
                <Button
                  onClick={handleInitialGuessSubmit}
                  disabled={studentGuess.trim().length < 10}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
                >
                  Start Discussion
                </Button>
              </div>
            </div>
          )}

          {/* Conversation */}
          {conversationHistory.length > 1 && (
            <div className="p-8">
              <div className="mb-6 max-h-[400px] overflow-y-auto space-y-4 px-2">
                {conversationHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-3xl shadow-sm transition-all ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 ml-12 hover:shadow-md"
                        : "bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 mr-12 hover:shadow-md"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{
                      color: msg.role === "user" ? "#2563eb" : "#7c3aed"
                    }}>
                      {msg.role === "user" ? "You" : "🐼 Panda Tutor"}
                    </p>
                    <p className="text-gray-800 leading-relaxed">{msg.content}</p>
                  </div>
                ))}
                {waitingForTutor && (
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-3xl p-5 mr-12 shadow-sm">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      <p className="text-gray-700 font-medium">🐼 Panda is thinking...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {questionCount < 4 && (
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-5 border border-gray-200 shadow-inner">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Continue the discussion..."
                    className="min-h-[100px] mb-3 border-gray-300 focus:border-blue-400 rounded-xl"
                    disabled={waitingForTutor}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 font-medium">
                      {currentMessage.length} characters (min 5)
                    </span>
                    <Button
                      onClick={handleMessageSubmit}
                      disabled={currentMessage.trim().length < 5 || waitingForTutor}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </div>
              )}

              {/* Complete Button */}
              {canProceed && (
                <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-3xl p-6 text-center shadow-lg">
                  <p className="text-green-900 font-bold text-lg mb-4">
                    🎉 Great discussion! You've completed 4 questions.
                  </p>
                  <Button
                    onClick={handleComplete}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-6 shadow-md"
                  >
                    Continue to Video
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}