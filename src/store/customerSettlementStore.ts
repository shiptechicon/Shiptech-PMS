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

export interface AmountPaid {
  id: string;
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
  settlement: CusSettlement;
  settlement: CusSettlement; // Single settlement for a customer
  loading: boolean;
  error: string | null;
  cache: Map<string, CusSettlement>; // Use Map for caching
  createSettlement: (
    settlement: Omit<
      CusSettlement,
      "id" | "created_at" | "updated_at" | "status"
    >
  ) => Promise<void>;
  updateSettlement: (
    id: string,
    settlement: Partial<CusSettlement>
  ) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  fetchSettlement: (customerId: string) => Promise<void>;
  fetchSettlement: DebouncedFunc<(customerId: string) => Promise<void>>;
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

export const useCustomerSettlementStore = create<SettlementState>(
  (set, get) => ({
    settlement: {} as CusSettlement,
    loading: false,
    error: null,
export const useCustomerSettlementStore = create<SettlementState>((set, get) => ({
  settlement: {} as CusSettlement,
  loading: false,
  error: null,
  cache: new Map(), // Initialize cache as a Map

    // Create a new settlement for a customer
    createSettlement: async (settlement) => {
      try {
        set({ loading: true, error: null });

        // Check if a settlement already exists for this customer
        const existingSettlementQuery = query(
          collection(db, "customerSettlement"),
          where("customer_id", "==", settlement.customer_id)
        );
        const querySnapshot = await getDocs(existingSettlementQuery);

        if (!querySnapshot.empty) {
          throw new Error("A settlement already exists for this customer.");
        }

        // If no settlement exists, create a new one
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
        set({ settlement: newSettlement });
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
      await setDoc(newSettlementDoc, newSettlement);

      // Update cache
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.set(settlement.customer_id, newSettlement);
        return {
          settlement: newSettlement,
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

    // Update an existing settlement
    updateSettlement: async (id, settlement) => {
      try {
        set({ loading: true, error: null });
        const settlementRef = doc(db, "customerSettlement", id);
        const updates = {
          ...settlement,
          updated_at: new Date().toISOString(),
        };
        await updateDoc(settlementRef, updates);

        set({ settlement: updates as CusSettlement });
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
      // Update cache if the settlement is cached
      set((state) => {
        const cachedSettlement = state.cache.get(state.settlement.customer_id);
        if (cachedSettlement && cachedSettlement.id === id) {
          const newCache = new Map(state.cache);
          newCache.set(state.settlement.customer_id, updates as CusSettlement);
          return {
            settlement: updates as CusSettlement,
            cache: newCache,
          };
        }
        return { settlement: updates as CusSettlement };
      });
    } catch (error) {
      console.error("Error updating settlement:", error);
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

    // Delete a settlement
    deleteSettlement: async (id) => {
      try {
        set({ loading: true, error: null });
        await deleteDoc(doc(db, "customerSettlement", id));
        set({ settlement: {} as CusSettlement });
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
  // Delete a settlement
  deleteSettlement: async (id) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, "customerSettlement", id));

      // Remove from cache
      set((state) => {
        const customerId = state.settlement.customer_id;
        const newCache = new Map(state.cache);
        newCache.delete(customerId);

        return {
          settlement: {} as CusSettlement,
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

    // Fetch settlements of a customer
    fetchSettlement: async (customerId) => {
      try {
        set({ loading: true, error: null });
        const querySnapshot = await getDocs(
          query(
            collection(db, "customerSettlement"),
            where("customer_id", "==", customerId)
          )
        );
  // Fetch settlement for a customer
  fetchSettlement: debounce(async (customerId : string) => {
    try {
      set({ loading: true, error: null });

      // Check if settlement is already cached
      const cachedSettlement = get().cache.get(customerId);
      if (cachedSettlement) {
        set({ settlement: cachedSettlement, loading: false });
        return;
      }

      console.log("Fetching customer settlement from Firestore...");
      

      // Fetch from Firestore if not cached
      const querySnapshot = await getDocs(
        query(
          collection(db, "customerSettlement"),
          where("customer_id", "==", customerId)
        )
      );

        if (querySnapshot.empty) {
          throw new Error("No settlement found for this customer");
        }
      if (querySnapshot.empty) {
        throw new Error(`No settlement found for customer: ${customerId}`);
      }

        const settlement = querySnapshot.docs[0].data() as CusSettlement;
        settlement.id = querySnapshot.docs[0].id;

        set({ settlement });
      } catch (error) {
        set({
          error: (error as Error).message,
          settlement: {} as CusSettlement,
        });
        throw error;
      } finally {
        set({ loading: false });
      }
    },
      // Update cache and state
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

    // Add a payment to a settlement
    addPayment: async (settlementId, payment, totalAmount, paymentRef) => {
      try {
        set({ loading: true, error: null });
        const settlement = (
          await getDoc(doc(db, "customerSettlement", settlementId))
        ).data() as CusSettlement;
        if (!settlement) throw new Error("Settlement not found");

        const newPayments = [
          ...settlement.amounts_paid,
          {
            id: Math.random().toString(36).substring(7),
            amount: payment,
            date: new Date().toISOString(),
            paymentRef: paymentRef,
          },
        ];
  // Add a payment to a settlement
  addPayment: async (settlementId, payment, totalAmount, paymentRef) => {
    try {
      set({ loading: true, error: null });

      // Get the settlement from cache or state
      const settlement = get().settlement;
      if (!settlement || settlement.id !== settlementId) {
        throw new Error("Settlement not found in cache");
      }

      // Add the new payment
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
      // Calculate the total amount paid
      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);

        const status =
          totalPaid >= totalAmount
            ? "completed"
            : totalPaid > 0
            ? "partial"
            : "pending";
      // Update the settlement status
      const status =
        totalPaid >= totalAmount
          ? "completed"
          : totalPaid > 0
          ? "partial"
          : "pending";

        await get().updateSettlement(settlementId, {
          amounts_paid: newPayments,
          status,
        });
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    // Edit a payment in a settlement
    editPayment: async (settlementId, paymentIndex, payment, totalAmount) => {
      try {
        set({ loading: true, error: null });

        // Get the fresh data from Firestore
        const settlementDoc = await getDoc(
          doc(db, "customerSettlement", settlementId)
        );
        if (!settlementDoc.exists()) throw new Error("Settlement not found");

        const settlement = settlementDoc.data() as CusSettlement;
        settlement.id = settlementDoc.id; // Make sure to include the document ID

        const newPayments = [...settlement.amounts_paid];
        newPayments[paymentIndex] = {
          ...newPayments[paymentIndex],
          ...payment,
        };

        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);

        const status =
          totalPaid >= totalAmount
            ? "completed"
            : totalPaid > 0
            ? "partial"
            : "pending";

        const updatedSettlement = {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        };

        // Update in Firestore
        await updateDoc(doc(db, "customerSettlement", settlementId), {
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        });

        // Update the local state
        set({ settlement: updatedSettlement as CusSettlement });
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
        
        // Get fresh data from Firestore first
        const settlementDoc = await getDoc(doc(db, "customerSettlement", settlementId));
        if (!settlementDoc.exists()) throw new Error("Settlement not found");
        
        const settlement = settlementDoc.data() as CusSettlement;
        settlement.id = settlementDoc.id; // Make sure to include the document ID
    
        const newPayments = settlement.amounts_paid.filter(
          (_, index) => index !== paymentIndex
        );
    
        const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);
    
        // Explicitly type the status to match CusSettlement type
        const status: "pending" | "partial" | "completed" =
          totalPaid >= totalAmount
            ? "completed"
            : totalPaid > 0
            ? "partial"
            : "pending";
    
        // Update in Firestore
        await updateDoc(doc(db, "customerSettlement", settlementId), {
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        });
    
        // Also update local state with proper typing
        const updatedSettlement: CusSettlement = {
          ...settlement,
          amounts_paid: newPayments,
          status,
          updated_at: new Date().toISOString(),
        };
        set({ settlement: updatedSettlement });
      } catch (error) {
        set({ error: (error as Error).message });
        throw error;
      } finally {
        set({ loading: false });
      }
    }
  })
);

      // Update the settlement in Firestore and cache
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
}));