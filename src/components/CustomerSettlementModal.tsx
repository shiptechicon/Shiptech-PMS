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
  const { settlement, fetchSettlement, addPayment, createSettlement } =
    useCustomerSettlementStore();
  const [paymentInfo, setPaymentInfo] = useState({
    amount: 0,
    paymentRef: "",
    date: new Date().toISOString().split("T")[0], // Default to today's date
  });
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [totalAmount , setToatalAmount] = useState(0);
  const [showCreateSettlementModal, setShowCreateSettlementModal] =
    useState(false);

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

  // Fetch settlement data when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetchSettlement(customer.id as string);
      setToatalAmount(calculateSum());
    }

    return () => {
        setPaymentInfo({
            amount: 0,
            paymentRef: "",
            date: new Date().toISOString().split("T")[0],
        });
        setBalanceAmount(0);
        setToatalAmount(0);
    }
  }, [isOpen, fetchSettlement , customer]);

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
            {
              balanceAmount > 0 && (
                <button
                  onClick={() => setShowCreateSettlementModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2 hover:bg-blue-600"
                >
                  Create Settlement
                </button>
              )
            }
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
              </tr>
            </thead>
            <tbody>
              {settlement?.amounts_paid?.map((payment) => (
                <tr key={payment.paymentRef} className="border-b">
                  <td className="border p-2">{payment.amount}</td>
                  <td className="border p-2">{payment.date}</td>
                  <td className="border p-2">{payment.paymentRef}</td>
                </tr>
              ))}
              {
                (!settlement || !settlement.amounts_paid || settlement.amounts_paid.length === 0) && (
                  <tr>
                    <td colSpan={3} className="text-center p-4">
                      No settlements made yet!
                    </td>
                  </tr>
                )
              }
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
    </div>
  );
};

export default CustomerSettlementModal;
