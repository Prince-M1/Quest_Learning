import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Zap, Target, RefreshCw, ArrowRight } from "lucide-react";

export default function NewHowItWorks() {
  const steps = [
    { icon: HelpCircle, title: "Inquiry-Based Entry", description: "Hook questions and AI-powered Socratic tutoring." },
    { icon: Zap, title: "Interactive Learning Session", description: "Videos and readings with attention checks." },
    { icon: Target, title: "Personalized Quizzes", description: "Adaptive multiple-choice questions." },
    { icon: Target, title: "Case Studies", description: "Real-world scenarios with free-response." },
    { icon: RefreshCw, title: "Spaced Repetition Reviews", description: "Automatic reviews at 1, 3, 7, 14, and 21 days." }
  ];

  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#E8EEF7]">
      <div className="container mx-auto max-w-6xl">
        <motion.h2
          className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          How learning works <span className="text-blue-600">inside Quest</span>
        </motion.h2>

        <motion.div 
          className="flex flex-wrap justify-center gap-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              className="text-center max-w-[180px]"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -100px 0px" }}
              transition={{ duration: 0.7, delay: idx * 0.12, ease: "easeOut" }}
            >
              <motion.div 
                className="relative mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto shadow-lg"
                  whileHover={{ shadow: "0 20px 25px -5px rgba(37, 99, 235, 0.3)" }}
                >
                  <step.icon className="w-10 h-10 text-white" />
                </motion.div>
                <motion.div 
                  className="w-1 h-8 bg-blue-300 mx-auto mt-2"
                  initial={{ scaleY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.12 + 0.2 }}
                />
              </motion.div>
              <motion.h3 
                className="text-base font-bold text-gray-900 mb-2"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 + 0.3 }}
              >
                {step.title}
              </motion.h3>
              <motion.p 
                className="text-sm text-gray-600 leading-snug"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 + 0.4 }}
              >
                {step.description}
              </motion.p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}