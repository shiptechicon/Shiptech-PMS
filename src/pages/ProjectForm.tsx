import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import toast from 'react-hot-toast';

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

export default function ProjectForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createProject, updateProject, fetchProject, loading } = useProjectStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    customer: {
      name: '',
      phone: '',
      address: '',
    },
    deliverables: [] as Deliverable[],
    requirements: [] as CustomerRequirement[],
  });

  useEffect(() => {
    const loadProject = async () => {
      if (id) {
        const project = await fetchProject(id);
        if (project) {
          setFormData(project);
        }
      }
    };

    loadProject();
  }, [id, fetchProject]);

  const addDeliverable = () => {
    setFormData(prev => ({
      ...prev,
      deliverables: [
        ...prev.deliverables,
        { id: crypto.randomUUID(), name: '', hours: 0, costPerHour: 0, total: 0 },
      ],
    }));
  };

  const removeDeliverable = (id: string) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.filter(d => d.id !== id),
    }));
  };

  const updateDeliverable = (id: string, field: keyof Deliverable, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      deliverables: prev.deliverables.map(d => {
        if (d.id === id) {
          const updatedDeliverable = { ...d, [field]: value };
          updatedDeliverable.total = updatedDeliverable.hours * updatedDeliverable.costPerHour;
          return updatedDeliverable;
        }
        return d;
      }),
    }));
  };

  const addRequirement = () => {
    setFormData(prev => ({
      ...prev,
      requirements: [
        ...prev.requirements,
        { id: crypto.randomUUID(), text: '' },
      ],
    }));
  };

  const removeRequirement = (id: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.filter(r => r.id !== id),
    }));
  };

  const updateRequirement = (id: string, text: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map(r =>
        r.id === id ? { ...r, text } : r
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id) {
        await updateProject(id, formData);
        toast.success('Project updated successfully');
      } else {
        await createProject(formData);
        toast.success('Project created successfully');
      }
      navigate('/dashboard/projects');
    } catch (error) {
      toast.error(id ? 'Failed to update project' : 'Failed to create project');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold">
            {id ? 'Edit Project' : 'Create New Project'}
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                {id ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              id ? 'Update Project' : 'Create Project'
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6 bg-white shadow-sm rounded-lg p-6">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              required
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={formData.customer.name}
              onChange={e => setFormData(prev => ({
                ...prev,
                customer: { ...prev.customer, name: e.target.value }
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              required
              value={formData.customer.phone}
              onChange={e => setFormData(prev => ({
                ...prev,
                customer: { ...prev.customer, phone: e.target.value }
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea
              required
              value={formData.customer.address}
              onChange={e => setFormData(prev => ({
                ...prev,
                customer: { ...prev.customer, address: e.target.value }
              }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Deliverables</h3>
          <button
            type="button"
            onClick={addDeliverable}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            Add Deliverable
          </button>
        </div>
        <div className="space-y-4">
          {formData.deliverables.map((deliverable, index) => (
            <div key={deliverable.id} className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-end border-b pb-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={deliverable.name}
                  onChange={e => updateDeliverable(deliverable.id, 'name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Hours</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={deliverable.hours}
                  onChange={e => updateDeliverable(deliverable.id, 'hours', parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost/Hour</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={deliverable.costPerHour}
                  onChange={e => updateDeliverable(deliverable.id, 'costPerHour', parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700">Total</label>
                  <input
                    type="number"
                    readOnly
                    value={deliverable.total}
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeDeliverable(deliverable.id)}
                  className="p-2 text-red-600 hover:text-red-900"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Project Requirements</h3>
          <button
            type="button"
            onClick={addRequirement}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
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
                onChange={e => updateRequirement(requirement.id, e.target.value)}
                placeholder={`Requirement ${index + 1}`}
                className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
    </form>
  );
}