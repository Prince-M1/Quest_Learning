import React from "react";
import { motion } from "framer-motion";

export default function SimpleTestimonials() {
  const testimonials = [
    {
      initials: "FE",
      name: "Felo Joseph",
      role: "Student",
      quote: "Quest Learning has transformed how I study. The spaced repetition system actually works, and I retain information much longer.",
      bgColor: "bg-blue-600"
    },
    {
      initials: "DW",
      name: "Drumwright",
      role: "Teacher",
      quote: "As an educator, I love seeing my students' progress in real-time. The analytics help me identify knowledge gaps before they become bigger problems.",
      bgColor: "bg-blue-600"
    },
    {
      initials: "EV",
      name: "Evelina",
      role: "College Staff",
      quote: "The Socratic inquiry feature challenged me to think deeply about concepts. It's like having a tutor who actually cares about my learning journey.",
      bgColor: "bg-blue-600"
    }
  ];

  return (
    <section className="py-24 px-6 bg-[#E8EEF7]">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              className="bg-white rounded-3xl p-8 shadow-sm relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 ${testimonial.bgColor} rounded-full flex items-center justify-center text-white font-bold text-base`}>
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-base">{testimonial.name}</p>
                    <p className="text-gray-600 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="text-5xl text-gray-200 font-serif leading-none">"</div>
              </div>
              <p className="text-gray-700 leading-relaxed">{testimonial.quote}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}