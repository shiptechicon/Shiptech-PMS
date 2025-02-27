import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useParams } from "react-router-dom";
import { useProjectStore, Task, User } from "../store/projectStore";
import { UserData } from "../store/authStore";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Task) => Promise<void>;
  initialData?: Task;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TaskModalProps) {
  const { projectId, "*": taskPath } = useParams<{
    projectId: string;
    "*": string;
  }>();
  const { fetchUsers, fetchProject } = useProjectStore();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    hours: undefined as number | undefined,
    costPerHour: undefined as number | undefined,
    assignedTo: [] as { id: string; fullName: string; email: string }[],
    deadline: "",
    percentage: 0,
  });

  const [siblingTasks, setSiblingTasks] = useState<Task[]>([]);
  const [availablePercentage, setAvailablePercentage] = useState(100);
  const [users, setUsers] = useState<User[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);

  // Get verified users from state or fetch if needed
  useEffect(() => {

    if (!isOpen) return;

    const getUsers = async () => {
      try {
        const usersCollection = await fetchUsers();
        const verifiedUsers = usersCollection
          .filter((user) => {
            const userDetails = user as unknown as UserData;
            return userDetails.verified && userDetails.role !== "customer";
          })
          .map(({ id, fullName, email }) => ({ id, fullName, email }));

        setUsers(verifiedUsers);
      } catch (error) {
        console.error("Error getting users:", error);
      }
    };

    getUsers();
  }, [isOpen, fetchUsers]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        description: initialData.description || "",
        hours: initialData.hours,
        costPerHour: initialData.costPerHour,
        assignedTo: initialData.assignedTo || [],
        deadline: initialData.deadline || "",
        percentage: initialData.percentage || 0,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        hours: undefined,
        costPerHour: undefined,
        assignedTo: [],
        deadline: "",
        percentage: 0,
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    const fetchSiblingTasks = async () => {
      if (!projectId || !isOpen) return;

      try {
        // First fetch the project
        const project = await fetchProject(projectId);
        if (!project) return;

        // Parse the task path to get task IDs
        const taskIds = taskPath?.split('/').filter(Boolean) || [];
        
        // If no task IDs, we're at root level
        if (taskIds.length === 0) {
          setSiblingTasks(project.tasks);
          return;
        }

        let currentLevel = project.tasks;
        let siblings: Task[] = [];

        // Check if we're editing the task that's in the URL's last segment
        const lastTaskId = taskIds[taskIds.length - 1];
        const isEditingLastTask = initialData && initialData.id === lastTaskId;

        if (isEditingLastTask) {
          // We're editing the task that's in the URL
          // Go up to its parent level to get siblings
          for (let i = 0; i < taskIds.length - 1; i++) {
            const currentTask = currentLevel.find(task => task.id === taskIds[i]);
            if (currentTask) {
              currentLevel = currentTask.children;
            } else {
              console.error('Task not found in hierarchy');
              return;
            }
          }
          siblings = currentLevel;
        } else {
          // We're editing a subtask of the task in the URL
          // Find the parent task and get its children as siblings
          for (let i = 0; i < taskIds.length; i++) {
            const currentTask = currentLevel.find(task => task.id === taskIds[i]);
            if (currentTask) {
              currentLevel = currentTask.children;
              if (i === taskIds.length - 1) {
                // This is the parent task of what we're editing
                siblings = currentTask.children;
              }
            } else {
              console.error('Task not found in hierarchy');
              return;
            }
          }
        }

        console.log('Found siblings:', siblings);
        setSiblingTasks(siblings);

        // Calculate total percentage excluding current task
        const otherTasksTotal = siblings.reduce((acc, task) => {
          if (initialData && task.id === initialData.id) return acc;
          return acc + (task.percentage || 0);
        }, 0);

        setTotalPercentage(otherTasksTotal);

        // If editing, add back current task's percentage to available amount
        const currentTaskPercentage = initialData?.percentage || 0;
        const available = 100 - otherTasksTotal + (initialData ? currentTaskPercentage : 0);
        
        setAvailablePercentage(Math.max(0, Math.min(100, available)));

        // Adjust form data percentage if it exceeds available
        if (formData.percentage > available) {
          setFormData(prev => ({
            ...prev,
            percentage: available
          }));
        }

      } catch (error) {
        console.error('Error fetching sibling tasks:', error);
      }
    };

    fetchSiblingTasks();
  }, [projectId, taskPath, isOpen, initialData, fetchProject]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData = {
      ...formData,
      id: initialData?.id || '',
      completed: initialData?.completed || false,
      children: initialData?.children || []
    };
    onSubmit(taskData);
    onClose();
  };

  const handleAssignedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedUsers = selectedOptions
      .map((option) => users.find((user) => user.id === option.value))
      .filter((user): user is User => user !== undefined);

    setFormData((prev) => ({ ...prev, assignedTo: selectedUsers }));
  };

  const calculateAvailablePercentage = () => {
    const totalAllocated = siblingTasks
      .filter(task => !initialData || task.id !== initialData.id)
      .reduce((sum, task) => sum + (task.percentage || 0), 0);
    
    return 100 - totalAllocated;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
              {initialData ? "Edit Task" : "Add Task"}
          </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
            <X className="w-5 h-5" />
          </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
          <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
            <input
              type="text"
              required
                placeholder="Enter task name"
              value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
            <textarea
                placeholder="Enter task description"
              value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">
                  Hours
                </label>
              <input
                type="number"
                min="0"
                step="0.5"
                  placeholder="0.0"
                  value={formData.hours || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                  ...prev, 
                      hours: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost/Hour
                </label>
              <input
                type="number"
                min="0"
                step="0.01"
                  placeholder="0.00"
                  value={formData.costPerHour || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                  ...prev, 
                      costPerHour: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700">
                Assign To
              </label>
            <select
              multiple
                value={formData.assignedTo.map((user) => user.id)}
              onChange={handleAssignedToChange}
              className="mt-1 border-2 border-gray-300 p-2 block w-full rounded-md  focus:border-blue-500 focus:ring-blue-500"
              size={4}
            >
                {users.map((user) => (
                  <option key={user.id} value={user.id} className="capitalize">
                  {user.fullName}
                </option>
              ))}
            </select>
              <p className="mt-1 text-sm text-gray-500">
                Hold Ctrl/Cmd to select multiple users
              </p>
          </div>

          <div>
              <label className="block text-sm font-medium text-gray-700">
                Deadline
              </label>
            <input
              type="datetime-local"
              value={formData.deadline}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, deadline: e.target.value }))
                }
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Percentage Allocation
              </label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Current: {formData.percentage}%</span>
                  <span className="text-sm text-gray-500">
                    Available: {calculateAvailablePercentage() - formData.percentage}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={calculateAvailablePercentage()}
                  value={formData.percentage}
                  onChange={(e) => {
                    const value = Math.min(
                      parseInt(e.target.value),
                      calculateAvailablePercentage()
                    );
                    setFormData(prev => ({ ...prev, percentage: value }));
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 
                    [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 
                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-0
                    [&::-webkit-slider-runnable-track]:bg-gray-200 [&::-webkit-slider-runnable-track]:rounded-lg
                    [&::-moz-range-track]:bg-gray-200 [&::-moz-range-track]:rounded-lg
                    [&::-webkit-slider-thumb]:hover:bg-blue-700 [&::-moz-range-thumb]:hover:bg-blue-700"
                />
                <div className="relative w-full h-2 bg-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${formData.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>{Math.floor(calculateAvailablePercentage() / 2)}%</span>
                  <span>{calculateAvailablePercentage()}%</span>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="number"
                  min="0"
                  max={calculateAvailablePercentage()}
                  value={formData.percentage}
                  onChange={(e) => {
                    const value = Math.min(
                      parseInt(e.target.value) || 0,
                      calculateAvailablePercentage()
                    );
                    setFormData(prev => ({ ...prev, percentage: value }));
                  }}
                  className="w-20 p-1 text-sm border rounded text-center"
                />
              </div>
              {siblingTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Other Tasks Allocation
                  </div>
                  <div className="space-y-1">
                    {siblingTasks
                      .filter(task => !initialData || task.id !== initialData.id)
                      .map(task => (
                        <div key={task.id} className="flex justify-between text-sm text-gray-600">
                          <span className="truncate flex-1 mr-2">{task.name}</span>
                          <span>{task.percentage || 0}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black/90 hover:bg-black/80"
            >
              {initialData ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
