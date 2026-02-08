import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TeacherLayout from "../components/teacher/TeacherLayout";
import MindmapPreview from "../components/teacher/MindmapPreview";
import { 
  BookOpen, 
  Plus, 
  Trash2
} from "lucide-react";

export default function TeacherCurricula() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [curricula, setCurricula] = useState([]);
  const [curriculaData, setCurriculaData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurricula();
  }, []);

  const loadCurricula = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      console.log("📚 [CURRICULA] Loading data from MongoDB...");
      
      // ✅ Step 1: Get current user from MongoDB
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!userRes.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const user = await userRes.json();
      setTeacher(user);
      console.log("✅ [CURRICULA] User loaded:", user.email);
      
      // ✅ Step 2: Fetch curricula from MongoDB endpoint
      const teacherId = user._id || user.id;
      console.log("🔍 [CURRICULA] Fetching curricula for teacher ID:", teacherId);
      
      const curriculaRes = await fetch(`${API_BASE}/api/curriculum/teacher/${teacherId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!curriculaRes.ok) {
        throw new Error('Failed to fetch curricula');
      }
      
      const curriculaData = await curriculaRes.json();
      console.log("✅ [CURRICULA] Loaded", curriculaData.length, "curricula");
      setCurricula(curriculaData);
      
      // ✅ Step 3: Load units and subunits for each curriculum
      const dataMap = {};
      
      for (const curriculum of curriculaData) {
        const curriculumId = curriculum.id || curriculum._id;
        
        // Fetch units for this curriculum
        const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${curriculumId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (unitsRes.ok) {
          const units = await unitsRes.json();
          console.log(`✅ [CURRICULA] Loaded ${units.length} units for curriculum ${curriculumId}`);
          
          // Fetch subunits for each unit
          const unitsWithSubunits = await Promise.all(
            units.map(async (unit) => {
              const unitId = unit.id || unit._id;
              const subunitsRes = await fetch(`${API_BASE}/api/subunits/unit/${unitId}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              const subunits = subunitsRes.ok ? await subunitsRes.json() : [];
              
              return {
                ...unit,
                subunits: subunits.sort((a, b) => a.subunit_order - b.subunit_order)
              };
            })
          );
          
          dataMap[curriculumId] = { 
            units: unitsWithSubunits.sort((a, b) => a.unit_order - b.unit_order) 
          };
        }
      }
      
      setCurriculaData(dataMap);
      setLoading(false);
      console.log("✅ [CURRICULA] All data loaded successfully");
      
    } catch (err) {
      console.error("❌ [CURRICULA] Failed to load curriculum:", err);
      setLoading(false);
    }
  };

  const handleDeleteCurriculum = async (id) => {
    if (!confirm("Are you sure you want to delete this curriculum?")) return;
    
    try {
      console.log("🗑️ [CURRICULA] Deleting curriculum:", id);
      
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // ✅ Delete from MongoDB endpoint
      const deleteRes = await fetch(`${API_BASE}/api/curriculum/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!deleteRes.ok) {
        throw new Error('Failed to delete curriculum');
      }
      
      console.log("✅ [CURRICULA] Curriculum deleted");
      loadCurricula();
    } catch (err) {
      console.error("❌ [CURRICULA] Failed to delete curriculum:", err);
      alert("Failed to delete curriculum. Please try again.");
    }
  };

  const handleSignOut = () => {
    console.log("👋 [CURRICULA] Signing out");
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate(createPageUrl("Login"));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="curricula" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-black mb-1">Curriculum</h1>
            <p className="text-sm text-gray-600">Create and manage your curriculum content</p>
          </div>
          <Button 
            onClick={() => navigate(createPageUrl("CreateCurriculum"))}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Curriculum with Quest
          </Button>
        </div>

        {curricula.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">No curriculum yet</h3>
                <p className="text-gray-600 mb-6 text-lg">Create your first curriculum to get started</p>
                <Button 
                  onClick={() => navigate(createPageUrl("CreateCurriculum"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Curriculum with Quest
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {curricula.map((curriculum) => {
              const curriculumId = curriculum.id || curriculum._id;
              return (
                <Card 
                  key={curriculumId}
                  className="group border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                  onClick={() => navigate(createPageUrl("ManageCurriculum") + `?id=${curriculumId}`)}
                >
                  <CardContent className="p-0">
                    <div className="p-6 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-black mb-1">{curriculum.subject_name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              {curriculum.curriculum_difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {curriculaData[curriculumId]?.units.length || 0} units
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCurriculum(curriculumId);
                          }}
                          className="h-8 w-8 p-0 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Mindmap Preview */}
                    {curriculaData[curriculumId] && curriculaData[curriculumId].units.length > 0 && (
                      <div className="px-6 pb-6">
                        <MindmapPreview curriculum={curriculaData[curriculumId]} />
                        <p className="text-xs text-gray-500 mt-3">Created {new Date(curriculum.created_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}