import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyAttendance } from "@/pages/Attendance";
import { useLeaveStore } from "@/store/leaveStore";
import { useWorkFromStore } from "@/store/workfromhomestore";
import { useAuthStore } from "@/store/authStore";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

export default function AttendanceCalendar({
  monthlyAttendance,
  selectedUser,
}: {
  monthlyAttendance: MonthlyAttendance[];
  selectedUser?: string | null;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const {
    leaveRequests: leaves,
    fetchUserLeaveRequests,
    cancelLeaveRequest,
    updateLeaveStatus,
  } = useLeaveStore();
  const {
    workFromRequests,
    fetchUserWorkFromRequests,
    cancelWorkFromHome,
    updateWorkFromStatus,
  } = useWorkFromStore();
  const { user, userData } = useAuthStore();
  const [showDialog, setShowDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Generate calendar days for the current month
  useEffect(() => {
    const generateCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Get the first day of the month
      const firstDayOfMonth = new Date(year, month, 1);
      const startingDayOfWeek = firstDayOfMonth.getDay();

      // Get the last day of the month
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const totalDaysInMonth = lastDayOfMonth.getDate();

      // Get the last day of the previous month
      const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

      const calendarDays: CalendarDay[] = [];

      // Add days from previous month
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const date = new Date(year, month - 1, lastDayOfPrevMonth - i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
        });
      }

      // Add days from current month
      for (let i = 1; i <= totalDaysInMonth; i++) {
        const date = new Date(year, month, i);
        date.setHours(0, 0, 0, 0);

        calendarDays.push({
          date,
          isCurrentMonth: true,
        });
      }

      // Add days from next month to complete the grid
      const remainingDays = 42 - calendarDays.length; // 6 rows × 7 days
      for (let i = 1; i <= remainingDays; i++) {
        const date = new Date(year, month + 1, i);
        calendarDays.push({
          date,
          isCurrentMonth: false,
        });
      }

      setCalendar(calendarDays);
    };

    generateCalendar();
    console.log(selectedUser);

    if (selectedUser) {
      fetchUserLeaveRequests(selectedUser);
      fetchUserWorkFromRequests(selectedUser);
    } else {
      fetchUserLeaveRequests();
      fetchUserWorkFromRequests();
    }
  }, [currentDate, selectedUser]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDateStatuses = (date: Date) => {
    const userId = selectedUser || user?.uid;
    const statuses = [];

    // Check attendance
    const hasAttendance = monthlyAttendance.some((month) =>
      month.records.some(
        (record) =>
          new Date(record.date).toLocaleDateString() ===
          date.toLocaleDateString()
      )
    );
    if (hasAttendance) {
      statuses.push({
        type: "attendance"
      });
    }

    // Check leave
    const leave = leaves.find((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate >= start && compareDate <= end && l.userId === userId;
    });
    if (leave) {
      statuses.push({
        type: "leave",
        status: leave.status,
        id: leave.id,
        reason: leave.reason
      });
    }

    // Check work from home
    const workFrom = workFromRequests.find((w) => {
      const start = new Date(w.startDate);
      const end = new Date(w.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= start && date <= end && w.userId === userId;
    });
    if (workFrom) {
      statuses.push({
        type: "workfrom",
        status: workFrom.status,
        id: workFrom.id,
      });
    }

    return statuses;
  };

  const handleClick = (e: React.MouseEvent, status: any) => {
    e.preventDefault();
    if (status?.status === "pending") {
      setSelectedStatus(status);
      if (selectedUser && selectedUser !== user?.uid) {
        setShowAdminDialog(true);
      } else if (!selectedUser) {
        setShowDialog(true);
      }
    }
  };

  const handleCancel = () => {
    if (selectedStatus.type === "workfrom") {
      cancelWorkFromHome(selectedStatus.id);
    } else if (selectedStatus.type === "leave") {
      cancelLeaveRequest(selectedStatus.id);
    }
    setShowDialog(false);
    setSelectedStatus(null);
  };

  const handleAdminAction = async (action: "approve" | "reject") => {
    if (action === "approve") {
      setIsApproving(true);
    }
    
    try {
      if (selectedStatus.type === "leave") {
        if (action === "approve") {
          await updateLeaveStatus(selectedStatus.id, "approved");
        } else {
          await updateLeaveStatus(selectedStatus.id, "rejected");
        }
        await fetchUserLeaveRequests(selectedUser as string);
      } else if (selectedStatus.type === "workfrom") {
        if (action === "approve") {
          await updateWorkFromStatus(selectedStatus.id, "approved");
        } else {
          await updateWorkFromStatus(selectedStatus.id, "rejected");
        }
        await fetchUserWorkFromRequests(selectedUser as string);
      }
    } finally {
      setIsApproving(false);
      setShowDialog(false);
      setShowAdminDialog(false);
      setSelectedStatus(null);
    }
  };

  const getStatusStyle = (status: any) => {
    if (status.type === "attendance") {
      return {
        bg: "bg-green-200",
        text: "Present"
      };
    }
    if (status.type === "leave") {
      if (status.status === "pending") {
        return {
          bg: "bg-red-200 animate-pulse",
          text: "Leave Pending"
        };
      } else if (status.status === "approved") {
        return {
          bg: "bg-red-200",
          text: "Leave Approved"
        };
      } else {
        return {
          bg: "bg-red-100",
          text: "Leave Rejected"
        };
      }
    }
    if (status.type === "workfrom") {
      if (status.status === "pending") {
        return {
          bg: "bg-violet-200 animate-pulse",
          text: "WFH Pending"
        };
      } else if (status.status === "approved") {
        return {
          bg: "bg-violet-200",
          text: "WFH Approved"
        };
      } else {
        return {
          bg: "bg-violet-100",
          text: "WFH Rejected"
        };
      }
    }
    return {
      bg: "bg-white",
      text: ""
    };
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Attendance Calendar
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-black/90 text-white rounded-md hover:bg-black/80"
            >
              Today
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-lg text-gray-900">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {calendar.map((day, index) => {
          const statuses = getDateStatuses(day.date);
          const isCurrentDay = isToday(day.date);
          const baseClasses = `min-h-[100px] p-2 ${
            day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
          } ${isCurrentDay ? "bg-blue-100" : "bg-white"} cursor-pointer`;

          return (
            <div
              key={index}
              className={baseClasses}
            >
              <div
                className={`font-medium text-sm mb-1 ${
                  isCurrentDay ? "text-blue-600" : ""
                }`}
              >
                {day.date.getDate()}
              </div>
              <div className="flex flex-col gap-1">
                {statuses.map((status, idx) => {
                  const style = getStatusStyle(status);
                  return (
                    <div
                      key={idx}
                      onClick={(e) => handleClick(e, status)}
                      className={`${style.bg} text-xs p-1 rounded`}
                    >
                      {style.text}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium mb-4">Cancel Request</h3>
            <p className="mb-6">
              Are you sure you want to cancel this request?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                OK
              </button>
              {userData?.role === 'admin' && (
                <button
                  onClick={() => handleAdminAction("approve")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                  ) : (
                    "Approve as Admin"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdminDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium mb-4">Review Request</h3>
            {selectedStatus.type === "leave" && (
              <p className="mb-4 text-gray-600">
                Reason: {selectedStatus.reason}
              </p>
            )}
            <p className="mb-6">What would you like to do with this request?</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowAdminDialog(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAdminAction("reject")}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isApproving}
              >
                Reject
              </button>
              <button
                onClick={() => handleAdminAction("approve")}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={isApproving}
              >
                {isApproving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  "Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
