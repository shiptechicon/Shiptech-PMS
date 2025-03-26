import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { debounce, DebouncedFunc } from "lodash";

interface AmountPaid {
  id: string;
  amount: number;
  date: string;
  paymentRef: string;
}

export interface CusSettlement {
  id: string;
  project_id: string;
  customer_id: string;
  amounts_paid: AmountPaid[];
  status: "pending" | "partial" | "completed";
  created_at: string;
  updated_at: string;
}

interface SettlementState {
  settlement: CusSettlement; // Single settlement for a customer
  settlements: CusSettlement[]; // All settlements
  loading: boolean;
  error: string | null;
  cache: Map<string, CusSettlement>;
  createSettlement: (
    settlement: Omit<CusSettlement, "id" | "created_at" | "updated_at" | "status">
  ) => Promise<void>;
  updateSettlement: (id: string, settlement: Partial<CusSettlement>) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  fetchSettlement: DebouncedFunc<(customerId: string) => Promise<void>>;
  fetchAllSettlements: () => Promise<void>;
  addPayment: (
    settlementId: string,
    payment: number,
    totalAmount: number,
    paymentRef: string
  ) => Promise<void>;
  editPayment: (
    settlementId: string,
    paymentIndex: number,
    payment: { amount: number; date: string; paymentRef: string },
    totalAmount: number
  ) => Promise<void>;
  deletePayment: (
    settlementId: string,
    paymentIndex: number,
    totalAmount: number
  ) => Promise<void>;
}

