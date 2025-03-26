import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutsourceTeamStore } from '@/store/outsourceTeamStore';

export default function NewTeam() {
  const navigate = useNavigate();
  const { addTeam } = useOutsourceTeamStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    gst: '',
    contactPersons: [{ name: '', phone: '' }],
    billingAddress: '',
    isBillingAddressSame: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addTeam(formData);
    navigate('/dashboard/outsource-teams');
  };

  const addContactPerson = () => {
    setFormData(prev => ({
      ...prev,
      contactPersons: [...prev.contactPersons, { name: '', phone: '' }]
    }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Add New Outsource Team</h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div>
          <label className="block mb-2">Team Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-2">Address</label>
          <textarea
            value={formData.address}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block mb-2">GST Number</label>
          <input
            type="text"
            value={formData.gst}
            onChange={e => setFormData(prev => ({ ...prev, gst: e.target.value }))}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block mb-2">Contact Persons</label>
          {formData.contactPersons.map((person, index) => (
            <div key={index} className="flex gap-4 mb-4">
              <input
                type="text"
                placeholder="Name"
                value={person.name}
                onChange={e => {
                  const newContactPersons = [...formData.contactPersons];
                  newContactPersons[index].name = e.target.value;
                  setFormData(prev => ({ ...prev, contactPersons: newContactPersons }));
                }}
                className="w-full p-2 border rounded"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={person.phone}
                onChange={e => {
                  const newContactPersons = [...formData.contactPersons];
                  newContactPersons[index].phone = e.target.value;
                  setFormData(prev => ({ ...prev, contactPersons: newContactPersons }));
                }}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addContactPerson}
            className="text-blue-600 hover:text-blue-800"
          >
            + Add Contact Person
          </button>
        </div>

        <div>
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={formData.isBillingAddressSame}
              onChange={e => {
                setFormData(prev => ({
                  ...prev,
                  isBillingAddressSame: e.target.checked,
                  billingAddress: e.target.checked ? prev.address : ''
                }));
              }}
              className="mr-2"
            />
            Billing Address same as Address
          </label>
          {!formData.isBillingAddressSame && (
            <textarea
              value={formData.billingAddress}
              onChange={e => setFormData(prev => ({ ...prev, billingAddress: e.target.value }))}
              className="w-full p-2 border rounded"
              required
            />
          )}
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-black/80"
        >
          Add Team
        </button>
      </form>
    </div>
  );
}