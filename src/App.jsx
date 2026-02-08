import React from 'react';
import SignIn from '@/pages/SignIn';
import SignUp from "@/pages/SignUp";
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { GoogleOAuthProvider } from "@react-oauth/google";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword.jsx";
import ResetPassword from "@/pages/ResetPassword.jsx";
import RoleSelection from "@/pages/RoleSelection"; 
import Landing from './pages/Landing';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, user } = useAuth();

  if ((isLoadingPublicSettings || isLoadingAuth) && !user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Strict Protection for Dashboard/Internal pages
  if (!isLoadingAuth && !isAuthenticated && !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Routes>
      <Route index element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />

      {Object.entries(Pages)
        // 🚀 FILTER OUT the semi-protected onboarding pages
        .filter(([path]) => !["RoleSelection", "Pricing", "JoinClass"].includes(path))
        .map(([path, Page]) => (
        <Route
          key={path}
          path={path}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function AppContent() {
  return (
    <Router>
      <NavigationTracker />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* 🚀 SEMI-PROTECTED ONBOARDING - These bypass the 'AuthenticatedApp' bouncer */}
        <Route path="/roleselection" element={<RoleSelection />} />
        <Route path="/pricing" element={<Pages.Pricing />} />
        <Route path="/joinclass" element={<Pages.JoinClass />} />
        
        {/* PROTECTED APP - Handles Dashboards and actual app content */}
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
      <Toaster />
      <VisualEditAgent />
    </Router>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <AppContent />
        </QueryClientProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;