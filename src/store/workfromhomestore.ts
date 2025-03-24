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

interface WorkFromRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface WorkFromState {
  loading: boolean;
  error: string | null;
  workFromRequests: WorkFromRequest[];
  allWorkFromRequests: WorkFromRequest[];
  cache: {
    userWorkFromRequests: { [userId: string]: WorkFromRequest[] }; // Cache for user-specific requests
    allWorkFromRequests: WorkFromRequest[] | null; // Cache for all requests
  };
  requestWorkFrom: (
    startDate: string,
    endDate: string,
    reason: string
  ) => Promise<void>;
  fetchUserWorkFromRequests: (userId?: string) => Promise<void>;
  fetchAllWorkFromRequests: () => Promise<void>;
  updateWorkFromStatus: (
    requestId: string,
    status: "approved" | "rejected"
  ) => Promise<void>;
  cancelWorkFromHome: (requestId: string) => Promise<void>;
}

export const useWorkFromStore = create<WorkFromState>((set, get) => ({
  loading: false,
  error: null,
  workFromRequests: [],
  allWorkFromRequests: [],
  cache: {
    userWorkFromRequests: {}, // Initialize cache for user-specific requests
    allWorkFromRequests: null, // Initialize cache for all requests
  },

  // Request work-from-home
  requestWorkFrom: async (startDate, endDate, reason) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const workFromRef = collection(db, "workfrom");
      const newWorkFromDoc = doc(workFromRef);

      const workFromRequest: WorkFromRequest = {
        id: newWorkFromDoc.id,
        userId: user.uid,
        startDate,
        endDate,
        reason,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await setDoc(newWorkFromDoc, workFromRequest);

      // Invalidate cache for the user's work-from-home requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userWorkFromRequests: {
            ...state.cache.userWorkFromRequests,
            [user.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: WorkFromRequest[];
          },
        },
      });

      await get().fetchUserWorkFromRequests();
    } catch (error) {
      console.error("Error requesting work from:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch work-from-home requests for a specific user
  fetchUserWorkFromRequests: async (userId) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user && !userId) return;

      const targetUserId = userId || user?.uid;

      // Check if requests are already cached for this user
      const cachedRequests =
        get().cache.userWorkFromRequests[targetUserId as string];
      if (cachedRequests) {
        set({ workFromRequests: cachedRequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log(
        "Fetching work-from-home requests from Firestore for user:",
        targetUserId
      );

      const workFromRef = collection(db, "workfrom");
      const q = query(workFromRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const workFromRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as WorkFromRequest))
        .filter((request) => request.userId === targetUserId);

      // Update cache and state
      set((state) => ({
        workFromRequests,
        cache: {
          ...state.cache,
          userWorkFromRequests: {
            ...state.cache.userWorkFromRequests,
            [targetUserId as string]: workFromRequests,
          },
        },
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching work-from-home requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all work-from-home requests
  fetchAllWorkFromRequests: async () => {
    try {
      set({ loading: true, error: null });

      // Check if all requests are already cached
      const cachedAllRequests = get().cache.allWorkFromRequests;
      if (cachedAllRequests) {
        set({ allWorkFromRequests: cachedAllRequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching all work-from-home requests from Firestore");

      const workFromRef = collection(db, "workfrom");
      const q = query(workFromRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const workFromRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as WorkFromRequest[];

      // Update cache and state
      set({
        allWorkFromRequests: workFromRequests,
        cache: { ...get().cache, allWorkFromRequests: workFromRequests },
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching all work-from-home requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Update work-from-home request status
  updateWorkFromStatus: async (requestId, status) => {
    try {
      set({ loading: true, error: null });

      const workFromRef = doc(db, "workfrom", requestId);
      await updateDoc(workFromRef, { status });

      // Invalidate cache for all requests
      set((state) => ({
        cache: {
          ...state.cache,
          allWorkFromRequests: null, // Invalidate cache for all requests
        },
      }));

      await get().fetchAllWorkFromRequests();
    } catch (error) {
      console.error("Error updating work-from-home status:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Cancel work-from-home request
  cancelWorkFromHome: async (requestId) => {
    try {
      set({ loading: true, error: null });
      const user = useAuthStore.getState().user;
      if (!user) throw new Error("User not authenticated");

      const workFromRef = doc(db, "workfrom", requestId);
      await deleteDoc(workFromRef);

      // Invalidate cache for the user's requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userWorkFromRequests: {
            ...state.cache.userWorkFromRequests,
            [user.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: WorkFromRequest[];
          },
        },
      });

      await get().fetchUserWorkFromRequests();
    } catch (error) {
      console.error("Error canceling work-from-home request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
