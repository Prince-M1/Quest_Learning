import React, { useEffect, useRef, useState } from "react";
import { CheckCircle, Circle } from "lucide-react";

export default function SymmetricalKnowledgeMap({ 
  curriculum, 
  units, 
  subunits, 
  studentProgress, 
  onSubunitClick 
}) {
  const svgRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 1200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight, 1200);
        setDimensions({ width: size, height: size });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const { width, height } = dimensions;
  const centerX = width / 2;
  const centerY = height / 2;
  const centerRadius = 50;
  const unitRadius = 40;
  const subunitRadius = 20;
  const unitOrbitRadius = 180;
  const subunitOrbitRadius = 100;

  const getProgress = (subunitId) => {
    const progress = studentProgress?.find((p) => p.subunit_id === subunitId);
    return progress?.learned_status ? 100 : 0;
  };

  const calculateSymmetricalPositions = () => {
    const totalUnits = units.length;
    const positions = [];

    units.forEach((unit, unitIndex) => {
      const angle = (unitIndex * 2 * Math.PI) / totalUnits - Math.PI / 2;
      const unitX = centerX + unitOrbitRadius * Math.cos(angle);
      const unitY = centerY + unitOrbitRadius * Math.sin(angle);

      const unitSubunits = subunits.filter((s) => s.unit_id === unit.id);
      const subunitPositions = [];

      unitSubunits.forEach((subunit, subIndex) => {
        const totalSubunits = unitSubunits.length;
        const subAngle = angle + ((subIndex - (totalSubunits - 1) / 2) * Math.PI) / (totalSubunits + 1);
        const subX = unitX + subunitOrbitRadius * Math.cos(subAngle);
        const subY = unitY + subunitOrbitRadius * Math.sin(subAngle);

        subunitPositions.push({
          subunit,
          x: subX,
          y: subY,
          angle: subAngle,
        });
      });

      positions.push({
        unit,
        x: unitX,
        y: unitY,
        angle,
        subunits: subunitPositions,
      });
    });

    return positions;
  };

  const positions = calculateSymmetricalPositions();

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="max-w-full max-h-full"
      >
        <defs>
          <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="unitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Connection lines from center to units */}
        {positions.map((pos, i) => (
          <line
            key={`center-line-${i}`}
            x1={centerX}
            y1={centerY}
            x2={pos.x}
            y2={pos.y}
            stroke="#e5e7eb"
            strokeWidth="2"
            strokeDasharray="5,5"
            opacity="0.6"
          />
        ))}

        {/* Connection lines from units to subunits */}
        {positions.map((pos, i) =>
          pos.subunits.map((sub, j) => (
            <line
              key={`unit-sub-${i}-${j}`}
              x1={pos.x}
              y1={pos.y}
              x2={sub.x}
              y2={sub.y}
              stroke="#e5e7eb"
              strokeWidth="1.5"
              opacity="0.5"
            />
          ))
        )}

        {/* Center curriculum circle */}
        <g>
          <circle
            cx={centerX}
            cy={centerY}
            r={centerRadius}
            fill="url(#centerGradient)"
            filter="url(#shadow)"
          />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize="16"
            fontWeight="600"
          >
            {curriculum?.subject_name?.length > 12
              ? curriculum.subject_name.substring(0, 10) + "..."
              : curriculum?.subject_name || "Curriculum"}
          </text>
        </g>

        {/* Unit circles */}
        {positions.map((pos, i) => {
          const completedSubunits = pos.subunits.filter(
            (s) => getProgress(s.subunit.id) === 100
          ).length;
          const totalSubunits = pos.subunits.length;
          const completionPercent = totalSubunits > 0 ? (completedSubunits / totalSubunits) * 100 : 0;

          return (
            <g key={`unit-${i}`}>
              {/* Progress ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={unitRadius + 6}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="4"
              />
              <circle
                cx={pos.x}
                cy={pos.y}
                r={unitRadius + 6}
                fill="none"
                stroke="url(#unitGradient)"
                strokeWidth="4"
                strokeDasharray={`${(completionPercent / 100) * 2 * Math.PI * (unitRadius + 6)} ${
                  2 * Math.PI * (unitRadius + 6)
                }`}
                strokeDashoffset={2 * Math.PI * (unitRadius + 6) * 0.25}
                transform={`rotate(-90 ${pos.x} ${pos.y})`}
              />

              {/* Unit circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={unitRadius}
                fill="white"
                stroke="#d1d5db"
                strokeWidth="2"
                filter="url(#shadow)"
              />
              <text
                x={pos.x}
                y={pos.y - 5}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#374151"
                fontSize="12"
                fontWeight="600"
              >
                {pos.unit.unit_name.length > 10
                  ? pos.unit.unit_name.substring(0, 8) + "..."
                  : pos.unit.unit_name}
              </text>
              <text
                x={pos.x}
                y={pos.y + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#9ca3af"
                fontSize="10"
              >
                {completedSubunits}/{totalSubunits}
              </text>
            </g>
          );
        })}

        {/* Subunit circles */}
        {positions.map((pos, i) =>
          pos.subunits.map((sub, j) => {
            const progress = getProgress(sub.subunit.id);
            const isLearned = progress === 100;

            return (
              <g
                key={`subunit-${i}-${j}`}
                onClick={() => isLearned && onSubunitClick(sub.subunit)}
                className={isLearned ? "cursor-pointer" : ""}
              >
                <circle
                  cx={sub.x}
                  cy={sub.y}
                  r={subunitRadius}
                  fill={isLearned ? "#10b981" : "white"}
                  stroke={isLearned ? "#059669" : "#d1d5db"}
                  strokeWidth="2"
                  filter="url(#shadow)"
                  className="transition-all"
                />
                {isLearned ? (
                  <g>
                    <circle cx={sub.x} cy={sub.y} r="10" fill="white" opacity="0.9" />
                    <text
                      x={sub.x}
                      y={sub.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#059669"
                      fontSize="14"
                      fontWeight="bold"
                    >
                      ✓
                    </text>
                  </g>
                ) : (
                  <circle cx={sub.x} cy={sub.y} r="4" fill="#d1d5db" />
                )}
                <text
                  x={sub.x}
                  y={sub.y + subunitRadius + 15}
                  textAnchor="middle"
                  fill="#6b7280"
                  fontSize="9"
                  fontWeight="500"
                >
                  {sub.subunit.subunit_name.length > 12
                    ? sub.subunit.subunit_name.substring(0, 10) + "..."
                    : sub.subunit.subunit_name}
                </text>
              </g>
            );
          })
        )}
      </svg>
    </div>
  );
}