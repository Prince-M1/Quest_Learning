import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Hand, Clock } from "lucide-react";

export default function CoreIdeaSection() {
  const pillars = [
    { icon: HelpCircle, title: "Inquiry before explanation", description: "Learning begins with questions, not answers." },
    { icon: Hand, title: "Active engagement", description: "Students must think, respond, and apply." },
    { icon: Clock, title: "Scientifically timed review", description: "Material returns exactly when memory needs it." }
  ];

  return (
    <section className="py-24 px-6 bg-[#E8EEF7]">
      <div className="container mx-auto max-w-6xl">
        <motion.h2
          className="text-4xl lg:text-5xl font-bold text-center text-gray-900 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Learning works when <span className="text-blue-600">curiosity comes first.</span>
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => (
            <motion.div
              key={idx}
              className="bg-white/80 backdrop-blur rounded-3xl p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <pillar.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
              <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}