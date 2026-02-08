import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, CheckCircle, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ProgressiveArticle({ article, studentGuess, onComplete, onExit, onAdminSkip }) {
  const [currentSection, setCurrentSection] = useState(0);
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [showQuestion, setShowQuestion] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState([]);
  const containerRef = useRef(null);

  // Split article into smaller chunks (1 paragraph each for shorter reading)
  const rawSections = article.split(/\n\n+/).filter(Boolean);
  
  // Calculate which sections should have questions (only 3 total, evenly distributed)
  const totalSections = rawSections.length;
  const questionInterval = Math.floor(totalSections / 4); // Divide into 4 parts, ask after 1st, 2nd, 3rd
  const questionIndices = [
    questionInterval,
    questionInterval * 2,
    questionInterval * 3
  ].filter(i => i > 0 && i < totalSections - 1);
  
  // Each paragraph is its own section
  const sections = rawSections.map((content, index) => ({
    content,
    hasQuestion: questionIndices.includes(index)
  }));

  // Generate context-aware questions based on section content
  const getQuestion = (sectionIndex) => {
    const content = sections[sectionIndex]?.content?.toLowerCase() || "";
    
    // Extract key topics from the content to make relevant questions
    if (content.includes("engineer") || content.includes("design") || content.includes("build")) {
      return "How do you think engineers plan on enhancing this performance?";
    }
    if (content.includes("problem") || content.includes("challenge") || content.includes("issue")) {
      return "What solutions do you think could address this challenge?";
    }
    if (content.includes("experiment") || content.includes("test") || content.includes("research")) {
      return "Why do you think this experiment or research was conducted?";
    }
    if (content.includes("discover") || content.includes("found") || content.includes("learn")) {
      return "How might this discovery change our understanding?";
    }
    if (content.includes("cause") || content.includes("effect") || content.includes("result")) {
      return "What other effects do you think this could have?";
    }
    if (content.includes("future") || content.includes("next") || content.includes("will")) {
      return "What developments do you predict will happen next?";
    }
    if (content.includes("important") || content.includes("significant") || content.includes("key")) {
      return "Why do you think this is considered so important?";
    }
    if (content.includes("example") || content.includes("instance") || content.includes("case")) {
      return "Can you think of another example of this in everyday life?";
    }
    if (content.includes("compare") || content.includes("different") || content.includes("similar")) {
      return "How does this compare to something you already know?";
    }
    
    // Default contextual questions
    const defaults = [
      "Based on what you just read, what do you think happens next?",
      "How might this concept apply to real-world situations?",
      "What questions does this raise for you?",
      "How would you explain this idea in your own words?"
    ];
    return defaults[sectionIndex % defaults.length];
  };

  const handleContinue = () => {
    if (sections[currentSection].hasQuestion && !answeredQuestions.includes(currentSection)) {
      setShowQuestion(true);
    } else {
      moveToNextSection();
    }
  };

  const handleQuestionSubmit = () => {
    setAnsweredQuestions([...answeredQuestions, currentSection]);
    setShowQuestion(false);
    setQuestionAnswer("");
    moveToNextSection();
  };

  const moveToNextSection = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(currentSection + 1);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isLastSection = currentSection === sections.length - 1;
  const progress = ((currentSection + 1) / sections.length) * 100;

  return (
    <Card className="border-0 shadow-2xl mx-auto max-w-3xl bg-white/95 backdrop-blur-xl rounded-[32px]">
      <CardContent className="p-8">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-[#1A1A1A]/60">Reading Progress</span>
            <span className="text-sm font-medium text-[#1A1A1A]">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-[#C4B5FD]/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#86EFAC] rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-[#86EFAC]" />
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Reading</h2>
        </div>

        <div 
          ref={containerRef}
          className="prose prose-lg max-w-none text-[#1A1A1A] mb-6"
          style={{ fontWeight: 450, lineHeight: '1.8' }}
        >
          <ReactMarkdown>{sections[currentSection].content}</ReactMarkdown>
        </div>

        {showQuestion ? (
          <div className="p-6 bg-[#C4B5FD]/10 border border-[#C4B5FD]/30 rounded-[24px] mb-6 animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#C4B5FD]/20 rounded-full flex items-center justify-center border-2 border-[#C4B5FD]/40">
                <span className="text-xl">🐼</span>
              </div>
              <p className="text-lg font-semibold text-[#1A1A1A]">
                {getQuestion(currentSection)}
              </p>
            </div>
            <Textarea
              value={questionAnswer}
              onChange={(e) => setQuestionAnswer(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[80px] text-base border-2 border-[#C4B5FD]/40 focus:border-[#86EFAC] rounded-[16px] p-4 text-[#1A1A1A] mb-4"
              style={{fontWeight: 450}}
            />
            <Button
              onClick={handleQuestionSubmit}
              disabled={questionAnswer.length < 1}
              className="w-full bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] py-4 font-semibold rounded-full"
            >
              Continue Reading
            </Button>
          </div>
        ) : isLastSection ? (
          <div className="text-center pt-4 border-t-2 border-[#C4B5FD]/30">
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">Reading Complete!</h3>
            <p className="text-[#1A1A1A]/70 mb-6" style={{fontWeight: 450}}>Great job finishing the article</p>
            <Button
              onClick={onComplete}
              className="bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] px-10 py-5 text-lg font-semibold rounded-full shadow-xl"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Continue to Results
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={handleContinue}
              className="flex-1 bg-[#86EFAC] hover:bg-[#86EFAC]/90 text-[#1A1A1A] py-5 font-semibold rounded-full"
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            {onAdminSkip && (
              <Button 
                onClick={onAdminSkip}
                variant="outline"
                className="px-6 py-3 text-xs rounded-full"
              >
                Admin Skip
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}