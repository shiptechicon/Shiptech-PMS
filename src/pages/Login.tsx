import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signIn, loading, error } = useAuthStore();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(""); // State for email input in modal
  const [resetError, setResetError] = useState(""); // State for reset error message
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signIn(email, password);
      if (userCredential) {
        // Get user role from Firestore
        const userDoc = await getDoc(doc(db, "users", userCredential.uid));
        const userData = userDoc.data();

        toast.success("Successfully logged in!");

        // Route based on user role
        if (userData?.role === "admin") {
          navigate("/dashboard");
        } else if (userData?.role === "customer") {
          navigate("/customer");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      toast.error("Failed to login. Please try again.");
    }
  };

  const handleResetPassword = async () => {
    try {
      // Check if the email exists in the users collection
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", resetEmail));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setResetError("User does not exist.");
        return;
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, resetEmail);
      toast.success("Password reset email sent!");
      setShowResetPassword(false);
      setResetError(""); // Clear any previous error
    } catch (err) {
      toast.error("Failed to send password reset email. Please try again.");
      setResetError("Failed to send password reset email. Please try again.");
    }
  };

  return (
    <div className="min-h-screen watermark flex items-center justify-center">
      <div className="p-8 bg-white shadow-2xl rounded-lg w-96 h-full">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo-192x192.png" alt="ShipTech PMS" className="h-20" />
          <h2 className="text-2xl font-semibold text-center mb-6">
            Login to <span className="font-bold">ShipTech-ICON</span>
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm  p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="...................."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm  p-2"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
        <button
          onClick={() => setShowResetPassword(true)}
          className="text-blue-600 hover:text-blue-500 text-sm justify-center flex w-full"
        >
          Forgot Password?
        </button>
        {showResetPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-96">
              <h2 className="text-2xl font-semibold mb-6">Reset Password</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={resetEmail}
                  placeholder="Enter your email"
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm  p-2"
                  required
                />
              </div>
              {resetError && <p className="text-red-500 text-sm mt-2">{resetError}</p>}
              <button
                onClick={handleResetPassword}
                className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-black/90 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 "
              >
                Send Reset Email
              </button>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetError(""); // Clear error when closing modal
                }}
                className="w-full mt-2 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 "
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}