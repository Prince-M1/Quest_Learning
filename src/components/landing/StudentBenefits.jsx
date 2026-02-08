import React from "react";
import { motion } from "framer-motion";
import { Brain, BarChart3, Clock, Flame } from "lucide-react";

export default function StudentBenefits() {
  const benefits = [
    { icon: Brain, text: "Never forget what you learn" },
    { icon: BarChart3, text: "See your progress visually" },
    { icon: Clock, text: "Study exactly when you need to" },
    { icon: Flame, text: "Stay motivated with streaks" }
  ];

  return (
    <section id="for-students" className="py-24 px-6 bg-white">
      <div className="container mx-auto max-w-6xl">
        <motion.h2
          className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          A <span className="text-blue-600">clear path</span>, every day.
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-12">
          <motion.div
            className="space-y-6 flex flex-col justify-center"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {[
              { icon: Brain, title: "Personalized Learning Journey", text: "Content adapts to each student's performance and pace." },
              { icon: BarChart3, title: "Knowledge Map & Radial Mindmap", text: "Visual map of subjects, units, and review timing." },
              { icon: Clock, title: "Learning Hub", text: "Today, upcoming, and completed sessions in one place." },
              { icon: Flame, title: "Progress & Motivation", text: "Streaks, mastery tracking, achievements." }
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 bg-white rounded-2xl border-2 border-blue-100">
                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-600 text-sm">{item.text}</p>
                </div>
              </div>
            ))}
          </motion.div>

          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-200">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911eeb0f3daa2d191a2a8fa/558772119_Screenshot2026-01-23at80439PM.png"
                alt="Quiz Interface"
                className="w-full h-auto"
              />
            </div>
            <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-200">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911eeb0f3daa2d191a2a8fa/174ac6433_Screenshot2026-01-23at80443PM.png"
                alt="Progress Dashboard"
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}