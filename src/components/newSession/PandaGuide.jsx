import React, { useEffect, useState } from "react";

export default function PandaGuide({ phase, celebrating }) {
  const [animation, setAnimation] = useState("wave");
  const [expression, setExpression] = useState("happy");

  useEffect(() => {
    if (celebrating) {
      setAnimation("celebrate");
      setExpression("excited");
      setTimeout(() => {
        setAnimation("wave");
        setExpression("happy");
      }, 2000);
    }
  }, [celebrating]);

  useEffect(() => {
    // Change expression based on phase
    if (phase === "inquiry") setExpression("curious");
    else if (phase === "video") setExpression("watching");
    else if (phase === "quiz") setExpression("thinking");
    else setExpression("happy");
  }, [phase]);

  const pandaExpressions = {
    happy: "🐼",
    curious: "🤔🐼",
    excited: "🎉🐼🎉",
    watching: "👀🐼",
    thinking: "💭🐼"
  };

  return (
    <div className={`fixed bottom-12 right-12 z-50 transition-all duration-500 ${
      animation === "celebrate" ? "scale-125 animate-bounce" : "scale-100 hover:scale-110"
    }`}>
      <div className="relative">
        {/* Panda character - larger and more prominent */}
        <div className="w-32 h-32 bg-gradient-to-br from-white to-purple-50 backdrop-blur-xl rounded-full shadow-2xl border-6 border-purple-300/50 flex items-center justify-center text-6xl cursor-pointer transform transition-all hover:rotate-12">
          {celebrating ? pandaExpressions.excited : pandaExpressions[expression]}
        </div>
        
        {/* Floating question mark for mystery phase */}
        {phase === "inquiry" && !celebrating && (
          <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-2xl animate-bounce">
            ?
          </div>
        )}
        
        {/* Bamboo confetti for celebration */}
        {celebrating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute text-3xl animate-ping"
                style={{
                  animationDelay: `${i * 0.1}s`,
                  transform: `rotate(${i * 45}deg) translateY(-60px)`
                }}
              >
                🎋
              </div>
            ))}
          </div>
        )}
        
        {/* Wave animation */}
        {!celebrating && (
          <div className="absolute -bottom-2 -right-2 text-2xl animate-wave">
            👋
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(20deg); }
          75% { transform: rotate(-20deg); }
        }
        .animate-wave {
          animation: wave 2s ease-in-out infinite;
        }
        .border-6 {
          border-width: 6px;
        }
      `}</style>
    </div>
  );
}