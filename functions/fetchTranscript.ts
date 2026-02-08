import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  console.log("🚀 [TRANSCRIPT API] ========== NEW REQUEST ==========");
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error("❌ [TRANSCRIPT API] Unauthorized - no user");
      return Response.json({ error: 'Unauthorized', transcript: "" }, { status: 401 });
    }

    console.log("✅ [TRANSCRIPT API] User authenticated:", user.email);

    const body = await req.json();
    const { videoId } = body;
    console.log("📹 [TRANSCRIPT API] Request body:", body);
    console.log("📹 [TRANSCRIPT API] Video ID extracted:", videoId);

    if (!videoId) {
      console.error("❌ [TRANSCRIPT API] No video ID provided in request");
      return Response.json({ error: 'Video ID is required', transcript: "" }, { status: 400 });
    }

    const transcriptApiKey = Deno.env.get("TRANSCRIPTAPI_KEY");
    console.log("🔑 [TRANSCRIPT API] API key available:", !!transcriptApiKey);
    
    if (!transcriptApiKey) {
      console.error("❌ [TRANSCRIPT API] TRANSCRIPTAPI_KEY not set in environment");
      return Response.json({ error: 'API key not configured', transcript: "" }, { status: 500 });
    }
    
    // According to API docs, video_url can be just the video ID
    const apiUrl = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}&format=json&include_timestamp=true&send_metadata=false&lang=en`;
    console.log("🌐 [TRANSCRIPT API] Calling TranscriptAPI.com:", apiUrl);
    console.log("🌐 [TRANSCRIPT API] Video ID being used:", videoId);
    
    const response = await fetch(apiUrl, { 
      method: "GET",
      headers: {
        "Authorization": `Bearer ${transcriptApiKey}`
      }
    });
    
    console.log("📡 [TRANSCRIPT API] Response status:", response.status);
    console.log("📡 [TRANSCRIPT API] Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ [TRANSCRIPT API] API request failed");
      console.error("❌ [TRANSCRIPT API] Status:", response.status);
      console.error("❌ [TRANSCRIPT API] Error body:", errorText);
      return Response.json({ 
        transcript: "", 
        timestampedSegments: [],
        error: `TranscriptAPI returned ${response.status}: ${errorText}` 
      }, { status: 200 });
    }
    
    const data = await response.json();
    console.log("📦 [TRANSCRIPT API] Response data structure:", Object.keys(data));
    console.log("📦 [TRANSCRIPT API] Transcript segments count:", data?.transcript?.length || 0);
    
    // Concatenate all transcript segments into one string and preserve timestamps
    let transcript = "";
    let timestampedSegments = [];
    if (data?.transcript && Array.isArray(data.transcript)) {
      transcript = data.transcript.map(segment => segment.text).join(" ");
      timestampedSegments = data.transcript.map(segment => ({
        text: segment.text,
        timestamp: segment.start
      }));
      console.log("✅ [TRANSCRIPT API] SUCCESS! Transcript assembled");
      console.log("📏 [TRANSCRIPT API] Final length:", transcript.length, "characters");
      console.log("📏 [TRANSCRIPT API] Timestamped segments:", timestampedSegments.length);
      console.log("📄 [TRANSCRIPT API] First 200 chars:", transcript.substring(0, 200));
      console.log("📄 [TRANSCRIPT API] Last 200 chars:", transcript.substring(transcript.length - 200));
    } else {
      console.warn("⚠️ [TRANSCRIPT API] No transcript array in response");
      console.warn("⚠️ [TRANSCRIPT API] Data structure:", JSON.stringify(data, null, 2));
    }

    console.log("✅ [TRANSCRIPT API] Returning transcript, length:", transcript.length);
    return Response.json({ transcript, timestampedSegments });
    
  } catch (error) {
    console.error("❌ [TRANSCRIPT API] EXCEPTION CAUGHT:", error);
    console.error("❌ [TRANSCRIPT API] Error name:", error.name);
    console.error("❌ [TRANSCRIPT API] Error message:", error.message);
    console.error("❌ [TRANSCRIPT API] Error stack:", error.stack);
    return Response.json({ 
      error: `Exception: ${error.message}`, 
      transcript: "" 
    }, { status: 500 });
  }
});