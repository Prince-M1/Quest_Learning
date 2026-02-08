/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Classes from './pages/Classes';
import CreateCurriculum from './pages/CreateCurriculum';
import CreateLiveSession from './pages/CreateLiveSession';
import Curriculum from './pages/Curriculum';
import Demo from './pages/Demo';
import JoinClass from './pages/JoinClass';
import KnowledgeMap from './pages/KnowledgeMap';
import Landing from './pages/Landing';
import LearningHub from './pages/LearningHub';
import ManageCurriculum from './pages/ManageCurriculum';
import ManageLiveSession from './pages/ManageLiveSession';
import NewSession from './pages/NewSession';
import PracticeSession from './pages/PracticeSession';
import Pricing from './pages/Pricing';
import PricingInfo from './pages/PricingInfo';
import Progress from './pages/Progress';
import RoleSelection from './pages/RoleSelection';
import SocraticInquiry from './pages/SocraticInquiry';
import StudentLiveSession from './pages/StudentLiveSession';
import TeacherAnalytics from './pages/TeacherAnalytics';
import TeacherClassDetail from './pages/TeacherClassDetail';
import TeacherClasses from './pages/TeacherClasses';
import TeacherCurricula from './pages/TeacherCurricula';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLeaderboard from './pages/TeacherLeaderboard';
import TeacherLiveSession from './pages/TeacherLiveSession';
import TeacherProgress from './pages/TeacherProgress';
import TeacherSettings from './pages/TeacherSettings';
import TeacherStudentDetail from './pages/TeacherStudentDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Classes": Classes,
    "CreateCurriculum": CreateCurriculum,
    "CreateLiveSession": CreateLiveSession,
    "Curriculum": Curriculum,
    "Demo": Demo,
    "JoinClass": JoinClass,
    "KnowledgeMap": KnowledgeMap,
    "Landing": Landing,
    "LearningHub": LearningHub,
    "ManageCurriculum": ManageCurriculum,
    "ManageLiveSession": ManageLiveSession,
    "NewSession": NewSession,
    "PracticeSession": PracticeSession,
    "Pricing": Pricing,
    "PricingInfo": PricingInfo,
    "Progress": Progress,
    "RoleSelection": RoleSelection,
    "SocraticInquiry": SocraticInquiry,
    "StudentLiveSession": StudentLiveSession,
    "TeacherAnalytics": TeacherAnalytics,
    "TeacherClassDetail": TeacherClassDetail,
    "TeacherClasses": TeacherClasses,
    "TeacherCurricula": TeacherCurricula,
    "TeacherDashboard": TeacherDashboard,
    "TeacherLeaderboard": TeacherLeaderboard,
    "TeacherLiveSession": TeacherLiveSession,
    "TeacherProgress": TeacherProgress,
    "TeacherSettings": TeacherSettings,
    "TeacherStudentDetail": TeacherStudentDetail,
}

export const pagesConfig = {
    mainPage: "LearningHub",
    Pages: PAGES,
    Layout: __Layout,
};