import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeacherLayout from "../components/teacher/TeacherLayout";
import { format } from "date-fns";
import { 
  BookOpen, 
  Users, 
  Plus,
  ChevronRight,
  GraduationCap,
  CalendarIcon,
  CheckCircle,
  Trash2
} from "lucide-react";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [curricula, setCurricula] = useState([]);
  const [units, setUnits] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedSubunit, setSelectedSubunit] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [saving, setSaving] = useState(false);

  // 🔧 CRITICAL FIX: Handle payment success with direct MongoDB API call
  useEffect(() => {
    const handleCheckoutSuccess = async () => {
      const params = new URLSearchParams(location.search);
      if (params.get('checkout') === 'success') {
        console.log("💳 Payment detected! Upgrading account...");
        
        try {
          const token = localStorage.getItem('token');
          const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
          
          // Step 1: Update database using YOUR backend endpoint
          const updateRes = await fetch(`${API_BASE}/api/auth/update-me`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ subscription_tier: 'premium' })
          });

          if (!updateRes.ok) {
            throw new Error('Failed to update subscription');
          }

          console.log("✅ Database updated to premium");
          
          // Step 2: Fetch fresh user data
          const meRes = await fetch(`${API_BASE}/api/auth/me`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (meRes.ok) {
            const userData = await meRes.json();
            setTeacher(userData);
            // Update localStorage so AuthContext picks it up
            localStorage.setItem('user', JSON.stringify(userData));
            console.log("✅ User data refreshed:", userData.subscription_tier);
          }
          
          // Step 3: Clean URL
          navigate(location.pathname, { replace: true });
          console.log("✅ URL cleaned - Premium access granted!");
          
          // Force a page reload to refresh AuthContext
          window.location.reload();
          
        } catch (err) {
          console.error("❌ Upgrade error:", err);
        }
      }
    };

    handleCheckoutSuccess();
  }, [location.search, navigate]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (selectedClass && classes.length > 0 && curricula.length > 0) {
      loadClassSubunits(selectedClass);
    }
  }, [selectedClass, classes, curricula]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // ✅ Step 1: Get current user from MongoDB
      console.log("📊 [DASHBOARD] Step 1: Fetching user...");
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const currentUser = await userRes.json();
      console.log("📊 [DASHBOARD] User fetched:", currentUser.email);
      setTeacher(currentUser);

      const teacherId = currentUser._id || currentUser.id;

      // ✅ Step 2: Fetch classes from MongoDB
      console.log("📊 [DASHBOARD] Step 2: Fetching classes from MongoDB for teacher:", teacherId);
      
      let teacherClasses = [];
      try {
        const classesRes = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (classesRes.ok) {
          teacherClasses = await classesRes.json();
          console.log("📊 [DASHBOARD] ✅ Classes fetched from MongoDB:", teacherClasses.length);
        } else {
          console.warn("📊 [DASHBOARD] ⚠️ Failed to fetch classes");
        }
        setClasses(teacherClasses);
      } catch (classError) {
        console.warn("📊 [DASHBOARD] ⚠️ Failed to fetch classes:", classError.message);
        setClasses([]);
      }

      // ✅ Step 3: Fetch curricula from MongoDB
      console.log("📊 [DASHBOARD] Step 3: Fetching curricula for teacher:", teacherId);
      
      const curriculaRes = await fetch(`${API_BASE}/api/curriculum/teacher/${teacherId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("📊 [DASHBOARD] Curricula response status:", curriculaRes.status);
      
      if (curriculaRes.ok) {
        const curriculaData = await curriculaRes.json();
        console.log("📊 [DASHBOARD] ✅ Curricula fetched:", curriculaData.length, "items");
        console.log("📊 [DASHBOARD] Curricula data:", curriculaData);
        
        setCurricula(curriculaData);
        console.log("📊 [DASHBOARD] ✅ State updated with", curriculaData.length, "curricula");
      } else {
        const errorText = await curriculaRes.text();
        console.error("📊 [DASHBOARD] ❌ Failed to fetch curricula:", errorText);
        setCurricula([]);
      }

      // Auto-select first class and fetch assignments from MongoDB
      if (teacherClasses.length > 0) {
        const firstClassId = teacherClasses[0].id || teacherClasses[0]._id;
        setSelectedClass(firstClassId);
        
        try {
          const classIds = teacherClasses.map(c => c.id || c._id);
          
          // Fetch assignments from MongoDB
          const assignmentsRes = await fetch(`${API_BASE}/api/assignments/classes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ classIds })
          });
          
          if (assignmentsRes.ok) {
            const teacherAssignments = await assignmentsRes.json();
            setAssignments(teacherAssignments);
            console.log("📊 [DASHBOARD] ✅ Assignments fetched from MongoDB:", teacherAssignments.length);
          } else {
            console.warn("📊 [DASHBOARD] ⚠️ Failed to fetch assignments");
            setAssignments([]);
          }
        } catch (assignmentError) {
          console.warn("📊 [DASHBOARD] ⚠️ Failed to fetch assignments:", assignmentError.message);
          setAssignments([]);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setLoading(false);
    }
  };

  const loadClassSubunits = async (classId) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const cls = classes.find(c => (c.id || c._id) === classId);
      if (!cls) return;

      // ✅ Fetch units from MongoDB
      const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${cls.curriculum_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!unitsRes.ok) {
        setUnits([]);
        setSubunits([]);
        return;
      }
      
      const unitsData = await unitsRes.json();
      setUnits(unitsData.sort((a, b) => a.unit_order - b.unit_order));

      // ✅ Fetch subunits for all units
      const allSubunits = [];
      for (const unit of unitsData) {
        const subunitsRes = await fetch(`${API_BASE}/api/subunits/unit/${unit.id || unit._id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (subunitsRes.ok) {
          const unitSubunits = await subunitsRes.json();
          allSubunits.push(...unitSubunits);
        }
      }
      setSubunits(allSubunits.sort((a, b) => a.subunit_order - b.subunit_order));
    } catch (err) {
      console.error("Failed to load subunits:", err);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedClass || !selectedSubunit || !selectedDate) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      // Check if assignment already exists
      const existing = assignments.find(
        a => a.class_id === selectedClass && a.subunit_id === selectedSubunit
      );
      
      if (existing) {
        // Update existing assignment
        const response = await fetch(`${API_BASE}/api/assignments/${existing.id || existing._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            due_date: format(selectedDate, 'yyyy-MM-dd')
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to update assignment');
        }
        
        console.log("✅ [DASHBOARD] Assignment updated");
      } else {
        // Create new assignment
        const response = await fetch(`${API_BASE}/api/assignments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            class_id: selectedClass,
            subunit_id: selectedSubunit,
            due_date: format(selectedDate, 'yyyy-MM-dd')
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to create assignment');
        }
        
        console.log("✅ [DASHBOARD] Assignment created");
      }
      
      // Reload assignments
      const classIds = classes.map(c => c.id || c._id);
      const assignmentsRes = await fetch(`${API_BASE}/api/assignments/classes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ classIds })
      });
      
      if (assignmentsRes.ok) {
        const teacherAssignments = await assignmentsRes.json();
        setAssignments(teacherAssignments);
      }
      
      setSelectedSubunit(null);
      setSelectedDate(null);
    } catch (err) {
      console.error("❌ [DASHBOARD] Failed to create assignment:", err);
      alert("Failed to save assignment. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE}/api/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete assignment');
      }
      
      console.log("✅ [DASHBOARD] Assignment deleted");
      setAssignments(assignments.filter(a => (a.id || a._id) !== assignmentId));
    } catch (err) {
      console.error("❌ [DASHBOARD] Failed to delete assignment:", err);
      alert("Failed to delete assignment. Please try again.");
    }
  };

  const getSubunitName = (subunitId) => {
    const sub = subunits.find(s => (s.id || s._id) === subunitId);
    return sub?.subunit_name || "Unknown";
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => (c.id || c._id) === classId);
    return cls?.class_name || "Unknown";
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
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="dashboard" user={teacher} onSignOut={handleSignOut}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-black mb-1">Dashboard</h1>
            <p className="text-sm text-gray-600">Overview of your teaching activities</p>
          </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">Total Classes</p>
                  <p className="text-4xl font-bold text-black">{classes.length}</p>
                </div>
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-2">Curriculum Created</p>
                  <p className="text-4xl font-bold text-black">{curricula.length}</p>
                </div>
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assign Section */}
        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-black mb-4">Assign Learn Dates</h2>
            {classes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600 mb-4">No classes created yet</p>
                <Button 
                  onClick={() => navigate(createPageUrl("TeacherClasses"))}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Class
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Assignment Form */}
                <div className="grid md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Class</label>
                    <Select value={selectedClass || ""} onValueChange={(val) => {
                      setSelectedClass(val);
                      setSelectedUnit(null);
                      setSelectedSubunit(null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id || cls._id} value={cls.id || cls._id}>{cls.class_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Unit</label>
                    <Select 
                      value={selectedUnit || ""} 
                      onValueChange={(val) => {
                        setSelectedUnit(val);
                        setSelectedSubunit(null);
                      }}
                      disabled={!selectedClass}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit.id || unit._id} value={unit.id || unit._id}>{unit.unit_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Topic</label>
                    <Select 
                      value={selectedSubunit || ""} 
                      onValueChange={setSelectedSubunit}
                      disabled={!selectedUnit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {subunits.filter(sub => (sub.unit_id === selectedUnit)).map((sub) => (
                          <SelectItem key={sub.id || sub._id} value={sub.id || sub._id}>{sub.subunit_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Due Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-10">
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate text-sm">{selectedDate ? format(selectedDate, 'PP') : 'Pick a date'}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start" sideOffset={5}>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <Button 
                    onClick={handleCreateAssignment}
                    disabled={!selectedClass || !selectedSubunit || !selectedDate || saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {saving ? "Saving..." : "Assign"}
                  </Button>
                </div>

                {/* Existing Assignments */}
                {assignments.length > 0 && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Assignments</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {assignments.map((assignment) => (
                        <div 
                          key={assignment.id || assignment._id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-black">{getSubunitName(assignment.subunit_id)}</p>
                              <p className="text-xs text-gray-500">{getClassName(assignment.class_id)} • Due {format(new Date(assignment.due_date + 'T00:00:00'), 'MMM d, yyyy')}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteAssignment(assignment.id || assignment._id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}