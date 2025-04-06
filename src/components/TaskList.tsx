import { Plus, Pencil, Trash2, CloudCog } from "lucide-react";
import { Task, useTaskStore } from "../store/taskStore";
import { useEffect, useState } from "react";

interface TaskListProps {
  tasks: Task[];
  onAddClick: () => void;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  isAdmin: boolean;
  currentUserId?: string;
  parentAccess?: boolean;
}

export default function TaskList({
  tasks = [],
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick,
  isAdmin,
  parentAccess,
}: TaskListProps) {
  const [sortedTasks, setSortedTasks] = useState<Task[]>([]);
  const { SetaddOrPencilEdit } = useTaskStore();

  useEffect(() => {
    setSortedTasks(
      [...tasks].sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      })
    );
  }, [tasks]);

  const calculateProgress = (children : Task[]) => {
    // console.log("tasks", tasks);
    
    if (!children.length) return 0;

    const completedProgress = children.reduce((acc, task) => {
      if (task.completed) {
        return acc + (task.percentage || 0);
      }
      return acc;
    }, 0);

    return Math.round(completedProgress);
  };

  const calculateCompletedPercentage = (task: Task): number => {
    if (!task.children || task.children.length === 0) {
      return task.completed ? 100 : 0;
    }

    const totalAssignedToChildren = task.children.reduce(
      (sum, child) => sum + (child.percentage || 0),
      0
    );

    if (totalAssignedToChildren === 0) return 0;

    const completedSum = task.children.reduce((sum, subtask) => {
      return sum + (subtask.completed ? subtask.percentage || 0 : 0);
    }, 0);

    return completedSum;
    // return Math.round((completedSum / totalAssignedToChildren) * 100);
  };

  // Helper function to get color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return "bg-green-600";
    if (percentage >= 50) return "bg-yellow-500";
    if (percentage >= 25) return "bg-orange-500";
    return "bg-red-600";
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Tasks</h3>
        {(isAdmin || parentAccess) && (
          <button
            onClick={()=>{
              SetaddOrPencilEdit(true)
              onAddClick()
            }}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg">
        {sortedTasks.length === 0 ? (
          <p className="p-4 text-gray-500">No tasks yet</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedTasks.map((task) => {
              
              const completedPercentage = !task.children?.length ? (task.completed ? 100 : 0) : calculateProgress(task.children as Task[]);
              const assignedPercentage = task.percentage || 0;

              return (
                <div key={task.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{task.name}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              Target: {assignedPercentage}%
                            </span>
                            <span
                              className={`text-sm ${
                                task.completed
                                  ? getProgressColor(completedPercentage).replace("bg-", "text-")
                                  : "text-red-600"
                              }`}
                            >
                              {task.completed ? "Completed" : "In Progress"}
                              :{" "}  
                              {(
                                (completedPercentage * 100) /
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-150 ${getProgressColor(
                              completedPercentage
                            )}`}
                            style={{ width: `${completedPercentage}%` }}
                          />
                        </div>
                        {task.timeEntries && task.timeEntries.length > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            {task.timeEntries.length} time entries
                          </p>
                        )}
                      </div>
                    </div>
                    {(isAdmin || parentAccess) && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            // console.log("current task : ",task)
                            SetaddOrPencilEdit(true)
                            onEditClick(task);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to delete this task and all its subtasks?"
                              )
                            ) {
                              onDeleteClick(task.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