export const useCustomerSettlementStore = create<SettlementState>((set, get) => ({
  settlement: {} as CusSettlement,
  settlements: [] as CusSettlement[],
  loading: false,
  error: null,
  cache: new Map(),

  createSettlement: async (settlement) => {
    try {
      set({ loading: true, error: null });

      const existingSettlementQuery = query(
        collection(db, "customerSettlement"),
        where("customer_id", "==", settlement.customer_id)
      );
      const querySnapshot = await getDocs(existingSettlementQuery);

      if (!querySnapshot.empty) {
        throw new Error("A settlement already exists for this customer.");
      }

      const settlementRef = collection(db, "customerSettlement");
      const newSettlementDoc = doc(settlementRef);

      const newSettlement: CusSettlement = {
        id: newSettlementDoc.id,
        ...settlement,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(newSettlementDoc, newSettlement);

      // Update cache and settlements list
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.set(settlement.customer_id, newSettlement);
        return {
          settlement: newSettlement,
          settlements: [...state.settlements, newSettlement],
          cache: newCache,
        };
      });
    } catch (error) {
      console.error("Error creating settlement:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateSettlement: async (id, settlement) => {
    try {
      set({ loading: true, error: null });
      const settlementRef = doc(db, "customerSettlement", id);
      const updates = {
        ...settlement,
        updated_at: new Date().toISOString(),
      };
      await updateDoc(settlementRef, updates);

      // Update cache and settlements list if the settlement is present
      set((state) => {
        const cachedSettlement = state.cache.get(state.settlement.customer_id);
        const updatedSettlements = state.settlements.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        );

        if (cachedSettlement && cachedSettlement.id === id) {
          const newCache = new Map(state.cache);
          newCache.set(state.settlement.customer_id, { ...cachedSettlement, ...updates });
          return {
            settlement: updates as CusSettlement,
            settlements: updatedSettlements,
            cache: newCache,
          };
        }
        return {
          settlement: updates as CusSettlement,
          settlements: updatedSettlements,
        };
      });
    } catch (error) {
      console.error("Error updating settlement:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteSettlement: async (id) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, "customerSettlement", id));

      // Remove from cache and settlements list
      set((state) => {
        const customerId = state.settlement.customer_id;
        const newCache = new Map(state.cache);
        newCache.delete(customerId);

        return {
          settlement: {} as CusSettlement,
          settlements: state.settlements.filter((s) => s.id !== id),
          cache: newCache,
        };
      });
    } catch (error) {
      console.error("Error deleting settlement:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settlement for a customer
  fetchSettlement: debounce(async (customerId: string) => {
    try {
      set({ loading: true, error: null });

      const cachedSettlement = get().cache.get(customerId);
      if (cachedSettlement) {
        set({ settlement: cachedSettlement, loading: false });
        return;
      }

      console.log("Fetching customer settlement from Firestore...");

      // Fetch from Firestore if not cached
      const querySnapshot = await getDocs(
        query(collection(db, "customerSettlement"), where("customer_id", "==", customerId))
      );

      if (querySnapshot.empty) {
        throw new Error(`No settlement found for customer: ${customerId}`);
      }

      const settlement = querySnapshot.docs[0].data() as CusSettlement;
      settlement.id = querySnapshot.docs[0].id;

      set((state) => {
        const newCache = new Map(state.cache);
        newCache.set(customerId, settlement);
        return {
          settlement,
          cache: newCache,
        };
      });
    } catch (error) {
      console.error("Error fetching settlement:", error);
      set({ error: (error as Error).message, settlement: {} as CusSettlement });
      throw error;
    } finally {
      set({ loading: false });
    }
  }, 300), // Debounce Firestore queries

  // Fetch all settlements
  fetchAllSettlements: async () => {
    try {
      set({ loading: true, error: null });
      
      const querySnapshot = await getDocs(collection(db, "customerSettlement"));
      
      const settlements: CusSettlement[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as CusSettlement[];
      

      // Update cache with all fetched settlements
      set((state) => {
        const newCache = new Map(state.cache);
        settlements.forEach((settlement) => {
          newCache.set(settlement.customer_id, settlement);
        });
        
        return {
          settlements,
          cache: newCache,
        };
      });
    } catch (error) {
      console.error("Error fetching all settlements:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  addPayment: async (settlementId, payment, totalAmount, paymentRef) => {
    try {
      set({ loading: true, error: null });

      const settlement = get().settlement;
      if (!settlement || settlement.id !== settlementId) {
        throw new Error("Settlement not found in cache");
      }

      const newPayments = [
        ...settlement.amounts_paid,
        {
          id: crypto.randomUUID(),
          amount: payment,
          date: new Date().toISOString(),
          paymentRef,
        },
      ];

      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
      const status = totalPaid >= totalAmount ? "completed" : totalPaid > 0 ? "partial" : "pending";

      await get().updateSettlement(settlementId, {
        amounts_paid: newPayments,
        status,
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  editPayment: async (settlementId, paymentIndex, payment, totalAmount) => {
    try {
      set({ loading: true, error: null });
      const settlement = get().settlement;

      if (!settlement || settlement.id !== settlementId) {
        throw new Error("Settlement not found in cache");
      }

      const newPayments = [...settlement.amounts_paid];
      newPayments[paymentIndex] = {
        ...newPayments[paymentIndex],
        ...payment,
      };

      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
      const status = totalPaid >= totalAmount ? "completed" : totalPaid > 0 ? "partial" : "pending";

      await updateDoc(doc(db, "customerSettlement", settlementId), {
        amounts_paid: newPayments,
        status,
        updated_at: new Date().toISOString(),
      });

      // Update local state immediately
      set((state) => ({
        settlement: {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        },
        cache: new Map(state.cache).set(settlementId, {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        }),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete a payment from a settlement
  deletePayment: async (settlementId, paymentIndex, totalAmount) => {
    try {
      set({ loading: true, error: null });
      const settlement = get().settlement;

      if (!settlement || settlement.id !== settlementId) {
        throw new Error("Settlement not found in cache");
      }

      const newPayments = settlement.amounts_paid.filter((_, index) => index !== paymentIndex);
      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
      const status = totalPaid >= totalAmount ? "completed" : totalPaid > 0 ? "partial" : "pending";

      await updateDoc(doc(db, "customerSettlement", settlementId), {
        amounts_paid: newPayments,
        status,
        updated_at: new Date().toISOString(),
      });

      // Update local state immediately
      set((state) => ({
        settlement: {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        },
        cache: new Map(state.cache).set(settlementId, {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        }),
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));
