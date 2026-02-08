import React from "react";
import { motion } from "framer-motion";

export default function WaitlistStats() {
  return (
    <section className="py-12 px-6 bg-white">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-gray-600 text-lg mb-2">Join over</p>
          <div className="flex justify-center items-center gap-8 flex-wrap">
            <div>
              <span className="text-4xl font-bold text-blue-600">30,000</span>
              <span className="text-gray-600 text-lg ml-2">students</span>
            </div>
            <span className="text-gray-400 text-2xl">+</span>
            <div>
              <span className="text-4xl font-bold text-blue-600">2,500</span>
              <span className="text-gray-600 text-lg ml-2">teachers</span>
            </div>
          </div>
          <p className="text-gray-600 text-lg mt-2">on the waitlist</p>
        </motion.div>
      </div>
    </section>
  );
}