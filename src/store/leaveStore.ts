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
      
      // Update the state of leaveRequests
      const currentLeaveRequests = get().leaveRequests;
      const updatedLeaveRequests = [...currentLeaveRequests, leaveRequest];
      set({ leaveRequests: updatedLeaveRequests });

      // await get().fetchUserLeaveRequests();
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

      //check it already exists
      if (get().leaveRequests.length > 0) {
        const leaveRequest = get().leaveRequests.filter(
          (request) => request.userId === targetUserId
        );

       if(leaveRequest.length > 0) {
        set({ leaveRequests: leaveRequest, loading: false });
        return;
       }
      }   

      console.log("Fetching user leave requests from Firestore");
      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as LeaveRequest))
        .filter((leave) => leave.userId === targetUserId);

      set({ leaveRequests, loading: false });
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all leave requests
  fetchAllLeaveRequests: async () => {
    try {
      set({ loading: true, error: null });

      // Check if requests are already cached
      if (get().allLeaveRequests.length > 0) {
        set({ loading: false });
        return;
      } 

      console.log("Fetching all leave requests from Firestore");
      const leavesRef = collection(db, "leaves");
      const q = query(leavesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const leaveRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as LeaveRequest[];

      set({ allLeaveRequests: leaveRequests, loading: false });
    } catch (error) {
      console.error("Error fetching all leave requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateLeaveStatus: async (leaveId, status) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      // Update Firestore
      const leaveRef = doc(db, "leaves", leaveId);
      await updateDoc(leaveRef, { status });

      const leaveRequest = get().leaveRequests;
      
      const fillteredLeaveRequests = leaveRequest.map((request) =>
        request.id === leaveId ? { ...request, status } : request
      );

      console.log("fillteredLeaveRequests", fillteredLeaveRequests);
      
      

      // Update state
      set({
        leaveRequests: fillteredLeaveRequests,
        allLeaveRequests: fillteredLeaveRequests,
      });

    } catch (error) {
      console.error("Error updating leave status:", error);
      set({ error: (error as Error).message });
      
      // Revert by refetching
      await Promise.all([
        get().fetchUserLeaveRequests(),
        get().fetchAllLeaveRequests()
      ]);
      
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

      const fillteredLeaveRequests = get().leaveRequests.filter(
        (request) => request.id !== leaveId
      );

      set({
        leaveRequests: fillteredLeaveRequests,
        allLeaveRequests: fillteredLeaveRequests,
      });
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

      const leaveRequest = get().leaveRequests.map((request) =>
        request.id === leaveId ? { ...request, startDate, endDate } : request
      );

      set({
        leaveRequests: leaveRequest,
        allLeaveRequests: leaveRequest,
      });

    } catch (error) {
      console.error("Error updating leave dates:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));