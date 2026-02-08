import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Wand2, Search, Rocket, ChevronDown } from "lucide-react";

export default function CurriculumCreationProcess() {
  const [openStep, setOpenStep] = useState(null);

  const steps = [
    {
      icon: FileText,
      title: "Step 1: Define Your Curriculum",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69501dd283f7fa71433447a7/a8692c797_Screenshot2025-12-29at75051PM.png",
      bullets: [
        "Set subject name (e.g., Biology, Algebra II)",
        "Choose difficulty level (High School, Undergraduate)",
        "Establish foundational context"
      ]
    },
    {
      icon: Wand2,
      title: "Step 2: AI Generates Complete Structure & Content",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69501dd283f7fa71433447a7/3e957b150_Screenshot2025-12-29at75259PM.png",
      bullets: [
        "AI suggests logical topic sequence and unit order",
        "AI proposes specific learning objectives and subunits",
        "Videos with transcripts and attention checks",
        "Articles with progressive reveal",
        "Quizzes with multiple difficulty levels",
        "Inquiry sessions with Socratic dialogue",
        "Case studies with real-world scenarios"
      ]
    },
    {
      icon: Search,
      title: "Step 3: Review & Refine",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69501dd283f7fa71433447a7/f60cfeb42_Screenshot2025-12-29at75539PM.png",
      bullets: [
        "Edit AI-generated questions",
        "Adjust Socratic prompts",
        "Modify case study scenarios",
        "Regenerate images as needed"
      ]
    },
    {
      icon: Rocket,
      title: "Step 4: Approve & Launch",
      image: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69501dd283f7fa71433447a7/c69971848_Screenshot2025-12-29at75554PM.png",
      bullets: [
        "You stay in control of quality",
        "Align content with your goals",
        "Deploy curriculum to students",
        "Track engagement and progress in real-time"
      ]
    }
  ];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-gray-600 text-lg mb-4">From concept to deployment in minutes, not months</p>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
            How teachers create curriculum with AI
          </h2>
        </motion.div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <button
                onClick={() => setOpenStep(openStep === idx ? null : idx)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-left">{step.title}</h3>
                </div>
                <ChevronDown
                  className={`w-6 h-6 text-gray-400 transition-transform ${openStep === idx ? 'rotate-180' : ''}`}
                />
              </button>

              <AnimatePresence>
                {openStep === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-6 flex items-start gap-6">
                      <ul className="flex-1 space-y-3">
                        {step.bullets.map((bullet, bulletIdx) => (
                          <li key={bulletIdx} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-700">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <img
                        src={step.image}
                        alt={step.title}
                        className="w-96 rounded-xl shadow-md flex-shrink-0"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}