import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import KnowledgeMapVisualization from "./KnowledgeMapVisualization";

export default function NewHeroSection() {
  const handleWatchDemo = () => {
    window.location.href = '/demo';
  };

  return (
    <section className="pt-56 pb-64 px-6 bg-[#E8EEF7]">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center gap-2 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-sm text-green-600 font-medium">
                Now launched · Try now
              </span>
            </motion.div>

            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Transform learning into{" "}
              <span className="text-blue-600">
                mastery
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 leading-relaxed">
              Adaptive learning that combines inquiry-based teaching, spaced repetition, and real-time insights.
            </p>

            <div className="flex gap-4">
              <Button onClick={handleWatchDemo} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base rounded-md">
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Right: Visualization */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <KnowledgeMapVisualization />
          </motion.div>
        </div>
      </div>
    </section>
  );
}