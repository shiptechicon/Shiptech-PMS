import { Task } from '@/store/projectStore';

interface TimeData {
  taskName: string;
  estimatedHours: number;
  actualHours: number;
  variance: number;
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
  if (!isOpen) return null;

  const calculateTimeData = (tasks: Task[]): TimeData[] => {
    const timeData: TimeData[] = [];
    
    const processTask = (task: Task) => {
      // Calculate actual hours from time entries
      const actualHours = task.timeEntries?.reduce((total, entry) => {
        return total + (entry.duration || 0);
      }, 0) || 0;

      // Add task data
      timeData.push({
        taskName: task.name,
        estimatedHours: task.hours || 0,
        actualHours: actualHours / 60, // Convert minutes to hours
        variance: ((actualHours / 60) - (task.hours || 0))
      });

      // Process subtasks
      if (task.children) {
        task.children.forEach(processTask);
      }
    };

    tasks.forEach(processTask);
    return timeData;
  };

  const timeData = calculateTimeData(tasks);
  const totalEstimated = timeData.reduce((sum, data) => sum + data.estimatedHours, 0);
  const totalActual = timeData.reduce((sum, data) => sum + data.actualHours, 0);
  const totalVariance = totalActual - totalEstimated;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Completion Summary</h2>
        
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
                  Variance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {timeData.map((data, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.taskName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.estimatedHours.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {data.actualHours.toFixed(2)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                    data.variance > 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {data.variance > 0 ? '+' : ''}{data.variance.toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalEstimated.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {totalActual.toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  totalVariance > 0 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Set Complete
          </button>
        </div>
      </div>
    </div>
  );
} 