import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { 
  Loader2, 
  ArrowLeft,
  Play,
  Square,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import TaskModal from '../components/TaskModal';
import TaskList from '../components/TaskList';
import ItemDetails from '../components/ItemDetails';
import { Task, TimeEntry } from '../store/projectStore';

export default function TaskDetails() {
  const { projectId, '*': taskPath } = useParams<{ projectId: string; '*': string }>();
  const navigate = useNavigate();
  const {
    getTaskByPath,
    addTask,
    updateTask,
    deleteTask,
    currentPath,
    setCurrentPath,
    startTimer,
    stopTimer,
    getTaskTimeEntries,
    activeTimer,
    checkActiveTimer
  } = useProjectStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');
  const { user } = useAuthStore();

  useEffect(() => {
    const loadTask = async () => {
      if (!projectId || !taskPath) {
        navigate(`/dashboard/projects/${projectId}`);
        return;
      }

      try {
        setLoading(true);
        const pathArray = taskPath.split('/').filter(Boolean).map(id => ({ id }));
        setCurrentPath(pathArray);

        // Check for active timer when component mounts
        await checkActiveTimer();

        const data = await getTaskByPath(projectId, pathArray);
        if (data) {
          setTask({
            ...data,
            children: data.children || [],
          });

          // Load time entries
          const entries = await getTaskTimeEntries(projectId, data.id);
          setTimeEntries(entries);
        } else {
          toast.error('Task not found');
          navigate(`/dashboard/projects/${projectId}`);
        }
      } catch (error) {
        console.error('Error loading task:', error);
        toast.error('Failed to load task');
        navigate(`/dashboard/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
      }
    };

    loadTask();
    checkUserRole();

    return () => {
      setTask(null);
      setLoading(true);
      setIsAdmin(false);
      setCurrentPath([]);
    };
  }, [projectId, taskPath, user, getTaskByPath, navigate, setCurrentPath, getTaskTimeEntries, checkActiveTimer]);

  // Add timer update effect
  useEffect(() => {
    let intervalId: number;

    if (activeTimer.taskId === task?.id && activeTimer.startTime) {
      intervalId = window.setInterval(() => {
        const start = new Date(activeTimer.startTime!).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000); // difference in seconds

        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTimer.taskId, activeTimer.startTime, task?.id]);

  const handleAddTask = async (data: any) => {
    if (!projectId || !taskPath) return;
    try {
      const pathArray = taskPath.split('/').filter(Boolean).map(id => ({ id }));
      await addTask(projectId, pathArray, data);
      
      const updatedTask = await getTaskByPath(projectId, pathArray);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
        toast.success('Task added successfully');
      }
    } catch (error) {
      console.error('Failed to add task:', error);
      toast.error('Failed to add task');
    }
  };

  const handleEditTask = async (data: any) => {
    if (!projectId || !taskPath) return;
    try {
      const pathArray = taskPath.split('/').filter(Boolean).map(id => ({ id }));
      
      if (editingTask) {
        await updateTask(projectId, pathArray, editingTask.id, data);
      }
      
      const updatedTask = await getTaskByPath(projectId, pathArray);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
        toast.success('Task updated successfully');
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !taskPath) return;
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        const pathArray = taskPath.split('/').filter(Boolean).map(id => ({ id }));
        await deleteTask(projectId, pathArray, taskId);
        
        const updatedTask = await getTaskByPath(projectId, pathArray);
        if (updatedTask) {
          setTask({
            ...updatedTask,
            children: updatedTask.children || [],
          });
          toast.success('Task deleted successfully');
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        toast.error('Failed to delete task');
      }
    }
  };

  const handleTaskClick = (clickedTask: Task) => {
    const newPath = taskPath ? `${taskPath}/${clickedTask.id}` : clickedTask.id;
    navigate(`/dashboard/projects/${projectId}/task/${newPath}`);
  };

  const handleStartTimer = async () => {
    if (!projectId || !task) return;
    try {
      await startTimer(projectId, task.id);
      toast.success('Timer started');
      
      // Refresh time entries
      const entries = await getTaskTimeEntries(projectId, task.id);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Failed to start timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!projectId || !task) return;
    try {
      await stopTimer(projectId, task.id);
      toast.success('Timer stopped');
      setElapsedTime('00:00:00');
      
      // Refresh time entries
      const entries = await getTaskTimeEntries(projectId, task.id);
      setTimeEntries(entries);
    } catch (error) {
      console.error('Failed to stop timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  const aggregateTimeByUser = (entries: TimeEntry[]): { email: string; totalMinutes: number }[] => {
    const userTimes = entries.reduce((acc, entry) => {
      if (!entry.duration) return acc;
      
      // For non-admin users, only show their own time
      if (!isAdmin && entry.userId !== user?.uid) return acc;
      
      const key = entry.userName;
      if (!acc[key]) {
        acc[key] = {
          email: entry.userName,
          totalMinutes: 0
        };
      }
      acc[key].totalMinutes += entry.duration;
      return acc;
    }, {} as Record<string, { email: string; totalMinutes: number }>);

    return Object.values(userTimes);
  };

  const isTimerActive = activeTimer.taskId === task?.id;
  const isAssignedToCurrentUser = task?.assignedTo?.some(u => u.id === user?.uid);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6">
        <p className="text-red-500">Task not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold">{task.name}</h1>
        </div>
        {isAssignedToCurrentUser && (
          <div className="flex items-center space-x-4">
            {isTimerActive && (
              <div className="text-lg font-mono bg-gray-100 px-3 py-1 rounded">
                {elapsedTime}
              </div>
            )}
            {isTimerActive ? (
              <button
                onClick={handleStopTimer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Timer
              </button>
            ) : (
              <button
                onClick={handleStartTimer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Timer
              </button>
            )}
          </div>
        )}
      </div>

      <ItemDetails 
        item={task} 
        onEditClick={() => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        isAdmin={isAdmin}
      />

      {timeEntries.length > 0 && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Time Spent</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {aggregateTimeByUser(timeEntries).map((userTime) => (
                <div key={userTime.email} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">{userTime.email}</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatDuration(userTime.totalMinutes)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <TaskList
        tasks={task.children}
        onAddClick={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
        onEditClick={(task) => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        onDeleteClick={handleDeleteTask}
        onTaskClick={handleTaskClick}
        isAdmin={isAdmin}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask}
      />
    </div>
  );
}