import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Play } from "lucide-react";

export default function TodaySessionsTab({ filterCritical }) {
  const navigate = useNavigate();

  const mockSessions = [
    {
      id: 1,
      topic: "Inheritance Patterns",
      unit: "Genetics",
      urgency: "Critical",
      daysLate: 4,
      reviewNumber: 2,
      progress: 35
    },
    {
      id: 2,
      topic: "Animal Systems",
      unit: "Plants & Animals",
      urgency: "Critical",
      daysLate: 3,
      reviewNumber: 4,
      progress: 42
    },
    {
      id: 3,
      topic: "Cell Membranes",
      unit: "Cells",
      urgency: "Medium",
      daysLate: 2,
      reviewNumber: 3,
      progress: 58
    },
    {
      id: 4,
      topic: "Population Dynamics",
      unit: "Ecology",
      urgency: "Medium",
      daysLate: 2,
      reviewNumber: 2,
      progress: 61
    },
    {
      id: 5,
      topic: "Organelles",
      unit: "Cells",
      urgency: "Low",
      daysLate: 1,
      reviewNumber: 1,
      progress: 78
    },
    {
      id: 6,
      topic: "Proteins",
      unit: "Biochemistry",
      urgency: "Low",
      daysLate: 1,
      reviewNumber: 3,
      progress: 82
    }
  ];

  const filteredSessions = filterCritical 
    ? mockSessions.filter(s => s.urgency === "Critical")
    : mockSessions;

  const urgencyColors = {
    Critical: "bg-red-100 text-red-800 border-red-200",
    Medium: "bg-orange-100 text-orange-800 border-orange-200",
    Low: "bg-blue-100 text-blue-800 border-blue-200"
  };

  const urgencyBorderColors = {
    Critical: "border-l-red-500",
    Medium: "border-l-orange-500",
    Low: "border-l-[#3b82f6]"
  };

  if (filteredSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          All Caught Up!
        </h3>
        <p className="text-slate-600">
          {filterCritical 
            ? "No critical topics at the moment. Great work!"
            : "No sessions due today. Check back tomorrow or explore new topics."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#1e40af] mb-2">Daily Limits</h3>
        <div className="text-sm text-[#2563eb] space-y-1">
          <p>• Reviews: 4 per day</p>
          <p>• New Topics: 1 per day</p>
          <p className="text-xs text-[#3b82f6] mt-2">
            Complete your scheduled reviews to maintain optimal retention
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {!filterCritical && mockSessions.filter(s => s.urgency === "Critical").length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-slate-900">
                Critical • {mockSessions.filter(s => s.urgency === "Critical").length} topics
              </h3>
            </div>
            <div className="space-y-3">
              {mockSessions
                .filter(s => s.urgency === "Critical")
                .map(session => (
                  <SessionCard 
                    key={session.id} 
                    session={session} 
                    urgencyColors={urgencyColors}
                    urgencyBorderColors={urgencyBorderColors}
                    navigate={navigate}
                  />
                ))}
            </div>
          </div>
        )}

        {!filterCritical && mockSessions.filter(s => s.urgency === "Medium").length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">
              Medium Priority • {mockSessions.filter(s => s.urgency === "Medium").length} topics
            </h3>
            <div className="space-y-3">
              {mockSessions
                .filter(s => s.urgency === "Medium")
                .map(session => (
                  <SessionCard 
                    key={session.id} 
                    session={session} 
                    urgencyColors={urgencyColors}
                    urgencyBorderColors={urgencyBorderColors}
                    navigate={navigate}
                  />
                ))}
            </div>
          </div>
        )}

        {!filterCritical && mockSessions.filter(s => s.urgency === "Low").length > 0 && (
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">
              On Schedule • {mockSessions.filter(s => s.urgency === "Low").length} topics
            </h3>
            <div className="space-y-3">
              {mockSessions
                .filter(s => s.urgency === "Low")
                .map(session => (
                  <SessionCard 
                    key={session.id} 
                    session={session} 
                    urgencyColors={urgencyColors}
                    urgencyBorderColors={urgencyBorderColors}
                    navigate={navigate}
                  />
                ))}
            </div>
          </div>
        )}

        {filterCritical && (
          <div className="space-y-3">
            {filteredSessions.map(session => (
              <SessionCard 
                key={session.id} 
                session={session} 
                urgencyColors={urgencyColors}
                urgencyBorderColors={urgencyBorderColors}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionCard({ session, urgencyColors, urgencyBorderColors, navigate }) {
  return (
    <Card className={`border-l-4 ${urgencyBorderColors[session.urgency]} hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="font-semibold text-slate-900 mb-1">{session.topic}</h4>
            <p className="text-sm text-slate-600">{session.unit} • Review #{session.reviewNumber}</p>
          </div>
          <Badge className={`${urgencyColors[session.urgency]} border`}>
            {session.urgency}
          </Badge>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Progress</span>
              <span className="font-medium">{session.progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  session.urgency === "Critical" ? "bg-red-500" :
                  session.urgency === "Medium" ? "bg-orange-500" :
                  "bg-[#3b82f6]"
                }`}
                style={{width: `${session.progress}%`}}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="text-sm font-semibold text-red-600">{session.daysLate} days</p>
          </div>
        </div>

        <Button 
          className="w-full bg-[#3b82f6] hover:bg-[#2563eb]"
          onClick={() => navigate(createPageUrl("PracticeSession"))}
        >
          <Play className="w-4 h-4 mr-2" />
          Start Review
        </Button>
      </div>
    </Card>
  );
}