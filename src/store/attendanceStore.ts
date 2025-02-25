import { create } from 'zustand';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface AttendanceRecord {
  date: string;
  attendance: {
    [key: string]: string; // userId: timestamp
  };
}

interface AttendanceState {
  loading: boolean;
  error: string | null;
  records: AttendanceRecord[];
  checkAttendance: () => Promise<boolean>;
  markAttendance: () => Promise<void>;
  fetchAttendanceRecords: () => Promise<void>;
  fetchAllUsersAttendance: () => Promise<void>;
  markAttendanceForUser: (userId: string, date: string) => Promise<string>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  loading: false,
  error: null,
  records: [],

  checkAttendance: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return false;

      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) return false;

      const attendanceData = attendanceDoc.data();
      return !!attendanceData.attendance[currentUser.uid];
    } catch (error) {
      console.error('Error checking attendance:', error);
      set({ error: (error as Error).message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  markAttendance: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const attendanceRef = doc(db, 'attendance', today);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: today,
          attendance: {
            [currentUser.uid]: now
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${currentUser.uid}`]: now
        });
      }

      // Refresh records after marking attendance
      await get().fetchAttendanceRecords();
    } catch (error) {
      console.error('Error marking attendance:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  fetchAttendanceRecords: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const records = querySnapshot.docs
        .map(doc => ({ ...doc.data() } as AttendanceRecord))
        .filter(record => record.attendance[currentUser.uid]); // Only get records where user is present

      set({ records, loading: false });
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchAllUsersAttendance: async () => {
    try {
      set({ loading: true, error: null });
      
      const attendanceRef = collection(db, 'attendance');
      const q = query(attendanceRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const records = querySnapshot.docs.map(doc => ({
        ...doc.data()
      })) as AttendanceRecord[];

      set({ records, loading: false });
    } catch (error) {
      console.error('Error fetching all users attendance:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  markAttendanceForUser: async (userId: string, date: string) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Admin not authenticated');

      // Format the timestamp for the selected date
      const timestamp = new Date(date).toISOString();
      const formattedDate = date.split('T')[0];

      const attendanceRef = doc(db, 'attendance', formattedDate);
      const attendanceDoc = await getDoc(attendanceRef);

      if (!attendanceDoc.exists()) {
        await setDoc(attendanceRef, {
          date: formattedDate,
          attendance: {
            [userId]: timestamp
          }
        });
      } else {
        await updateDoc(attendanceRef, {
          [`attendance.${userId}`]: timestamp
        });
      }

      // Refresh records after marking attendance
      await get().fetchAllUsersAttendance();
      return 'Attendance marked successfully';
    } catch (error) {
      console.error('Error marking attendance for user:', error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));