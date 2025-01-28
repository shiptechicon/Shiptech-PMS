import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { useEnquiryStore } from "../store/enquiryStore";
import toast from "react-hot-toast";

interface Deliverable {
  id: string;
  name: string;
  hours: number;
  costPerHour: number;
  total: number;
}

interface CustomerRequirement {
  id: string;
  text: string;
}

export default function EnquiryForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createEnquiry, updateEnquiry, fetchEnquiry, loading } =
    useEnquiryStore();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customer: {
      name: "",
      phone: "",
      address: "",
    },
    deliverables: [] as Deliverable[],
    requirements: [] as CustomerRequirement[],
  });

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const enquiry = await fetchEnquiry(id);
        if (enquiry) {
          setFormData({
            ...enquiry,
            deliverables: enquiry.deliverables.map((d) => ({
              ...d,
              hours: d.hours ?? 0,
              costPerHour: d.costPerHour ?? 0,
            })),
          });
        }
      }
    };

    loadEnquiry();
  }, [id, fetchEnquiry]);

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

  const addRequirement = () => {
    setFormData((prev) => ({
      ...prev,
      requirements: [
        ...prev.requirements,
        { id: crypto.randomUUID(), text: "" },
      ],
    }));
  };

  const removeRequirement = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.filter((r) => r.id !== id),
    }));
  };

  const updateRequirement = (id: string, text: string) => {
    setFormData((prev) => ({
      ...prev,
      requirements: prev.requirements.map((r) =>
        r.id === id ? { ...r, text } : r
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateEnquiry(id, formData);
        toast.success("Enquiry updated successfully");
      } else {
        await createEnquiry(formData);
        toast.success("Enquiry created successfully");
      }
      navigate("/dashboard/enquiries");
    } catch (error) {
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
          </div>
        </div>

        <div className="bg-white border-[1px] rounded-xl px-6 py-10">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Customer Details
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.customer.name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="tel"
                required
                value={formData.customer.phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, phone: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                required
                value={formData.customer.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, address: e.target.value },
                  }))
                }
                className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>
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
            {formData.deliverables.map((deliverable, index) => (
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

        <div className="bg-white border-[1px] rounded-xl py-10 px-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Requirements
            </h3>
            <button
              type="button"
              onClick={addRequirement}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black/90 hover:bg-black/80"
            >
              <Plus size={16} className="mr-1" />
              Add Requirement
            </button>
          </div>
          <div className="space-y-4">
            {formData.requirements.map((requirement, index) => (
              <div key={requirement.id} className="flex space-x-2">
                <input
                  type="text"
                  required
                  value={requirement.text}
                  onChange={(e) =>
                    updateRequirement(requirement.id, e.target.value)
                  }
                  placeholder={`Requirement ${index + 1}`}
                  className="flex-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeRequirement(requirement.id)}
                  className="p-2 text-red-600 hover:text-red-900"
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
