import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTaskStore } from "@/store/taskStore";
import { Trash2, Edit2Icon, ChevronDown, ChevronUp } from "lucide-react";

export default function MyTasks() {
  const { user, userData } = useAuthStore();
  const { fetchUserTasks, tasks } = useTaskStore();
  const [expandedTaskRows, setExpandedTaskRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && userData) {
      fetchUserTasks({
        id: user.uid,
        name: userData.fullName,
        email: userData.email,
      });
    }
  }, [user, userData, fetchUserTasks]);

  const toggleTaskRowExpansion = (id: string) => {
    const newExpandedTaskRows = new Set(expandedTaskRows);
    if (newExpandedTaskRows.has(id)) {
      newExpandedTaskRows.delete(id);
    } else {
      newExpandedTaskRows.add(id);
    }
    setExpandedTaskRows(newExpandedTaskRows);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Tasks</h1>
      {tasks.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Task Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Entries
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex justify-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <React.Fragment key={task.id}>
                <tr onClick={() => toggleTaskRowExpansion(task.id)} className="hover:bg-gray-50 hover:cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {task.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.timeEntries
                      ? task.timeEntries
                          .filter(entry => entry.userId === user?.uid) // Filter by user ID
                          .reduce((total, entry) => total + entry.duration, 0) / 60 // Convert to hours
                      : 0}{" "}
                    hours
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {task.completed ? "completed" : "incomplete"}
                  </td>
                  <td className="py-4 whitespace-nowrap text-sm text-gray-500 flex justify-end items-center pr-12">
                    <button className="text-gray-600 hover:text-gray-900">
                      {expandedTaskRows.has(task.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </td>
                </tr>
                {expandedTaskRows.has(task.id) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 bg-gray-100">
                      <div>
                        <h3 className="font-semibold">Task Details:</h3>
                        <p>Description: {task.description}</p>
                        <p>Assigned To: {task.assignedTo?.map(user => user.name).join(", ")}</p>
                        <p>Deadline: {task.deadline || "No deadline set"}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold">No Tasks Available</h2>
          <p>Please add tasks to see the entries.</p>
        </div>
      )}
    </div>
  );
}
