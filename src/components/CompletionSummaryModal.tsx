import { useState } from 'react';
import { Task } from '@/store/taskStore';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface TimeData {
  taskId: string;
  taskName: string;
  estimatedHours: number;
  actualHours: number;
  isParent: boolean;
  hasSubtasks: boolean;
  children?: TimeData[];
  subtasksActualHours?: number;
}

interface CompletionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  tasks: Task[];
}

export default function CompletionSummaryModal({
  isOpen,
  onClose,
  onComplete,
  tasks
}: CompletionSummaryModalProps) {
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskIds(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const calculateTimeData = (tasks: Task[], isChild = false): TimeData[] => {
    return tasks.map(task => {
      // Calculate actual hours from time entries (only for this task)
      const taskActualHours = task.timeEntries?.reduce((total, entry) => {
        return total + (entry.duration || 0);
      }, 0) || 0;
  
      const hasSubtasks = !!task.children?.length;
      
      // Process children first to get their data
      let childrenData: TimeData[] = [];
      let subtasksActualHours = 0;
      
      if (task.children) {
        childrenData = calculateTimeData(task.children, true);
        subtasksActualHours = childrenData.reduce(
          (sum, child) => sum + child.actualHours + (child.subtasksActualHours || 0), 
          0
        );
      }
  
      // Calculate total actual hours for this task
      // If it has subtasks, include subtask hours in the parent's actual hours
      const totalActualHours = hasSubtasks && !isChild 
        ? (taskActualHours / 60) + subtasksActualHours
        : taskActualHours / 60;
  
      const timeData: TimeData = {
        taskId: task.id,
        taskName: task.name,
        estimatedHours: task.hours || 0,
        actualHours: totalActualHours, // This now includes subtask hours for parent tasks
        isParent: hasSubtasks && !isChild,
        hasSubtasks,
        children: childrenData,
        subtasksActualHours
      };
  
      return timeData;
    });
  };

  const timeData = calculateTimeData(tasks);

  // Calculate totals
  const totalEstimated = timeData.reduce(
    (sum, data) => sum + data.estimatedHours, 0
  );

  const totalActual = timeData.reduce(
    (sum, data) => sum + data.actualHours , 0
  );

  const totalDifference = totalEstimated - totalActual ;

  const renderTimeDifference = (difference: number) => {
    const absoluteDiff = Math.abs(difference);
    if (difference === 0) {
      return <span className="text-gray-500">On time</span>;
    }
    return (
      <span className={difference < 0 ? 'text-red-500' : 'text-green-500'}>
        {absoluteDiff.toFixed(2)} hours {difference < 0 ? 'loss' : 'gain'}
      </span>
    );
  };

  const calculateTaskDifference = (task: TimeData) => {
    if (!task.hasSubtasks) {
      // For tasks without subtasks: estimated - actual
      return task.estimatedHours - task.actualHours;
    } else {
      // For tasks with subtasks: estimated - (actual + subtasks actual)
      return task.estimatedHours - (task.actualHours);
    }
  };

  const renderTaskRow = (data: TimeData, index: number, level = 0) => {
    const difference = calculateTaskDifference(data);
    const hasChildren = data.children && data.children.length > 0;
    const isExpanded = expandedTaskIds[data.taskId];

    return (
      <>
        <tr 
          key={`${data.taskId}-${level}`} 
          className={`${level > 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-gray-100`}
        >
          <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
            <div style={{ paddingLeft: `${level * 20}px` }} className="flex items-center">
              {hasChildren && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskExpand(data.taskId);
                  }}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              {data.taskName}
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {data.estimatedHours.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {data.actualHours.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm">
            {data.estimatedHours > 0 ? renderTimeDifference(difference) : '-'}
          </td>
        </tr>
        {isExpanded && hasChildren && data.children?.map(
          (child, childIndex) => renderTaskRow(child, childIndex, level + 1)
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Project Time Summary</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estimated Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Difference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeData.map((data, index) => renderTaskRow(data, index))}
              <tr className="bg-gray-100 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Project Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalEstimated.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalActual.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {renderTimeDifference(totalDifference)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Complete Project
          </button>
        </div>
      </div>
    </div>
  );
}