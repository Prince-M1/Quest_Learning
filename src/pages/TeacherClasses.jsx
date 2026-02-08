import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TeacherLayout from "../components/teacher/TeacherLayout";
import { 
  Users, 
  Plus, 
  Trash2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClass, setNewClass] = useState({
    class_name: "",
    curriculum_id: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log("📚 [CLASSES] Loading data...");
      
      // Get fresh user data from MongoDB
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
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
      console.log("✅ [CLASSES] User loaded:", user.email);
      
      const teacherId = user._id || user.id;
      console.log("📝 [CLASSES] Using teacherId:", teacherId);
      
      // Fetch curricula from MongoDB
      const curriculaRes = await fetch(`${API_BASE}/api/curriculum/teacher/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!curriculaRes.ok) {
        throw new Error("Failed to fetch curricula from MongoDB");
      }
      
      const curriculaData = await curriculaRes.json();
      console.log("✅ [CLASSES] Curricula loaded from MongoDB:", curriculaData.length);
      setCurricula(curriculaData);
      
      // Fetch classes from MongoDB
      const classesRes = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      let classData = [];
      if (classesRes.ok) {
        classData = await classesRes.json();
        console.log("✅ [CLASSES] Classes loaded from MongoDB:", classData.length);
      } else {
        console.warn("⚠️ [CLASSES] Failed to fetch classes from MongoDB");
      }
      
      // ✅ NEW: Get enrollment counts for each class from MongoDB
      const enrollmentCounts = {};
      for (const cls of classData) {
        const classId = cls.id || cls._id;
        try {
          const enrollRes = await fetch(`${API_BASE}/api/enrollments/class/${classId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (enrollRes.ok) {
            const enrollments = await enrollRes.json();
            enrollmentCounts[classId] = enrollments.length;
            console.log(`✅ [CLASSES] Class ${cls.class_name}: ${enrollments.length} students`);
          } else {
            enrollmentCounts[classId] = 0;
          }
        } catch (err) {
          console.warn(`⚠️ [CLASSES] Failed to get enrollments for class ${classId}:`, err);
          enrollmentCounts[classId] = 0;
        }
      }
      
      // Add student counts to classes
      classData = classData.map(cls => ({
        ...cls,
        studentCount: enrollmentCounts[cls.id || cls._id] || 0
      }));
      
      setClasses(classData);
      setLoading(false);
      
    } catch (err) {
      console.error("❌ [CLASSES] Failed to load data:", err);
      setLoading(false);
    }
  };

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateClass = async () => {
    try {
      console.log("📚 [CLASSES] Creating class...");
      
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const teacherId = teacher._id || teacher.id;
      const joinCode = generateJoinCode();
      
      const response = await fetch(`${API_BASE}/api/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          class_name: newClass.class_name,
          curriculum_id: newClass.curriculum_id,
          teacher_id: teacherId,
          join_code: joinCode
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create class');
      }
      
      const createdClass = await response.json();
      console.log("✅ [CLASSES] Class created:", createdClass.class_name);
      
      setShowCreateForm(false);
      setNewClass({ class_name: "", curriculum_id: "" });
      loadData();
    } catch (err) {
      console.error("❌ [CLASSES] Failed to create class:", err);
      alert("Failed to create class. Please try again.");
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm("Are you sure you want to delete this class?")) return;
    
    try {
      console.log("📚 [CLASSES] Deleting class:", id);
      
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE}/api/classes/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete class');
      }
      
      console.log("✅ [CLASSES] Class deleted");
      loadData();
    } catch (err) {
      console.error("❌ [CLASSES] Failed to delete class:", err);
      alert("Failed to delete class. Please try again.");
    }
  };

  const getCurriculumName = (curriculumId) => {
    const curriculum = curricula.find(c => (c.id || c._id) === curriculumId);
    return curriculum ? curriculum.subject_name : "Unknown";
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate(createPageUrl("Login"));
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading classes...</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="classes" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-black mb-1">Class Data</h1>
            <p className="text-sm text-gray-600">Manage your classes and student enrollment</p>
          </div>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={curricula.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Class
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6 border border-gray-200">
            <CardHeader>
              <CardTitle>Create New Class</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Class Name</label>
                  <Input
                    value={newClass.class_name}
                    onChange={(e) => setNewClass({...newClass, class_name: e.target.value})}
                    placeholder="e.g., Period 3 Biology"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Curriculum</label>
                  <Select 
                    value={newClass.curriculum_id}
                    onValueChange={(value) => setNewClass({...newClass, curriculum_id: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a curriculum" />
                    </SelectTrigger>
                    <SelectContent>
                      {curricula.map((curriculum) => (
                        <SelectItem key={curriculum.id || curriculum._id} value={curriculum.id || curriculum._id}>
                          {curriculum.subject_name} ({curriculum.curriculum_difficulty})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button 
                    onClick={handleCreateClass}
                    disabled={!newClass.class_name || !newClass.curriculum_id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Create Class
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewClass({ class_name: "", curriculum_id: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {curricula.length === 0 && (
          <Card className="border border-yellow-200 bg-yellow-50 mb-6">
            <CardContent className="p-6">
              <p className="text-sm text-yellow-800">
                You need to create a curriculum first before creating a class. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto ml-1 text-yellow-900 font-semibold"
                  onClick={() => navigate(createPageUrl("TeacherCurricula"))}
                >
                  Create curriculum →
                </Button>
              </p>
            </CardContent>
          </Card>
        )}

        {classes.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No classes yet</h3>
                <p className="text-gray-600 mb-6">Create your first class to get started</p>
                {curricula.length > 0 && (
                  <Button 
                    onClick={() => setShowCreateForm(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Class
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <Card 
                key={cls.id || cls._id}
                className="border border-gray-200 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(createPageUrl("TeacherClassDetail") + `?id=${cls.id || cls._id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id || cls._id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                  <h3 className="text-lg font-bold text-black mb-2">{cls.class_name}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {getCurriculumName(cls.curriculum_id)}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                      {cls.studentCount || 0} students
                    </span>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-600 mb-1">Student Join Code</p>
                    <p className="text-2xl font-bold text-blue-600 tracking-wider">{cls.join_code}</p>
                  </div>
                  <p className="text-sm text-gray-600">Created {new Date(cls.created_date).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}