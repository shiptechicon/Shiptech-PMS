import { Plus, Pencil, Trash2, User, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
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
  currentUserId
}: TaskListProps) {
  // Show add button if user is admin or is assigned to parent task
  const showAddButton = isAdmin || currentUserId;

  const getTaskStatus = (task: Task) => {
    if (task.completed) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: 'Completed',
        bgColor: 'bg-green-50',
        textColor: 'text-green-700',
        borderColor: 'border-green-200'
      };
    }

    // Check if task has subtasks and their completion status
    const hasSubtasks = task.children && task.children.length > 0;
    if (hasSubtasks) {
      const allSubtasksComplete = task.children.every(subtask => subtask.completed);
      const anySubtasksComplete = task.children.some(subtask => subtask.completed);

      if (allSubtasksComplete) {
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Ready to Complete',
          bgColor: 'bg-blue-50',
          textColor: 'text-blue-700',
          borderColor: 'border-blue-200'
        };
      }

      if (anySubtasksComplete) {
        return {
          icon: <XCircle className="h-4 w-4" />,
          text: 'In Progress',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      }
    }

    return {
      icon: <XCircle className="h-4 w-4" />,
      text: 'Not Started',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-200'
    };
  };

  return (
    <div className="bg-white border-[1px] rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          {showAddButton && (
            <button
              onClick={onAddClick}
              className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white bg-black/90 hover:bg-black/80"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Task
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No tasks yet. Add your first task!
            </p>
          ) : (
            tasks.map(task => {
              const status = getTaskStatus(task);
              return (
                <div 
                  key={task.id}
                  className={`border rounded-lg hover:border-black transition-colors duration-200 ${status.borderColor}`}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onTaskClick(task)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-medium">{task.name}</h4>
                          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${status.bgColor} ${status.textColor}`}>
                            {status.icon}
                            <span className="text-sm font-medium">{status.text}</span>
                          </div>
                        </div>
                        {task.description && (
                          <p className="mt-1 text-gray-600">{task.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {task.hours && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{task.hours} hours</span>
                            </div>
                          )}
                          {task.costPerHour && (
                            <span>Rate: ₹{task.costPerHour}/hr</span>
                          )}
                          {task.assignedTo && task.assignedTo.length > 0 && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>
                                {task.assignedTo.map(user => user.fullName).join(', ')}
                              </span>
                            </div>
                          )}
                          {task.deadline && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1" />
                              <span>{new Date(task.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                          {task.children && task.children.length > 0 && (
                            <span className="text-gray-500">
                              {task.children.filter(t => t.completed).length} of {task.children.length} subtasks complete
                            </span>
                          )}
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => onEditClick(task)}
                            className="p-1 text-gray-400 hover:text-blue-500"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => onDeleteClick(task.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}