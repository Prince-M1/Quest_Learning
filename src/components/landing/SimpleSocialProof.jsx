import React from "react";
import { motion } from "framer-motion";

export default function SimpleSocialProof() {
  return (
    <motion.section
      className="py-12 bg-gradient-to-r from-blue-50 to-indigo-50"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="container mx-auto px-6 text-center">
        <p className="text-gray-600 text-lg">
          Join <span className="font-bold text-blue-600">500+</span> educators and students on the waitlist
        </p>
      </div>
    </motion.section>
  );
}