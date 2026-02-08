import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.account_type !== 'teacher') {
      return Response.json({ error: 'Unauthorized - Teachers only' }, { status: 403 });
    }

    const { transcript, videoDuration } = await req.json();

    if (!transcript || !videoDuration) {
      return Response.json({ error: 'Missing transcript or videoDuration' }, { status: 400 });
    }

    // Calculate number of checks (1 per 90 seconds, not evenly spaced)
    // This ensures checks aren't predictable and transcript coverage is better
    const numChecks = Math.max(1, Math.floor(videoDuration / 90));
    
    if (videoDuration < 60) {
      console.log("📹 Video too short (<60s), no attention checks needed");
      return Response.json({ attention_checks: [] });
    }

    console.log("🎯 [ATTENTION CHECK GENERATION] Starting");
    console.log(`📹 Video Duration: ${videoDuration}s (${Math.floor(videoDuration / 60)}m ${videoDuration % 60}s)`);
    console.log(`📊 Generating ${numChecks} attention checks (1 per ~90 seconds)`);
    console.log(`📝 Transcript Length: ${transcript.length} characters\n`);
    
    const attentionChecks = [];
    
    // Stagger checks throughout video (at 1/4, 2/4, 3/4 points for better coverage)
    const timestamps = [];
    for (let i = 1; i <= numChecks; i++) {
      const proportion = i / (numChecks + 1); // Spread evenly: 1/n+1, 2/n+1, etc.
      const t = Math.floor(videoDuration * proportion);
      // Ensure check is between 30s and video_duration-30s
      const safeT = Math.max(30, Math.min(videoDuration - 30, t));
      timestamps.push(safeT);
    }
    
    // Generate checks for each timestamp
    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i]; // Exact timestamp for the check
      const segmentStart = Math.max(0, t - 45); // 45 seconds before the check
      const segmentEnd = Math.min(videoDuration, t + 15); // 15 seconds after (broader context)
      
      console.log(`\n🔄 [CHECK ${i + 1}/${numChecks}] Generating for timestamp ${t}s`);
      console.log(`   📍 Segment: ${segmentStart}s → ${segmentEnd}s (broader context window)`);
      
      // Extract transcript segment for this time window
      // Approximate: divide transcript proportionally by time
      const transcriptWords = transcript.split(/\s+/);
      const wordsPerSecond = transcriptWords.length / videoDuration;
      const startWordIndex = Math.floor(segmentStart * wordsPerSecond);
      const endWordIndex = Math.floor(segmentEnd * wordsPerSecond);
      const segmentText = transcriptWords.slice(startWordIndex, endWordIndex).join(' ');
      
      console.log(`   📄 Extracted ${segmentText.split(/\s+/).length} words from transcript`);
      
      if (!segmentText || segmentText.trim().length < 50) {
        console.log(`   ⚠️  Segment too short, using broader context`);
        // Fallback to broader context if segment is too small
        const fallbackStart = Math.max(0, startWordIndex - 50);
        const fallbackEnd = Math.min(transcriptWords.length, endWordIndex + 50);
        const fallbackSegment = transcriptWords.slice(fallbackStart, fallbackEnd).join(' ');
        
        try {
          const questionData = await generateQuestionFromSegment(base44, fallbackSegment, t, i + 1, numChecks);
          attentionChecks.push({
            timestamp: t,
            check_order: i,
            ...questionData
          });
        } catch (error) {
          console.error(`   ❌ Failed to generate check ${i + 1}:`, error.message);
          throw new Error(`Failed to generate attention check ${i + 1}: ${error.message}`);
        }
      } else {
        try {
          const questionData = await generateQuestionFromSegment(base44, segmentText, t, i + 1, numChecks);
          attentionChecks.push({
            timestamp: t,
            check_order: i,
            ...questionData
          });
        } catch (error) {
          console.error(`   ❌ Failed to generate check ${i + 1}:`, error.message);
          throw new Error(`Failed to generate attention check ${i + 1}: ${error.message}`);
        }
      }
    }

    console.log("\n✅ [GENERATION COMPLETE] All attention checks generated");
    console.log(`📊 Total: ${attentionChecks.length} checks`);
    console.log(`📍 Timestamps: ${attentionChecks.map(c => `${c.timestamp}s`).join(', ')}\n`);

    return Response.json({ attention_checks: attentionChecks });

  } catch (error) {
    console.error("❌ [ERROR] Attention check generation failed:", error);
    console.error("Stack:", error.stack);
    return Response.json({ 
      error: 'Failed to generate attention checks',
      details: error.message 
    }, { status: 500 });
  }
});

