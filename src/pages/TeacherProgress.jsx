import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import TeacherLayout from "../components/teacher/TeacherLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TeacherProgress({ selectedClassId: propClassId }) {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(propClassId || null);
  const [students, setStudents] = useState([]);
  const [subunits, setSubunits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadProgress();
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (propClassId) {
      setSelectedClassId(propClassId);
    }
  }, [propClassId]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      // Get current user from MongoDB
      const userRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const user = await userRes.json();
      setTeacher(user);

      // Get classes for this teacher
      const teacherId = user._id || user.id;
      const classesRes = await fetch(`${API_BASE}/api/classes/teacher/${teacherId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const classData = await classesRes.json();
      setClasses(classData);

      const savedClassId = localStorage.getItem('teacherSelectedClassId');
      if (savedClassId && classData.some(c => (c.id || c._id) === savedClassId)) {
        setSelectedClassId(savedClassId);
      } else if (classData.length > 0) {
        setSelectedClassId(classData[0].id || classData[0]._id);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

      // Get class data
      const classRes = await fetch(`${API_BASE}/api/classes?id=${selectedClassId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const classData = await classRes.json();
      
      if (!classData) return;

      // Get curriculum
      const curriculumRes = await fetch(`${API_BASE}/api/curriculum?id=${classData.curriculum_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const curriculum = await curriculumRes.json();
      
      if (!curriculum) return;

      // Get units for this curriculum
      const unitsRes = await fetch(`${API_BASE}/api/units/curriculum/${curriculum.id || curriculum._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const units = await unitsRes.json();
      const sortedUnits = units.sort((a, b) => a.unit_order - b.unit_order);

      // Get all subunits for these units
      const allSubunits = [];
      for (const unit of sortedUnits) {
        const subunitsRes = await fetch(`${API_BASE}/api/subunits/unit/${unit.id || unit._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const unitSubunits = await subunitsRes.json();
        allSubunits.push(...unitSubunits);
      }
      
      const relevantSubunits = allSubunits.sort((a, b) => a.subunit_order - b.subunit_order);
      setSubunits(relevantSubunits);

      // Get enrollments for this class
      const enrollmentsRes = await fetch(`${API_BASE}/api/enrollments/class/${selectedClassId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const enrollments = await enrollmentsRes.json();

      // Get all progress data
      const progressRes = await fetch(`${API_BASE}/api/progress`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const allProgress = await progressRes.json();

      // Build student data
      const studentData = enrollments.map(enrollment => {
        const studentId = enrollment.student_id?._id || enrollment.student_id?.id || enrollment.student_id;
        const progress = allProgress.filter(p => {
          const pStudentId = p.student_id?._id || p.student_id?.id || p.student_id;
          return pStudentId?.toString() === studentId?.toString();
        });

        const progressMap = {};
        relevantSubunits.forEach(sub => {
          const subId = sub.id || sub._id;
          const p = progress.find(pr => {
            const prSubunitId = pr.subunit_id?._id || pr.subunit_id?.id || pr.subunit_id;
            return prSubunitId?.toString() === subId?.toString();
          });
          
          progressMap[subId] = {
            completed: p?.new_session_completed || false,
            learned: p?.learned_status || false
          };
        });

        return {
          id: studentId,
          name: enrollment.student_full_name || enrollment.student_id?.full_name || "Unknown",
          email: enrollment.student_email || enrollment.student_id?.email || "",
          progressMap
        };
      });

      setStudents(studentData);
    } catch (err) {
      console.error("Failed to load progress:", err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate(createPageUrl("Login"));
  };

  const handleClassChange = (classId) => {
    setSelectedClassId(classId);
    localStorage.setItem('teacherSelectedClassId', classId);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="progress" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-black mb-1">Student Progress</h1>
              <p className="text-sm text-gray-600">Track individual student progress across all topics</p>
            </div>
            {classes.length > 0 && (
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id || cls._id} value={cls.id || cls._id}>
                      {cls.class_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {!selectedClassId ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">Select a class</h3>
                <p className="text-gray-600">Choose a class to view student progress</p>
              </div>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">No students yet</h3>
                <p className="text-gray-600">Students will appear here once they join the class</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {students.map((student) => {
              const completed = Object.values(student.progressMap).filter(p => p.completed).length;
              const learned = Object.values(student.progressMap).filter(p => p.learned).length;
              const total = subunits.length;

              return (
                <Card key={student.id} className="border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-lg text-blue-600">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-black text-lg">{student.name}</h3>
                          <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{completed}/{total}</p>
                          <p className="text-xs text-gray-600">Completed</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{learned}/{total}</p>
                          <p className="text-xs text-gray-600">Learned</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-10 gap-2">
                      {subunits.map((subunit) => {
                        const subId = subunit.id || subunit._id;
                        const progress = student.progressMap[subId];
                        return (
                          <div
                            key={subId}
                            className={`h-8 rounded flex items-center justify-center text-xs font-semibold ${
                              progress.learned ? 'bg-blue-500 text-white' :
                              progress.completed ? 'bg-green-500 text-white' :
                              'bg-gray-200 text-gray-400'
                            }`}
                            title={`${subunit.subunit_name} - ${progress.learned ? 'Learned' : progress.completed ? 'Completed' : 'Not started'}`}
                          >
                            {progress.learned ? <CheckCircle className="w-4 h-4" /> :
                             progress.completed ? <Clock className="w-4 h-4" /> : ''}
                          </div>
                        );
                      })}
                    </div>
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