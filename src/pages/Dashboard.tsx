import { useEffect, useState } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import {
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  FileQuestion,
  Briefcase,
  UserCheck,
  ListTodo,
  Users,
  DollarSign,
  TimerIcon,
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
import Todos from './Todos';
import Customers from "./Customers";
import OutsourceTeams from "./OutsourceTeams";
import Documents from "./Documents";
import Currencies from "./Currencies";
import TimeSheet from "./TimeSheet";
import Settings from "./Settings";
import MyTasks from "./MyTasks";
// Remove NewTeam and TeamDetails imports as they'll be handled in index.tsx

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { checkAttendance } = useAttendanceStore();
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const { user, userData } = useAuthStore();

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
    <div className="min-h-screen watermark bg-gray-50 flex flex-col">
      <div className="flex flex-1">
        <div
          className={`bg-white transition-all duration-300 lg:flex flex-col border-r-[1px] hidden ${isCollapsed ? "w-16" : "w-64"
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
                `flex items-center space-x-3 transition-all duration-500 rounded-xl ${isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <LayoutDashboard size={20} />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>
            {
              userData?.role === 'admin' && (
                <>
                  <NavLink
                    to="/dashboard/enquiries"
                    className={({ isActive }) =>
                      `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                        ? "bg-black/90 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                      } ${isCollapsed ? "justify-center p-2" : " p-4"}`
                    }
                  >
                    <FileQuestion size={20} />
                    {!isCollapsed && <span>Enquiries</span>}
                  </NavLink>
                  <NavLink
                    to="/dashboard/customers"
                    className={({ isActive }) =>
                      `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                        ? "bg-black/90 text-white"
                        : "text-gray-700 hover:bg-gray-50"
                      } ${isCollapsed ? "justify-center p-2" : " p-4"}`
                    }
                  >
                    <Users size={20} />
                    {!isCollapsed && <span>Customers</span>}
                  </NavLink>
                </>
              )
            }
            <NavLink
              to="/dashboard/projects"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
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
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <UserCheck size={20} />
              {!isCollapsed && <span>Attendance</span>}
            </NavLink>
            <NavLink
              to="/dashboard/todos"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <ListTodo size={20} />
              {!isCollapsed && <span>To Do</span>}
            </NavLink>
            <NavLink
              to="/dashboard/outsource-teams/"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <Briefcase size={20} />
              {!isCollapsed && <span>Outsource Teams</span>}
            </NavLink>
            <NavLink
              to="/dashboard/timesheet"
              className={({ isActive }) =>
                `flex items-center space-x-3 transition-all duration-500 rounded-xl mt-2 ${isActive
                  ? "bg-black/90 text-white"
                  : "text-gray-700 hover:bg-gray-50"
                } ${isCollapsed ? "justify-center p-2" : " p-4"}`
              }
            >
              <TimerIcon size={20} />
              {!isCollapsed && <span>Time Sheet</span>}
            </NavLink>
          </nav>
        </div>

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Basics />} />
            <Route path="/enquiries/*" element={<Enquiries />} />
            <Route path="/customers/*" element={<Customers />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/projects/:id/task/*" element={<TaskDetails />} />
            <Route path="/projects/:id/edit" element={<ProjectForm />} />
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/outsource-teams/*" element={<OutsourceTeams />} />
            <Route path="/projects/:projectId/documents/*" element={<Documents />} />
            <Route path="/currencies" element={<Currencies />} />
            <Route path="/timesheet" element={<TimeSheet />} />
            <Route path="/settings" element={<Settings/>} />
            <Route path="/mytasks" element={<MyTasks/>} />
          </Routes>
        </div>

        {user && (
          <AttendanceModal
            isOpen={showAttendanceModal}
            onClose={() => setShowAttendanceModal(false)}
          />
        )}
      </div>
    </div>
  );
}
