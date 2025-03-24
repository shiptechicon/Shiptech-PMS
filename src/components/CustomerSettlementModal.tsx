import { useCustomerSettlementStore } from "@/store/customerSettlementStore";
import { Customer } from "@/store/customerStore";
import { Enquiry } from "@/store/enquiryStore";
import { Project } from "@/store/projectStore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const CustomerSettlementModal = ({
  customer,
  enquiries,
  isOpen,
  setOpen,
  projects,
}: {
  customer: Customer;
  enquiries: Enquiry[];
  projects: Project[];
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}) => {
  const {
    settlement,
    fetchSettlement,
    addPayment,
    createSettlement,
    editPayment,
    deletePayment,
  } = useCustomerSettlementStore();

  const [paymentInfo, setPaymentInfo] = useState({
    amount: 0,
    paymentRef: "",
    date: new Date().toISOString().split("T")[0], // Default to today's date
  });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showCreateSettlementModal, setShowCreateSettlementModal] =
    useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );

  // Calculate the total amount from enquiries
  const calculateSum = () => {
    return (
      enquiries?.reduce((sum, enquiry) => {
        return (
          sum +
          (enquiry.deliverables?.reduce((enquirySum, deliverable) => {
            return (
              enquirySum +
              (deliverable.costPerHour ?? 0) * (deliverable.hours ?? 0)
            );
          }, 0) ?? 0)
        );
      }, 0) ?? 0
    );
  };

  // Handle creating a new settlement or adding a payment
  const handleCreateSettlement = async () => {
    try {
      if (paymentInfo.date === "" || paymentInfo.paymentRef === "") {
        toast.error("All fields are required");
        return;
      }

      if (paymentInfo.amount <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      if (paymentInfo.amount > balanceAmount) {
        toast.error("Amount must be less than balance to pay");
        return;
      }

      const totalAmount = calculateSum();

      if (settlement?.id) {
        await addPayment(
          settlement.id,
          paymentInfo.amount,
          totalAmount,
          paymentInfo.paymentRef
        );
      } else {
        await createSettlement({
          ...settlement,
          customer_id: customer.id as string,
          project_id: projects[0].id as string,
          amounts_paid: [
            {
              id: Math.random().toString(36).substring(7),
              date: paymentInfo.date,
              amount: paymentInfo.amount,
              paymentRef: paymentInfo.paymentRef,
            },
          ],
        });
      }
      toast.success("Settlement created successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create settlement");
    } finally {
      setPaymentInfo({
        amount: 0,
        paymentRef: "",
        date: new Date().toISOString().split("T")[0],
      });
      setShowCreateSettlementModal(false);
    }
  };

  const handleEditPayment = async () => {
    try {
      // Check if we have a valid settlement and index
      if (editIndex === null || !settlement?.id) {
        toast.error("Cannot edit payment: Settlement not found");
        return;
      }

      // Validate payment information
      if (!paymentInfo.date) {
        toast.error("Payment date is required");
        return;
      }

      if (!paymentInfo.paymentRef) {
        toast.error("Payment reference is required");
        return;
      }

      if (paymentInfo.amount <= 0) {
        toast.error("Amount must be greater than 0");
        return;
      }

      if (paymentInfo.amount > balanceAmount) {
        toast.error("Amount must be less than balance to pay");
        return;
      }

      const totalAmount = calculateSum();

      // Call edit payment function from store
      await editPayment(
        settlement.id,
        editIndex,
        {
          amount: paymentInfo.amount,
          date: paymentInfo.date,
          paymentRef: paymentInfo.paymentRef,
        },
        totalAmount
      );

      // Refresh the settlement data after editing
      await fetchSettlement(customer.id as string);

      toast.success("Payment updated successfully");
      setShowEditModal(false);
      setEditIndex(null);
      resetPaymentInfo();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error("Failed to update payment");
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      if (!settlement?.id) {
        toast.error("Settlement not found");
        return;
      }

      const totalAmount = calculateSum();
      await deletePayment(settlement.id, index, totalAmount);

      // Wait for a moment and then fetch settlement again to ensure UI is updated
      await fetchSettlement(customer.id as string);

      toast.success("Payment deleted successfully");
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete payment");
    }
  };

  // Reset payment info state
  const resetPaymentInfo = () => {
    setPaymentInfo({
      amount: 0,
      paymentRef: "",
      date: new Date().toISOString().split("T")[0],
    });
  };

  // Open edit modal with selected payment data
  const openEditModal = (index: number) => {
    if (settlement?.amounts_paid && index < settlement.amounts_paid.length) {
      const payment = settlement.amounts_paid[index];

      // Ensure date is properly formatted
      let paymentDate = payment.date;
      try {
        // Try to format the date as YYYY-MM-DD for the input field
        paymentDate = new Date(payment.date).toISOString().split("T")[0];
      } catch (error) {
        console.error("Error formatting date:", error);
      }

      setPaymentInfo({
        amount: payment.amount,
        paymentRef: payment.paymentRef,
        date: paymentDate,
      });

      setEditIndex(index);
      setShowEditModal(true);
    }
  };

  // Fetch settlement data when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettlement(customer.id as string);
      setTotalAmount(calculateSum());
    }

    return () => {
      resetPaymentInfo();
      setBalanceAmount(0);
      setTotalAmount(0);
      setEditIndex(null);
      setShowEditModal(false);
      setShowDeleteConfirm(null);
    };
  }, [isOpen, fetchSettlement, customer]);

  // Calculate the balance amount
  useEffect(() => {
    const totalAmount = calculateSum();
    const totalPaid =
      settlement?.amounts_paid?.reduce(
        (sum, payment) => sum + payment.amount,
        0
      ) || 0;
    setBalanceAmount(totalAmount - totalPaid);
  }, [settlement, enquiries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Customer Settlements</h2>
          <div className="flex items-center gap-4">
            {balanceAmount > 0 && (
              <button
                onClick={() => setShowCreateSettlementModal(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2 hover:bg-blue-600"
              >
                Create Settlement
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-4xl"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="mb-4">
          <p>
            <strong>Total Amount:</strong> {totalAmount}
          </p>
          <p>
            <strong>Balance:</strong> {balanceAmount}
          </p>
        </div>
        <div>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Amount</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Payment Reference</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {settlement?.amounts_paid?.map((payment, index) => (
                <tr key={payment.id} className="border-b">
                  <td className="border p-2">{payment.amount}</td>
                  <td className="border p-2">
                    {new Date(payment.date).toLocaleDateString()}
                  </td>
                  <td className="border p-2">{payment.paymentRef}</td>
                  <td className="border p-2 flex justify-center space-x-2">
                    <button
                      onClick={() => openEditModal(index)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(index)}
                      className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {(!settlement ||
                !settlement.amounts_paid ||
                settlement.amounts_paid.length === 0) && (
                <tr>
                  <td colSpan={4} className="text-center p-4">
                    No settlements made yet!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Settlement Modal */}
      {showCreateSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add Payment</h2>
              <button
                onClick={() => setShowCreateSettlementModal(false)}
                className="text-gray-500 hover:text-gray-700 text-4xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={paymentInfo.date}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, date: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentInfo.paymentRef}
                  onChange={(e) =>
                    setPaymentInfo({
                      ...paymentInfo,
                      paymentRef: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentInfo.amount}
                  onChange={(e) =>
                    setPaymentInfo({
                      ...paymentInfo,
                      amount: parseFloat(e.target.value),
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <button
                onClick={handleCreateSettlement}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Payment</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditIndex(null);
                  resetPaymentInfo();
                }}
                className="text-gray-500 hover:text-gray-700 text-4xl"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  value={paymentInfo.date}
                  onChange={(e) =>
                    setPaymentInfo({ ...paymentInfo, date: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Reference
                </label>
                <input
                  type="text"
                  value={paymentInfo.paymentRef}
                  onChange={(e) =>
                    setPaymentInfo({
                      ...paymentInfo,
                      paymentRef: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentInfo.amount}
                  onChange={(e) =>
                    setPaymentInfo({
                      ...paymentInfo,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <button
                onClick={handleEditPayment}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">Confirm Deletion</h2>
              <p className="mt-2">
                Are you sure you want to delete this payment? This action cannot
                be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePayment(showDeleteConfirm)}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerSettlementModal;
