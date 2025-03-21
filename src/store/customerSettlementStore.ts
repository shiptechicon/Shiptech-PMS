import { create } from "zustand";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";

interface AmountPaid {
  id :string;
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
  settlement: CusSettlement; // Changed from `settlements` to `settlement`
  loading: boolean;
  error: string | null;
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
  fetchSettlement: (customerId : string) => Promise<void>; 
  addPayment: (
    settlementId: string,
    payment: number,
    totalAmount: number,
    paymentRef: string
  ) => Promise<void>;
}

export const useCustomerSettlementStore = create<SettlementState>((set, get) => ({
  settlement: {} as CusSettlement,
  loading: false,
  error: null,

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
      set((state) => ({
        settlement: newSettlement, // Changed from `settlements` to `settlement`
      }));
    } catch (error) {
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

      set({
        settlement: updates as CusSettlement, 
    })
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
      set({
        settlement: {} as CusSettlement, 
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settlements of a cutomer
  fetchSettlement: async (customerId) => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(
        query(
          collection(db, "customerSettlement"),
          where("customer_id", "==", customerId)
        )
      );

      if (querySnapshot.empty) {
        throw new Error("No settlement found for this customer");
      }

      const settlement = querySnapshot.docs[0].data() as CusSettlement;
      settlement.id = querySnapshot.docs[0].id;

      set({ settlement });
    } catch (error) {
      set({ error: (error as Error).message , settlement: {} as CusSettlement });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Add a payment to a settlement
  addPayment: async (settlementId, payment, totalAmount , paymentRef) => {
    try {
      set({ loading: true, error: null });
      const settlement = (await getDoc(doc(db, "customerSettlement", settlementId))).data() as CusSettlement;
      if (!settlement) throw new Error("Settlement not found");

      const newPayments = [...settlement.amounts_paid, {
        amount: payment,
        date: new Date().toISOString(),
        paymentRef: paymentRef,
      }];

      const totalPaid = newPayments.reduce((sum, p) => sum + p.amount, 0);

      const status =
        totalPaid >= totalAmount
          ? "completed"
          : totalPaid > 0
          ? "partial"
          : "pending";

      await get().updateSettlement(settlementId, {
        amounts_paid: newPayments as AmountPaid[],
        status,
      });

    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

}));