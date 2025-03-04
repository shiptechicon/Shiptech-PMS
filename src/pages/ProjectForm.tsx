import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import { TimeEntry, useProjectStore } from "../store/projectStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface Task {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User[];
  deadline?: string | null;
  completed: boolean;
  children: Task[];
  projectId?: string;
  path?: string;
  timeEntries?: TimeEntry[];
  percentage: number;
}

interface FormData {
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  projectNumber: string;
  status: "completed" | "ongoing" | "not-started";
  type: "project";
}

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject, loading } = useProjectStore();
  const { fetchCustomers, customers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<FormData>(() => {
    // Try to load saved form data from localStorage
    const savedData = localStorage.getItem('projectFormData');
    if (savedData) {
      return JSON.parse(savedData);
    }
    return {
      name: "",
      description: "",
      customer: {
        name: "",
        phone: "",
        address: "",
      },
      tasks: [],
      projectNumber: "",
      status: "not-started",
      type: "project"
    };
  });

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const project = await fetchProject(id);
        if (project) {
          setFormData({
            name: project.name,
            description: project.description,
            customer: project.customer,
            tasks: project.tasks || [],
            projectNumber: project.projectNumber || "",
            status: project.status,
            type: project.type
          });
          
          // Find the selected customer if customer exists
          const customer = customers.find(c => 
            c.name === project.customer.name && 
            c.contactPersons[0]?.phone === project.customer.phone
          );
          if (customer) {
            setSelectedCustomer(customer);
          }
        }
      }
    };

    fetchCustomers(); // Load customers when component mounts
    loadProject();

    // Check for newly created customer
    const newCustomerId = localStorage.getItem('newCustomerId');
    if (newCustomerId) {
      const newCustomer = customers.find(c => c.id === newCustomerId);
      if (newCustomer) {
        handleCustomerSelect(newCustomer);
      }
      localStorage.removeItem('newCustomerId');
    }
  }, [id, fetchProject, fetchCustomers, customers]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('projectFormData', JSON.stringify(formData));
  }, [formData]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer: {
        name: customer.name,
        phone: customer.contactPersons[0]?.phone || "",
        address: customer.address,
      },
    }));
    setShowCustomerDropdown(false);
  };

  const handleAddNewCustomer = () => {
    localStorage.setItem('last_visited', window.location.pathname);
    navigate('/dashboard/customers/new');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateProject(id, formData);
        toast.success("Project updated successfully");
      } else {
        await createProject(formData);
        toast.success("Project created successfully");
      }
      // Clear saved form data after successful submission
      localStorage.removeItem('projectFormData');
      navigate("/dashboard/projects");
    } catch (error) {
      console.error(error);
      toast.error(id ? "Failed to update project" : "Failed to create project");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">
            {id ? "Edit Project" : "Create New Project"}
          </h2>
        </div>
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Project"
            ) : (
              "Create Project"
            )}
          </button>
        </div>
      </div>

      <div className="grid gap-3 px-[10%]">
        <div className="space-y-6 bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Number
              </label>
              <input
                type="text"
                required
                value={formData.projectNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, projectNumber: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-10 border-[1px] rounded-xl">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Customer Details
          </h3>
          <div className="relative">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowCustomerDropdown(true)}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddNewCustomer}
                className="mt-1 p-2 text-gray-600 hover:text-gray-900"
              >
                <UserPlus size={20} />
              </button>
            </div>
            
            {showCustomerDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    {customer.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedCustomer.name}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  readOnly
                  value={selectedCustomer.email}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  readOnly
                  value={selectedCustomer.address}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
