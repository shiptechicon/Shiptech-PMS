import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Task } from '../store/projectStore';

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
            {tasks.map((task) => (
              <div key={task.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center cursor-pointer"
                    onClick={() => onTaskClick(task)}
                  >
                    <div>
                      <h4 className="text-sm font-medium">{task.name}</h4>
                      {task.children && task.children.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {task.children.length} subtask{task.children.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center space-x-2">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}