import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  leaveType: "full" | "half";
  session?: "forenoon" | "afternoon" | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface LeaveState {
  loading: boolean;
  error: string | null;
  leaveRequests: LeaveRequest[];
  allLeaveRequests: LeaveRequest[];
  cache: {
    userLeaveRequests: { [userId: string]: LeaveRequest[] }; // Cache for user-specific leave requests
    allLeaveRequests: LeaveRequest[] | null; // Cache for all leave requests
  };
  requestLeave: (
    startDate: string,
    endDate: string,
    reason: string,
    leaveType: "full" | "half",
    session?: "forenoon" | "afternoon"
  ) => Promise<void>;
  fetchUserLeaveRequests: (userId?: string) => Promise<void>;
  fetchAllLeaveRequests: () => Promise<void>;
  updateLeaveStatus: (
    leaveId: string,
    status: "approved" | "rejected"
  ) => Promise<void>;
  cancelLeaveRequest: (leaveId: string) => Promise<void>;
  updateDate: (
    leaveId: string,
    startDate: string,
    endDate: string
  ) => Promise<void>;
}

export const useLeaveStore = create<LeaveState>((set, get) => ({
  loading: false,
  error: null,
  leaveRequests: [],
  allLeaveRequests: [],
  cache: {
    userLeaveRequests: {}, // Initialize cache for user-specific leave requests
    allLeaveRequests: null, // Initialize cache for all leave requests
  },

  // Request leave
  requestLeave: async (startDate, endDate, reason, leaveType, session) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const leaveRef = collection(db, "leaves");
      const newLeaveDoc = doc(leaveRef);

      const leaveRequest: LeaveRequest = {
        id: newLeaveDoc.id,
        userId: currentUser.uid,
        startDate,
        endDate,
        reason,
        leaveType,
        status: "pending",
        createdAt: new Date().toISOString(),
        session: session || null,
      };

      await setDoc(newLeaveDoc, leaveRequest);

      // Invalidate cache for the user's leave requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userLeaveRequests: {
            ...state.cache.userLeaveRequests,
            [currentUser.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: LeaveRequest[];
          },
        },
      });

      await get().fetchUserLeaveRequests();
    } catch (error) {
      console.error("Error requesting leave:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch leave requests for a specific user
  fetchUserLeaveRequests: async (userId) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser && !userId) return;

      const targetUserId = userId || currentUser?.uid;

      // Check if leave requests are already cached for this user
      const cachedLeaveRequests =
        get().cache.userLeaveRequests[targetUserId as string];
      if (cachedLeaveRequests) {
        set({ leaveRequests: cachedLeaveRequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log(
        "Fetching leave requests from Firestore for user:",
        targetUserId
      );

      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as LeaveRequest))
        .filter((leave) => leave.userId === targetUserId);

      // Update cache and state
      set((state) => ({
        leaveRequests,
        cache: {
          ...state.cache,
          userLeaveRequests: {
            ...state.cache.userLeaveRequests,
            [targetUserId as string]: leaveRequests,
          },
        },
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all leave requests
  fetchAllLeaveRequests: async () => {
    try {
      set({ loading: true, error: null });

      // Check if all leave requests are already cached
      const cachedAllLeaveRequests = get().cache.allLeaveRequests;
      if (cachedAllLeaveRequests) {
        set({ allLeaveRequests: cachedAllLeaveRequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching all leave requests from Firestore");

      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as LeaveRequest[];

      // Update cache and state
      set({
        allLeaveRequests: leaveRequests,
        cache: { ...get().cache, allLeaveRequests: leaveRequests },
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Update leave status
  updateLeaveStatus: async (leaveId, status) => {
    try {
      set({ loading: true, error: null });

      const leaveRef = doc(db, "leaves", leaveId);
      await updateDoc(leaveRef, { status });

      // Invalidate cache for all leave requests
      set((state) => ({
        cache: {
          ...state.cache,
          allLeaveRequests: null, // Invalidate cache for all leave requests
        },
      }));

      await get().fetchAllLeaveRequests();
    } catch (error) {
      console.error("Error updating leave status:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Cancel leave request
  cancelLeaveRequest: async (leaveId) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const leaveRef = doc(db, "leaves", leaveId);
      await deleteDoc(leaveRef);

      // Invalidate cache for the user's leave requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userLeaveRequests: {
            ...state.cache.userLeaveRequests,
            [currentUser.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: LeaveRequest[];
          },
        },
      });

      await get().fetchUserLeaveRequests();
    } catch (error) {
      console.error("Error canceling leave request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Update leave dates
  updateDate: async (leaveId, startDate, endDate) => {
    try {
      set({ loading: true, error: null });

      const leaveRef = doc(db, "leaves", leaveId);
      await updateDoc(leaveRef, { startDate, endDate });

      // Invalidate cache for all leave requests
      set((state) => ({
        cache: {
          ...state.cache,
          allLeaveRequests: null, // Invalidate cache for all leave requests
        },
      }));

      // Refresh the leave requests after updating
      await get().fetchUserLeaveRequests();
      await get().fetchAllLeaveRequests();
    } catch (error) {
      console.error("Error updating leave dates:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
