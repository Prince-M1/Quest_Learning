import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function PastSessionsTab() {
  const pastSessions = [
    {
      id: 1,
      topic: "Cell Organelles",
      unit: "Cells",
      completedDate: "2025-01-09",
      score: 90,
      timeSpent: "12m",
      outcome: "passed"
    },
    {
      id: 2,
      topic: "Mitosis Process",
      unit: "Cells",
      completedDate: "2025-01-08",
      score: 75,
      timeSpent: "15m",
      outcome: "passed"
    },
    {
      id: 3,
      topic: "Gene Expression",
      unit: "Genetics",
      completedDate: "2025-01-08",
      score: 85,
      timeSpent: "18m",
      outcome: "passed"
    },
    {
      id: 4,
      topic: "Ecosystem Balance",
      unit: "Ecology",
      completedDate: "2025-01-07",
      score: 95,
      timeSpent: "14m",
      outcome: "passed"
    },
    {
      id: 5,
      topic: "Carbohydrates",
      unit: "Biochemistry",
      completedDate: "2025-01-06",
      score: 100,
      timeSpent: "10m",
      outcome: "passed"
    }
  ];

  return (
    <div className="space-y-3">
      {pastSessions.map(session => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">{session.topic}</h4>
                <p className="text-sm text-slate-600">{session.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                {session.outcome === "passed" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-600">
                  {new Date(session.completedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </span>
                <div className="flex items-center gap-1 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span>{session.timeSpent}</span>
                </div>
              </div>
              <Badge 
                className={`${
                  session.score >= 90 ? "bg-green-100 text-green-800 border-green-200" :
                  session.score >= 70 ? "bg-blue-100 text-blue-800 border-blue-200" :
                  "bg-orange-100 text-orange-800 border-orange-200"
                } border`}
              >
                {session.score}%
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}