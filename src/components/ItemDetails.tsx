import React from 'react';
import { User, Calendar, Clock, DollarSign, Check, AlertCircle } from 'lucide-react';
import ItemStatusBadge from './ItemStatusBadge';

interface ItemDetailsProps {
  item: {
    id: string;
    description?: string;
    assignedTo?: {
      fullName: string;
    }[];
    deadline?: string;
    completed: boolean;
    hours?: number;
    costPerHour?: number;
    children?: any[];
  };
  onEditClick?: () => void;
  onToggleComplete?: () => void;
  isAdmin?: boolean;
  canComplete?: boolean;
}

export default function ItemDetails({ 
  item, 
  onEditClick, 
  onToggleComplete,
  isAdmin,
  canComplete = true
}: ItemDetailsProps) {
  const allChildrenComplete = item.children?.length 
    ? item.children.every(child => child.completed)
    : true;

  return (
    <div className="bg-white rounded-lg shadow-sm mb-6">
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Description</h3>
              <p className="text-gray-700">{item.description || 'No description provided'}</p>
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && onEditClick && (
                <button
                  onClick={onEditClick}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit Details
                </button>
              )}
              {onToggleComplete && (
                <button
                  onClick={onToggleComplete}
                  disabled={!canComplete || (item.children?.length && !allChildrenComplete)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    item.completed
                      ? 'text-yellow-600 hover:text-yellow-700'
                      : 'text-green-600 hover:text-green-700'
                  } ${(!canComplete || (item.children?.length && !allChildrenComplete)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {item.completed ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark as Incomplete
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Complete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.assignedTo && item.assignedTo.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned To</h3>
                <div className="flex flex-col gap-2">
                  {item.assignedTo.map((user, index) => (
                    <div key={index} className="flex items-center">
                      <User className="h-4 w-4 text-gray-400 mr-2" />
                      <p>{user.fullName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {item.deadline && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Deadline</h3>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <p>{new Date(item.deadline).toLocaleString()}</p>
                </div>
              </div>
            )}

            {(item.hours !== undefined || item.costPerHour !== undefined) && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                {item.hours !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Estimated Hours</h3>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-2" />
                      <p>{item.hours} hours</p>
                    </div>
                  </div>
                )}
                
                {item.costPerHour !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Cost per Hour</h3>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                      <p>₹{item.costPerHour}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <div className="flex items-center space-x-2">
                <ItemStatusBadge completed={item.completed} />
                {item.children?.length > 0 && !allChildrenComplete && (
                  <span className="text-sm text-red-600">
                    (Cannot complete - subtasks pending)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}