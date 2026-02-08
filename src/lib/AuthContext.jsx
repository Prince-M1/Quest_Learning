// src/lib/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";

const AuthContext = createContext(null);

function getToken() {
  return localStorage.getItem("token");
}

function setToken(token) {
  if (!token) localStorage.removeItem("token");
  else localStorage.setItem("token", token);
}

function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  const API_BASE = useMemo(() => {
    return (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");
  }, []);

  const fetchMe = async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }

    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      clearAuthStorage();
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: "auth_required", message: "Authentication required" });
      return null;
    }

    const me = data?.user || data;

    if (me) {
      // If the user is a teacher, we "force" the active status
      if (me.account_type === 'teacher' || !me.account_type) {
        me.account_type = 'teacher';
        me.subscription_status = 'active';
        me.onboarded = true;
        me.subscribed = true; 
        me.role = 'teacher';
      }

      setUser(me);
      setIsAuthenticated(true);
      setAuthError(null);
      localStorage.setItem("user", JSON.stringify(me));
      
      // 🔧 CRITICAL: Log the subscription tier so we can debug
      console.log("✅ [AUTH CONTEXT] User loaded. Subscription tier:", me.subscription_tier);
    }

    return me;
  };

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    try {
      await fetchMe(); 
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;

    const token = getToken();
    
    if (token) {
      hasChecked.current = true;
      checkAppState();
    } else {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  }, []);

  const logout = (shouldRedirect = true) => {
    clearAuthStorage();
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);

    if (shouldRedirect) {
      window.location.href = "/login";
    }
  };

  const navigateToLogin = (nextUrl) => {
    const next =
      typeof nextUrl === "string" && nextUrl.trim()
        ? nextUrl
        : window.location.pathname + window.location.search;

    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  };

  // 🔧 NEW: Force refresh user from database (for after payment)
  const refreshUser = async () => {
    console.log("🔄 [AUTH CONTEXT] Force refreshing user...");
    await fetchMe();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        checkAppState,
        fetchMe,
        refreshUser, // 🔧 NEW: Expose this for payment success
        getToken,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
