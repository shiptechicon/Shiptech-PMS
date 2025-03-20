import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomerCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerEmail: string;
  customerName: string;
}

export default function CustomerCredentialsModal({
  isOpen,
  onClose,
  customerEmail,
  customerName,
}: CustomerCredentialsModalProps) {
  if (!isOpen) return null;

  const generatedPassword = customerName.replace(/\s+/g, '_').toLowerCase() + '@123';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Customer Credentials</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="email"
                value={customerEmail}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(customerEmail)}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={generatedPassword}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(generatedPassword)}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Copy
              </button>
            </div>
          </div>

          {/* url for customer login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Login URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${import.meta.env.VITE_MAIN_URL}/customer_login`}
                readOnly
                className="flex-1 p-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(`${import.meta.env.VITE_MAIN_URL}/customer_login`)}
                className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 