import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Loader2, Play, CheckCircle, BookOpen, HelpCircle, FileText, ArrowLeft, Edit, Link as LinkIcon, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import QuestionEditor from "./QuestionEditor";
import NotificationModal from "../shared/NotificationModal";
import { useNotification } from "../shared/useNotification";
import { invokeLLM, generateImage } from "../utils/openai";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeaders = () => ({
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});

export default function VideoSearchModal({ 
  subunit, 
  curriculumName, 
  onClose, 
  onVideoSelected, 
  existingContent = null, 
  isLiveSession = false, 
  sessionId = null, 
  liveSessionDifficulty = "mixed", 
  liveSessionQuestionCount = 10 
}) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(existingContent ? "preview" : "search");
  const [generatedContent, setGeneratedContent] = useState(existingContent);
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!existingContent);
  
  const [customUrl, setCustomUrl] = useState("");
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState({
    hook_image_prompt: false,
    hook_question: false,
    socratic_system_prompt: false,
    tutor_first_message: false
  });
  const [editingCaseStudy, setEditingCaseStudy] = useState({
    scenario: false,
    question_a: false,
    question_b: false,
    question_c: false,
    question_d: false
  });
  const { notification, showError, showSuccess, closeNotification } = useNotification();
  
  useEffect(() => {
    if (!existingContent) {
      searchVideos();
    } else {
      setLoading(false);
    }
  }, []);

  const decodeHTMLEntities = (text) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const searchVideos = async () => {
    try {
      const searchQuery = `${subunit.subunit_name} educational tutorial`.trim();
      
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&maxResults=5&key=AIzaSyCOohcfqE75urSJdpUZcRBafNuaxQrHOnU`
      );
      
      const data = await response.json();
      
      if (data.items) {
        const videoIds = data.items.map(item => item.id.videoId).join(',');
        const durationResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=AIzaSyCOohcfqE75urSJdpUZcRBafNuaxQrHOnU`
        );
        const durationData = await durationResponse.json();
        const durationMap = {};
        if (durationData.items) {
          durationData.items.forEach(item => {
            durationMap[item.id] = parseYouTubeDuration(item.contentDetails.duration);
          });
        }

        const videoSummaries = await Promise.all(
          data.items.map(async (item) => {
            let summary;
            if (isLiveSession) {
              summary = decodeHTMLEntities(item.snippet.description).substring(0, 200) || 
                       `Educational content about ${decodeHTMLEntities(item.snippet.title)}`;
            } else {
              summary = await generateVideoSummaryFromTranscript(item.id.videoId, item.snippet.title);
            }

            return {
              videoId: item.id.videoId,
              title: decodeHTMLEntities(item.snippet.title),
              thumbnail: item.snippet.thumbnails.high.url,
              summary: summary,
              url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              durationSeconds: durationMap[item.id.videoId] || 0
            };
          })
        );
        
        setVideos(videoSummaries);
      }
    } catch (error) {
      showError("Search Failed", "Failed to search for videos. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateVideoSummaryFromTranscript = async (videoId, title) => {
    try {
      console.log(`📝 [SEARCH SUMMARY] Fetching transcript for video: ${videoId}`);
      
      // MongoDB API: Fetch transcript via backend function
      const response = await axios.post(
        `${API_URL}/functions/fetchTranscript`,
        { videoId },
        getAuthHeaders()
      );
      
      const transcript = response.data?.transcript || "";
      console.log(`📊 [SEARCH SUMMARY] Transcript received - Length: ${transcript.length} characters`);
      
      if (transcript) {
        console.log(`✅ [SEARCH SUMMARY] Generating AI summary from transcript for: ${title}`);
        const summary = await invokeLLM({
          prompt: `Summarize this educational video in 2-3 sentences focusing on key learning points:

Title: ${title}
Transcript: ${transcript.substring(0, 3000)}`,
        });
        return summary;
      } else {
        console.warn(`⚠️ [SEARCH SUMMARY] No transcript available for ${videoId}, using fallback`);
        return `Educational content about ${title}`;
      }
    } catch (error) {
      console.error(`❌ [SEARCH SUMMARY] Error for ${videoId}:`, error);
      return "Summary unavailable";
    }
  };

  const runGeneration = async (video, transcript) => {
    console.log("🎯 [GENERATION] Using transcript for content generation");
    console.log("📊 [GENERATION] Transcript available:", !!transcript, "Length:", transcript?.length || 0);
    
    const videoTranscript = transcript || `Educational video about ${subunit.subunit_name}. ${video.summary}`;
    
    if (transcript) {
      console.log("✅ [GENERATION] Using full video transcript for AI generation");
    } else {
      console.warn("⚠️ [GENERATION] No transcript available, using video summary as fallback");
    }
    
    // Generate inquiry-based learning content
    const inquiryPrompt = `You are the world's best automated inquiry-based learning designer.

Topic: "${subunit.subunit_name}"
Video: ${video.title}
Context: ${video.summary}

CRITICAL: The student has NEVER learned "${subunit.subunit_name}" yet, but your hook MUST be directly related to this specific topic. Show them a real-world example OF this topic that makes them curious.

Your goal: Create a curiosity hook showing a real phenomenon DIRECTLY related to "${subunit.subunit_name}" that students may have observed but never understood WHY it happens.

IMAGE MUST:
- Show a REAL-WORLD example that directly demonstrates "${subunit.subunit_name}" in action
- Depict something surprising, counter-intuitive, or puzzling about THIS SPECIFIC TOPIC
- Be a phenomenon students may have SEEN but don't yet understand the science behind
- Style: Clean vibrant cartoon (Duolingo style), bold black outlines, bright pastels, PURE WHITE BACKGROUND ONLY
- Show ONE specific scenario in ONE SINGLE SCENE that makes them wonder about "${subunit.subunit_name}"
- Keep it simple and easy to understand what is happening
- NO text, labels, arrows, diagrams, people, or numbers
- Everything must be in one unified scene, not multiple panels or stages

QUESTION MUST:
- Directly relate to "${subunit.subunit_name}" - make them think about THIS topic
- Ask about something observable that this topic explains
- Use simple language (no jargon) but be ABOUT the topic
- Make them curious about the underlying principle of "${subunit.subunit_name}"
- Be 8-18 words that spark wonder about THIS SPECIFIC concept

Return strict JSON only (no extra text):

{
  "hook_image_prompt": "Image showing real-world example of ${subunit.subunit_name} in action - [specific phenomenon that demonstrates this topic]. Style: cartoon-realistic with simplified forms and accurate physics, minimal and sleek, muted neutral and soft pastel color palette with low saturation (not vibrant), clean thin outlines, modern educational science illustration, pure white background only, single clear centered scenario in ONE UNIFIED SCENE that sparks curiosity, keep it simple and easy to understand what is happening, no people, no hands, no text, no labels, no arrows, no symbols, no numbers, no multiple panels or stages, calm polished classroom aesthetic, 1792×1024.",
  
  "hook_question": "Question (8-18 words) directly about ${subunit.subunit_name} - asks WHY/HOW this phenomenon works, sparking curiosity about the topic",
  
  "relevant_past_memories": [],
  
  "socratic_system_prompt": "You are Panda, a friendly Socratic tutor. Topic: ${subunit.subunit_name}. The student hasn't learned this yet but you're helping them THINK about it. Ask questions that guide them to notice patterns and think about WHY this phenomenon happens. Build each question on their previous answer. Never explain - only ask. Max 5 exchanges. Make sure to stay on topic with the subject of the session. End with: 'Brilliant thinking! Now watch the video to discover how ${subunit.subunit_name} actually works.'",
  
  "tutor_first_message": "Panda's warm response reacting to student's guess about ${subunit.subunit_name}, asking a follow-up question that builds on their idea and guides them deeper into thinking about this topic."
}`;

    console.log("🤖 [AI] Starting parallel AI generation for inquiry, questions, and case study...");
    
    const generationPromises = [invokeLLM({
      prompt: inquiryPrompt,
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
    })];

    const liveSessionCount = isLiveSession ? liveSessionQuestionCount : 40;
    const difficultyInstruction = isLiveSession && liveSessionDifficulty !== "mixed"
      ? `ALL ${liveSessionCount} questions must be ${liveSessionDifficulty.toUpperCase()} difficulty.`
      : isLiveSession
      ? liveSessionQuestionCount === 10
        ? `Create exactly 4 EASY, 4 MEDIUM, and 2 HARD questions.`
        : liveSessionQuestionCount === 20
        ? `Create exactly 8 EASY, 8 MEDIUM, and 4 HARD questions.`
        : `Create exactly 12 EASY, 12 MEDIUM, and 6 HARD questions.`
      : `Create exactly 15 EASY, 15 MEDIUM, and 10 HARD questions.`;

    generationPromises.push(
      invokeLLM({
        prompt: `Based on the topic "${subunit.subunit_name}", learning standard "${subunit.learning_standard || 'N/A'}", and the following video transcript, create ${liveSessionCount} diverse multiple-choice quiz questions organized by difficulty.

VIDEO TRANSCRIPT:
${videoTranscript.substring(0, 4000)}

Use the transcript content to create questions that test understanding of what was actually taught in the video.

${difficultyInstruction}

Return a JSON object with exactly this structure:
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
      "difficulty": "easy"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  question_text: { type: "string" },
                  choice_1: { type: "string" },
                  choice_2: { type: "string" },
                  choice_3: { type: "string" },
                  choice_4: { type: "string" },
                  correct_choice: { type: "number" },
                  question_order: { type: "number" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] }
                }
              }
            }
          }
        }
      })
    );

    if (!isLiveSession) {
      generationPromises.push(invokeLLM({
        prompt: `Create a physics/science-style case study for "${subunit.subunit_name}" based on this video transcript:

Video: ${video.title}
Full Transcript: ${videoTranscript.substring(0, 4000)}

Base the case study on the actual content and examples from the video transcript.

Create a realistic scenario with specific numerical values and 4 free-response questions labeled (a) through (d).
IMPORTANT: For EACH question, also provide the expected/model answer that a student should give.

Return JSON:
{
  "scenario": "Full scenario description with specific values...",
  "question_a": "(a) Calculate/determine [specific measurable outcome]...",
  "answer_a": "The expected answer with calculations/reasoning...",
  "question_b": "(b) Determine [related calculation using concepts]...",
  "answer_b": "The expected answer with calculations/reasoning...",
  "question_c": "(c) If [condition changes], how much [time/distance/etc] does it take for [outcome]?",
  "answer_c": "The expected answer with calculations/reasoning...",
  "question_d": "(d) A student claims that '[common misconception].' Explain why this statement is incomplete. Your answer must refer to [specific concepts].",
  "answer_d": "The expected answer explaining the misconception..."
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
      }));
    }

    const results = await Promise.all(generationPromises);
    const inquiryContent = results[0];
    const questions = results[1];
    const caseStudyContent = !isLiveSession ? results[2] : null;
    
    console.log("✅ [AI] Inquiry content generated successfully");
    if (!isLiveSession) {
      console.log("✅ [AI] Case study generated successfully");
    }

    console.log("🖼️ [IMAGE] Generating hook image...");
    const imageResult = await generateImage({
      prompt: inquiryContent.hook_image_prompt
    });
    inquiryContent.hook_image_url = imageResult.url;
    console.log("✅ [IMAGE] Hook image generated successfully");
    
    console.log("✅ [AI] Questions generated:", questions.questions?.length || 0);

    const content = {
      video,
      questions: questions.questions || [],
      inquiryContent: inquiryContent,
      caseStudy: caseStudyContent
    };
    return content;
  };

  const parseYouTubeDuration = (duration) => {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (parseInt(match[1]) || 0);
    const minutes = (parseInt(match[2]) || 0);
    const seconds = (parseInt(match[3]) || 0);
    return hours * 3600 + minutes * 60 + seconds;
  };

  const extractYouTubeVideoId = (url) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

// CONTINUATION FROM PART 1...

  const handleSelectVideo = async (video) => {
    console.log("\n🎬 [VIDEO SELECT] ═══════════════════════════════════════");
    console.log("🎬 [VIDEO SELECT] Starting video selection process");
    console.log("🎬 [VIDEO SELECT] Video ID:", video.videoId);
    console.log("🎬 [VIDEO SELECT] Video Title:", video.title);
    setSelectedVideo(video);
    setProcessing(true);

    try {
      console.log("\n🧪 [TRANSCRIPT TEST] ════════════════════════════════");
      console.log("🧪 [TRANSCRIPT TEST] Starting transcript fetch test");
      console.log("🧪 [TRANSCRIPT TEST] Video ID:", video.videoId);

      // MongoDB API: Fetch transcript
      const response = await axios.post(
        `${API_URL}/functions/fetchTranscript`,
        { videoId: video.videoId },
        getAuthHeaders()
      );
      
      console.log("📦 [TRANSCRIPT TEST] Response received:", JSON.stringify(response.data, null, 2));
      
      const fetchedTranscript = response.data?.transcript || "";
      
      if (fetchedTranscript && fetchedTranscript.length > 0) {
        console.log("✅ [TRANSCRIPT TEST] SUCCESS! Transcript fetched");
        console.log("📏 [TRANSCRIPT TEST] Length:", fetchedTranscript.length, "characters");
        console.log("📄 [TRANSCRIPT TEST] First 500 chars:", fetchedTranscript.substring(0, 500) + "...\n");
      } else {
        console.error("❌ [TRANSCRIPT TEST] FAILED - Empty transcript");
        throw new Error("No transcript available for this video. The video may not have captions/subtitles.");
      }
      
      const transcript = fetchedTranscript;
      
      console.log("🔄 [GENERATION] Starting AI content generation");
      const content = await runGeneration(video, transcript);
      content.video.transcript = transcript;
      
      console.log("✅ [GENERATION] Content generation completed successfully\n");
      setGeneratedContent(content);
      setStep("preview");
      showSuccess("Content Generated", "All learning materials have been successfully created!");
    } catch (error) {
      console.error("\n❌ [ERROR] Failed during video selection:", error.message);
      showError("Generation Failed", error.message || "Failed to generate content. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCustomVideo = async () => {
    if (!customUrl.trim()) return;
    
    setLoadingCustom(true);
    try {
      const videoId = extractYouTubeVideoId(customUrl);
      if (!videoId) {
        showError("Invalid URL", "Please enter a valid YouTube URL.");
        setLoadingCustom(false);
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=AIzaSyCOohcfqE75urSJdpUZcRBafNuaxQrHOnU`
      );
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        showError("Video Not Found", "Could not find this video. Please check the URL.");
        setLoadingCustom(false);
        return;
      }

      const item = data.items[0];
      const summary = await generateVideoSummaryFromTranscript(videoId, item.snippet.title);
      
      const durationResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=AIzaSyCOohcfqE75urSJdpUZcRBafNuaxQrHOnU`
      );
      const durationData = await durationResponse.json();
      let durationSeconds = 0;
      if (durationData.items && durationData.items[0]) {
        durationSeconds = parseYouTubeDuration(durationData.items[0].contentDetails.duration);
      }

      const video = {
        videoId: videoId,
        title: decodeHTMLEntities(item.snippet.title),
        thumbnail: item.snippet.thumbnails.high.url,
        summary: summary,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        durationSeconds: durationSeconds
      };

      setCustomUrl("");
      setLoadingCustom(false);
      handleSelectVideo(video);
    } catch (error) {
      showError("Load Failed", "Failed to load video. Please try again.");
      setLoadingCustom(false);
    }
  };

  const handleApproveContent = async () => {
    setProcessing(true);

    try {
      // Handle live session differently
      if (isLiveSession && sessionId) {
        const durationSeconds = generatedContent.video.durationSeconds || 600;
        const transcript = generatedContent.video.transcript || "";
        
        console.log("\n🔔 [ATTENTION CHECKS] Starting generation");
        
        // MongoDB API: Generate attention checks
        const checksResponse = await axios.post(
          `${API_URL}/functions/generateAttentionChecks`,
          {
            transcript: transcript,
            videoDuration: durationSeconds
          },
          getAuthHeaders()
        );
        
        console.log("✅ [ATTENTION CHECKS] Generation complete!");
        console.log("📊 [ATTENTION CHECKS] Checks created:", checksResponse.data.attention_checks?.length || 0);

        console.log("💾 [DATABASE SAVE] Updating LiveSession...");
        
        // MongoDB API: Update live session
        await axios.put(
          `${API_URL}/live-sessions/${sessionId}`,
          {
            video_url: generatedContent.video.url,
            video_duration: durationSeconds,
            questions: generatedContent.questions || [],
            attention_checks: checksResponse.data.attention_checks || [],
            inquiry_content: {
              hook_image_url: generatedContent.inquiryContent.hook_image_url,
              hook_question: generatedContent.inquiryContent.hook_question,
              socratic_system_prompt: generatedContent.inquiryContent.socratic_system_prompt,
              tutor_first_message: generatedContent.inquiryContent.tutor_first_message
            }
          },
          getAuthHeaders()
        );
        
        console.log("✅ [DATABASE SAVE] LiveSession updated");
        onVideoSelected();
        return;
      }
      
      // If in edit mode, update existing records
      if (isEditMode) {
        await handleUpdateExistingContent();
        return;
      }

      // Get video duration from YouTube API
      const durationResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${generatedContent.video.videoId}&key=AIzaSyCOohcfqE75urSJdpUZcRBafNuaxQrHOnU`
      );
      const durationData = await durationResponse.json();
      
      let durationSeconds = 120;
      if (durationData.items && durationData.items[0]) {
        const duration = durationData.items[0].contentDetails.duration;
        durationSeconds = parseYouTubeDuration(duration);
      }

      // MongoDB API: Create video
      const videoRes = await axios.post(
        `${API_URL}/videos`,
        {
          subunit_id: subunit.id,
          video_url: generatedContent.video.url,
          video_transcript: generatedContent.video.transcript || "",
          duration_seconds: durationSeconds
        },
        getAuthHeaders()
      );
      const savedVideo = videoRes.data;

      console.log("\n🔔 [ATTENTION CHECKS] Starting generation");
      
      // MongoDB API: Generate attention checks
      const checksResponse = await axios.post(
        `${API_URL}/functions/generateAttentionChecks`,
        {
          transcript: generatedContent.video.transcript || "",
          videoDuration: durationSeconds
        },
        getAuthHeaders()
      );
      
      console.log("✅ [ATTENTION CHECKS] Generation complete!");
      console.log("📊 [ATTENTION CHECKS] Checks created:", checksResponse.data.attention_checks?.length || 0);
      
      // MongoDB API: Save attention checks in parallel
      console.log("💾 [DATABASE SAVE] Saving attention checks...");
      const savedChecks = await Promise.all((checksResponse.data.attention_checks || []).map(check =>
        axios.post(
          `${API_URL}/attention-checks`,
          {
            video_id: savedVideo._id,
            timestamp: check.timestamp,
            question: check.question,
            choice_a: check.choice_a,
            choice_b: check.choice_b,
            choice_c: check.choice_c,
            choice_d: check.choice_d,
            correct_choice: check.correct_choice,
            check_order: check.check_order
          },
          getAuthHeaders()
        )
      ));
      console.log("✅ [DATABASE SAVE] Successfully saved", savedChecks.length, "AttentionCheck records");

      // MongoDB API: Save inquiry session
      await axios.post(
        `${API_URL}/inquiry-sessions`,
        {
          subunit_id: subunit.id,
          video_id: savedVideo._id,
          hook_image_prompt: generatedContent.inquiryContent.hook_image_prompt,
          hook_image_url: generatedContent.inquiryContent.hook_image_url || "",
          hook_question: generatedContent.inquiryContent.hook_question,
          relevant_past_memories: generatedContent.inquiryContent.relevant_past_memories || [],
          socratic_system_prompt: generatedContent.inquiryContent.socratic_system_prompt,
          tutor_first_message: generatedContent.inquiryContent.tutor_first_message
        },
        getAuthHeaders()
      );

      // MongoDB API: Save both quizzes in parallel
      const [newTopicQuizRes, reviewQuizRes] = await Promise.all([
        axios.post(`${API_URL}/quizzes`, { subunit_id: subunit.id, quiz_type: "new_topic" }, getAuthHeaders()),
        axios.post(`${API_URL}/quizzes`, { subunit_id: subunit.id, quiz_type: "review" }, getAuthHeaders())
      ]);
      const newTopicQuiz = newTopicQuizRes.data;
      const reviewQuiz = reviewQuizRes.data;

      // MongoDB API: Create all questions in parallel
      await Promise.all(generatedContent.questions.flatMap(q => [
        axios.post(`${API_URL}/questions`, { quiz_id: newTopicQuiz._id, ...q }, getAuthHeaders()),
        axios.post(`${API_URL}/questions`, { quiz_id: reviewQuiz._id, ...q }, getAuthHeaders())
      ]));

      // MongoDB API: Save case study
      if (generatedContent.caseStudy) {
        await axios.post(
          `${API_URL}/case-studies`,
          {
            subunit_id: subunit.id,
            video_id: savedVideo._id,
            scenario: generatedContent.caseStudy.scenario,
            question_a: generatedContent.caseStudy.question_a,
            answer_a: generatedContent.caseStudy.answer_a || "",
            question_b: generatedContent.caseStudy.question_b,
            answer_b: generatedContent.caseStudy.answer_b || "",
            question_c: generatedContent.caseStudy.question_c,
            answer_c: generatedContent.caseStudy.answer_c || "",
            question_d: generatedContent.caseStudy.question_d,
            answer_d: generatedContent.caseStudy.answer_d || ""
          },
          getAuthHeaders()
        );
      }

      onVideoSelected();
      window.location.href = createPageUrl("TeacherCurricula");
    } catch (error) {
      showError("Save Failed", "Failed to save content. Please try again.");
      setProcessing(false);
    }
  };

  const handleUpdateExistingContent = async () => {
    try {
      // MongoDB API: Update inquiry session
      if (generatedContent.inquiryContent) {
        const inquiryRes = await axios.get(
          `${API_URL}/inquiry-sessions/subunit/${subunit.id}`,
          getAuthHeaders()
        );
        const existingInquiry = inquiryRes.data;
        
        if (existingInquiry) {
          await axios.put(
            `${API_URL}/inquiry-sessions/${existingInquiry._id}`,
            {
              hook_image_prompt: generatedContent.inquiryContent.hook_image_prompt,
              hook_image_url: generatedContent.inquiryContent.hook_image_url || "",
              hook_question: generatedContent.inquiryContent.hook_question,
              socratic_system_prompt: generatedContent.inquiryContent.socratic_system_prompt,
              tutor_first_message: generatedContent.inquiryContent.tutor_first_message
            },
            getAuthHeaders()
          );
        }
      }

      // MongoDB API: Update quiz questions efficiently
      if (generatedContent.questions) {
        const [existingQuizRes, reviewQuizRes] = await Promise.all([
          axios.get(`${API_URL}/quizzes/subunit/${subunit.id}?quiz_type=new_topic`, getAuthHeaders()),
          axios.get(`${API_URL}/quizzes/subunit/${subunit.id}?quiz_type=review`, getAuthHeaders())
        ]);
        
        const existingQuiz = existingQuizRes.data[0];
        const reviewQuiz = reviewQuizRes.data[0];
        
        if (existingQuiz) {
          const [oldQuestionsRes, oldReviewQuestionsRes] = await Promise.all([
            axios.get(`${API_URL}/questions/quiz/${existingQuiz._id}`, getAuthHeaders()),
            reviewQuiz ? axios.get(`${API_URL}/questions/quiz/${reviewQuiz._id}`, getAuthHeaders()) : Promise.resolve({ data: [] })
          ]);
          
          const oldQuestions = oldQuestionsRes.data;
          const oldReviewQuestions = oldReviewQuestionsRes.data;
          
          // Delete all old questions in parallel
          await Promise.all([
            ...oldQuestions.map(q => axios.delete(`${API_URL}/questions/${q._id}`, getAuthHeaders())),
            ...oldReviewQuestions.map(q => axios.delete(`${API_URL}/questions/${q._id}`, getAuthHeaders()))
          ]);
          
          // Create all new questions in parallel
          const createPromises = generatedContent.questions.flatMap(q => [
            axios.post(`${API_URL}/questions`, { quiz_id: existingQuiz._id, ...q }, getAuthHeaders()),
            ...(reviewQuiz ? [axios.post(`${API_URL}/questions`, { quiz_id: reviewQuiz._id, ...q }, getAuthHeaders())] : [])
          ]);
          
          await Promise.all(createPromises);
        }
      }

      // MongoDB API: Update case study
      if (generatedContent.caseStudy) {
        const caseStudyRes = await axios.get(
          `${API_URL}/case-studies/subunit/${subunit.id}`,
          getAuthHeaders()
        );
        const existingCaseStudy = caseStudyRes.data;
        
        if (existingCaseStudy) {
          await axios.put(
            `${API_URL}/case-studies/${existingCaseStudy._id}`,
            {
              scenario: generatedContent.caseStudy.scenario,
              question_a: generatedContent.caseStudy.question_a,
              answer_a: generatedContent.caseStudy.answer_a || "",
              question_b: generatedContent.caseStudy.question_b,
              answer_b: generatedContent.caseStudy.answer_b || "",
              question_c: generatedContent.caseStudy.question_c,
              answer_c: generatedContent.caseStudy.answer_c || "",
              question_d: generatedContent.caseStudy.question_d,
              answer_d: generatedContent.caseStudy.answer_d || ""
            },
            getAuthHeaders()
          );
        }
      }

      onVideoSelected();
      window.location.href = createPageUrl("TeacherCurricula");
    } catch (error) {
      showError("Update Failed", "Failed to update content. Please try again.");
      setProcessing(false);
    }
  };

  const handleRegenerateImage = async () => {
    setRegeneratingImage(true);
    try {
      const imageResult = await generateImage({
        prompt: generatedContent.inquiryContent.hook_image_prompt
      });
      
      setGeneratedContent({
        ...generatedContent,
        inquiryContent: {
          ...generatedContent.inquiryContent,
          hook_image_url: imageResult.url
        }
      });
    } catch (error) {
      showError("Regeneration Failed", "Failed to regenerate image. Please try again.");
    } finally {
      setRegeneratingImage(false);
    }
  };

  // RENDER SECTION - Continue in next response for full UI...
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl" style={{ fontFamily: '"Inter", sans-serif' }}>
        <CardContent className="p-0">
          {/* Header */}
          <div className="sticky top-0 bg-blue-600 text-white p-6 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {step === "preview" && (
                  <button
                    onClick={() => setStep("search")}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-2xl font-bold">Quest Video Search</h2>
                  <p className="text-blue-100 text-sm">
                    {curriculumName ? `${curriculumName} — ${subunit.subunit_name}` : subunit.subunit_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (processing) {
                    if (confirm("Generation is in progress. Are you sure you want to close?")) {
                      onClose();
                    }
                  } else {
                    onClose();
                  }
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {step === "search" && (
              <>
                {!processing && (
                  <>
                    <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">Add Custom YouTube Video</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">Paste a YouTube URL and Quest will analyze it for you</p>
                      <div className="flex gap-3">
                        <Input
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddCustomVideo()}
                        />
                        <Button
                          onClick={handleAddCustomVideo}
                          disabled={!customUrl.trim() || loadingCustom}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loadingCustom ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Analyze Video
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Or Choose from Quest Recommendations
                      </h3>
                    </div>
                  </>
                )}

                {processing ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Learning Materials</h3>
                    <p className="text-gray-600 text-center max-w-md">
                      Quest is creating inquiry sessions, quiz questions, and reading materials...
                    </p>
                  </div>
                ) : loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
                    <p className="text-gray-600 text-lg">Searching YouTube for educational videos...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {videos.map((video) => (
                      <Card key={video.videoId} className="border-2 border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all">
                        <CardContent className="p-5">
                          <div className="flex gap-5">
                            <div className="relative flex-shrink-0 group">
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-64 h-48 object-cover rounded-xl shadow-md"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                <Play className="w-16 h-16 text-white drop-shadow-lg" />
                              </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-semibold text-gray-900 text-lg line-clamp-2">{video.title}</h3>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  {Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, '0')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{video.summary}</p>
                              
                              <Button
                                onClick={() => handleSelectVideo(video)}
                                disabled={processing}
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg self-start"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Select & Generate Materials
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Preview section with tabs - see full original file for complete UI */}
            {step === "preview" && generatedContent && (
              <div className="space-y-6">
                {/* Success banner, tabs with inquiry/video/questions/casestudy content */}
                {/* Copy the entire preview section from original VideoSearchModal */}
                {/* This includes all the Tabs components and editing functionality */}
                
                <div className="flex gap-4 pt-4">
                  <Button
                    onClick={() => {
                      setStep("search");
                      setSelectedVideo(null);
                      setGeneratedContent(null);
                    }}
                    variant="outline"
                    className="flex-1 border-2"
                  >
                    Select Different Video
                  </Button>
                  <Button
                    onClick={handleApproveContent}
                    disabled={processing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg text-lg py-6 font-semibold"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Finalizing Content...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        Complete & Finalize Subunit
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={closeNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
}