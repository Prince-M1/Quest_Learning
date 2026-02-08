import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { apiFetch } from "@/utils/auth.js";        // now exists

import { Loader2 } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null); // <-- ADD THIS

  useEffect(() => {
    console.log("🚀 [LAYOUT] Layout mounted/updated. Page:", currentPageName);
    console.log("🚀 [LAYOUT] Full URL:", window.location.href);
    console.log("🚀 [LAYOUT] URL params:", window.location.search);
    checkAuthAndRedirect();
  }, [currentPageName]);

  const checkAuthAndRedirect = async () => {
    // Public marketing pages - no auth required
    const publicPages = ["Landing", "Demo", "PricingInfo", "RoleSelection"];
    const noRedirectPages = ["StudentLiveSession", "SocraticInquiry"];

    // If on public marketing page, skip all auth checks
    if (publicPages.includes(currentPageName)) {
      console.log("✅ [AUTH] Public marketing page, no auth required");
      setChecking(false);
      return;
    }

    // All other pages require authentication
    try {
const fetchedUser = await apiFetch("/api/auth/me");

if (!fetchedUser || typeof fetchedUser !== "object") {
  throw new Error("Invalid user payload");
}

// store user in state
setUser(fetchedUser);

console.log("✅ [AUTH] User authenticated successfully");
console.log("📋 [AUTH] User ID:", fetchedUser.id || fetchedUser._id);
console.log("📋 [AUTH] User Email:", fetchedUser.email);
console.log("📋 [AUTH] Account Type:", fetchedUser.account_type || "NOT SET");
console.log("📋 [AUTH] Subscription Status:", fetchedUser.subscription_status || "NOT SET");

      // If no account type, send to role selection
      if (!fetchedUser.account_type) {
        console.log("⚠️ [AUTH] User authenticated but account_type not set");
        console.log("🔄 [AUTH] Redirecting to role selection");
        navigate(createPageUrl("RoleSelection"), { replace: true });
        return;
      }

      // Teacher-specific routing
      if (fetchedUser.account_type === "teacher") {
        const teacherPages = ["LearningHub","Pricing", "TeacherLiveSession", "CreateLiveSession", "ManageLiveSession", "TeacherDashboard", "TeacherClasses", "TeacherClassDetail", "TeacherCurricula", "CreateCurriculum", "ManageCurriculum", "TeacherProgress", "TeacherLeaderboard", "TeacherAnalytics", "TeacherStudentDetail", "TranscriptTester", "TeacherSettings"];

        // If trying to access non-teacher page, redirect appropriately
        if (!teacherPages.includes(currentPageName) && !noRedirectPages.includes(currentPageName)) {
          console.log("⚠️ [AUTH] Teacher on invalid page, redirecting");
          navigate(createPageUrl("TeacherDashboard"), { replace: true });
          return;
        }
      }

      // Student-specific routing
      if (fetchedUser.account_type === "student") {
        const studentPages = ["StudentLiveSession", "KnowledgeMap", "JoinClass", "Classes", "LearningHub", "Progress", "NewSession", "PracticeSession", "Curriculum", "SocraticInquiry"];

        // If trying to access non-student page, redirect appropriately
        if (!studentPages.includes(currentPageName) && !noRedirectPages.includes(currentPageName)) {
          console.log("⚠️ [AUTH] Student on invalid page, redirecting");
          navigate(createPageUrl("KnowledgeMap"), { replace: true });
          return;
        }
      }

      setChecking(false);
    } catch (err) {
      console.log("❌ [AUTH] Authentication failed - User not authenticated");
      console.error("❌ [AUTH] Error details:", err);
      console.log("📄 [AUTH] Error message:", err.message || "Unknown error");
      console.log("🔐 [AUTH] Current page:", currentPageName);

      // Redirect to Landing page if not authenticated and trying to access protected page
      console.log("🔄 [AUTH] Redirecting to Landing page");
      navigate(createPageUrl("Landing"), { replace: true });
    }
  };

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Don't show layout - pages handle their own layouts
  const noLayoutPages = ["Landing", "Demo", "Pricing", "PricingInfo", "RoleSelection", "KnowledgeMap", "StudentLiveSession", "SocraticInquiry", "JoinClass"];
  
  if (noLayoutPages.includes(currentPageName)) {
    return children;
  }

  return children;
}