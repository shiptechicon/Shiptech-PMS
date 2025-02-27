import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Task } from '../store/projectStore';
import { toast } from 'react-hot-toast';

interface TaskListProps {
  tasks: Task[];
  onAddClick: () => void;
  onEditClick: (task: Task) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  isAdmin: boolean;
  currentUserId?: string;
}

export default function TaskList({
  tasks = [],
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick,
  isAdmin,
}: TaskListProps) {

  const calculateCompletedPercentage = (task: Task): number => {
    if (!task.children || task.children.length === 0) {
      return task.completed ? 100 : 0;
    }

    const totalAssignedToChildren = task.children.reduce((sum, child) => 
      sum + (child.percentage || 0), 0);

    if (totalAssignedToChildren === 0) return 0;

    const completedSum = task.children.reduce((sum, subtask) => {
      return sum + (subtask.completed ? (subtask.percentage || 0) : 0);
    }, 0);

    return Math.round((completedSum / totalAssignedToChildren) * 100);
  };

  // Helper function to get color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-600';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-600';
  };

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Tasks</h3>
            {isAdmin && (
              <button
                onClick={onAddClick}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-black/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </button>
            )}
      </div>

      <div className="bg-white shadow rounded-lg">
          {tasks.length === 0 ? (
          <p className="p-4 text-gray-500">No tasks yet</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => {
              const completedPercentage = calculateCompletedPercentage(task);
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
                            <span className={`text-sm ${getProgressColor(completedPercentage).replace('bg-', 'text-')}`}>
                              Completed: {((completedPercentage * assignedPercentage) / 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-150 ${getProgressColor(completedPercentage)}`}
                            style={{ width: `${completedPercentage}%` }}
                          />
                        </div>
                        {task.children && task.children.length > 0 && (
                          <p className="text-xs text-gray-400 mt-2">
                            {task.children.length} subtask{task.children.length !== 1 ? 's' : ''}
                          </p>
                        )}
                        </div>
                      </div>
                      {isAdmin && (
                      <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => onEditClick(task)}
                          className="text-gray-600 hover:text-gray-900"
                          >
                          <Pencil className="h-4 w-4" />
                          </button>
                          <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this task and all its subtasks?')) {
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