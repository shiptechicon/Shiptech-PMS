import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Plus, Loader2, Trash2, ExternalLink } from "lucide-react";
import { useEnquiryStore } from "../store/enquiryStore";
import toast from "react-hot-toast";
import EnquiryForm from "./EnquiryForm";
import EnquiryDetails from "./EnquiryDetails";

const EnquiriesList = () => {
  const navigate = useNavigate();
  const { enquiries, loading, fetchEnquiries, deleteEnquiry } =
    useEnquiryStore();

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this enquiry?")) {
      try {
        await deleteEnquiry(id);
        toast.success("Enquiry deleted successfully");
      } catch (error) {
        toast.error("Failed to delete enquiry");
      }
    }
  };

  const filteredEnquiries = enquiries.filter((e) => e.type === "enquiry");

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Enquiries</h2>
        <button
          onClick={() => navigate("new")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80"
        >
          <Plus size={20} className="mr-2" />
          New Enquiry
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredEnquiries.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No enquiries yet. Create your first one!
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 overflow-x-auto">
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
                  status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnquiries.map((enquiry) => (
                <tr
                  onClick={() => navigate(`${enquiry.id}`)}
                  key={enquiry.id}
                  className="hover:bg-gray-50 hover:cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enquiry.__id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {enquiry.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {enquiry.customer?.name || "No Customer"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(enquiry.createdAt).toLocaleDateString()}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-white`}
                  >
                    <div
                      className={`px-3 py-2 whitespace-nowrap text-sm text-white w-max rounded-sm ${
                        enquiry.status === "cancelled"
                          ? "bg-red-500"
                          : enquiry.status === "moved to projects"
                          ? "bg-green-500"
                          : enquiry.status === "on hold"
                          ? "bg-yellow-500"
                          : ""
                      }`}
                    >
                      {enquiry.status || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        onClick={() => navigate(`${enquiry.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <ExternalLink size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(enquiry.id!)}
                        className="text-red-600 hover:text-red-900"
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
      )}
    </div>
  );
};

export default function Enquiries() {
  return (
    <Routes>
      <Route path="/" element={<EnquiriesList />} />
      <Route path="/new" element={<EnquiryForm />} />
      <Route path="/:id" element={<EnquiryDetails />} />
      <Route path="/:id/edit" element={<EnquiryForm />} />
    </Routes>
  );
}
