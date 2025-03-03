import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, Trash2, ArrowLeft, UserPlus } from "lucide-react";
import { useEnquiryStore } from "../store/enquiryStore";
import { useCustomerStore, Customer } from "@/store/customerStore";
import toast from "react-hot-toast";
import RichTextEditor, { ToolbarConfig } from "react-rte";

interface Deliverable {
  id: string;
  name: string;
  hours: number;
  costPerHour: number;
  total: number;
}

const toolbarConfig: ToolbarConfig = {
  display: [
    'INLINE_STYLE_BUTTONS',
    'BLOCK_TYPE_BUTTONS',
    'BLOCK_TYPE_DROPDOWN',
    'HISTORY_BUTTONS',
    'BLOCK_ALIGNMENT_BUTTONS',
    'LINK_BUTTONS'
  ],
  INLINE_STYLE_BUTTONS: [
    {label: 'Bold', style: 'BOLD'},
    {label: 'Italic', style: 'ITALIC'},
    {label: 'Underline', style: 'UNDERLINE'}
  ],
  BLOCK_TYPE_DROPDOWN: [
    {label: 'Normal', style: 'unstyled'},
    {label: 'Heading 1', style: 'header-one'},
    {label: 'Heading 2', style: 'header-two'},
    {label: 'Heading 3', style: 'header-three'}
  ],
  BLOCK_TYPE_BUTTONS: [
    {label: 'UL', style: 'unordered-list-item'},
    {label: 'OL', style: 'ordered-list-item'}
  ],
  BLOCK_ALIGNMENT_BUTTONS: [
    {label: 'Align Left', style: 'ALIGN_LEFT'},
    {label: 'Align Center', style: 'ALIGN_CENTER'},
    {label: 'Align Right', style: 'ALIGN_RIGHT'}
  ]
};

const editorStyle = {
  editor: {
    border: '1px solid #ccc',
    padding: '10px',
    minHeight: '200px',
    borderRadius: '6px',
    fontSize: '14px'
  }
};

