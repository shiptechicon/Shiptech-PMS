import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Task } from '../store/projectStore';

interface ManagePercentagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onSubmit: (updatedTasks: Task[]) => void;
}

export default function ManagePercentagesModal({
  isOpen,
  onClose,
  tasks,
  onSubmit
}: ManagePercentagesModalProps) {
  const [percentages, setPercentages] = useState<{ [key: string]: number }>({});
  const [remainingPercentage, setRemainingPercentage] = useState(100);
  const [totalPercentage, setTotalPercentage] = useState(0);

  useEffect(() => {
    const initialPercentages = tasks.reduce((acc, task) => {
      acc[task.id] = task.percentage || 0;
      return acc;
    }, {} as { [key: string]: number });
    setPercentages(initialPercentages);

    const total = tasks.reduce((acc, task) => acc + (task.percentage || 0), 0);
    setTotalPercentage(total);
    setRemainingPercentage(100 - total);
  }, [tasks]);

  const handlePercentageChange = (taskId: string, value: number) => {
    const otherTasksTotal = Object.entries(percentages)
      .reduce((acc, [id, val]) => id !== taskId ? acc + val : acc, 0);
    
    // Ensure we don't exceed 100%
    const maxAllowed = 100 - otherTasksTotal;
    const newValue = Math.min(value, maxAllowed);
    
    const newPercentages = {
      ...percentages,
      [taskId]: newValue
    };
    
    setPercentages(newPercentages);
    
    // Calculate new totals
    const newTotal = Object.values(newPercentages).reduce((acc, val) => acc + val, 0);
    setTotalPercentage(newTotal);
    setRemainingPercentage(100 - newTotal);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTasks = tasks.map(task => ({
      ...task,
      percentage: percentages[task.id] || 0
    }));
    onSubmit(updatedTasks);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Manage Task Percentages</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="percentages-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Percentage Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-600">Total Allocated</span>
                <span className={totalPercentage > 100 ? 'text-red-600' : 'text-green-600'}>
                  {totalPercentage}%
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Remaining</span>
                <span className={remainingPercentage < 0 ? 'text-red-600' : 'text-gray-600'}>
                  {remainingPercentage}%
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    totalPercentage > 100 ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Task Percentage Inputs */}
            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-gray-700">{task.name}</label>
                    <span className="text-sm text-gray-500">{percentages[task.id]}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentages[task.id] || 0}
                    onChange={(e) => handlePercentageChange(task.id, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          </form>
        </div>

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
              form="percentages-form"
              disabled={totalPercentage > 100}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                totalPercentage > 100 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-black/90 hover:bg-black/80'
              }`}
            >
              Update Percentages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 