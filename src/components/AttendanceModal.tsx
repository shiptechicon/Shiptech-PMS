import { useAttendanceStore } from '../store/attendanceStore';
import { Loader2 } from 'lucide-react';

interface AttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AttendanceModal({ isOpen, onClose }: AttendanceModalProps) {
  const { markAttendance, loading } = useAttendanceStore();

  if (!isOpen) return null;

  const handleMarkAttendance = async () => {
    try {
      await markAttendance();
      onClose();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h2 className="text-xl font-semibold mb-4">Mark Your Attendance</h2>
        <p className="text-gray-600 mb-6">
          Would you like to mark your attendance for today?
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            disabled={loading}
          >
            No, Later
          </button>
          <button
            onClick={handleMarkAttendance}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Marking...
              </>
            ) : (
              "Yes, I'm In"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}