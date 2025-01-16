import React from 'react';
import { Calendar } from 'lucide-react';

export default function AdminBasics() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Calendar</h3>
          <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
            <Calendar className="h-8 w-8 text-gray-400" />
            <span className="ml-2 text-gray-500">Calendar Component Coming Soon</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Incoming Mails</h3>
          <div className="space-y-4">
            <div className="border-b pb-4">
              <p className="font-medium text-gray-500">No new messages</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}