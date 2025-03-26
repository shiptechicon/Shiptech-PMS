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
import { db } from "../lib/firebase";
import { useAuthStore } from "./authStore";

interface OOORequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface OOOState {
  loading: boolean;
  error: string | null;
  oooRequests: OOORequest[];
  allOOORequests: OOORequest[];
  requestOOO: (
    startDate: string,
    endDate: string,
    reason: string
  ) => Promise<void>;
  fetchUserOOORequests: (userId?: string) => Promise<void>;
  fetchAllOOORequests: () => Promise<void>;
  updateOOOStatus: (
    requestId: string,
    status: "approved" | "rejected"
  ) => Promise<void>;
  cancelOOORequest: (requestId: string) => Promise<void>;
}

export const useOOOStore = create<OOOState>((set, get) => ({
  loading: false,
  error: null,
  oooRequests: [],
  allOOORequests: [],

  // Request OOO
  requestOOO: async (startDate, endDate, reason) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const oooRef = collection(db, "ooo");
      const newOOODoc = doc(oooRef);

      const oooRequest: OOORequest = {
        id: newOOODoc.id,
        userId: user.uid,
        startDate,
        endDate,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await setDoc(newOOODoc, oooRequest);

      const currentLeaveRequests = get().oooRequests;
      const updatedLeaveRequests = [...currentLeaveRequests, oooRequest];
      set({ oooRequests: updatedLeaveRequests });

      await get().fetchUserOOORequests();
    } catch (error) {
      console.error("Error requesting OOO:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch OOO requests for a specific user
  fetchUserOOORequests: async (userId) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user && !userId) return;

      const targetUserId = userId || user?.uid;

      //check if exists
      if(get().oooRequests.length > 0) {
        if(get().oooRequests[0].userId === targetUserId) {
          set({ loading: false });
          return;
        }
      }

      const oooRef = collection(db, "ooo");
      const q = query(oooRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const oooRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as OOORequest))
        .filter((request) => request.userId === targetUserId);

      set({ oooRequests, loading: false });
    } catch (error) {
      console.error("Error fetching OOO requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all OOO requests
  fetchAllOOORequests: async () => {
    try {
      set({ loading: true, error: null });

      //check if exists

      if(get().allOOORequests.length > 0) {
        set({ loading: false });
        return;
      }

      const oooRef = collection(db, "ooo");
      const q = query(oooRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const oooRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as OOORequest[];

      set({ allOOORequests: oooRequests, loading: false });
    } catch (error) {
      console.error("Error fetching all OOO requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Update OOO status
  updateOOOStatus: async (requestId, status) => {
    try {
      set({ loading: true, error: null });

      const oooRef = doc(db, "ooo", requestId);
      await updateDoc(oooRef, { status });

      // Update local state
      set((state) => ({
        oooRequests: state.oooRequests.map(request => 
          request.id === requestId ? { ...request, status } : request
        ),
        allOOORequests: state.allOOORequests.map(request =>
          request.id === requestId ? { ...request, status } : request
        ),
      }));

    } catch (error) {
      console.error("Error updating OOO status:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Cancel OOO request
  cancelOOORequest: async (requestId) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const oooRef = doc(db, "ooo", requestId);
      await deleteDoc(oooRef);

      // Update local state
      set((state) => ({
        oooRequests: state.oooRequests.filter(
          (request) => request.id !== requestId
        ),
        allOOORequests: state.allOOORequests.filter(
          (request) => request.id !== requestId
        ),
      }));

    } catch (error) {
      console.error("Error canceling OOO request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));