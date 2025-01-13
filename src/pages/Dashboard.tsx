import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Ship } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-center mb-8">
            <Ship className="h-12 w-12 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 ml-4">Welcome to ShipTech PMS</h1>
          </div>
          <p className="text-center text-gray-600 text-lg">
            Hello {user?.email}! Your project management dashboard is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}