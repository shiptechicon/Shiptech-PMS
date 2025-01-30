import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  FileQuestion,
  Briefcase,
  UserCheck,
} from "lucide-react";
import Enquiries from "./Enquiries";
import Projects from "./Projects";
import ProjectDetails from "./ProjectDetails";
import ProjectForm from "./ProjectForm";
import TaskDetails from "./TaskDetails";
import Basics from "./Basics";
import Attendance from "./Attendance";
import { useAttendanceStore } from "@/store/attendanceStore";
import { useAuthStore } from "@/store/authStore";
import AttendanceModal from "@/components/AttendanceModal";

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { checkAttendance } = useAttendanceStore();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const checkUserAttendance = async () => {
      const hasMarkedAttendance = await checkAttendance();
      if (!hasMarkedAttendance) {
        setShowAttendanceModal(true);
      }
    };

    if (user) {
      checkUserAttendance();
    }
  }, [checkAttendance, user]);

  return (
    <div className="min-h-screen bg-bggray flex">
      <div
        className={`bg-white transition-all duration-300 flex flex-col border-r-[1px] ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="p-4 flex justify-between items-center border-b">
          {!isCollapsed && <span className="font-semibold">Navigation</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded-xl"
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        </div>
        <nav className="flex-1 p-2">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center space-x-3 transition-all duration-500 rounded-xl ${
                isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center p-2" : " p-4"}`
            }
          >
            <LayoutDashboard size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink
            to="/dashboard/enquiries"
            className={({ isActive }) =>
              `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center p-2" : " p-4"}`
            }
          >
            <FileQuestion size={20} />
            {!isCollapsed && <span>Enquiries</span>}
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) =>
              `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center p-2" : " p-4"}`
            }
          >
            <Briefcase size={20} />
            {!isCollapsed && <span>Projects</span>}
          </NavLink>
          <NavLink
            to="/dashboard/attendance"
            className={({ isActive }) =>
              `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${
                isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
              } ${isCollapsed ? "justify-center p-2" : " p-4"}`
            }
          >
            <UserCheck size={20} />
            {!isCollapsed && <span>Attendance</span>}
          </NavLink>
        </nav>
      </div>

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Basics />} />
          <Route path="/enquiries/*" element={<Enquiries />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetails />} />
          <Route path="/projects/:projectId/task/*" element={<TaskDetails />} />
          <Route path="/projects/:id/edit" element={<ProjectForm />} />
          <Route path="/projects/new" element={<ProjectForm />} />
          <Route path="/attendance" element={<Attendance />} />
        </Routes>
      </div>

      {user && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}
    </div>
  );
}
