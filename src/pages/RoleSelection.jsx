import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getToken, apiFetch } from "@/utils/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, Loader2 } from "lucide-react";
import NotificationModal from "../components/shared/NotificationModal";
import { useNotification } from "../components/shared/useNotification";

export default function RoleSelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(null);
  const { notification, showError, closeNotification } = useNotification();

  // -------------------------
  // Check if user already has role
 useEffect(() => {
  const checkExistingUser = async () => {
    try {
      const token = getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const user = await apiFetch("/api/auth/me");

      if (user.account_type) {
        if (user.account_type === "teacher") {
          navigate(createPageUrl("TeacherDashboard"));
        } else {
          navigate(createPageUrl("KnowledgeMap"));
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  checkExistingUser();
}, [navigate]);

  // -------------------------
  // Handle role selection
  // -------------------------
 const handleSelectRole = async (role) => {
    setSavingRole(role);

    try {
      // ✅ Post role to backend
      await apiFetch("/api/auth/user/role", {
        method: "POST",
        body: JSON.stringify({ account_type: role }),
      });

      // 🚀 FORCE REFRESH REDIRECTS: 
      // This ensures the App 'wakes up' with the new role and fresh state.
      if (role === "teacher") {
        window.location.href = "/pricing?onboarding=true";
      } else {
        window.location.href = "/joinclass";
      }
      
    } catch (err) {
      showError(
        "Save Failed",
        err.message || "Failed to save your selection. Please try again."
      );
      setSavingRole(null); // Reset if it fails
    }
  };

  // -------------------------
  // Loader while checking user
  // -------------------------
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // -------------------------
  // Render role selection cards
  // -------------------------
  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Welcome to Quest Learning
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Select your role to get started
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Student Card */}
          <Card
            className="border-2 border-gray-200 hover:border-blue-500 hover:shadow-2xl transition-all cursor-pointer group"
            onClick={() => savingRole === null && handleSelectRole("student")}
          >
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <GraduationCap className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Student</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Learn at your own pace with interactive lessons and quizzes
              </p>
              <Button
                disabled={savingRole !== null}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-6 text-lg rounded-xl"
              >
                {savingRole === "student" ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Continue as Student"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Teacher Card */}
          <Card
            className="border-2 border-gray-200 hover:border-purple-500 hover:shadow-2xl transition-all cursor-pointer group"
            onClick={() => savingRole === null && handleSelectRole("teacher")}
          >
            <CardContent className="p-8 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Users className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Teacher</h2>
              <p className="text-gray-600 mb-6 text-lg">
                Create curriculum, manage classes, and track student progress
              </p>
              <Button
                disabled={savingRole !== null}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold py-6 text-lg rounded-xl"
              >
                {savingRole === "teacher" ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "Continue as Teacher"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification Modal */}
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
