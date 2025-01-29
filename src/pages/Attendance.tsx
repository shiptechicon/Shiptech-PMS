import React, { useEffect, useState } from "react";
import { useAttendanceStore } from "../store/attendanceStore";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Loader2, Calendar, ChevronDown, ChevronUp } from "lucide-react";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState<
    MonthlyAttendance[]
  >([]);

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
          // Only include verified users
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
    } else {
      fetchAttendanceRecords();
    }
  }, [isAdmin, fetchAttendanceRecords, fetchAllUsersAttendance]);

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

  const toggleMonthExpansion = (month: string) => {
    setExpandedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTotalAttendance = (userId: string) => {
    return records.filter((record) => record.attendance[userId]).length;
  };

  const isTodayAttendanceMarked = () => {
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
    return records.some(
      (record) => record.date === today && record.attendance[user?.uid || ""]
    );
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
        {!isTodayAttendanceMarked() && (
          <button
            onClick={handleMarkAttendance}
            className="px-4 py-2 text-white rounded-md bg-black/90 hover:bg-black/80"
          >
            Mark Today's Attendance
          </button>
        )}
      </div>

      <div className="px-[10%] mt-10">
        {isAdmin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <div className="relative">
              <select
                value={selectedUser || ""}
                onChange={(e) => setSelectedUser(e.target.value || null)}
                className="mt-1 capitalize py-3 px-4 block w-full rounded-lg cursor-pointer bg-white border-[1px] border-gray-200 appearance-none focus:outline-none  focus:border-black hover:bg-gray-50 transition-colors"
              >
                <option value="">Select employee...</option>
                {Object.values(users).map((user) => (
                  <option
                    className="capitalize cursor-pointer"
                    key={user.id}
                    value={user.id}
                  >
                    <span className="font-bold">{user.fullName}</span> -{" "}
                    {getTotalAttendance(user.id)} days present
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

        <AttendanceCalendar monthlyAttendance={monthlyAttendance} />
      </div>
    </div>
  );
}
