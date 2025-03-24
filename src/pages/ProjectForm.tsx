import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useProjectStore } from "../store/projectStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import { useTaskStore , Task } from "@/store/taskStore";


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
  project_due_date?: string | null;
  project_start_date?: string | null;
  endClient: string;
}

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const { fetchAllTasksWithChildren } = useTaskStore();
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject } = useProjectStore();
  const { fetchCustomers, customers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      type: "project",
      endClient: "",
    };
  });

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        try {
          const project = await fetchProject(id);
          if (project) {
            // Clear any existing form data from localStorage first
            localStorage.removeItem('projectFormData');

            const tasks = await fetchAllTasksWithChildren(project.__id);
            
            // Set the form data
            setFormData({
              name: project.name || "",
              description: project.description || "",
              projectNumber: project.projectNumber || "",
              status: project.status || "not-started",
              customer: {
                name: project.customer?.name || "",
                phone: project.customer?.phone || "",
                address: project.customer?.address || "",
              },
              tasks: tasks,
              project_due_date: project.project_due_date || null,
              project_start_date: project.project_start_date || null,
              type: "project" as const,
              endClient: project.endClient || "",
            });
            
            // Find and set the selected customer
            const customer = customers.find(c => 
              c.name === project.customer?.name && 
              c.contactPersons[0]?.phone === project.customer?.phone
            );
            if (customer) {
              setSelectedCustomer(customer);
            }
          }
        } catch (error) {
          console.error("Error loading project:", error);
          toast.error("Failed to load project");
        }
      }
    };

    // Only fetch customers once when component mounts
    if (customers.length === 0) {
      fetchCustomers();
    }
    
    // Only load project data once when id is available
    if (id) {
      loadProject();
    }

    // Check for newly created customer
    const newCustomerId = localStorage.getItem('newCustomerId');
    if (newCustomerId) {
      const newCustomer = customers.find(c => c.id === newCustomerId);
      if (newCustomer) {
        handleCustomerSelect(newCustomer);
      }
      localStorage.removeItem('newCustomerId');
    }
  }, [id]); // Remove unnecessary dependencies

  // Separate useEffect for handling new customers
  useEffect(() => {
    const newCustomerId = localStorage.getItem('newCustomerId');
    if (newCustomerId) {
      const newCustomer = customers.find(c => c.id === newCustomerId);
      if (newCustomer) {
        handleCustomerSelect(newCustomer);
        localStorage.removeItem('newCustomerId');
      }
    }
  }, [customers]);

  // Modify the useEffect for localStorage
  useEffect(() => {
    // Only save to localStorage if we're not editing an existing project
    if (!id) {
      localStorage.setItem('projectFormData', JSON.stringify(formData));
    }
  }, [formData, id]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prevData => ({
      ...prevData,
      customer: {
        name: customer.name,
        phone: customer.contactPersons[0]?.phone || "",
        address: customer.address,
      }
    }));
    setShowCustomerDropdown(false);
    setSearchTerm("");
  };

  const handleAddNewCustomer = () => {
    localStorage.setItem('last_visited', window.location.pathname);
    navigate('/dashboard/customers/new');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      if (!selectedCustomer) {
        toast.error("Please select a customer");
        setIsSubmitting(false);
        return;
      }

      // Create form data using the latest selectedCustomer data
      const currentFormData = {
        ...formData,
        customer: {
          name: selectedCustomer.name,
          phone: selectedCustomer.contactPersons[0]?.phone || "",
          address: selectedCustomer.address,
        },
        customer_id:selectedCustomer.id || "",
        settlement: "not-defined",
        total_amount: 0,
      };

      if (id) {
        await updateProject(id, currentFormData);
        toast.success("Project updated successfully");
        localStorage.removeItem('projectFormData');
        navigate(`/dashboard/projects/${id}`, { replace: true });
      } else {
        await createProject(currentFormData);
        toast.success("Project created successfully");
        localStorage.removeItem('projectFormData');
        navigate("/dashboard/projects");
      }
    } catch (error) {
      console.error("Error submitting project:", error);
      toast.error("Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {id ? "Update Project" : "Create Project"}
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
                name="projectNumber"
                required
                value={formData.projectNumber}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                required
                value={formData.description}
                onChange={handleInputChange}
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
                  Phone
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedCustomer.contactPersons[0]?.phone || ""}
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
        <div>
          <label className="block font-medium text-gray-700">
            End Client
          </label>
          <input
            type="text"
            value={formData.endClient}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                endClient: e.target.value,
              }))
            }
            className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          </div>
      </div>
    </form>
  );
}
