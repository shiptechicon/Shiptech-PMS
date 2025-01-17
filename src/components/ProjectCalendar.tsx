import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';

interface Project {
  id: string;
  name: string;
  project_due_date: string | null;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  projects: Project[];
}

export default function ProjectCalendar() {
  const navigate = useNavigate();
  const { projects, fetchProjects } = useProjectStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);

  // Fetch projects when component mounts
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Generate calendar days for the current month
  useEffect(() => {
    const generateCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Get the first day of the month
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDayOfWeek = firstDayOfMonth.getDay();
      
      // Get the last day of the month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();
      
      // Get the last day of the previous month
      const lastDayOfPrevMonth = new Date(year, month, 0).getDate();
      
      const calendarDays: CalendarDay[] = [];
      
      // Add days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, lastDayOfPrevMonth - i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
          projects: []
        });
      }
      
      // Add days from current month
      for (let i = 1; i <= totalDaysInMonth; i++) {
        const date = new Date(year, month, i);
        date.setHours(0, 0, 0, 0); // Reset time part for comparison
        
        // Find projects due on this date
        const dueProjects = projects.filter(project => {
          if (!project.project_due_date) return false;
          
          const dueDate = new Date(project.project_due_date);
          dueDate.setHours(0, 0, 0, 0); // Reset time part for comparison
          
          return dueDate.getTime() === date.getTime();
        });
        
        calendarDays.push({
          date,
          isCurrentMonth: true,
          projects: dueProjects
        });
      }
      
      // Add days from next month to complete the grid
      const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
          projects: []
        });
      }
      
      setCalendar(calendarDays);
    };

    generateCalendar();
  }, [currentDate, projects]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Project Calendar</h3>
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-lg text-gray-900">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {calendar.map((day, index) => (
          <div
            key={index}
            className={`min-h-[100px] bg-white p-2 ${
              day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            } ${isToday(day.date) ? 'bg-blue-50' : ''}`}
          >
            <div className={`font-medium text-sm mb-1 ${
              isToday(day.date) ? 'text-blue-600' : ''
            }`}>
              {day.date.getDate()}
            </div>
            <div className="space-y-1">
              {day.projects.map(project => (
                <div
                  key={project.id}
                  onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                  className="text-xs bg-blue-100 text-blue-800 rounded px-2 py-1 truncate cursor-pointer hover:bg-blue-200"
                  title={project.name}
                >
                  {project.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}