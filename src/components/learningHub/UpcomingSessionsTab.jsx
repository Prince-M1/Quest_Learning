import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";

export default function UpcomingSessionsTab() {
  const upcomingSessions = [
    {
      id: 1,
      topic: "Photosynthesis",
      unit: "Plants & Animals",
      reviewNumber: 1,
      dueDate: "2025-01-12",
      daysUntil: 2
    },
    {
      id: 2,
      topic: "DNA Structure",
      unit: "Genetics",
      reviewNumber: 2,
      dueDate: "2025-01-13",
      daysUntil: 3
    },
    {
      id: 3,
      topic: "ATP Energy",
      unit: "Biochemistry",
      reviewNumber: 4,
      dueDate: "2025-01-15",
      daysUntil: 5
    },
    {
      id: 4,
      topic: "Natural Selection",
      unit: "Evolution",
      reviewNumber: 3,
      dueDate: "2025-01-18",
      daysUntil: 8
    }
  ];

  if (upcomingSessions.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No Upcoming Sessions
        </h3>
        <p className="text-slate-600">
          Complete today's reviews to schedule more learning sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {upcomingSessions.map(session => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900 mb-1">{session.topic}</h4>
                <p className="text-sm text-slate-600">{session.unit} • Review #{session.reviewNumber}</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Scheduled
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(session.dueDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-600 font-medium">
                <Clock className="w-4 h-4" />
                <span>In {session.daysUntil} days</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}