import React, { useEffect, useState } from "react";
import { useAttendanceStore } from "../store/attendanceStore";
import { useAuthStore } from "../store/authStore";
import { useLeaveStore } from "../store/leaveStore";
import { useWorkFromStore } from "../store/workfromhomestore";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Loader2, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import AttendanceCalendar from "@/components/AttendanceCalendar";

interface User {
  id: string;
  fullName: string;
  email: string;
  verified?: boolean;
}

export interface MonthlyAttendance {
  month: string;
  records: {
    date: string;
    time: string;
  }[];
}

export default function Attendance() {
  const {
    records,
    loading,
    fetchAttendanceRecords,
    fetchAllUsersAttendance,
    markAttendance,
  } = useAttendanceStore();
  const { user } = useAuthStore();
  const { requestLeave, fetchUserLeaveRequests, allLeaveRequests, fetchAllLeaveRequests } =
    useLeaveStore();
  const { requestWorkFrom, fetchUserWorkFromRequests, allWorkFromRequests, fetchAllWorkFromRequests } =
    useWorkFromStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [monthlyAttendance, setMonthlyAttendance] = useState<
    MonthlyAttendance[]
  >([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Modal states
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showWorkFromModal, setShowWorkFromModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [workFromForm, setWorkFromForm] = useState({
    startDate: "",
    endDate: "",
    location: "",
  });

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
      }
    };

    const loadUsers = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersData = querySnapshot.docs.reduce((acc, doc) => {
        const userData = doc.data();
        if (userData.verified) {
          return {
            ...acc,
            [doc.id]: { id: doc.id, ...userData },
          };
        }
        return acc;
      }, {});
      setUsers(usersData);
    };

    checkUserRole();
    loadUsers();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllUsersAttendance();
      fetchAllLeaveRequests();
      fetchAllWorkFromRequests();
    } else {
      fetchAttendanceRecords();
    }
  }, [isAdmin, fetchAttendanceRecords, fetchAllUsersAttendance]);

  useEffect(() => {
    const userId = selectedUser || user?.uid;
    if (userId) {
      // Fetch leave and work from home requests for selected user
      if (isAdmin && selectedUser) {
        fetchUserLeaveRequests(selectedUser);
        fetchUserWorkFromRequests(selectedUser);
      } else if (!isAdmin) {
        fetchUserLeaveRequests();
        fetchUserWorkFromRequests();
      }
    }
  }, [selectedUser, isAdmin]);

  useEffect(() => {
    const processRecords = () => {
      const userId = selectedUser || user?.uid;
      if (!userId) return;

      const monthlyData: Record<string, { date: string; time: string }[]> = {};

      records
        .filter((record) => record.attendance[userId])
        .forEach((record) => {
          const date = new Date(record.date);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}`;
          const monthName = date.toLocaleString("default", {
            month: "long",
            year: "numeric",
          });

          if (!monthlyData[monthName]) {
            monthlyData[monthName] = [];
          }

          monthlyData[monthName].push({
            date: record.date,
            time: record.attendance[userId],
          });
        });

      const sortedMonthly = Object.entries(monthlyData)
        .map(([month, records]) => ({
          month,
          records: records.sort((a, b) => b.date.localeCompare(a.date)),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      setMonthlyAttendance(sortedMonthly);
    };

    processRecords();
  }, [records, selectedUser, user?.uid]);

  const handleMarkAttendance = async () => {
    try {
      await markAttendance();
      toast.success("Attendance marked successfully");
    } catch (error) {
      toast.error("Failed to mark attendance");
    }
  };

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestLeave(
        leaveForm.startDate,
        leaveForm.endDate,
        leaveForm.reason
      );
      setShowLeaveModal(false);
      setLeaveForm({ startDate: "", endDate: "", reason: "" });
      toast.success("Leave request submitted successfully");
    } catch (error) {
      toast.error("Failed to submit leave request");
    }
  };

  const handleRequestWorkFromHome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestWorkFrom(workFromForm.startDate, workFromForm.endDate);
      setShowWorkFromModal(false);
      setWorkFromForm({ startDate: "", endDate: "", location: "" });
      toast.success("Work from home request submitted successfully");
    } catch (error) {
      toast.error("Failed to submit work from home request");
    }
  };

  const getTotalAttendance = (userId: string) => {
    return records.filter((record) => record.attendance[userId]).length;
  };

  const isTodayAttendanceMarked = () => {
    const today = new Date().toISOString().split("T")[0];
    return records.some(
      (record) => record.date === today && record.attendance[user?.uid || ""]
    );
  };

  const hasPendingRequests = (userId: string) => {

    const pendingLeave = allLeaveRequests.some(
      req => req.userId === userId && req.status === "pending"
    );
    const pendingWorkFrom = allWorkFromRequests.some(
      req => req.userId === userId && req.status === "pending"  
    );
    console.log(allLeaveRequests, allWorkFromRequests, pendingLeave, pendingWorkFrom , userId);
    
    return pendingLeave || pendingWorkFrom;
  };

  const isAnyRequestPending = () => {
    return allLeaveRequests.some(req => req.status === "pending") || allWorkFromRequests.some(req => req.status === "pending");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management</h1>
          <p className="text-gray-600 mt-1">
            Total Days Present:{" "}
            {getTotalAttendance(selectedUser || user?.uid || "")}
          </p>
        </div>
        <div className="flex gap-2">
          {!isTodayAttendanceMarked() && (
            <button
              onClick={handleMarkAttendance}
              className="px-4 py-2 text-white rounded-md bg-black/90 hover:bg-black/80"
            >
              Mark Today's Attendance
            </button>
          )}
          <button
            onClick={() => setShowLeaveModal(true)}
            className="px-4 py-2 text-white rounded-md bg-red-600 hover:bg-red-700"
          >
            Request Leave
          </button>
          <button
            onClick={() => setShowWorkFromModal(true)}
            className="px-4 py-2 text-white rounded-md bg-green-600 hover:bg-green-700"
          >
            Work From Home
          </button>
        </div>
      </div>

      {/* Leave Request Modal */}
      {showLeaveModal && (
        <div className="fixed z-[100] inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Request Leave</h2>
            <form onSubmit={handleRequestLeave}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={leaveForm.startDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, startDate: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={leaveForm.endDate}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, endDate: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea
                  required
                  value={leaveForm.reason}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, reason: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-red-600 rounded"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work From Home Modal */}
      {showWorkFromModal && (
        <div className="fixed z-[100] inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Request Work From Home</h2>
            <form onSubmit={handleRequestWorkFromHome}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={workFromForm.startDate}
                  onChange={(e) =>
                    setWorkFromForm({
                      ...workFromForm,
                      startDate: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={workFromForm.endDate}
                  onChange={(e) =>
                    setWorkFromForm({
                      ...workFromForm,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWorkFromModal(false)}
                  className="px-4 py-2 text-gray-600 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-green-600 rounded"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="px-[10%] mt-10">
        {isAdmin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <div className="relative">
              <button
                onClick={() => setShowEmployeeDropdown(!showEmployeeDropdown)}
                className="mt-1 relative capitalize py-3 px-4 w-full text-left rounded-lg cursor-pointer bg-white border-[1px] border-gray-200 focus:outline-none focus:border-black hover:bg-gray-50 transition-colors flex justify-between items-center"
              >
                <div className="flex items-center gap-2">
                  <span>{selectedUser ? users[selectedUser]?.fullName : "Select employee..."}</span>
                  {selectedUser && hasPendingRequests(selectedUser) && (
                    <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
                  )}
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${showEmployeeDropdown ? 'rotate-180' : ''}`} />
                {isAnyRequestPending() ? <span className="h-3 w-3 bg-red-600 rounded-full animate-pulse absolute top-0 right-0 translate-x-1 -translate-y-1"></span> : null}
              </button>
              
              {showEmployeeDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  <div 
                    className="p-2 hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedUser(null);
                      setShowEmployeeDropdown(false);
                    }}
                  >
                    Select employee...
                  </div>
                  {Object.values(users).map((employee) => (
                    <div
                      key={employee.id}
                      className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                      onClick={() => {
                        setSelectedUser(employee.id);
                        setShowEmployeeDropdown(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{employee.fullName}</span>
                        <span className="text-gray-500">
                          - {getTotalAttendance(employee.id)} days present
                        </span>
                        {hasPendingRequests(employee.id) && (
                          <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <AttendanceCalendar
          monthlyAttendance={monthlyAttendance}
          selectedUser={selectedUser}
        />
      </div>
    </div>
  );
}
