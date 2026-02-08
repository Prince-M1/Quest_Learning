import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { invokeLLM } from "@/components/utils/openai";

export default function SocraticTutor({ inquirySession, studentGuess, subunit, unitName, onComplete, user }) {
  const MAX_TURNS = 4;
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const messagesEndRef = useRef(null);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    initializeTutor();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeTutor = async () => {
    setLoading(true);
    try {
      const hasMemories = inquirySession.relevant_past_memories && inquirySession.relevant_past_memories.length > 0;
      
      // Generate first AI message referencing student's guess
      const firstMessage = await invokeLLM({
        prompt: `You are Quest Panda. The student has NOT learned "${subunit?.subunit_name}" yet - help them discover it through real-world observations. Be BRIEF (2 sentences max).

      UNIT: ${unitName}
      SUBUNIT: ${subunit?.subunit_name}
      LEARNING STANDARD: ${subunit?.learning_standard || "Not specified"}
      SCENARIO CONTEXT: ${inquirySession.hook_question}
      Student's guess: "${studentGuess}"

      CRITICAL: Your question MUST directly explore ${subunit?.subunit_name}, NOT tangentially related topics. Stay focused on the learning standard.

      React to THEIR specific guess using **bold** on their key word. Then ask ONE question that guides them to think about the CORE CONCEPT of ${subunit?.subunit_name} using the scenario context.

      Example for "Energy Flow": "You said **photosynthesis** - interesting! In the image, where do you think the energy is coming FROM and where is it going TO?"`
      });

      const newMessages = [
        { role: "assistant", content: firstMessage }
      ];
      setMessages(newMessages);
      setConversationHistory(newMessages);
      setTurnCount(1);
    } catch (err) {
      console.error("Failed to initialize tutor:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || loading) return;

    const userMessage = currentInput.trim();
    setCurrentInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => 
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      ).join("\n\n");

      const aiResponse = await invokeLLM({
        prompt: `You are Quest Panda. Student has NOT learned "${subunit?.subunit_name}" yet. Turn ${turnCount + 1} of ${MAX_TURNS}.

      UNIT: ${unitName}
      SUBUNIT: ${subunit?.subunit_name}
      LEARNING STANDARD: ${subunit?.learning_standard || "Not specified"}
      SCENARIO: ${inquirySession.hook_question}

      FULL conversation so far:
      ${conversationHistory}

      Student just said: "${userMessage}"

      CRITICAL RULES:
      - ONLY discuss ${subunit?.subunit_name} - NO feelings, personal preferences, or tangential topics
      - Build toward understanding the CORE CONCEPT in the learning standard
      - Guide them to think about the scenario in the context of ${subunit?.subunit_name}

      FORMAT${turnCount + 1 >= MAX_TURNS ? ' (FINAL TURN - NO QUESTION)' : ''}: 
      1. ONE SENTENCE connecting their answer to ${subunit?.subunit_name}. Use **bold** on their key word.
      ${turnCount + 1 >= MAX_TURNS ? '2. End with: "Brilliant thinking! Now watch the video."' : '2. ONE follow-up question that directly probes ' + subunit?.subunit_name + ' using the scenario.'}

      Example for "Energy Flow": "You said **sun** - that's key to ${subunit?.subunit_name}! Where does the sun's energy GO after plants absorb it?"`
      });

      const newMessages = [...messages, { role: "user", content: userMessage }, { role: "assistant", content: aiResponse }];
      setMessages(newMessages);
      setConversationHistory(newMessages);
      setTurnCount(prev => prev + 1);
    } catch (err) {
      console.error("Failed to get AI response:", err);
      const errorMessages = [...messages, { role: "user", content: userMessage }, { 
        role: "assistant", 
        content: "I'm having trouble connecting. Let's continue to the video!" 
      }];
      setMessages(errorMessages);
      setConversationHistory(errorMessages);
      setTimeout(() => onComplete(errorMessages), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-8">
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-[32px]">
      <CardContent className="p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-2">
            Quest Panda
          </h2>
          <p className="text-lg text-[#1A1A1A]/70">Let's explore this together</p>
        </div>

        <div className="bg-gradient-to-br from-white to-[#FFEBE0]/20 rounded-[28px] p-6 mb-6 max-h-[500px] overflow-y-auto border-2 border-[#C4B5FD]/20">
          <div className="space-y-5">
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

        <div className="flex gap-3">
          <Textarea
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="Share your thoughts..."
            className="flex-1 h-20 rounded-[20px] border-3 border-[#C4B5FD]/50 focus:border-[#86EFAC] bg-white resize-none text-base p-4 placeholder:text-[#1A1A1A]/40 text-[#1A1A1A]"
            style={{fontWeight: 450}}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={loading || turnCount >= MAX_TURNS}
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !currentInput.trim() || turnCount >= MAX_TURNS}
            className="bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] px-8 rounded-full shadow-xl transform transition-all hover:scale-105 h-20"
          >
            {loading ? (
              <Sparkles className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {turnCount >= MAX_TURNS && (
          <div className="mt-6 text-center">
            <p className="text-sm text-[#1A1A1A]/60 mb-3">Great discussion! Ready to watch the video?</p>
            <Button
              onClick={() => onComplete(conversationHistory)}
              className="bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white px-10 py-5 font-semibold rounded-full shadow-xl"
            >
              Continue to Video
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}