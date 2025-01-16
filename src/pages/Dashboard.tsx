import React, { useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft,
  LayoutDashboard,
  FileQuestion,
  Briefcase
} from 'lucide-react';
import Enquiries from './Enquiries';
import Projects from './Projects';
import ProjectDetails from './ProjectDetails';
import ProjectForm from './ProjectForm';
import TaskDetails from './TaskDetails';
import Basics from './Basics';

export default function Dashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex">
      <div className={`bg-white shadow-lg transition-all duration-300 flex flex-col ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="p-4 flex justify-between items-center border-b">
          {!isCollapsed && <span className="font-semibold">Navigation</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded-lg"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        <nav className="flex-1 p-4">
          <NavLink
            to="/dashboard"
            end
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <LayoutDashboard size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </NavLink>
          <NavLink
            to="/dashboard/enquiries"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg mt-2 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <FileQuestion size={20} />
            {!isCollapsed && <span>Enquiries</span>}
          </NavLink>
          <NavLink
            to="/dashboard/projects"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-2 rounded-lg mt-2 ${
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
          >
            <Briefcase size={20} />
            {!isCollapsed && <span>Projects</span>}
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
        </Routes>
      </div>
    </div>
  );
}