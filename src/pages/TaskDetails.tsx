import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProjectStore } from "../store/projectStore";
import { Loader2, ArrowLeft, Play, Square, Clock, User, Plus, Minus } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import TaskModal from "../components/TaskModal";
import TaskList from "../components/TaskList";
import ItemDetails from "../components/ItemDetails";
import { Task, TimeEntry } from "../store/projectStore";

export default function TaskDetails() {
  const { id : projectId, "*": taskPath } = useParams();

  const navigate = useNavigate();
  const {
    getTaskByPath,
    addTask,
    currentPath,
    updateTask,
    deleteTask,
    setCurrentPath,
    startTimer,
    stopTimer,
    getTaskTimeEntries,
    activeTimer,
    toggleTaskCompletion,
    checkActiveTimer,
  } = useProjectStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const { user } = useAuthStore();
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(0);

  const formatTimeDisplay = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const loadTask = async () => {
    if (!projectId || !taskPath) {
      navigate(`/dashboard/projects/${projectId}`);
      return;
    }

    try {
      setLoading(true);
      const pathArray = taskPath
        .split("/")
        .filter(Boolean)
        .map((id) => ({ id }));
      setCurrentPath(pathArray);

      const data = await getTaskByPath(projectId, pathArray);
      if (data) {
        setTask({
          ...data,
          children: data.children || [],
        });

        // Load time entries and set current duration
        const entries = await getTaskTimeEntries(projectId, data.id);
        setTimeEntries(entries);
        
        // Find current user's entry and set initial duration
        findUserEntry(entries);
      } else {
        toast.error("Task not found");
        navigate(`/dashboard/projects/${projectId}`);
      }
    } catch (error) {
      console.error("Error loading task:", error);
      toast.error("Failed to load task");
      navigate(`/dashboard/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  };

  const findUserEntry = (entries: TimeEntry[]) => {
    const userEntry = entries.find(entry => entry.userId === user?.uid);
    if (userEntry) {
      setCurrentDuration(userEntry.duration || 0);
      // Display the current duration
      const totalSeconds = Math.floor(userEntry.duration * 60); // Convert minutes to seconds
      setElapsedTime(formatTimeDisplay(totalSeconds));
    }
  };

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    const initializeActiveTimer = async () => {
      try {
        await checkActiveTimer();
      } catch (error) {
        console.error("Error checking active timer:", error);
      }
    };

    loadTask();
    checkUserRole();
    initializeActiveTimer();

    return () => {
      setTask(null);
      setLoading(true);
      setIsTimerActive(false);
      setManualHours(0);
      setManualMinutes(0);
      setCurrentDuration(0);
      setElapsedTime("00:00:00");
      setIsAdmin(false);
      setCurrentPath([]);
    };
  }, [
    projectId,
    taskPath,
    user,
    getTaskByPath,
    navigate,
    setCurrentPath,
    getTaskTimeEntries,
    checkActiveTimer,
  ]);

  // Timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isTimerActive && activeTimer.startTime && activeTimer.taskId === task?.id) {
      const updateElapsedTime = () => {
        const start = new Date(activeTimer.startTime!).getTime();
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - start) / 1000);

        // Calculate total seconds including the current duration
        const totalMinutes = Math.floor(currentDuration);
        const totalSeconds = Math.floor(totalMinutes * 60) + elapsedSeconds;

        setElapsedTime(formatTimeDisplay(totalSeconds));
      };

      updateElapsedTime();
      intervalId = setInterval(updateElapsedTime, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerActive, activeTimer, task?.id, currentDuration]);

  const handleToggleComplete = async () => {
    if (!projectId || !task) return;

    // Check if task has subtasks and if they're all complete
    const hasSubtasks = task.children && task.children.length > 0;
    const allSubtasksComplete = hasSubtasks
      ? task.children.every((subtask) => subtask.completed)
      : true;

    if (hasSubtasks && !allSubtasksComplete && !task.completed) {
      toast.error("Cannot complete task - some subtasks are still pending");
      return;
    }

    try {
      const pathArray = taskPath
        ?.split("/")
        .filter(Boolean)
        .map((id) => ({ id }));
      await toggleTaskCompletion(projectId, pathArray || []);

      // Refresh task data
      const updatedTask = await getTaskByPath(projectId, pathArray || []);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
        toast.success(
          updatedTask.completed
            ? "Task marked as complete"
            : "Task marked as incomplete"
        );
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast.error("Failed to update task status");
    }
  };

  const handleAddTask = async (
    data: Omit<Task, "id" | "completed" | "children">
  ) => {
    if (!projectId || !taskPath) return;
    try {
      const pathArray = taskPath
        .split("/")
        .filter(Boolean)
        .map((id) => ({ id }));

      const taskToAdd = {
        ...data,
        percentage: data.percentage || 0, // Ensure percentage is included
      };

      await addTask(projectId, pathArray, taskToAdd);

      const updatedTask = await getTaskByPath(projectId, pathArray);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
        toast.success("Task added successfully");
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to add task");
    }
  };

  const handleEditTask = async (data: Partial<Task>) => {
    if (!projectId || !taskPath || !editingTask) return;
    try {
      const pathArray = taskPath
        .split("/")
        .filter(Boolean)
        .map((id) => ({ id }));

      // Ensure we maintain required fields when updating
      const updatedData = {
        ...editingTask, // Keep existing task data
        ...data, // Override with new data
        percentage:
          typeof data.percentage === "number"
            ? data.percentage
            : editingTask.percentage,
        completed: editingTask.completed, // Maintain completion status
        children: editingTask.children, // Maintain children
      };

      await updateTask(projectId, pathArray, editingTask.id, updatedData);

      const updatedTask = await getTaskByPath(projectId, pathArray);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
        toast.success("Task updated successfully");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!projectId || !taskPath) return;
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        const pathArray = taskPath
          .split("/")
          .filter(Boolean)
          .map((id) => ({ id }));
        await deleteTask(projectId, pathArray, taskId);

        const updatedTask = await getTaskByPath(projectId, pathArray);
        if (updatedTask) {
          setTask({
            ...updatedTask,
            children: updatedTask.children || [],
          });
          toast.success("Task deleted successfully");
        }
      } catch (error) {
        console.error("Failed to delete task:", error);
        toast.error("Failed to delete task");
      }
    }
  };

  const handleTaskClick = (clickedTask: Task) => {
    const newPath = taskPath ? `${taskPath}/${clickedTask.id}` : clickedTask.id;
    navigate(`/dashboard/projects/${projectId}/task/${newPath}`);
  };

  const handleStartTimer = async () => {
    try {
      if (!projectId || !task) return;
      await startTimer(projectId, task.id);
      setIsTimerActive(true);
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handleStopTimer = async () => {
    try {
      if (!projectId || !task) return;
      await stopTimer(projectId, task.id);
      setIsTimerActive(false);
      
      // Update current duration from the latest time entries
      const entries = await getTaskTimeEntries(projectId, task.id);
      const userEntry = entries.find(entry => entry.userId === user?.uid);
      if (userEntry) {
        setCurrentDuration(userEntry.duration || 0);
        const totalSeconds = Math.floor(userEntry.duration * 60);
        setElapsedTime(formatTimeDisplay(totalSeconds));
      }
      setTimeEntries(entries); // Refetch time entries
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const aggregateTimeByUser = (
    entries: TimeEntry[]
  ): { email: string; totalMinutes: number }[] => {
    const userTimes = entries.reduce((acc, entry) => {
      if (!entry.duration) return acc;

      const key = entry.userName;
      if (!acc[key]) {
        acc[key] = {
          email: entry.userName,
          totalMinutes: 0,
        };
      }
      acc[key].totalMinutes += entry.duration;
      return acc;
    }, {} as Record<string, { email: string; totalMinutes: number }>);

    return Object.values(userTimes);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = (minutes % 60).toFixed(0);
    return `${hours}h ${remainingMinutes}m`;
  };

  const isAssignedToCurrentUser = task?.assignedTo?.some(
    (u) => u.id === user?.uid
  );

  const handleTasksUpdate = (updatedTasks: Task[]) => {
    // Update the local state with new task percentages
    if (task) {
      setTask((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          children: updatedTasks,
        };
      });
    }
  };

  const handleOpenManualEntry = () => {
    setManualHours(0);
    setManualMinutes(0);
    setShowManualEntry(true);
  };

  const handleManualTimeAdd = async () => {
    try {
      if (!projectId || !task) return;
      
      const totalMinutes = (manualHours * 60) + manualMinutes;
      
      if (totalMinutes <= 0) {
        toast.error("Please enter a valid time");
        return;
      }

      // Add the new time to the current duration
      const newDuration = currentDuration + totalMinutes;
      // Find existing time entry for current user
      const existingEntry = task.timeEntries?.find(entry => entry.userId === user?.uid);

      let updatedTimeEntries;
      if (existingEntry) {
        // Update existing entry
        updatedTimeEntries = task.timeEntries?.map(entry => {
          if (entry.userId === user?.uid) {
            console.log("entry", entry);
            const newDuration = entry.duration + totalMinutes;
            console.log("newDuration", newDuration);
            return {
              ...entry,
              duration: newDuration,
            };
          }
          return entry;
        });
      } else {
        // Add new entry
        updatedTimeEntries = [
          ...(task.timeEntries || []),
          {
            userId: user?.uid || '',
            userName: user?.email || '',
            duration: totalMinutes,
            startTime: new Date().toISOString(),
            id: crypto.randomUUID()
          }
        ];
      }

      await updateTask(projectId, currentPath, task.id, {
        ...task,
        timeEntries: updatedTimeEntries
      });
      

      setTask({
        ...task,
        timeEntries: updatedTimeEntries
      });
      // Update the display with the new total duration
      setCurrentDuration(newDuration);
      setElapsedTime(formatTimeDisplay(newDuration * 60)); // Convert minutes to seconds and format

      setShowManualEntry(false);
      const entries = await getTaskTimeEntries(projectId, task.id);
      findUserEntry(entries);
      setTimeEntries(entries); // Refetch time entries
      toast.success("Time added successfully");
    } catch (error) {
      console.error("Error updating time:", error);
      toast.error("Failed to update time");
    }
  };

  const handleUpdatePercentage = async (taskId: string, percentage: number) => {
    try {
      if (!projectId || !task) return;
      
      await updateTask(projectId, currentPath, taskId, {
        ...task,
        percentage: percentage
      });

      // Refresh task data
      const updatedTask = await getTaskByPath(projectId, currentPath);
      if (updatedTask) {
        setTask({
          ...updatedTask,
          children: updatedTask.children || [],
        });
      }

      toast.success('Progress updated successfully');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
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
    <div className="p-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className=" h-7 w-7" />
          </button>
          <h1 className="text-2xl font-bold">{task.name}</h1>
        </div>
        {isAssignedToCurrentUser && (
          <div className="flex items-center space-x-4">
            {(isTimerActive || currentDuration > 0) && (
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-md">
                <Clock className="h-4 w-4" />
                <span className="font-mono">{elapsedTime}</span>
              </div>
            )}
            <button
              onClick={isTimerActive ? handleStopTimer : handleStartTimer}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                isTimerActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isTimerActive ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Stop Timer
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Timer
                </>
              )}
            </button>
            
            <button
              onClick={handleOpenManualEntry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Time
            </button>
          </div>
        )}
      </div>

      <ItemDetails
        item={
          task as {
            name: string;
            description?: string | undefined;
            assignedTo?: { fullName: string }[] | undefined;
            deadline?: string | undefined;
            completed: boolean;
            hours?: number | undefined;
            costPerHour?: number | undefined;
            children?: Task[] | undefined;
            id: string;
          }
        }
        tasks={task.children}
        onEditClick={() => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        onToggleComplete={handleToggleComplete}
        isAdmin={isAdmin}
        canComplete={
          isAdmin || task.assignedTo?.some((u) => u.id === user?.uid)
        }
      />

      {timeEntries.length > 0 && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Time Spent</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {aggregateTimeByUser(timeEntries).map((userTime) => (
                <div
                  key={userTime.email}
                  className="flex items-center justify-between"
                >
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
        tasks={task?.children || []}
        onAddClick={() => setIsModalOpen(true)}
        onEditClick={(task) => {
          setEditingTask(task);
          setIsModalOpen(true);
        }}
        onDeleteClick={handleDeleteTask}
        onTaskClick={handleTaskClick}
        // onUpdatePercentage={handleUpdatePercentage}
        isAdmin={isAdmin}
        currentUserId={user?.uid}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditTask : handleAddTask}
        initialData={editingTask || undefined}
      />

      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium mb-4">Add Time Manually</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <div className="text-sm text-gray-500 mb-1">Current Duration</div>
              <div className="text-lg font-medium">
                {Math.floor(currentDuration / 60)}h {Math.floor(currentDuration % 60)}m
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours to Add
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() => setManualHours(Math.max(0, manualHours - 1))}
                    className="p-2 bg-gray-100 rounded-l-md hover:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={manualHours}
                    onChange={(e) => setManualHours(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center border-y p-2"
                  />
                  <button
                    onClick={() => setManualHours(manualHours + 1)}
                    className="p-2 bg-gray-100 rounded-r-md hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minutes to Add
                </label>
                <div className="flex items-center">
                  <button
                    onClick={() => setManualMinutes(Math.max(0, manualMinutes - 15))}
                    className="p-2 bg-gray-100 rounded-l-md hover:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={manualMinutes}
                    onChange={(e) => setManualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    className="w-full text-center border-y p-2"
                  />
                  <button
                    onClick={() => setManualMinutes(Math.min(59, manualMinutes + 15))}
                    className="p-2 bg-gray-100 rounded-r-md hover:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="text-sm text-blue-600 mb-1">New Total Duration</div>
              <div className="text-lg font-medium text-blue-700">
                {Math.floor((currentDuration + manualHours * 60 + manualMinutes) / 60)}h{" "}
                {Math.floor((currentDuration + manualHours * 60 + manualMinutes) % 60)}m
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowManualEntry(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleManualTimeAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
