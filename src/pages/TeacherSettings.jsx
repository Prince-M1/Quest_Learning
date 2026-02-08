import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TeacherLayout from "../components/teacher/TeacherLayout";
import { Loader2, Save, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function TeacherSettings() {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState({ full_name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Here we make sure 'name' from the database shows up as 'full_name' on screen
        setTeacher({ 
          ...data, 
          full_name: data.name || data.full_name || "" 
        });
        localStorage.setItem("user", JSON.stringify(data));
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Failed to load:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: teacher.full_name,
        }),
      });

      if (response.ok) {
        toast.success("Profile updated!");
        // Refresh the data so the UI stays in sync
        loadTeacherData();
      } else {
        toast.error("Failed to save changes.");
      }
    } catch (err) {
      toast.error("Connection error.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TeacherLayout activeNav="settings" user={teacher} onSignOut={handleSignOut}>
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-semibold text-black mb-1">Settings</h1>
            <p className="text-sm text-gray-600">Manage your account and preferences</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>

        <Card className="border border-gray-200 mb-6 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <Input 
                value={teacher.full_name || ""} 
                onChange={(e) => setTeacher({...teacher, full_name: e.target.value})}
                placeholder="Enter your full name"
                className="max-w-md"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <Input 
                value={teacher.email || ""} 
                disabled 
                className="max-w-md bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}