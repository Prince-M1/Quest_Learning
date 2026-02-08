import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function Pricing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { user, isLoadingAuth, fetchMe } = useAuth();
  const [showContactModal, setShowContactModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    const init = async () => {
      await fetchMe(); 
      checkOnboardingMode();
    };
    init();
  }, []);

  const checkOnboardingMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsOnboarding(urlParams.get('onboarding') === 'true');
  };

  const plans = [
    {
      name: "Basic",
      price: "Free",
      description: "Perfect for trying out live sessions",
      features: [
        "Access to live learning sessions",
        "Basic progress tracking",
        "Community support"
      ],
      cta: "Get Started Free",
      popular: false,
      action: async () => {
        if (isLoadingAuth) return;
        setLoading(true);
        try {
          if (!user) {
            toast.info("Please log in to activate your free plan");
            navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }

          const token = localStorage.getItem("token");
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/user/role`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ account_type: 'teacher' })
          });

          if (!response.ok) {
            throw new Error("Failed to set account type");
          }

          toast.success("Welcome! Opening your dashboard...");
          navigate("/teacherdashboard");

        } catch (error) {
          console.error("Free Tier Error:", error);
          toast.error("Failed to activate. Please try again.");
        } finally {
          setLoading(false);
        }
      }
    },
    {
      name: "Premium",
      price: "$30",
      period: "/month",
      description: "Full access to transform your learning",
      features: [
        "30-day free trial",
        "Unlimited live sessions",
        "AI-generated curriculum",
        "Personalized learning paths",
        "Spaced repetition system",
        "Progress analytics & insights",
        "Inquiry-based learning modules",
        "Priority support"
      ],
      cta: "Start Free Trial",
      popular: true,
      action: async () => {
        if (isLoadingAuth) return;
        setLoading(true);

        try {
          if (!user) {
            toast.info("Please log in to upgrade to Premium");
            navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`);
            return;
          }

          const token = localStorage.getItem("token");
          
          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/create-checkout`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              priceId: 'price_1SsoVLGkJwjLzI2pADjSmRzS',
              successUrl: `${window.location.origin}/teacherdashboard?checkout=success`,
              cancelUrl: window.location.href,
            }),
          });

          if (!response.ok) {
            throw new Error("Checkout failed");
          }

          const result = await response.json();

          if (result.url) {
            window.location.href = result.url;
          } else {
            toast.error(result.message || "Checkout failed");
          }
        } catch (error) {
          console.error("Premium Error:", error);
          toast.error("Could not connect to payment server.");
        } finally {
          setLoading(false);
        }
      }
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large schools and districts",
      features: [
        "Everything in Premium",
        "Unlimited users",
        "Custom curriculum integration",
        "Dedicated account manager",
        "Advanced analytics & reporting",
        "SSO & security features",
        "Custom training & onboarding",
        "Priority 24/7 support"
      ],
      cta: "Contact Sales",
      popular: false,
      action: () => setShowContactModal(true),
    }
  ];

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Verifying your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Back Button - hide during onboarding */}
      {!isOnboarding && (
        <div className="container mx-auto max-w-7xl px-6 pt-8">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("teacherdashboard"))}
            className="mb-4"
          >
            ← Back
          </Button>
        </div>
      )}

      {/* Header */}
      <section className="pt-12 pb-20 px-6">
        <div className="container mx-auto max-w-7xl text-center">
          <motion.h1
            className="text-5xl lg:text-6xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {isOnboarding ? (
              <>Select Your <span className="text-blue-600">Subscription Plan</span></>
            ) : (
              <>Choose Your <span className="text-blue-600">Learning Path</span></>
            )}
          </motion.h1>
          <motion.p
            className="text-xl text-gray-600 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {isOnboarding 
              ? "Choose the plan that fits your teaching needs"
              : "Start with a free plan or unlock full potential with Premium"
            }
          </motion.p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.name}
                className={`relative bg-white rounded-3xl p-8 ${
                  plan.popular
                    ? "border-4 border-blue-600 shadow-2xl"
                    : "border-2 border-gray-200 shadow-md"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-bold ${plan.popular ? "text-blue-600" : "text-gray-900"}`}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-gray-500 text-lg">{plan.period}</span>
                    )}
                  </div>
                  {plan.name === "Premium" && (
                    <p className="text-sm text-gray-500 mt-2">30-day free trial</p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={plan.action}
                  disabled={loading || isLoadingAuth} 
                  className={`w-full h-14 text-lg rounded-xl ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : plan.name === "Enterprise"
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-gray-600 hover:bg-gray-700 text-white"
                  }`}
                >
                  {(loading || isLoadingAuth) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {isLoadingAuth ? "Checking..." : "Loading..."}
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Money-back guarantee */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <p className="text-gray-600">
              Premium includes a 30-day free trial
            </p>
            <div className="mt-2">
              <p className="text-gray-500 text-sm">
                Questions?{" "}
                <button 
                  type="button"
                  onClick={() => setShowContactModal(true)} 
                  className="text-blue-600 hover:underline font-medium cursor-pointer relative z-50"
                >
                  Contact our team
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enterprise/Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise Inquiry</h3>
            <p className="text-gray-600 mb-6 text-sm">
              Our team will help you set up a custom plan for your school or district.
            </p>
            
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl mb-6 flex items-center justify-between">
              <span className="font-mono text-blue-600 font-bold text-sm">sales@quest-learn.com</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText("sales@quest-learn.com");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12"
                onClick={() => window.open('https://mail.google.com/mail/?view=cm&fs=1&to=sales@quest-learn.com&su=Enterprise%20Plan%20Inquiry', '_blank')}
              >
                Send us a mail
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full h-12"
                onClick={() => setShowContactModal(false)}
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}