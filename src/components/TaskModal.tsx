import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { doc, getDocs, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    hours?: number;
    costPerHour?: number;
    assignedTo?: User[];
    deadline?: string;
  }) => void;
  initialData?: {
    name: string;
    description: string;
    hours?: number;
    costPerHour?: number;
    assignedTo?: User[];
    deadline?: string;
  };
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  initialData
}: TaskModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hours: undefined as number | undefined,
    costPerHour: undefined as number | undefined,
    assignedTo: [] as User[],
    deadline: ''
  });
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        hours: initialData.hours,
        costPerHour: initialData.costPerHour,
        assignedTo: initialData.assignedTo || [],
        deadline: initialData.deadline || ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        hours: undefined,
        costPerHour: undefined,
        assignedTo: [],
        deadline: ''
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const verifiedUsers = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.verified && user.role !== 'customer') as User[]; // Add condition for role
    setUsers(verifiedUsers);
  };
  if (isOpen) {
    fetchUsers();
  }
}, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleAssignedToChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions);
    const selectedUsers = selectedOptions.map(option => 
      users.find(user => user.id === option.value)
    ).filter((user): user is User => user !== undefined);
    
    setFormData(prev => ({ ...prev, assignedTo: selectedUsers }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {initialData ? 'Edit Task' : 'Add Task'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              placeholder='Enter task name'
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              placeholder='Enter task description'
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder='0.0'
                value={formData.hours || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  hours: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Cost/Hour</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder='0.00'
                value={formData.costPerHour || ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  costPerHour: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assign To</label>
            <select
              multiple
              value={formData.assignedTo.map(user => user.id)}
              onChange={handleAssignedToChange}
              className="mt-1 border-2 border-gray-300 p-2 block w-full rounded-md  focus:border-blue-500 focus:ring-blue-500"
              size={4}
            >
              {users.map(user => (
                <option key={user.id} value={user.id} className='capitalize'>
                  {user.fullName}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">Hold Ctrl/Cmd to select multiple users</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Deadline</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black/90 hover:bg-black/80"
            >
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}