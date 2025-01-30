import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthlyAttendance } from "@/pages/Attendance";


interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
}

export default function AttendanceCalendar({
  monthlyAttendance,
}: {
  monthlyAttendance: MonthlyAttendance[];
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);


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
          isCurrentMonth: false
        });
      }

      // Add days from current month
      for (let i = 1; i <= totalDaysInMonth; i++) {
        const date = new Date(year, month, i);
        date.setHours(0, 0, 0, 0); 

        calendarDays.push({
          date,
          isCurrentMonth: true
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
  }, [currentDate,]);

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

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
          Attendance  Calendar
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
          const hasAttendance = monthlyAttendance.some((month) =>
            month.records.some(
              (record) =>
                new Date(record.date).toLocaleDateString() ===
                day.date.toLocaleDateString()
            )
          );

          return (
            <div
              key={index}
              className={`min-h-[100px] p-2 ${
                day.isCurrentMonth ? "text-gray-900" : "text-gray-400"
              }  ${hasAttendance ? "bg-green-200" : isToday(day.date) ? "bg-blue-200" : "bg-white "}`}
            >
              <div
                className={`font-medium text-sm mb-1 ${
                  isToday(day.date) ? "text-blue-600" : ""
                } `}
              >
                {day.date.getDate()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
