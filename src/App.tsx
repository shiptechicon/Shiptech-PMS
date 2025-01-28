import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import CustomerProject from "./pages/CustomerProject";
import Navbar from "./components/Navbar";
import AttendanceModal from "./components/AttendanceModal";
import { useAuthStore } from "./store/authStore";
import { useAttendanceStore } from "./store/attendanceStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase";

function PrivateRoute({
  children,
  allowedRoles = ["admin", "member"],
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { user } = useAuthStore();
  const [isVerified, setIsVerified] = React.useState<boolean | null>(null);
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkVerification = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsVerified(userData?.verified || false);
        setUserRole(userData?.role || null);
      }
      setLoading(false);
    };
    checkVerification();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // If user is a customer, only allow access to customer route
  if (userRole === "customer") {
    return allowedRoles.includes("customer") ? (
      <>{children}</>
    ) : (
      <Navigate to="/customer" />
    );
  }

  // For non-customer users, check verification
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Account Not Verified
          </h2>
          <p className="text-gray-600">
            Your account is pending verification. Please contact an
            administrator to verify your account.
          </p>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(userRole || "")) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AuthenticatedRedirect() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setUserRole(userData?.role || null);

        if (userData?.role === "customer") {
          navigate("/customer");
        } else {
          navigate("/dashboard");
        }
      }
    };

    checkUserRole();
  }, [user, navigate]);

  return null;
}

function App() {
  const { initialize, signIn, user } = useAuthStore();
  const { checkAttendance } = useAttendanceStore();
  const [initializing, setInitializing] = React.useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      await initialize();

      const storedCredentials = localStorage.getItem("userCredentials");
      if (storedCredentials) {
        try {
          const { email, password } = JSON.parse(storedCredentials);
          const userCredential = await signIn(email, password);
          if (userCredential) {
            const userDoc = await getDoc(doc(db, "users", userCredential.uid));
            const userData = userDoc.data();
            setUserRole(userData?.role || null);
            setIsVerified(userData?.verified || false);
          }
        } catch (error) {
          console.error("Auto-login failed:", error);
          localStorage.removeItem("userCredentials");
        }
      }

      setInitializing(false);
    };

    initAuth();
  }, [initialize, signIn]);

  useEffect(() => {
    const checkUserAttendance = async () => {
      // Only show attendance modal if:
      // 1. User is logged in
      // 2. User is verified
      // 3. User is not a customer
      // 4. Not on login/signup pages
      const isAuthPage =
        location.pathname === "/login" || location.pathname === "/signup";
      const shouldShowModal =
        user && isVerified && userRole !== "customer" && !isAuthPage;

      if (shouldShowModal) {
        const hasMarkedAttendance = await checkAttendance();
        if (!hasMarkedAttendance) {
          setShowAttendanceModal(true);
        }
      }
    };

    if (!initializing) {
      checkUserAttendance();
    }
  }, [
    initializing,
    checkAttendance,
    userRole,
    user,
    isVerified,
    location.pathname,
  ]);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route
          path="/login"
          element={
            <>
              <AuthenticatedRedirect />
              <Login />
            </>
          }
        />
        <Route
          path="/signup"
          element={
            <>
              <AuthenticatedRedirect />
              <Signup />
            </>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute allowedRoles={["admin", "member"]}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminPanel />
            </PrivateRoute>
          }
        />
        <Route
          path="/customer"
          element={
            <PrivateRoute allowedRoles={["customer"]}>
              <CustomerProject />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate
              to={userRole === "customer" ? "/customer" : "/dashboard"}
            />
          }
        />
        <Route
          path="*"
          element={
            <Navigate
              to={userRole === "customer" ? "/customer" : "/dashboard"}
            />
          }
        />
      </Routes>
      <Toaster position="top-right" />
      {user && isVerified && userRole !== "customer" && (
        <AttendanceModal
          isOpen={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}
    </>
  );
}

export default App;
