import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEnquiryStore } from "../store/enquiryStore";
import { useProjectStore } from "../store/projectStore";
import { Loader2, Pencil, FileDown, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";

export default function EnquiryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEnquiry, convertToProject } = useEnquiryStore();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const data = await fetchEnquiry(id);
        if (data) {
          setEnquiry(data);
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
  }, [id, user, fetchEnquiry, navigate]);

  const handleConvertToProject = async () => {
    try {
      if (!id) return;
      await convertToProject(id);
      navigate("/dashboard/projects");
    } catch (error) {
      console.error("Error converting to project:", error);
    }
  };

  const downloadInvoice = () => {
    if (!enquiry) return;

    const totalAmount = enquiry.deliverables.reduce(
      (sum: number, d: any) => sum + d.total,
      0
    );

    const content = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h1 style="color: #2563eb;">INVOICE</h1>
          <p style="color: #666;">Enquiry ID: ${enquiry.__id}</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2>ShipTech-ICON</h2>
          <p>Center for Innovation Technology Transfer & Industrial Collaboration</p>
          <p>CITTIC, CUSAT, Kochi, Kerala 682022</p>
        </div>

        <div style="margin-bottom: 30px;">
          <h3>Bill To:</h3>
          <p><strong>${enquiry.customer.name}</strong></p>
          <p>${enquiry.customer.address}</p>
          <p>Phone: ${enquiry.customer.phone}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Item</th>
              <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${enquiry.deliverables
              .map(
                (d: any) => `
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${d.name}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">₹${d.total}</td>
              </tr>
            `
              )
              .join("")}
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 12px; text-align: right; font-weight: bold;">Total Amount:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold;">₹${totalAmount}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 30px;">
          <h3>Customer Requirements:</h3>
          <ul>
            ${enquiry.requirements
              .map(
                (r: any) => `
              <li style="margin-bottom: 8px;">${r.text}</li>
            `
              )
              .join("")}
          </ul>
        </div>
      </div>
    `;

    const opt = {
      margin: 1,
      filename: `invoice-${enquiry.__id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    const element = document.createElement("div");
    element.innerHTML = content;
    document.body.appendChild(element);

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        document.body.removeChild(element);
      });
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
          <button
            onClick={downloadInvoice}
            className="inline-flex items-center px-4 py-2  text-sm font-medium rounded-md text-black bg-white border-[1px]"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Download Invoice
          </button>
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
        <div className="bg-white border-[1px]  rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Details
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1">{enquiry.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Phone</p>
                <p className="mt-1">{enquiry.customer.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="mt-1">{enquiry.customer.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliverables Section */}
        <div className="bg-white  rounded-xl border-[1px] overflow-hidden">
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
                {enquiry.deliverables.map((deliverable: any) => (
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
                      (sum: number, d: any) => sum + d.total,
                      0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Requirements Section */}
        <div className="bg-white rounded-xl border-[1px] overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-3">
            <h3 className="text-lg font-medium text-gray-900">
              Customer Requirements
            </h3>
          </div>
          <div className="px-6 py-4">
            <ul className="space-y-2">
              {enquiry.requirements.map((requirement: any) => (
                <li
                  key={requirement.id}
                  className="text-gray-700 flex items-start"
                >
                  <span className="text-gray-400 mr-2">•</span>
                  <span>{requirement.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
