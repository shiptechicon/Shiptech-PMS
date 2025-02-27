import React, { useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import { Loader2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import toast from "react-hot-toast";

export default function Projects() {
  const { projects, loading, fetchProjects, createProject, deleteProject } = useProjectStore();
  const navigate = useNavigate();

  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject({
        projectNumber,
        name: projectName,
        description: projectDescription,
        customer: {
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
        },
        tasks: [],
        status: "not-started",
        type: "project",
      });
      setProjectNumber("");
      setProjectName("");
      setProjectDescription("");
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setShowForm(false);
      toast.success("Project created successfully");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(projectId);
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex sm:flex-row flex-col gap-3 justify-between items-center">
        Projects
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center sm:px-4 px-1 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-black"
        >
          <Plus className="mr-2" />
          Create New Project
        </button>
      </h2>

      {showForm && (
        <form
          onSubmit={handleCreateProject}
          className="mb-6 bg-white sm:p-6 p-2 rounded-lg shadow-md"
        >
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block font-medium text-gray-700">
                Project Number
              </label>
              <input
                type="text"
                required
                value={projectNumber}
                onChange={(e) => setProjectNumber(e.target.value)}
                className="mt-1 p-2 w-11/12 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-1 p-2 block w-11/12 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Description
              </label>
              <textarea
                required
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="mt-1 block w-11/12 sm:w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Customer Name
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1 p-2 block w-11/12 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Customer Phone
              </label>
              <input
                type="tel"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1 p-2 block w-11/12 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700">
                Customer Address
              </label>
              <textarea
                required
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="mt-1 p-2 block w-11/12 sm:w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-black"
            >
              Create Project
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-500"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <p className="text-gray-500">No active projects</p>
          </div>
        </div>
      ) : (
        <div className="bg-white w-full shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.__id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {project.name.length > 40
                        ? `${project.name.slice(0, 40)}...`
                        : project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <ProjectStatusSelect
                        project={{
                          id: project.id as string,
                          status: project.status,
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <button
                          onClick={() => navigate(`/dashboard/projects/${project.id}`)}
                          className="text-black/90 hover:text-black/80"
                        >
                          <ExternalLink size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id!)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete project"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
