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
  cache: {
    userOOORequests: { [userId: string]: OOORequest[] }; // Cache for user-specific OOO requests
    allOOORequests: OOORequest[] | null; // Cache for all OOO requests
  };
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
  cache: {
    userOOORequests: {}, // Initialize cache for user-specific OOO requests
    allOOORequests: null, // Initialize cache for all OOO requests
  },

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

      // Invalidate cache for the user's OOO requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userOOORequests: {
            ...state.cache.userOOORequests,
            [user.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: OOORequest[];
          },
        },
      });

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

      // Check if OOO requests are already cached for this user
      const cachedOOORequests =
        get().cache.userOOORequests[targetUserId as string];
      if (cachedOOORequests) {
        set({ oooRequests: cachedOOORequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log(
        "Fetching OOO requests from Firestore for user:",
        targetUserId
      );

      const oooRef = collection(db, "ooo");
      const q = query(oooRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const oooRequests = querySnapshot.docs
        .map((doc) => ({ ...doc.data() } as OOORequest))
        .filter((request) => request.userId === targetUserId);

      // Update cache and state
      set((state) => ({
        oooRequests,
        cache: {
          ...state.cache,
          userOOORequests: {
            ...state.cache.userOOORequests,
            [targetUserId as string]: oooRequests,
          },
        },
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching OOO requests:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch all OOO requests
  fetchAllOOORequests: async () => {
    try {
      set({ loading: true, error: null });

      // Check if all OOO requests are already cached
      const cachedAllOOORequests = get().cache.allOOORequests;
      if (cachedAllOOORequests) {
        set({ allOOORequests: cachedAllOOORequests, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching all OOO requests from Firestore");

      const oooRef = collection(db, "ooo");
      const q = query(oooRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const oooRequests = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as OOORequest[];

      // Update cache and state
      set({
        allOOORequests: oooRequests,
        cache: { ...get().cache, allOOORequests: oooRequests },
        loading: false,
      });
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

      // Invalidate cache for all OOO requests
      set((state) => ({
        cache: {
          ...state.cache,
          allOOORequests: null, // Invalidate cache for all OOO requests
        },
      }));

      await get().fetchAllOOORequests();
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

      // Invalidate cache for the user's OOO requests
      const state = get();
      set({
        cache: {
          ...state.cache,
          userOOORequests: {
            ...state.cache.userOOORequests,
            [user.uid]: undefined, // Invalidate cache for this user
          } as {
            [userId: string]: OOORequest[];
          },
        },
      });

      await get().fetchUserOOORequests();
    } catch (error) {
      console.error("Error canceling OOO request:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
