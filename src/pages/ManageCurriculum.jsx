import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, Video, CheckCircle, Clock, Sparkles, Zap, BookOpen } from "lucide-react";
import VideoOnlyModal from "@/components/teacher/VideoOnlyModal";
import ContentReviewModal from "@/components/teacher/ContentReviewModal";
import { invokeLLM, generateImage } from "@/components/utils/openai";

export default function ManageCurriculum() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [inquirySessions, setInquirySessions] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [attentionChecks, setAttentionChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubunit, setSelectedSubunit] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContent, setReviewContent] = useState(null);
  const [generatingQueue, setGeneratingQueue] = useState(false);
  const [queueProgress, setQueueProgress] = useState({ current: 0, total: 0 });
  const [currentGeneratingSubunit, setCurrentGeneratingSubunit] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const curriculumId = urlParams.get("id");
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    loadCurriculumData();
  }, []);

  const loadCurriculumData = async () => {
    try {
      console.log("📚 [MANAGE] Loading curriculum data for ID:", curriculumId);
      
      // ✅ Fetch curriculum from MongoDB
      const curriculumRes = await fetch(`${API_BASE}/api/curriculum/${curriculumId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!curriculumRes.ok) {
        throw new Error('Failed to fetch curriculum');
      }
      
      const curriculumData = await curriculumRes.json();
      console.log("📚 [MANAGE] Curriculum loaded:", curriculumData.subject_name);
      setCurriculum(curriculumData);
      
      // ✅ Fetch units from MongoDB
      const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${curriculumId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!unitsRes.ok) {
        throw new Error('Failed to fetch units');
      }
      
      const unitsData = await unitsRes.json();
      console.log("📚 [MANAGE] Units loaded:", unitsData.length);
      setUnits(unitsData);
      
      // ✅ Fetch all subunits for these units from MongoDB
      const allSubunitsPromises = unitsData.map(unit => 
        fetch(`${API_BASE}/api/subunits/unit/${unit._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : [])
      );
      
      const subunitsArrays = await Promise.all(allSubunitsPromises);
      const allSubunits = subunitsArrays.flat().sort((a, b) => a.subunit_order - b.subunit_order);
      console.log("📚 [MANAGE] Subunits loaded:", allSubunits.length);
      setSubunits(allSubunits);
      
      // ✅ Fetch all content from MongoDB with proper error handling
      const fetchWithErrorHandling = async (url, name) => {
        try {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) {
            console.warn(`⚠️ ${name} endpoint returned ${res.status}`);
            return [];
          }
          const data = await res.json();
          return data;
        } catch (error) {
          console.error(`❌ Error fetching ${name}:`, error);
          return [];
        }
      };

      const [videosData, quizzesData, questionsData, inquiryData, caseStudyData, attentionChecksData] = await Promise.all([
        fetchWithErrorHandling(`${API_BASE}/api/videos`, 'videos'),
        fetchWithErrorHandling(`${API_BASE}/api/quizzes`, 'quizzes'),
        fetchWithErrorHandling(`${API_BASE}/api/questions`, 'questions'),
        fetchWithErrorHandling(`${API_BASE}/api/inquiry-sessions`, 'inquiry-sessions'),
        fetchWithErrorHandling(`${API_BASE}/api/case-studies`, 'case-studies'),
        fetchWithErrorHandling(`${API_BASE}/api/attention-checks`, 'attention-checks')
      ]);

      setVideos(videosData);
      setQuizzes(quizzesData);
      setQuestions(questionsData);
      setInquirySessions(inquiryData);
      setCaseStudies(caseStudyData);
      setAttentionChecks(attentionChecksData);
      console.log("📚 [MANAGE] All MongoDB content loaded successfully");
      
    } catch (error) {
      console.error("❌ [MANAGE] Failed to load curriculum:", error);
      alert("Failed to load curriculum data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const getSubunitStatus = (subunitId) => {
    const video = videos.find(v => v.subunit_id === subunitId);
    if (!video) return "no_video";
    
    const hasQuiz = quizzes.some(q => q.subunit_id === subunitId);
    const hasInquiry = inquirySessions.some(i => i.subunit_id === subunitId);
    const hasCaseStudy = caseStudies.some(c => c.subunit_id === subunitId);
    
    if (hasQuiz && hasInquiry && hasCaseStudy) return "complete";
    return "video_only";
  };

  const handleAddVideo = (subunit) => {
    console.log("🎥 [MANAGE] Opening video modal for:", subunit.subunit_name);
    setSelectedSubunit(subunit);
    setShowVideoModal(true);
  };

  const handleReviewContent = async (subunit) => {
    const video = videos.find(v => v.subunit_id === subunit._id);
    const videoId = video.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1] || "";
    
    const quiz = quizzes.find(q => q.subunit_id === subunit._id && q.quiz_type === "new_topic");
    const quizQuestions = quiz ? questions.filter(q => q.quiz_id === quiz._id) : [];
    const inquiry = inquirySessions.find(i => i.subunit_id === subunit._id);
    const caseStudy = caseStudies.find(c => c.subunit_id === subunit._id);
    
    setReviewContent({
      video: {
        videoId,
        title: subunit.subunit_name,
        url: video.video_url,
        summary: video.video_transcript || "",
        transcript: video.video_transcript || ""
      },
      inquiryContent: {
        hook_image_prompt: inquiry?.hook_image_prompt || "",
        hook_image_url: inquiry?.hook_image_url || "",
        hook_question: inquiry?.hook_question || "",
        socratic_system_prompt: inquiry?.socratic_system_prompt || "",
        tutor_first_message: inquiry?.tutor_first_message || ""
      },
      questions: quizQuestions,
      caseStudy: {
        scenario: caseStudy?.scenario || "",
        question_a: caseStudy?.question_a || "",
        answer_a: caseStudy?.answer_a || "",
        question_b: caseStudy?.question_b || "",
        answer_b: caseStudy?.answer_b || "",
        question_c: caseStudy?.question_c || "",
        answer_c: caseStudy?.answer_c || "",
        question_d: caseStudy?.question_d || "",
        answer_d: caseStudy?.answer_d || ""
      },
      quiz,
      inquirySession: inquiry,
      caseStudyEntity: caseStudy
    });
    
    setSelectedSubunit(subunit);
    setShowReviewModal(true);
  };

  const handleVideoAdded = async () => {
    console.log("✅ [MANAGE] Video added, reloading data...");
    setShowVideoModal(false);
    await loadCurriculumData();
  };

  const handleContentSaved = async () => {
    console.log("✅ [MANAGE] Content saved, reloading data...");
    setShowReviewModal(false);
    await loadCurriculumData();
  };

  const handleGenerateAll = async () => {
    const subunitsNeedingContent = subunits.filter(sub => getSubunitStatus(sub._id) === "video_only");
    
    if (subunitsNeedingContent.length === 0) {
      alert("All subunits already have content generated!");
      return;
    }

    setGeneratingQueue(true);
    setQueueProgress({ current: 0, total: subunitsNeedingContent.length });

    // Small delay to ensure UI updates before heavy work
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < subunitsNeedingContent.length; i++) {
      const sub = subunitsNeedingContent[i];
      setCurrentGeneratingSubunit(sub.subunit_name);
      
      try {
        console.log(`\n🚀 Starting generation for subunit ${i + 1}/${subunitsNeedingContent.length}: ${sub.subunit_name}`);
        await generateContentForSubunit(sub);
        
        // Reload data to update the UI
        await loadCurriculumData();
        
        // Only update progress after content is fully generated and data reloaded
        setQueueProgress({ current: i + 1, total: subunitsNeedingContent.length });
        console.log(`✅ Completed ${i + 1}/${subunitsNeedingContent.length}`);
        
        // Small delay between subunits to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`❌ Failed to generate content for ${sub.subunit_name}:`, err);
        alert(`Failed to generate content for ${sub.subunit_name}. Error: ${err?.message || "Unknown error"}`);
        setQueueProgress({ current: i + 1, total: subunitsNeedingContent.length });
      }
    }

    // Final reload to ensure everything is up to date
    await loadCurriculumData();
    
    // Keep queue visible for a moment to show completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setGeneratingQueue(false);
    setCurrentGeneratingSubunit(null);
    console.log(`\n🎉 All content generation complete!`);
  };

  const generateContentForSubunit = async (subunit) => {
    try {
      console.log(`\n🚀 Starting generation for: ${subunit.subunit_name}`);
      
      const video = videos.find(v => v.subunit_id === subunit._id);
      if (!video) {
        throw new Error(`No video found for subunit: ${subunit.subunit_name}`);
      }

      // Extract video ID from YouTube URL
      const videoId = video.video_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
      
      if (!videoId) {
        throw new Error(`Could not extract video ID from URL: ${video.video_url}`);
      }

      // Fetch transcript with error handling
      console.log("\n🧪 [TRANSCRIPT TEST] ════════════════════════════════");
      console.log("🧪 [TRANSCRIPT TEST] Starting transcript fetch test");
      console.log("🧪 [TRANSCRIPT TEST] Video ID:", videoId);
      console.log("🧪 [TRANSCRIPT TEST] Full URL:", video.video_url);
      console.log("🧪 [TRANSCRIPT TEST] ════════════════════════════════\n");

      const response = await fetch(`${API_BASE}/api/videos/fetch-transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      let transcriptData = {};
      let fetchedTranscript = "";
      let timestampedSegments = [];

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's the "no transcript" error
        if (errorData.code === 'NO_TRANSCRIPT') {
          console.warn("⚠️ [TRANSCRIPT] Video has no captions available");
          console.warn("⚠️ [TRANSCRIPT] Skipping this video - please choose a video with captions");
          throw new Error(`This video does not have captions/transcripts available. Please select a different video with captions enabled.`);
        } else {
          throw new Error(`Failed to fetch transcript: ${errorData.error || errorData.message}`);
        }
      } else {
        transcriptData = await response.json();
        fetchedTranscript = transcriptData?.transcript || "";
        timestampedSegments = transcriptData?.timestampedSegments || [];
      }

      if (fetchedTranscript && fetchedTranscript.length > 0) {
        console.log("✅ [TRANSCRIPT TEST] SUCCESS! Transcript fetched");
        console.log("📏 [TRANSCRIPT TEST] Length:", fetchedTranscript.length, "characters");
        console.log("📏 [TRANSCRIPT TEST] Timestamped segments:", timestampedSegments.length);
        console.log("📄 [TRANSCRIPT TEST] First 500 chars:");
        console.log(fetchedTranscript.substring(0, 500) + "...\n");
      } else {
        console.error("❌ [TRANSCRIPT TEST] FAILED - Empty transcript");
        throw new Error("Could not fetch transcript for this video. Please select a video with captions enabled.");
      }
      
      const videoTranscript = fetchedTranscript;
      const videoDuration = timestampedSegments.length > 0 
        ? Math.ceil(timestampedSegments[timestampedSegments.length - 1].timestamp) 
        : (video.duration_seconds || 120);
      
      console.log("🎯 [GENERATION] Using transcript for content generation");
      console.log("📊 [GENERATION] Transcript length:", videoTranscript.length, "characters");

      // Save the fetched transcript to MongoDB
      if (fetchedTranscript && fetchedTranscript.length > 0) {
        console.log("💾 [TRANSCRIPT] Saving transcript to video entity...");
        await fetch(`${API_BASE}/api/videos/${video._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_transcript: fetchedTranscript
          })
        });
        console.log("✅ [TRANSCRIPT] Transcript saved to video entity");
      }

      // Generate 5 attention checks for the video
      console.log(`  🔄 Generating video attention checks...`);
      
      const attentionCheckResponse = await fetch(`${API_BASE}/api/videos/generate-attention-checks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: videoTranscript,
          videoDuration: videoDuration
        })
      });

      const attentionCheckData = await attentionCheckResponse.json();
      const attentionChecks = attentionCheckData?.attention_checks || [];

      // Generate all other content in parallel (faster)
      console.log(`  🔄 Generating inquiry, questions, and case study in parallel...`);
      const [inquiryContent, questionsData, caseStudyContent] = await Promise.all([
        invokeLLM({
          prompt: `You are the world's best automated inquiry-based learning designer.

        Topic: "${subunit.subunit_name}"
        Learning Standard: "${subunit.learning_standard || 'Not specified'}"

        Create a curiosity hook for this topic. IMPORTANT: The student has NOT learned this concept yet - they are encountering it for the first time. The hook question should relate directly to the topic but be answerable through intuition, prior knowledge, or everyday experience.

        The hook_image_prompt should describe a specific scenario and end with: "Clean simple cartoon, bold black outlines, bright pastel colors, PURE WHITE BACKGROUND ONLY, showing this specific scenario that makes students curious about ${subunit.subunit_name}. No text,. Modern cute Duolingo style. 1792×1024."

        Return strict JSON:
        {
        "hook_image_prompt": "[Describe specific scenario]. Style: cartoon-realistic with simplified forms and accurate physics, minimal and sleek, muted neutral and soft pastel color palette with low saturation (not vibrant), clean thin outlines, modern educational science illustration, pure white background only, single clear centered scenario in ONE UNIFIED SCENE that sparks curiosity, keep it simple and easy to understand what is happening, no people, no hands, no text, no labels, no arrows, no symbols, no numbers, no multiple panels or stages, calm polished classroom aesthetic, 1792×1024.",
        "hook_question": "Question (8-18 words) directly about ${subunit.subunit_name} that students can answer through intuition or everyday experience, even without formal knowledge of the topic",
        "relevant_past_memories": [],
        "socratic_system_prompt": "You are Panda, a Socratic tutor. The student has NOT learned ${subunit.subunit_name} yet. Guide them to think about the topic using their intuition and prior knowledge. Ask questions, never explain. Max 3 exchanges. Make sure to stay on topic with the subject of the session. End with: 'Brilliant thinking! Now watch the video.'",
        "tutor_first_message": "Warm response to student's guess, with follow-up question that helps them explore the topic further"
        }`,
          response_json_schema: {
            type: "object",
            properties: {
              hook_image_prompt: { type: "string" },
              hook_question: { type: "string" },
              relevant_past_memories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subunitTitle: { type: "string" },
                    studentFinalGuess: { type: "string" },
                    completedDateRelative: { type: "string" }
                  }
                }
              },
              socratic_system_prompt: { type: "string" },
              tutor_first_message: { type: "string" }
            }
          }
        }),
        
        invokeLLM({
          prompt: `Based on the topic "${subunit.subunit_name}" and learning standard "${subunit.learning_standard || 'Not specified'}", create 40 diverse multiple-choice quiz questions organized by difficulty.

DIFFICULTY DISTRIBUTION:
- 15 EASY questions (basic recall and understanding)
- 15 MEDIUM questions (application and analysis)
- 10 HARD questions (synthesis, evaluation, complex scenarios)

Return a JSON object with exactly this structure:
{
  "questions": [
    {
      "question_text": "Question text here?",
      "choice_1": "First option",
      "choice_2": "Second option", 
      "choice_3": "Third option",
      "choice_4": "Fourth option",
      "correct_choice": 1,
      "question_order": 1,
      "difficulty": "easy"
    }
  ]
}

Make sure:
- First 15 questions (order 1-15) have difficulty "easy"
- Next 15 questions (order 16-30) have difficulty "medium"
- Last 10 questions (order 31-40) have difficulty "hard"
- correct_choice is a number (1, 2, 3, or 4)`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    choice_1: { type: "string" },
                    choice_2: { type: "string" },
                    choice_3: { type: "string" },
                    choice_4: { type: "string" },
                    correct_choice: { type: "number" },
              import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ChevronLeft, Video, CheckCircle, Clock, Sparkles, Zap, BookOpen } from "lucide-react";
import VideoOnlyModal from "@/components/teacher/VideoOnlyModal";
import ContentReviewModal from "@/components/teacher/ContentReviewModal";
import { invokeLLM, generateImage } from "@/components/utils/openai";

export default function ManageCurriculum() {
  const navigate = useNavigate();
  const [curriculum, setCurriculum] = useState(null);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [inquirySessions, setInquirySessions] = useState([]);
  const [caseStudies, setCaseStudies] = useState([]);
  const [attentionChecks, setAttentionChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubunit, setSelectedSubunit] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewContent, setReviewContent] = useState(null);
  const [generatingQueue, setGeneratingQueue] = useState(false);
  const [queueProgress, setQueueProgress] = useState({ current: 0, total: 0 });
  const [currentGeneratingSubunit, setCurrentGeneratingSubunit] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const curriculumId = urlParams.get("id");
  const token = localStorage.getItem('token');
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // ✅ HELPER FUNCTION: Extract YouTube Video ID from various URL formats
  const extractYouTubeVideoId = (url) => {
    if (!url) return null;
    
    // Handle if it's already just an ID
    if (url.length === 11 && !url.includes('/') && !url.includes('?')) {
      return url;
    }
    
    // Extract from various YouTube URL formats
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match?.[1] || null;
  };

  useEffect(() => {
    loadCurriculumData();
  }, []);

  const loadCurriculumData = async () => {
    try {
      console.log("📚 [MANAGE] Loading curriculum data for ID:", curriculumId);
      
      // ✅ Fetch curriculum from MongoDB
      const curriculumRes = await fetch(`${API_BASE}/api/curriculum/${curriculumId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!curriculumRes.ok) {
        throw new Error('Failed to fetch curriculum');
      }
      
      const curriculumData = await curriculumRes.json();
      console.log("📚 [MANAGE] Curriculum loaded:", curriculumData.subject_name);
      setCurriculum(curriculumData);
      
      // ✅ Fetch units from MongoDB
      const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${curriculumId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!unitsRes.ok) {
        throw new Error('Failed to fetch units');
      }
      
      const unitsData = await unitsRes.json();
      console.log("📚 [MANAGE] Units loaded:", unitsData.length);
      setUnits(unitsData);
      
      // ✅ Fetch all subunits for these units from MongoDB
      const allSubunitsPromises = unitsData.map(unit => 
        fetch(`${API_BASE}/api/subunits/unit/${unit._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.ok ? res.json() : [])
      );
      
      const subunitsArrays = await Promise.all(allSubunitsPromises);
      const allSubunits = subunitsArrays.flat().sort((a, b) => a.subunit_order - b.subunit_order);
      console.log("📚 [MANAGE] Subunits loaded:", allSubunits.length);
      setSubunits(allSubunits);
      
      // ✅ Fetch all content from MongoDB with proper error handling
      const fetchWithErrorHandling = async (url, name) => {
        try {
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (!res.ok) {
            console.warn(`⚠️ ${name} endpoint returned ${res.status}`);
            return [];
          }
          const data = await res.json();
          return data;
        } catch (error) {
          console.error(`❌ Error fetching ${name}:`, error);
          return [];
        }
      };

      const [videosData, quizzesData, questionsData, inquiryData, caseStudyData, attentionChecksData] = await Promise.all([
        fetchWithErrorHandling(`${API_BASE}/api/videos`, 'videos'),
        fetchWithErrorHandling(`${API_BASE}/api/quizzes`, 'quizzes'),
        fetchWithErrorHandling(`${API_BASE}/api/questions`, 'questions'),
        fetchWithErrorHandling(`${API_BASE}/api/inquiry-sessions`, 'inquiry-sessions'),
        fetchWithErrorHandling(`${API_BASE}/api/case-studies`, 'case-studies'),
        fetchWithErrorHandling(`${API_BASE}/api/attention-checks`, 'attention-checks')
      ]);

      setVideos(videosData);
      setQuizzes(quizzesData);
      setQuestions(questionsData);
      setInquirySessions(inquiryData);
      setCaseStudies(caseStudyData);
      setAttentionChecks(attentionChecksData);
      console.log("📚 [MANAGE] All MongoDB content loaded successfully");
      
    } catch (error) {
      console.error("❌ [MANAGE] Failed to load curriculum:", error);
      alert("Failed to load curriculum data. Please try refreshing the page.");
    } finally {
      setLoading(false);
    }
  };

  const getSubunitStatus = (subunitId) => {
    const video = videos.find(v => v.subunit_id === subunitId);
    if (!video) return "no_video";
    
    const hasQuiz = quizzes.some(q => q.subunit_id === subunitId);
    const hasInquiry = inquirySessions.some(i => i.subunit_id === subunitId);
    const hasCaseStudy = caseStudies.some(c => c.subunit_id === subunitId);
    
    if (hasQuiz && hasInquiry && hasCaseStudy) return "complete";
    return "video_only";
  };

  const handleAddVideo = (subunit) => {
    console.log("🎥 [MANAGE] Opening video modal for:", subunit.subunit_name);
    setSelectedSubunit(subunit);
    setShowVideoModal(true);
  };

  const handleReviewContent = async (subunit) => {
    const video = videos.find(v => v.subunit_id === subunit._id);
    
    // ✅ FIXED: Use the helper function with complete regex pattern
    const videoId = extractYouTubeVideoId(video.video_url);
    
    // Add safety check
    if (!videoId) {
      console.error('❌ Could not extract video ID from URL:', video.video_url);
      alert('Invalid YouTube URL format. Please check the video URL.');
      return;
    }
    
    const quiz = quizzes.find(q => q.subunit_id === subunit._id && q.quiz_type === "new_topic");
    const quizQuestions = quiz ? questions.filter(q => q.quiz_id === quiz._id) : [];
    const inquiry = inquirySessions.find(i => i.subunit_id === subunit._id);
    const caseStudy = caseStudies.find(c => c.subunit_id === subunit._id);
    
    setReviewContent({
      video: {
        videoId,
        title: subunit.subunit_name,
        url: video.video_url,
        summary: video.video_transcript || "",
        transcript: video.video_transcript || ""
      },
      inquiryContent: {
        hook_image_prompt: inquiry?.hook_image_prompt || "",
        hook_image_url: inquiry?.hook_image_url || "",
        hook_question: inquiry?.hook_question || "",
        socratic_system_prompt: inquiry?.socratic_system_prompt || "",
        tutor_first_message: inquiry?.tutor_first_message || ""
      },
      questions: quizQuestions,
      caseStudy: {
        scenario: caseStudy?.scenario || "",
        question_a: caseStudy?.question_a || "",
        answer_a: caseStudy?.answer_a || "",
        question_b: caseStudy?.question_b || "",
        answer_b: caseStudy?.answer_b || "",
        question_c: caseStudy?.question_c || "",
        answer_c: caseStudy?.answer_c || "",
        question_d: caseStudy?.question_d || "",
        answer_d: caseStudy?.answer_d || ""
      },
      quiz,
      inquirySession: inquiry,
      caseStudyEntity: caseStudy
    });
    
    setSelectedSubunit(subunit);
    setShowReviewModal(true);
  };

  const handleVideoAdded = async () => {
    console.log("✅ [MANAGE] Video added, reloading data...");
    setShowVideoModal(false);
    await loadCurriculumData();
  };

  const handleContentSaved = async () => {
    console.log("✅ [MANAGE] Content saved, reloading data...");
    setShowReviewModal(false);
    await loadCurriculumData();
  };

  const handleGenerateAll = async () => {
    const subunitsNeedingContent = subunits.filter(sub => getSubunitStatus(sub._id) === "video_only");
    
    if (subunitsNeedingContent.length === 0) {
      alert("All subunits already have content generated!");
      return;
    }

    setGeneratingQueue(true);
    setQueueProgress({ current: 0, total: subunitsNeedingContent.length });

    // Small delay to ensure UI updates before heavy work
    await new Promise(resolve => setTimeout(resolve, 500));

    for (let i = 0; i < subunitsNeedingContent.length; i++) {
      const sub = subunitsNeedingContent[i];
      setCurrentGeneratingSubunit(sub.subunit_name);
      
      try {
        console.log(`\n🚀 Starting generation for subunit ${i + 1}/${subunitsNeedingContent.length}: ${sub.subunit_name}`);
        await generateContentForSubunit(sub);
        
        // Reload data to update the UI
        await loadCurriculumData();
        
        // Only update progress after content is fully generated and data reloaded
        setQueueProgress({ current: i + 1, total: subunitsNeedingContent.length });
        console.log(`✅ Completed ${i + 1}/${subunitsNeedingContent.length}`);
        
        // Small delay between subunits to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`❌ Failed to generate content for ${sub.subunit_name}:`, err);
        alert(`Failed to generate content for ${sub.subunit_name}. Error: ${err?.message || "Unknown error"}`);
        setQueueProgress({ current: i + 1, total: subunitsNeedingContent.length });
      }
    }

    // Final reload to ensure everything is up to date
    await loadCurriculumData();
    
    // Keep queue visible for a moment to show completion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setGeneratingQueue(false);
    setCurrentGeneratingSubunit(null);
    console.log(`\n🎉 All content generation complete!`);
  };

  const generateContentForSubunit = async (subunit) => {
    try {
      console.log(`\n🚀 Starting generation for: ${subunit.subunit_name}`);
      
      const video = videos.find(v => v.subunit_id === subunit._id);
      if (!video) {
        throw new Error(`No video found for subunit: ${subunit.subunit_name}`);
      }

      // ✅ FIXED: Extract video ID using helper function
      const videoId = extractYouTubeVideoId(video.video_url);
      
      if (!videoId) {
        throw new Error(`Could not extract video ID from URL: ${video.video_url}`);
      }

      // Fetch transcript with error handling
      console.log("\n🧪 [TRANSCRIPT TEST] ════════════════════════════════");
      console.log("🧪 [TRANSCRIPT TEST] Starting transcript fetch test");
      console.log("🧪 [TRANSCRIPT TEST] Video ID:", videoId);
      console.log("🧪 [TRANSCRIPT TEST] Full URL:", video.video_url);
      console.log("🧪 [TRANSCRIPT TEST] ════════════════════════════════\n");

      const response = await fetch(`${API_BASE}/api/videos/fetch-transcript`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ videoId })
      });

      let transcriptData = {};
      let fetchedTranscript = "";
      let timestampedSegments = [];

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's the "no transcript" error
        if (errorData.code === 'NO_TRANSCRIPT') {
          console.warn("⚠️ [TRANSCRIPT] Video has no captions available");
          console.warn("⚠️ [TRANSCRIPT] Skipping this video - please choose a video with captions");
          throw new Error(`This video does not have captions/transcripts available. Please select a different video with captions enabled.`);
        } else {
          throw new Error(`Failed to fetch transcript: ${errorData.error || errorData.message}`);
        }
      } else {
        transcriptData = await response.json();
        fetchedTranscript = transcriptData?.transcript || "";
        timestampedSegments = transcriptData?.timestampedSegments || [];
      }

      if (fetchedTranscript && fetchedTranscript.length > 0) {
        console.log("✅ [TRANSCRIPT TEST] SUCCESS! Transcript fetched");
        console.log("📏 [TRANSCRIPT TEST] Length:", fetchedTranscript.length, "characters");
        console.log("📏 [TRANSCRIPT TEST] Timestamped segments:", timestampedSegments.length);
        console.log("📄 [TRANSCRIPT TEST] First 500 chars:");
        console.log(fetchedTranscript.substring(0, 500) + "...\n");
      } else {
        console.error("❌ [TRANSCRIPT TEST] FAILED - Empty transcript");
        throw new Error("Could not fetch transcript for this video. Please select a video with captions enabled.");
      }
      
      const videoTranscript = fetchedTranscript;
      const videoDuration = timestampedSegments.length > 0 
        ? Math.ceil(timestampedSegments[timestampedSegments.length - 1].timestamp) 
        : (video.duration_seconds || 120);
      
      console.log("🎯 [GENERATION] Using transcript for content generation");
      console.log("📊 [GENERATION] Transcript length:", videoTranscript.length, "characters");

      // Save the fetched transcript to MongoDB
      if (fetchedTranscript && fetchedTranscript.length > 0) {
        console.log("💾 [TRANSCRIPT] Saving transcript to video entity...");
        await fetch(`${API_BASE}/api/videos/${video._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_transcript: fetchedTranscript
          })
        });
        console.log("✅ [TRANSCRIPT] Transcript saved to video entity");
      }

      // Generate 5 attention checks for the video
      console.log(`  🔄 Generating video attention checks...`);
      
      const attentionCheckResponse = await fetch(`${API_BASE}/api/videos/generate-attention-checks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: videoTranscript,
          videoDuration: videoDuration
        })
      });

      const attentionCheckData = await attentionCheckResponse.json();
      const attentionChecks = attentionCheckData?.attention_checks || [];

      // Generate all other content in parallel (faster)
      console.log(`  🔄 Generating inquiry, questions, and case study in parallel...`);
      const [inquiryContent, questionsData, caseStudyContent] = await Promise.all([
        invokeLLM({
          prompt: `You are the world's best automated inquiry-based learning designer.

        Topic: "${subunit.subunit_name}"
        Learning Standard: "${subunit.learning_standard || 'Not specified'}"

        Create a curiosity hook for this topic. IMPORTANT: The student has NOT learned this concept yet - they are encountering it for the first time. The hook question should relate directly to the topic but be answerable through intuition, prior knowledge, or everyday experience.

        The hook_image_prompt should describe a specific scenario and end with: "Clean simple cartoon, bold black outlines, bright pastel colors, PURE WHITE BACKGROUND ONLY, showing this specific scenario that makes students curious about ${subunit.subunit_name}. No text,. Modern cute Duolingo style. 1792×1024."

        Return strict JSON:
        {
        "hook_image_prompt": "[Describe specific scenario]. Style: cartoon-realistic with simplified forms and accurate physics, minimal and sleek, muted neutral and soft pastel color palette with low saturation (not vibrant), clean thin outlines, modern educational science illustration, pure white background only, single clear centered scenario in ONE UNIFIED SCENE that sparks curiosity, keep it simple and easy to understand what is happening, no people, no hands, no text, no labels, no arrows, no symbols, no numbers, no multiple panels or stages, calm polished classroom aesthetic, 1792×1024.",
        "hook_question": "Question (8-18 words) directly about ${subunit.subunit_name} that students can answer through intuition or everyday experience, even without formal knowledge of the topic",
        "relevant_past_memories": [],
        "socratic_system_prompt": "You are Panda, a Socratic tutor. The student has NOT learned ${subunit.subunit_name} yet. Guide them to think about the topic using their intuition and prior knowledge. Ask questions, never explain. Max 3 exchanges. Make sure to stay on topic with the subject of the session. End with: 'Brilliant thinking! Now watch the video.'",
        "tutor_first_message": "Warm response to student's guess, with follow-up question that helps them explore the topic further"
        }`,
          response_json_schema: {
            type: "object",
            properties: {
              hook_image_prompt: { type: "string" },
              hook_question: { type: "string" },
              relevant_past_memories: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    subunitTitle: { type: "string" },
                    studentFinalGuess: { type: "string" },
                    completedDateRelative: { type: "string" }
                  }
                }
              },
              socratic_system_prompt: { type: "string" },
              tutor_first_message: { type: "string" }
            }
          }
        }),
        
        invokeLLM({
          prompt: `Based on the topic "${subunit.subunit_name}" and learning standard "${subunit.learning_standard || 'Not specified'}", create 40 diverse multiple-choice quiz questions organized by difficulty.

DIFFICULTY DISTRIBUTION:
- 15 EASY questions (basic recall and understanding)
- 15 MEDIUM questions (application and analysis)
- 10 HARD questions (synthesis, evaluation, complex scenarios)

Return a JSON object with exactly this structure:
{
  "questions": [
    {
      "question_text": "Question text here?",
      "choice_1": "First option",
      "choice_2": "Second option", 
      "choice_3": "Third option",
      "choice_4": "Fourth option",
      "correct_choice": 1,
      "question_order": 1,
      "difficulty": "easy"
    }
  ]
}

Make sure:
- First 15 questions (order 1-15) have difficulty "easy"
- Next 15 questions (order 16-30) have difficulty "medium"
- Last 10 questions (order 31-40) have difficulty "hard"
- correct_choice is a number (1, 2, 3, or 4)`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    choice_1: { type: "string" },
                    choice_2: { type: "string" },
                    choice_3: { type: "string" },
                    choice_4: { type: "string" },
                    correct_choice: { type: "number" },
                    question_order: { type: "number" },
                    difficulty: { type: "string" }
                  }
                }
              }
            }
          }
        }),
        
        invokeLLM({
          prompt: `Create a case study for "${subunit.subunit_name}" with 4 free-response questions and expected answers.

Context: ${videoTranscript}

Return JSON:
{
  "scenario": "Realistic scenario with specific values...",
  "question_a": "(a) Calculate...",
  "answer_a": "Expected answer...",
  "question_b": "(b) Determine...",
  "answer_b": "Expected answer...",
  "question_c": "(c) If condition changes...",
  "answer_c": "Expected answer...",
  "question_d": "(d) A student claims... Explain why...",
  "answer_d": "Expected answer..."
}`,
          response_json_schema: {
            type: "object",
            properties: {
              scenario: { type: "string" },
              question_a: { type: "string" },
              answer_a: { type: "string" },
              question_b: { type: "string" },
              answer_b: { type: "string" },
              question_c: { type: "string" },
              answer_c: { type: "string" },
              question_d: { type: "string" },
              answer_d: { type: "string" }
            }
          }
        })
      ]);

      console.log(`  ✓ All content generated`);

      // Generate the hook image
      console.log(`  🎨 Generating hook image...`);
      const imageResult = await generateImage({
        prompt: inquiryContent.hook_image_prompt
      });
      console.log(`  ✓ Hook image generated`);

      // Save inquiry session to MongoDB
      console.log(`  💾 Saving inquiry session...`);
      const inquiryResponse = await fetch(`${API_BASE}/api/inquiry-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subunit_id: subunit._id,
          video_id: video._id,
          hook_image_prompt: inquiryContent.hook_image_prompt,
          hook_image_url: imageResult.url,
          hook_question: inquiryContent.hook_question,
          relevant_past_memories: inquiryContent.relevant_past_memories || [],
          socratic_system_prompt: inquiryContent.socratic_system_prompt,
          tutor_first_message: inquiryContent.tutor_first_message
        })
      });

      if (!inquiryResponse.ok) {
        const errorText = await inquiryResponse.text();
        throw new Error(`Failed to save inquiry session: ${inquiryResponse.status} - ${errorText}`);
      }

      console.log(`  ✓ Inquiry session saved`);

      console.log(`  💾 Saving quizzes...`);
      const [newTopicQuizRes, reviewQuizRes] = await Promise.all([
        fetch(`${API_BASE}/api/quizzes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subunit_id: subunit._id, quiz_type: "new_topic" })
        }),
        fetch(`${API_BASE}/api/quizzes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subunit_id: subunit._id, quiz_type: "review" })
        })
      ]);

      const newTopicQuiz = await newTopicQuizRes.json();
      const reviewQuiz = await reviewQuizRes.json();

      // Create questions in smaller batches to avoid network overload
      console.log(`  💾 Saving questions (${questionsData.questions?.length || 0} per quiz)...`);
      const questions = questionsData.questions || [];
      
      // Process sequentially to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        // Create new topic quiz questions
        for (const q of batch) {
          try {
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: newTopicQuiz._id, ...q })
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`  ⚠️ Error creating question, retrying...`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: newTopicQuiz._id, ...q })
            });
          }
        }
        
        // Create review quiz questions
        for (const q of batch) {
          try {
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: reviewQuiz._id, ...q })
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`  ⚠️ Error creating question, retrying...`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: reviewQuiz._id, ...q })
            });
          }
        }
        
        // Delay between batches
        if (i + batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      console.log(`  ✓ Both quizzes saved (${questions.length} questions each)`);

      // Save case study to MongoDB
      console.log(`  💾 Saving case study...`);
      await fetch(`${API_BASE}/api/case-studies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subunit_id: subunit._id,
          video_id: video._id,
          scenario: caseStudyContent.scenario,
          question_a: caseStudyContent.question_a,
          answer_a: caseStudyContent.answer_a || "",
          question_b: caseStudyContent.question_b,
          answer_b: caseStudyContent.answer_b || "",
          question_c: caseStudyContent.question_c,
          answer_c: caseStudyContent.answer_c || "",
          question_d: caseStudyContent.question_d,
          answer_d: caseStudyContent.answer_d || ""
        })
      });
      console.log(`  ✓ Case study saved`);

      // Save attention checks to MongoDB in parallel
      console.log(`  💾 Saving attention checks...`);
      await Promise.all(attentionChecks.map(check => 
        fetch(`${API_BASE}/api/attention-checks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: video._id,
            timestamp: check.timestamp,
            question: check.question,
            choice_a: check.choice_a,
            choice_b: check.choice_b,
            choice_c: check.choice_c,
            choice_d: check.choice_d,
            correct_choice: check.correct_choice,
            check_order: check.check_order
          })
        })
      ));
      console.log(`  ✓ Attention checks saved (${attentionChecks.length} checks)`);
      
      console.log(`✅ COMPLETED all 4-phase content for: ${subunit.subunit_name}\n`);

    } catch (error) {
      console.error(`\n❌ ERROR in ${subunit.subunit_name}:`, error);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">Curriculum not found</p>
          <Button onClick={() => navigate(createPageUrl("TeacherCurricula"))}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Curricula
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="max-w-7xl mx-auto" style={{ fontFamily: '"Inter", sans-serif' }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("TeacherCurricula"))}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">{curriculum?.subject_name}</h1>
                <p className="text-gray-600">Add videos and content to your curriculum</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {subunits.some(s => getSubunitStatus(s._id) === "video_only") && (
              <Button
                onClick={handleGenerateAll}
                disabled={generatingQueue}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-4 py-2 text-sm font-semibold shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Generate Content
              </Button>
            )}
            <Button
              onClick={() => navigate(createPageUrl("TeacherCurricula"))}
              style={{ backgroundColor: '#16a34a' }}
              className="hover:opacity-90 text-white gap-2 px-4 py-2 text-sm font-semibold shadow-lg"
            >
              <CheckCircle className="w-4 h-4" />
              Complete
            </Button>
          </div>
        </div>

        {units.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Units Found</h3>
              <p className="text-gray-600">This curriculum doesn't have any units yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {units.map((unit) => {
              const unitSubunits = subunits.filter(s => s.unit_id === unit._id);
              const completedCount = unitSubunits.filter(s => getSubunitStatus(s._id) === "complete").length;

              return (
                <Card key={unit._id} className="border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{unit.unit_name}</h2>
                        <p className="text-sm text-gray-600">
                          {completedCount} of {unitSubunits.length} subunits completed
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {unitSubunits.length > 0 ? Math.round((completedCount / unitSubunits.length) * 100) : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="h-3 bg-blue-100 rounded-full mb-6 shadow-inner">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all shadow-lg"
                        style={{ width: `${unitSubunits.length > 0 ? (completedCount / unitSubunits.length) * 100 : 0}%` }}
                      />
                    </div>

                    {unitSubunits.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No subunits in this unit</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unitSubunits.map((subunit) => {
                          const status = getSubunitStatus(subunit._id);
                          return (
                            <div
                              key={subunit._id}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                status === "complete"
                                  ? "bg-green-50 border-green-300"
                                  : status === "video_only"
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-gray-50 border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 text-sm">{subunit.subunit_name}</h3>
                                {status === "complete" ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : status === "video_only" ? (
                                  <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                              
                              <Button
                                onClick={() => status === "complete" ? handleReviewContent(subunit) : handleAddVideo(subunit)}
                                size="sm"
                                disabled={generatingQueue}
                                className={`w-full shadow-lg ${
                                  status === "complete" 
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                    : status === "video_only"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-gray-600 hover:bg-gray-700 text-white"
                                }`}
                              >
                                {status === "complete" ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Review Content
                                  </>
                                ) : (
                                  <>
                                    <Video className="w-4 h-4 mr-2" />
                                    {status === "video_only" ? "Video Added" : "Add Video"}
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showVideoModal && selectedSubunit && (
        <VideoOnlyModal
          subunit={selectedSubunit}
          curriculumName={curriculum?.subject_name}
          onClose={() => setShowVideoModal(false)}
          onVideoAdded={handleVideoAdded}
        />
      )}

      {showReviewModal && selectedSubunit && reviewContent && (
        <ContentReviewModal
          subunit={selectedSubunit}
          content={reviewContent}
          onClose={() => setShowReviewModal(false)}
          onSave={handleContentSaved}
        />
      )}

      {generatingQueue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Generating Content</h3>
                <p className="text-gray-600">Please wait while Quest generates learning materials...</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-900">{queueProgress.current} of {queueProgress.total} completed</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all duration-500" 
                    style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated time remaining: {Math.ceil((queueProgress.total - queueProgress.current) * 1.5)} minutes
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Content Queue</h4>
                {subunits.filter(sub => getSubunitStatus(sub._id) === "video_only").map((sub, index) => {
                  const isCurrent = index === queueProgress.current;
                  const isPending = index > queueProgress.current;

                  // Only show current and pending items (completed ones disappear)
                  if (index < queueProgress.current) return null;

                  return (
                    <div 
                      key={sub._id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isCurrent ? 'bg-blue-50 border-blue-300' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          isCurrent ? 'text-blue-700' :
                          'text-gray-600'
                        }`}>
                          {sub.subunit_name}
                        </span>
                        {isCurrent && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                        {isPending && <Clock className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}      question_order: { type: "number" },
                    difficulty: { type: "string" }
                  }
                }
              }
            }
          }
        }),
        
        invokeLLM({
          prompt: `Create a case study for "${subunit.subunit_name}" with 4 free-response questions and expected answers.

Context: ${videoTranscript}

Return JSON:
{
  "scenario": "Realistic scenario with specific values...",
  "question_a": "(a) Calculate...",
  "answer_a": "Expected answer...",
  "question_b": "(b) Determine...",
  "answer_b": "Expected answer...",
  "question_c": "(c) If condition changes...",
  "answer_c": "Expected answer...",
  "question_d": "(d) A student claims... Explain why...",
  "answer_d": "Expected answer..."
}`,
          response_json_schema: {
            type: "object",
            properties: {
              scenario: { type: "string" },
              question_a: { type: "string" },
              answer_a: { type: "string" },
              question_b: { type: "string" },
              answer_b: { type: "string" },
              question_c: { type: "string" },
              answer_c: { type: "string" },
              question_d: { type: "string" },
              answer_d: { type: "string" }
            }
          }
        })
      ]);

      console.log(`  ✓ All content generated`);

      // Generate the hook image
      console.log(`  🎨 Generating hook image...`);
      const imageResult = await generateImage({
        prompt: inquiryContent.hook_image_prompt
      });
      console.log(`  ✓ Hook image generated`);

      // Save inquiry session to MongoDB
     // Save inquiry session to MongoDB
console.log(`  💾 Saving inquiry session...`);
const inquiryResponse = await fetch(`${API_BASE}/api/inquiry-sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subunit_id: subunit._id,
    video_id: video._id,
    hook_image_prompt: inquiryContent.hook_image_prompt,
    hook_image_url: imageResult.url,
    hook_question: inquiryContent.hook_question,
    relevant_past_memories: inquiryContent.relevant_past_memories || [],
    socratic_system_prompt: inquiryContent.socratic_system_prompt,
    tutor_first_message: inquiryContent.tutor_first_message
  })
});

if (!inquiryResponse.ok) {
  const errorText = await inquiryResponse.text();
  throw new Error(`Failed to save inquiry session: ${inquiryResponse.status} - ${errorText}`);
}

console.log(`  ✓ Inquiry session saved`);B
      console.log(`  💾 Saving quizzes...`);
      const [newTopicQuizRes, reviewQuizRes] = await Promise.all([
        fetch(`${API_BASE}/api/quizzes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subunit_id: subunit._id, quiz_type: "new_topic" })
        }),
        fetch(`${API_BASE}/api/quizzes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subunit_id: subunit._id, quiz_type: "review" })
        })
      ]);

      const newTopicQuiz = await newTopicQuizRes.json();
      const reviewQuiz = await reviewQuizRes.json();

      // Create questions in smaller batches to avoid network overload
      console.log(`  💾 Saving questions (${questionsData.questions?.length || 0} per quiz)...`);
      const questions = questionsData.questions || [];
      
      // Process sequentially to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        
        // Create new topic quiz questions
        for (const q of batch) {
          try {
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: newTopicQuiz._id, ...q })
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`  ⚠️ Error creating question, retrying...`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: newTopicQuiz._id, ...q })
            });
          }
        }
        
        // Create review quiz questions
        for (const q of batch) {
          try {
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: reviewQuiz._id, ...q })
            });
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (err) {
            console.error(`  ⚠️ Error creating question, retrying...`, err);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await fetch(`${API_BASE}/api/questions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ quiz_id: reviewQuiz._id, ...q })
            });
          }
        }
        
        // Delay between batches
        if (i + batchSize < questions.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      console.log(`  ✓ Both quizzes saved (${questions.length} questions each)`);

      // Save case study to MongoDB
      console.log(`  💾 Saving case study...`);
      await fetch(`${API_BASE}/api/case-studies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subunit_id: subunit._id,
          video_id: video._id,
          scenario: caseStudyContent.scenario,
          question_a: caseStudyContent.question_a,
          answer_a: caseStudyContent.answer_a || "",
          question_b: caseStudyContent.question_b,
          answer_b: caseStudyContent.answer_b || "",
          question_c: caseStudyContent.question_c,
          answer_c: caseStudyContent.answer_c || "",
          question_d: caseStudyContent.question_d,
          answer_d: caseStudyContent.answer_d || ""
        })
      });
      console.log(`  ✓ Case study saved`);

      // Save attention checks to MongoDB in parallel
      console.log(`  💾 Saving attention checks...`);
      await Promise.all(attentionChecks.map(check => 
        fetch(`${API_BASE}/api/attention-checks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            video_id: video._id,
            timestamp: check.timestamp,
            question: check.question,
            choice_a: check.choice_a,
            choice_b: check.choice_b,
            choice_c: check.choice_c,
            choice_d: check.choice_d,
            correct_choice: check.correct_choice,
            check_order: check.check_order
          })
        })
      ));
      console.log(`  ✓ Attention checks saved (${attentionChecks.length} checks)`);
      
      console.log(`✅ COMPLETED all 4-phase content for: ${subunit.subunit_name}\n`);

    } catch (error) {
      console.error(`\n❌ ERROR in ${subunit.subunit_name}:`, error);
      console.error('Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 text-xl mb-4">Curriculum not found</p>
          <Button onClick={() => navigate(createPageUrl("TeacherCurricula"))}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Curricula
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div className="max-w-7xl mx-auto" style={{ fontFamily: '"Inter", sans-serif' }}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("TeacherCurricula"))}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-black">{curriculum?.subject_name}</h1>
                <p className="text-gray-600">Add videos and content to your curriculum</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {subunits.some(s => getSubunitStatus(s._id) === "video_only") && (
              <Button
                onClick={handleGenerateAll}
                disabled={generatingQueue}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 px-4 py-2 text-sm font-semibold shadow-lg"
              >
                <Sparkles className="w-4 h-4" />
                Generate Content
              </Button>
            )}
            <Button
              onClick={() => navigate(createPageUrl("TeacherCurricula"))}
              style={{ backgroundColor: '#16a34a' }}
              className="hover:opacity-90 text-white gap-2 px-4 py-2 text-sm font-semibold shadow-lg"
            >
              <CheckCircle className="w-4 h-4" />
              Complete
            </Button>
          </div>
        </div>

        {units.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Units Found</h3>
              <p className="text-gray-600">This curriculum doesn't have any units yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {units.map((unit) => {
              const unitSubunits = subunits.filter(s => s.unit_id === unit._id);
              const completedCount = unitSubunits.filter(s => getSubunitStatus(s._id) === "complete").length;

              return (
                <Card key={unit._id} className="border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 bg-white overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{unit.unit_name}</h2>
                        <p className="text-sm text-gray-600">
                          {completedCount} of {unitSubunits.length} subunits completed
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {unitSubunits.length > 0 ? Math.round((completedCount / unitSubunits.length) * 100) : 0}%
                        </div>
                      </div>
                    </div>

                    <div className="h-3 bg-blue-100 rounded-full mb-6 shadow-inner">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all shadow-lg"
                        style={{ width: `${unitSubunits.length > 0 ? (completedCount / unitSubunits.length) * 100 : 0}%` }}
                      />
                    </div>

                    {unitSubunits.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No subunits in this unit</p>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unitSubunits.map((subunit) => {
                          const status = getSubunitStatus(subunit._id);
                          return (
                            <div
                              key={subunit._id}
                              className={`p-4 rounded-lg border-2 transition-all ${
                                status === "complete"
                                  ? "bg-green-50 border-green-300"
                                  : status === "video_only"
                                  ? "bg-blue-50 border-blue-300"
                                  : "bg-gray-50 border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold text-gray-900 text-sm">{subunit.subunit_name}</h3>
                                {status === "complete" ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                ) : status === "video_only" ? (
                                  <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                ) : (
                                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                              
                              <Button
                                onClick={() => status === "complete" ? handleReviewContent(subunit) : handleAddVideo(subunit)}
                                size="sm"
                                disabled={generatingQueue}
                                className={`w-full shadow-lg ${
                                  status === "complete" 
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                                    : status === "video_only"
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-gray-600 hover:bg-gray-700 text-white"
                                }`}
                              >
                                {status === "complete" ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Review Content
                                  </>
                                ) : (
                                  <>
                                    <Video className="w-4 h-4 mr-2" />
                                    {status === "video_only" ? "Video Added" : "Add Video"}
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showVideoModal && selectedSubunit && (
        <VideoOnlyModal
          subunit={selectedSubunit}
          curriculumName={curriculum?.subject_name}
          onClose={() => setShowVideoModal(false)}
          onVideoAdded={handleVideoAdded}
        />
      )}

      {showReviewModal && selectedSubunit && reviewContent && (
        <ContentReviewModal
          subunit={selectedSubunit}
          content={reviewContent}
          onClose={() => setShowReviewModal(false)}
          onSave={handleContentSaved}
        />
      )}

      {generatingQueue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Loader2 className="w-16 h-16 animate-spin text-purple-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Generating Content</h3>
                <p className="text-gray-600">Please wait while Quest generates learning materials...</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">Overall Progress</span>
                  <span className="text-sm font-medium text-gray-900">{queueProgress.current} of {queueProgress.total} completed</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 rounded-full transition-all duration-500" 
                    style={{ width: `${(queueProgress.current / queueProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Estimated time remaining: {Math.ceil((queueProgress.total - queueProgress.current) * 1.5)} minutes
                </p>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Content Queue</h4>
                {subunits.filter(sub => getSubunitStatus(sub._id) === "video_only").map((sub, index) => {
                  const isCurrent = index === queueProgress.current;
                  const isPending = index > queueProgress.current;

                  // Only show current and pending items (completed ones disappear)
                  if (index < queueProgress.current) return null;

                  return (
                    <div 
                      key={sub._id}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isCurrent ? 'bg-blue-50 border-blue-300' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          isCurrent ? 'text-blue-700' :
                          'text-gray-600'
                        }`}>
                          {sub.subunit_name}
                        </span>
                        {isCurrent && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                        {isPending && <Clock className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}