async function generateQuestionFromSegment(base44, segmentText, timestamp, checkNum, totalChecks) {
  console.log(`   🤖 Calling LLM for question generation...`);
  
  const questionResponse = await base44.integrations.Core.InvokeLLM({
    prompt: `You are creating a literal recall attention check question for a video lecture.

Transcript Segment (content from the last 60 seconds):
"""
${segmentText.substring(0, 2000)}
"""

CRITICAL INSTRUCTIONS:
- You MUST provide ALL 4 answer choices (A, B, C, D)
- You MUST specify which choice is correct
- ALL fields are REQUIRED and CANNOT be empty

Your task:
1. Find ONE concrete fact from this transcript segment:
   - A number
   - A vocabulary term
   - A definition
   - A cause/effect relationship
   - A specific example
   
2. Create a LITERAL RECALL question where:
   - The answer appears almost word-for-word in the transcript
   - NO reasoning or inference required
   - Student MUST have been listening to answer correctly
   
3. Generate 4 answer choices:
   - ONE correct answer (from transcript)
   - THREE plausible but incorrect distractors
   
Rules:
- Keep question short and clear (10-15 words max)
- All choices should be similar length and format
- Make distractors believable but clearly wrong if student was paying attention
- DO NOT ask opinion or analysis questions

Example:
Transcript: "Plants absorb carbon dioxide during photosynthesis and release oxygen."
Question: "What gas do plants absorb during photosynthesis?"
choice_a: "Carbon dioxide" ← CORRECT
choice_b: "Oxygen"
choice_c: "Nitrogen"  
choice_d: "Hydrogen"
correct_choice: "A"

Now generate ONE question based on the transcript segment above. Return EXACTLY this format with ALL fields filled.`,
    response_json_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question text" },
        choice_a: { type: "string", description: "First answer choice - REQUIRED" },
        choice_b: { type: "string", description: "Second answer choice - REQUIRED" },
        choice_c: { type: "string", description: "Third answer choice - REQUIRED" },
        choice_d: { type: "string", description: "Fourth answer choice - REQUIRED" },
        correct_choice: { type: "string", enum: ["A", "B", "C", "D"], description: "The correct answer letter - REQUIRED" }
      },
      required: ["question", "choice_a", "choice_b", "choice_c", "choice_d", "correct_choice"],
      additionalProperties: false
    }
  });
  
  console.log(`   🔍 LLM Response:`, JSON.stringify(questionResponse, null, 2));
  
  // Strict validation - all fields must be present and non-empty
  const missingFields = [];
  if (!questionResponse.question || questionResponse.question.trim() === '') missingFields.push('question');
  if (!questionResponse.choice_a || questionResponse.choice_a.trim() === '') missingFields.push('choice_a');
  if (!questionResponse.choice_b || questionResponse.choice_b.trim() === '') missingFields.push('choice_b');
  if (!questionResponse.choice_c || questionResponse.choice_c.trim() === '') missingFields.push('choice_c');
  if (!questionResponse.choice_d || questionResponse.choice_d.trim() === '') missingFields.push('choice_d');
  if (!questionResponse.correct_choice || !['A', 'B', 'C', 'D'].includes(questionResponse.correct_choice)) missingFields.push('correct_choice');
  
  if (missingFields.length > 0) {
    console.error(`   ❌ Missing/invalid fields: ${missingFields.join(', ')}`);
    console.error(`   ❌ Full response:`, questionResponse);
    throw new Error(`LLM returned incomplete question data. Missing: ${missingFields.join(', ')}`);
  }
  
  console.log(`   ✅ Question generated successfully`);
  console.log(`   📝 Q: "${questionResponse.question.substring(0, 60)}..."`);
  console.log(`   ✓ A: ${questionResponse.choice_a.substring(0, 30)}...`);
  console.log(`   ✓ B: ${questionResponse.choice_b.substring(0, 30)}...`);
  console.log(`   ✓ C: ${questionResponse.choice_c.substring(0, 30)}...`);
  console.log(`   ✓ D: ${questionResponse.choice_d.substring(0, 30)}...`);
  console.log(`   🎯 Correct: ${questionResponse.correct_choice}`);
  
  // Return with explicit field mapping to ensure structure
  return {
    question: questionResponse.question.trim(),
    choice_a: questionResponse.choice_a.trim(),
    choice_b: questionResponse.choice_b.trim(),
    choice_c: questionResponse.choice_c.trim(),
    choice_d: questionResponse.choice_d.trim(),
    correct_choice: questionResponse.correct_choice.trim()
  };
}