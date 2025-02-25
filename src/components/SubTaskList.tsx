import { Plus } from 'lucide-react';
import SubTaskItem from './SubTaskItem';
import { Task } from '@/store/projectStore';

interface SubTask {
  id: string;
  name: string;
  description?: string;
  assignedTo?: {
    fullName: string;
  };
  deadline?: string;
}

interface SubTaskListProps {
  tasks?: Task[];
  onAddClick: () => void;
  onEditClick: (task: SubTask) => void;
  onDeleteClick: (taskId: string) => void;
  onTaskClick: () => void;
}

export default function SubTaskList({
  tasks = [], // Provide default empty array
  onAddClick,
  onEditClick,
  onDeleteClick,
  onTaskClick
}: SubTaskListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Subtasks</h2>
          <button
            onClick={onAddClick}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </button>
        </div>

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-500 py-4">
              No subtasks yet. Add your first task!
            </p>
          ) : (
            tasks.map(task => (
              <SubTaskItem
                key={task.id}
                task={task}
                onEditClick={() => onEditClick(task as SubTask)}
                onDeleteClick={() => onDeleteClick(task.id)}
                onClick={() => onTaskClick()}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}