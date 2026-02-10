import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { connectDB } from "./db.js"; 

import authRoutes from "./routes/auth.js";
import curriculumRoutes from "./routes/curriculum.js";
import unitsRoutes from "./routes/units.js";
import subunitsRouter from "./routes/subunits.js";
import classesRouter from "./routes/classes.js";
import assignmentsRouter from "./routes/assignments.js";
import liveSessionsRouter from "./routes/liveSessions.js";
import enrollmentsRouter from "./routes/enrollments.js";
import progressRouter from "./routes/progress.js";
import inquirySessionsRouter from "./routes/inquirySessions.js";
import inquiryResponsesRouter from "./routes/inquiryResponses.js";
import videosRouter from "./routes/videos.js";
import quizzesRouter from "./routes/quizzes.js";
import questionsRouter from "./routes/questions.js";
import caseStudiesRouter from "./routes/caseStudies.js";
import caseStudyResponsesRouter from "./routes/caseStudyResponses.js"; // NEW
import questionResponsesRouter from "./routes/questionResponses.js";
import quizResultsRouter from "./routes/quizResults.js";
import attentionCheckResponsesRouter from "./routes/attentionCheckResponses.js";
import attentionChecksRouter from "./routes/attentionChecks.js";
import unitImagesRouter from "./routes/unitImages.js";
import learningSessionsRouter from "./routes/learningSessions.js";
import aiGenerationRouter from "./routes/aiGeneration.js";

const app = express();

app.use(cors());

// ⚠️ CRITICAL: Webhook route MUST come BEFORE express.json()
// Stripe needs the raw body for signature verification
app.use('/api/auth/webhook', express.raw({ type: 'application/json' }));

// Body parsing middleware (comes AFTER webhook route)
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

connectDB().then(() => {
    console.log("✅ Database is ready for routes");

    app.use("/api/auth", authRoutes);
    app.use("/api/curriculum", curriculumRoutes);
    app.use("/api/units", unitsRoutes);
    app.use("/api/subunits", subunitsRouter);
    app.use("/api/classes", classesRouter);
    app.use("/api/assignments", assignmentsRouter);
    app.use("/api/live-sessions", liveSessionsRouter);
    app.use("/api/enrollments", enrollmentsRouter);
    app.use("/api/progress", progressRouter);
    app.use("/api/inquiry-sessions", inquirySessionsRouter);
    app.use("/api/inquiry-responses", inquiryResponsesRouter);
    app.use("/api/videos", videosRouter);
    app.use("/api/quizzes", quizzesRouter);
    app.use("/api/questions", questionsRouter);
    app.use("/api/case-studies", caseStudiesRouter);
    app.use("/api/case-study-responses", caseStudyResponsesRouter); // NEW
    app.use("/api/attention-checks", attentionChecksRouter);
    app.use("/api/attention-check-responses", attentionCheckResponsesRouter);
    app.use("/api/unit-images", unitImagesRouter);
    app.use("/api/learning-sessions", learningSessionsRouter);
    app.use("/api/question-responses", questionResponsesRouter);
    app.use("/api/ai", aiGenerationRouter);
    app.use("/api/quiz-results", quizResultsRouter);

    app.get("/api/health", (req, res) => res.json({ status: "ok" }));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on http://localhost:${PORT}`);
      console.log(`📧 Webhook endpoint: http://localhost:${PORT}/api/auth/webhook`);
    });
}).catch(err => {
    console.error("❌ Database failed to start:", err);
    process.exit(1);
});