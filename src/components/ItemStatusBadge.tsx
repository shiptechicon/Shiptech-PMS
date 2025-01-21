import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ItemStatusBadgeProps {
  completed: boolean;
}

export default function ItemStatusBadge({ completed }: ItemStatusBadgeProps) {
  return completed ? (
    <div className="flex items-center text-green-600 bg-green-50 px-2 py-1 rounded">
      <CheckCircle className="h-4 w-4 mr-2" />
      <p>Completed</p>
    </div>
  ) : (
    <div className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
      <XCircle className="h-4 w-4 mr-2" />
      <p>In Progress</p>
    </div>
  );
}