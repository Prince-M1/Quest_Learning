import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

export default function MinimalHeader({ onContactClick }) {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignIn = () => {
    window.location.href = '/login';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69501dd283f7fa71433447a7/635f2021d_Untitleddesign3.png" 
            alt="Quest Learning" 
            className="h-10 w-10 rounded-lg"
          />
          <span className="text-xl font-bold text-gray-900">Quest Learning</span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <button onClick={() => scrollToSection('how-it-works')} className="text-gray-600 hover:text-blue-600 transition-colors">
            How It Works
          </button>
          <button onClick={() => scrollToSection('for-students')} className="text-gray-600 hover:text-blue-600 transition-colors">
            For Students
          </button>
          <button onClick={() => scrollToSection('for-teachers')} className="text-gray-600 hover:text-blue-600 transition-colors">
            For Teachers
          </button>
          <button onClick={() => scrollToSection('pricing')} className="text-gray-600 hover:text-blue-600 transition-colors">
            Pricing
          </button>
          <button onClick={() => scrollToSection('faq')} className="text-gray-600 hover:text-blue-600 transition-colors">
            FAQ
          </button>
          <button onClick={onContactClick || (() => scrollToSection('contact'))} className="text-gray-600 hover:text-blue-600 transition-colors">
            Contact
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button onClick={handleSignIn} className="bg-blue-600 hover:bg-blue-700 text-white">
            Sign In / Sign Up
          </Button>
        </div>
      </div>
    </header>
  );
}