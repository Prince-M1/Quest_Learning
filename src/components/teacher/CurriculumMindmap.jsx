import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Circle } from "lucide-react";

export default function CurriculumMindmap({ curriculum, subjectName }) {
  const totalSubunits = curriculum.units.reduce((acc, unit) => acc + unit.subunits.length, 0);
  
  return (
    <div className="relative min-h-screen p-8 bg-gray-50">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      
      <div style={{fontFamily: '"Inter", sans-serif'}} className="max-w-7xl mx-auto">
        {/* Central Node */}
        <div className="flex flex-col items-center mb-16">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-2xl opacity-30 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative w-48 h-48 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-full shadow-2xl flex flex-col items-center justify-center border-4 border-white/20 backdrop-blur-sm">
              <h3 className="text-white font-bold text-2xl text-center px-4 leading-tight">{subjectName}</h3>
              <div className="mt-2 text-indigo-200 text-sm font-medium">{curriculum.units.length} Units • {totalSubunits} Topics</div>
            </div>
          </div>
        </div>

        {/* Units Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {curriculum.units.map((unit, index) => (
            <Card 
              key={unit.unit_order} 
              className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden bg-white/80 backdrop-blur-sm"
              style={{
                animationDelay: `${index * 100}ms`,
                animation: 'fadeInUp 0.6s ease-out forwards'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <CardContent className="p-6 relative">
                {/* Unit Header */}
                <div className="flex items-start gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-md opacity-40"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 mb-2 font-semibold border-0">
                      Unit {unit.unit_order}
                    </Badge>
                    <h4 className="font-bold text-gray-900 text-lg leading-tight">{unit.unit_name}</h4>
                    <p className="text-xs text-gray-500 mt-1 font-medium">{unit.subunits.length} Subtopics</p>
                  </div>
                </div>

                {/* Subunits */}
                <div className="space-y-3">
                  {unit.subunits.map((subunit, subIdx) => (
                    <div
                      key={subunit.subunit_order}
                      className="group/subunit p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-700">{subIdx + 1}</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">{subunit.subunit_name}</p>
                          {subunit.learning_standard && (
                            <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{subunit.learning_standard}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}