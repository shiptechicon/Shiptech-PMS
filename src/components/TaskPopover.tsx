import React from 'react';

interface TaskPopoverProps {
  tasks: { name: string; deadline: string; assignees: string[] }[];
  isOpen: boolean;
  onClose: () => void;
}

const TaskPopover: React.FC<TaskPopoverProps> = ({ tasks, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute z-10 bg-white border rounded shadow-lg p-4">
      <h4 className="font-bold">Tasks:</h4>
      <ul>
        {tasks.map((task, index) => (
          <li key={index}>
            <strong>{task.name}</strong> - Due: {task.deadline} - Assignees: {task.assignees.join(', ')}
          </li>
        ))}
      </ul>
      <button onClick={onClose} className="mt-2 text-blue-500">Close</button>
    </div>
  );
};

export default TaskPopover; 