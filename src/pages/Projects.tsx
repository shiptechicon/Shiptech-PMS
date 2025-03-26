import { useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import { useCustomerSettlementStore } from "@/store/customerSettlementStore";
import { Loader2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ProjectStatusSelect from "@/components/ProjectStatusSelect";
import toast from "react-hot-toast";

export default function Projects() {
  const { projects, loading, deleteProject, fetchProjects } = useProjectStore();
  const { 
    fetchAllSettlements, 
    settlements, 
    loading: settlementsLoading 
  } = useCustomerSettlementStore();
  const navigate = useNavigate();

  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

  // Get settlement status for a project's customer
  const getSettlementStatus = (customerId: string) => {
    if (settlementsLoading) return "Loading...";
    
    const settlement = settlements.find(s => s.customer_id === customerId);
    if (!settlement) return "No settlement";
    
    // Customize this based on your status display preferences
    switch(settlement.status) {
      case "completed":
        return "Paid";
      case "partial":
        return "Partial";
      case "pending":
        return "Pending";
      default:
        return settlement.status;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (projects.length === 0) {
        await fetchProjects();
      }
      await fetchAllSettlements();
      setIsInitialLoad(false);
    };
    
    fetchData();
  }, []);

  const isLoading = isInitialLoad || loading || settlementsLoading;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex sm:flex-row flex-col gap-3 justify-between items-center">
        Projects
        <button
          onClick={() => navigate('/dashboard/projects/new')}
          className="inline-flex items-center sm:px-4 px-1 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black hover:bg-black"
        >
          <Plus className="mr-2" />
          Create New Project
        </button>
      </h2>

      {isLoading ? (
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr 
                    onClick={() => navigate(`/dashboard/projects/${project.id}`)} 
                    key={project.id} 
                    className="hover:bg-gray-50 hover:cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      P-{project.projectNumber}
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
                      {getSettlementStatus(project.customer_id)}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.settlement}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <Link
                          to={`/dashboard/projects/${project.id}`}
                          className="text-black/90 hover:text-black/80"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={18} />
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id!);
                          }}
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