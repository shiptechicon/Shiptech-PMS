import React, { useState, useEffect } from 'react';
import { X, Loader2, Copy } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface CustomerCredentials {
  email: string;
  fullName: string;
  password: string;
}

interface ExistingCustomer {
  id: string;
  email: string;
  fullName: string;
}

export default function CreateCustomerModal({ isOpen, onClose, projectId }: CreateCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<CustomerCredentials | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<CustomerCredentials | null>(null);
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomer | null>(null);
  const [showConfirmNewCustomer, setShowConfirmNewCustomer] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const generateRandomString = (length: number) => {
    const chars = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const generateCredentials = () => {
    const randomString = generateRandomString(4);
    setGeneratedCredentials({
      email: `shiptech-${randomString}@gmail.com`,
      fullName: `ShipTech ${randomString}`,
      password: '123456'
    });
  };

  const checkExistingCustomer = async () => {
    try {
      setCheckingExisting(true);
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('projectId', '==', projectId),
        where('role', '==', 'customer')
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        setExistingCustomer({
          id: customerDoc.id,
          email: customerDoc.data().email,
          fullName: customerDoc.data().fullName
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking existing customer:', error);
      toast.error('Failed to check existing customer');
      return false;
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!generatedCredentials) return;

    try {
      setLoading(true);
      // Create user in Firebase Auth
      const { user } = await createUserWithEmailAndPassword(
        auth, 
        generatedCredentials.email, 
        generatedCredentials.password
      );

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        fullName: generatedCredentials.fullName,
        email: generatedCredentials.email,
        role: 'customer',
        createdAt: new Date().toISOString(),
        verified: true,
        projectId
      });

      setCreatedCredentials(generatedCredentials);
      setGeneratedCredentials(null);
      setShowConfirmNewCustomer(false);
      toast.success('Customer account created successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleClose = () => {
    setGeneratedCredentials(null);
    setCreatedCredentials(null);
    setExistingCustomer(null);
    setShowConfirmNewCustomer(false);
    onClose();
  };

  useEffect(() => {
    const initializeModal = async () => {
      if (isOpen) {
        const hasExisting = await checkExistingCustomer();
        if (!hasExisting) {
          generateCredentials();
        }
      }
    };

    initializeModal();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  if (checkingExisting) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-md p-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Create Customer Account</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {existingCustomer && !showConfirmNewCustomer && !createdCredentials ? (
            // Show existing customer info
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="text-yellow-800 font-medium mb-2">Existing Customer Found</h3>
                <p className="text-yellow-700 text-sm mb-4">
                  This project already has a customer account:
                </p>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border border-yellow-200">
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-medium">{existingCustomer.fullName}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-yellow-200">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{existingCustomer.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmNewCustomer(true);
                    generateCredentials();
                  }}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                >
                  Create Another Account
                </button>
              </div>
            </div>
          ) : createdCredentials ? (
            // Show created account details
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-green-800 font-medium mb-2">Account Created Successfully!</h3>
                <p className="text-green-700 text-sm mb-4">
                  Please save these credentials before closing:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="font-medium">{createdCredentials.fullName}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.fullName)}
                      className="p-1.5 text-green-700 hover:bg-green-50 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium">{createdCredentials.email}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.email)}
                      className="p-1.5 text-green-700 hover:bg-green-50 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                    <div>
                      <p className="text-xs text-gray-500">Password</p>
                      <p className="font-medium">{createdCredentials.password}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCredentials.password)}
                      className="p-1.5 text-green-700 hover:bg-green-50 rounded"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          ) : generatedCredentials ? (
            // Show credentials for confirmation
            <div className="space-y-4">
              <div >
                <h3 className="text-black/70 font-medium mb-2">Review Customer Account Details</h3>
                {showConfirmNewCustomer && (
                  <p className="text-red-600 text-sm mb-4">
                    Warning: You are creating an additional customer account for this project.
                  </p>
                )}
                <p className="text-black/70 text-sm mb-4">
                  Please review the following credentials before creating the account:
                </p>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-medium">{generatedCredentials.fullName}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{generatedCredentials.email}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs text-gray-500">Password</p>
                    <p className="font-medium">{generatedCredentials.password}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setGeneratedCredentials(null);
                    generateCredentials();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Generate New
                </button>
                <button
                  onClick={handleCreateCustomer}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black/90 hover:bg-black/80 disabled:opacity-50 flex items-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : (
                    'Confirm & Create'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}