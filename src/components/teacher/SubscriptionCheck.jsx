import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/utils/getUser"; // ADD THIS IMPORT

export default function SubscriptionCheck({ children, requirePremium = false }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      // REPLACE THIS LINE:
      // const userData = await base44.auth.me();
      
      // WITH THIS:
      const userData = await getCurrentUser();
      
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to check subscription:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // If premium required and user doesn't have premium/trial/grace_period access
  if (requirePremium && !['premium', 'trial', 'grace_period'].includes(user?.subscription_tier)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Premium Feature
          </h2>
          <p className="text-gray-600 mb-6">
            This feature requires a Premium subscription. Upgrade now to unlock unlimited curriculum creation and advanced analytics.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => navigate(createPageUrl("Pricing"))}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              View Plans
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("TeacherDashboard"))}
              variant="outline"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}