export default function EnquiryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createEnquiry, updateEnquiry, fetchEnquiry, loading } =
    useEnquiryStore();
  const { fetchCustomers, customers } = useCustomerStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    enquiryNumber: "",
    name: "",
    description: "",
    customer_id: "",
    deliverables: [] as Deliverable[],
    exclusions: [] as string[],
    charges: [] as string[],
    scopeOfWork: RichTextEditor.createEmptyValue(),
    inputsRequired: [] as string[],
  });

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const enquiry = await fetchEnquiry(id);
        if (enquiry) {
          setFormData({
            ...enquiry,
            scopeOfWork: RichTextEditor.createValueFromString(enquiry.scopeOfWork, 'html'),
            deliverables: enquiry.deliverables.map((d) => ({
              ...d,
              hours: d.hours ?? 0,
              costPerHour: d.costPerHour ?? 0,
            })),
            exclusions: enquiry.exclusions ?? [],
            inputsRequired: enquiry.inputsRequired ?? [],
            charges: enquiry.charges ?? [],
          });
          
          // Find the selected customer if customer_id exists
          if (enquiry.customer_id) {
            const customer = customers.find(c => c.id === enquiry.customer_id);
            if (customer) {
              setSelectedCustomer(customer);
            }
          }
        }
      }
    };

    fetchCustomers(); // Load customers when component mounts
    loadEnquiry();
  }, [id, fetchEnquiry, fetchCustomers, customers]);

  // Filter customers based on search term
  const filteredCustomers = customers.filter((customer: Customer) => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id || "",
    }));
    setShowCustomerDropdown(false);
  };

  const handleAddNewCustomer = () => {
    // Save current path to localStorage
    localStorage.setItem('last_visited', window.location.pathname);
    navigate('/dashboard/customers/new');
  };

  const addDeliverable = () => {
    setFormData((prev) => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        {
          id: crypto.randomUUID(),
          name: "",
          hours: 0,
          costPerHour: 0,
          total: 0,
        },
      ],
    }));
  };

  const removeDeliverable = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.filter((d) => d.id !== id),
    }));
  };

  const updateDeliverable = (
    id: string,
    field: keyof Deliverable,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      deliverables: prev.deliverables.map((d) => {
        if (d.id === id) {
          const updatedDeliverable = { ...d, [field]: value };
          updatedDeliverable.total =
            updatedDeliverable.hours * updatedDeliverable.costPerHour;
          return updatedDeliverable;
        }
        return d;
      }),
    }));
  };

  const addInputRequired = () => {
    setFormData((prev) => ({
      ...prev,
      inputsRequired: [...prev.inputsRequired, ""],
    }));
  };

  const updateInputRequired = (index: number, value: string) => {
    setFormData((prev) => {
      const newInputs = [...prev.inputsRequired];
      newInputs[index] = value;
      return { ...prev, inputsRequired: newInputs };
    });
  };

  const removeInputRequired = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inputsRequired: prev.inputsRequired.filter((_, i) => i !== index),
    }));
  };

  const addExclusion = () => {
    setFormData((prev) => ({
      ...prev,
      exclusions: [...prev.exclusions, ""],
    }));
  };

  const removeExclusion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      exclusions: prev.exclusions.filter((_, i) => i !== index),
    }));
  };

  const updateExclusion = (index: number, value: string) => {
    setFormData((prev) => {
      const newExclusions = [...prev.exclusions];
      newExclusions[index] = value;
      return { ...prev, exclusions: newExclusions };
    });
  };

  const addCharge = () => {
    setFormData((prev) => ({
      ...prev,
      charges: [...prev.charges, ""],
    }));
  };

  const removeCharge = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      charges: prev.charges.filter((_, i) => i !== index),
    }));
  };

  const updateCharge = (index: number, value: string) => {
    setFormData((prev) => {
      const newCharges = [...prev.charges];
      newCharges[index] = value;
      return { ...prev, charges: newCharges };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scopeOfWorkHtml = formData.scopeOfWork.toString('html');
      if (id) {
        await updateEnquiry(id, { ...formData, scopeOfWork: scopeOfWorkHtml });
        toast.success("Enquiry updated successfully");
      } else {
        await createEnquiry({ ...formData, scopeOfWork: scopeOfWorkHtml });
        toast.success("Enquiry created successfully");
      }
      navigate("/dashboard/enquiries");
    } catch (error) {
      console.error("Enquiry submission error:", error);
      toast.error(id ? "Failed to update enquiry" : "Failed to create enquiry");
    }
  };

  return (
    <form onSubmit={handleSubmit} className=" p-6 space-y-8 ">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className=" h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">
            {id ? "Edit Enquiry" : "Create New Enquiry"}
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none "
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? "Updating..." : "Creating..."}
              </>
            ) : id ? (
              "Update Enquiry"
            ) : (
              "Create Enquiry"
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 justify-center px-[10%]">
        <div className=" bg-white border-[1px] rounded-xl px-6 py-10 ">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block font-medium text-gray-700">
                Enquiry Number
              </label>
              <input
                type="text"
                required
                value={formData.enquiryNumber}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, enquiryNumber: e.target.value }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700">
                Enquiry Name
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
              <label className="block font-medium text-gray-700">
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
                className="mt-1 block w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700">Scope of Work</label>
              <RichTextEditor
                value={formData.scopeOfWork}
                onChange={(value) => setFormData((prev) => ({ ...prev, scopeOfWork: value }))}
                toolbarConfig={toolbarConfig}
                editorStyle={editorStyle}
                className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
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

        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Deliverables</h3>
            <button
              type="button"
              onClick={addDeliverable}
              className="inline-flex items-center px-3 border border-transparent text-sm font-medium rounded-md text-white bg-black/90 hover:bg-black/80 py-2"
            >
              <Plus size={16} className="mr-1" />
              Add Deliverable
            </button>
          </div>
          <div className="space-y-4">
            {formData.deliverables.map((deliverable) => (
              <div
                key={deliverable.id}
                className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-end border-b pb-4"
              >
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={deliverable.name}
                    onChange={(e) =>
                      updateDeliverable(deliverable.id, "name", e.target.value)
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Hours
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={deliverable.hours}
                    onChange={(e) =>
                      updateDeliverable(
                        deliverable.id,
                        "hours",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cost/Hour
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={deliverable.costPerHour}
                    onChange={(e) =>
                      updateDeliverable(
                        deliverable.id,
                        "costPerHour",
                        parseFloat(e.target.value)
                      )
                    }
                    className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Total
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={deliverable.total}
                      className="mt-1 p-2 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(deliverable.id)}
                    className="mb-1 p-2 text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Exclusions</h3>
            <button
              type="button"
              onClick={addExclusion}
              className="inline-flex items-center px-3 border border-transparent text-sm font-medium rounded-md text-white bg-black/90 hover:bg-black/80 py-2"
            >
              <Plus size={16} className="mr-1" />
              Add Exclusion
            </button>
          </div>
          <div className="space-y-4">
            {formData.exclusions.map((exclusion, index) => (
              <div key={index} className="flex items-end space-x-2">
                <input
                  type="text"
                  required
                  value={exclusion}
                  onChange={(e) => updateExclusion(index, e.target.value)}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeExclusion(index)}
                  className="mb-1 p-2 text-red-600 hover:text-red-900"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* New Inputs Required Section */}
        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Inputs Required</h3>
            <button
              type="button"
              onClick={addInputRequired}
              className="inline-flex items-center px-3 border border-transparent text-sm font-medium rounded-md text-white bg-black/90 hover:bg-black/80 py-2"
            >
              <Plus size={16} className="mr-1" />
              Add Input
            </button>
          </div>
          <div className="space-y-4">
            {formData.inputsRequired.map((input, index) => (
              <div key={index} className="flex items-end space-x-2">
                <input
                  type="text"
                  required
                  value={input}
                  onChange={(e) => updateInputRequired(index, e.target.value)}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeInputRequired(index)}
                  className="mb-1 p-2 text-red-600 hover:text-red-900"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Charges</h3>
            <button
              type="button"
              onClick={addCharge}
              className="inline-flex items-center px-3 border border-transparent text-sm font-medium rounded-md text-white bg-black/90 hover:bg-black/80 py-2"
            >
              <Plus size={16} className="mr-1" />
              Add Charge
            </button>
          </div>
          <div className="space-y-4">
            {formData.charges.map((charge, index) => (
              <div key={index} className="flex items-end space-x-2">
                <input
                  type="text"
                  required
                  value={charge}
                  onChange={(e) => updateCharge(index, e.target.value)}
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeCharge(index)}
                  className="mb-1 p-2 text-red-600 hover:text-red-900"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
}
