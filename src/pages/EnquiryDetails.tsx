import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Enquiry, useEnquiryStore, Deliverable } from "../store/enquiryStore";
import { Loader2, Pencil, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import toast from "react-hot-toast";
import InvoiceDownloader from "@/components/InvoiceDocument";
import { useCustomerStore, Customer } from "../store/customerStore";

export default function EnquiryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEnquiry, convertToProject } = useEnquiryStore();
  const { fetchCustomer } = useCustomerStore();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const data = await fetchEnquiry(id);
        if (data) {
          setEnquiry(data);
          
          // Fetch customer details if customer_id exists
          if (data.customer_id) {
            const customerData = await fetchCustomer(data.customer_id);
            if (customerData) {
              setCustomerDetails(customerData);
            }
          }
        } else {
          toast.error("Enquiry not found");
          navigate("/dashboard/enquiries");
        }
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    loadEnquiry();
    checkUserRole();
  }, [id, user, fetchEnquiry, fetchCustomer, navigate]);

  const handleConvertToProject = async () => {
    try {
      if (!id) return;
      await convertToProject(id);
      navigate("/dashboard/projects");
    } catch (error) {
      console.error("Error converting to project:", error);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!enquiry) {
    return (
      <div className="p-6">
        <p className="text-red-500">Enquiry not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate("/dashboard/enquiries")}>
            <ArrowLeft className="h-7 w-7" />
          </button>
          <h2 className="text-2xl font-bold">Enquiry Details</h2>
        </div>

        <div className="flex space-x-4">
          <InvoiceDownloader enquiry={enquiry} />
          {isAdmin && (
            <>
              <button
                onClick={() => navigate(`/dashboard/enquiries/${id}/edit`)}
                className="inline-flex items-center px-4 py-2  text-sm font-medium rounded-md text-black bg-white border-[1px]"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleConvertToProject}
                className="inline-flex items-center px-4 py-2  text-sm font-medium rounded-md text-black bg-white border-[1px]"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Move to Projects
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6 px-[10%] mt-10">
        {/* Basic Information Section */}
        <div className="bg-white border-[1px] rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Basic Information
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">ID</p>
                <p className="mt-1">{enquiry.__id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Created At</p>
                <p className="mt-1">
                  {new Date(enquiry.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1">{enquiry.name}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="mt-1">{enquiry.description}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="bg-white border-[1px] rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Details
            </h3>
          </div>
          <div className="px-6 py-4">
            {customerDetails ? (
              <div className="grid grid-cols-2 gap-4">
                {customerDetails.logoUrl && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-gray-500">Logo</p>
                    <img 
                      src={customerDetails.logoUrl} 
                      alt="Customer Logo" 
                      className="mt-1 max-h-20 object-contain"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="mt-1">{customerDetails.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="mt-1">{customerDetails.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">GST Number</p>
                  <p className="mt-1">{customerDetails.gstNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Client</p>
                  <p className="mt-1">{customerDetails.endClient}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="mt-1">{customerDetails.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Billing Address</p>
                  <p className="mt-1">{customerDetails.billingAddress}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-500">Contact Persons</p>
                  <div className="mt-1 space-y-2">
                    {customerDetails.contactPersons.map((person, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <span className="text-sm text-gray-700">{person.name}</span>
                        <span className="text-sm text-gray-500">-</span>
                        <span className="text-sm text-gray-700">{person.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No customer details found.</p>
            )}
          </div>
        </div>

        {/* Deliverables Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Deliverables</h3>
          </div>
          <div className="px-6 py-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hours
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost/Hour
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {enquiry.deliverables.map((deliverable: Deliverable) => (
                  <tr key={deliverable.id}>
                    <td className="px-3 py-4 text-sm text-gray-900">
                      {deliverable.name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {deliverable.hours}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      ₹{deliverable.costPerHour}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-right">
                      ₹{deliverable.total}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-sm font-medium text-gray-900 text-right"
                  >
                    Grand Total
                  </td>
                  <td className="px-3 py-4 text-sm font-medium text-gray-900 text-right">
                    ₹
                    {enquiry.deliverables.reduce(
                      (sum: number, d: Deliverable) => sum + d.total,
                      0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Scope of Work Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Scope of Work
            </h3>
          </div>
          <div className="px-6 py-4">
            <div 
              className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700"
              dangerouslySetInnerHTML={{ __html: enquiry.scopeOfWork }}
            />
          </div>
        </div>

        {/* Exclusions Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Exclusions</h3>
          </div>
          <div className="px-6 py-4"> 
            <ul className="list-disc pl-5">
              {enquiry.exclusions.map((exclusion, index) => (
                <li key={index} className="text-gray-700">{exclusion}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Charges Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Charges</h3>
          </div>
          <div className="px-6 py-4">
            <ul className="list-disc pl-5">
              {enquiry.charges.map((charge, index) => (
                <li key={index} className="text-gray-700">{charge}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Inputs Required Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">Inputs Required</h3>
          </div>
          <div className="px-6 py-4"> 
            <ul className="list-disc pl-5">
              {enquiry.inputsRequired.map((input, index) => (
                <li key={index} className="text-gray-700">{input}</li>
              ))}
            </ul>
          </div>
        </div>

        
      </div>
    </div>
  );
}
