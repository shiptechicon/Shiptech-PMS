import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { useAttendanceStore } from '../store/attendanceStore';
import { Calendar, Clock, AlertCircle, UserCheck } from 'lucide-react';

export default function MemberBasics() {
  const navigate = useNavigate();
  const { userTasks, fetchUserTasks, loading } = useProjectStore();
  const { checkAttendance } = useAttendanceStore();
  const [hasMarkedAttendance, setHasMarkedAttendance] = React.useState(true);

  useEffect(() => {
    fetchUserTasks();
  }, [fetchUserTasks]);

  useEffect(() => {
    const checkUserAttendance = async () => {
      const marked = await checkAttendance();
      setHasMarkedAttendance(marked);
    };
    checkUserAttendance();
  }, [checkAttendance]);

  const handleTaskClick = (projectId: string, taskPath: string) => {
    navigate(`/dashboard/projects/${projectId}/task/${taskPath}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {!hasMarkedAttendance && (
        <div 
          onClick={() => navigate('/dashboard/attendance')}
          className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 cursor-pointer hover:bg-red-100 transition-colors duration-200"
        >
          <div className="flex items-center">
            <UserCheck className="h-6 w-6 text-red-400 mr-3" />
            <div>
              <h3 className="text-red-800 font-medium">Mark Your Attendance</h3>
              <p className="text-red-700 text-sm">Please mark your attendance for today. Click here to mark attendance.</p>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold mb-6">My Tasks</h2>
      <div className="bg-white rounded-lg shadow">
        {userTasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-gray-400" />
            </div>
            <p>No tasks assigned to you yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {userTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task.projectId as string, task.path as string)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{task.name}</h3>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {task.hours && (
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{task.hours} hours</span>
                        </div>
                      )}
                      {task.deadline && (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-sm ${
                    task.completed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.completed ? 'Completed' : 'In Progress'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}