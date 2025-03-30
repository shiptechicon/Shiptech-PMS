import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AmountPaid {
  amount: string;
  date: string;
  notes?: string;
}

export interface Settlement {
  id: string;
  task_id: string;
  team_id: string;
  total_amount: string;
  amounts_paid: AmountPaid[];
  status: 'pending' | 'partial' | 'completed';
  created_at: string;
  updated_at: string;
}

interface SettlementState {
  settlements: Settlement[];
  loading: boolean;
  error: string | null;
  cache: {
    settlements: Settlement[] | null; // Cache for all settlements
    teamSettlements: { [teamId: string]: Settlement[] }; // Cache for team-specific settlements
    teamTaskSettlements: { [key: string]: Settlement[] }; // Cache for team-task-specific settlements
  };
  createSettlement: (settlement: Omit<Settlement, 'id' | 'created_at' | 'updated_at' | 'status'>) => Promise<void>;
  updateSettlement: (id: string, settlement: Partial<Settlement>) => Promise<void>;
  deleteSettlement: (id: string) => Promise<void>;
  fetchSettlements: () => Promise<void>;
  addPayment: (settlementId: string, payment: AmountPaid) => Promise<void>;
  editPayment: (settlementId: string, paymentIndex: number, payment: AmountPaid) => Promise<void>;
  deletePayment: (settlementId: string, paymentIndex: number) => Promise<void>;
  fetchTeamSettlements: (teamId: string) => Promise<Settlement[]>;
  fetchTeamSettlementsWithTaskID: (teamId: string, taskId: string) => Promise<Settlement[]>;
}

export const useSettlementStore = create<SettlementState>((set, get) => ({
  settlements: [],
  loading: false,
  error: null,
  cache: {
    settlements: null, // Initialize cache for all settlements
    teamSettlements: {}, // Initialize cache for team-specific settlements
    teamTaskSettlements: {}, // Initialize cache for team-task-specific settlements
  },

  // Create a new settlement
  createSettlement: async (settlement) => {
    try {
      set({ loading: true, error: null });
      const settlementRef = collection(db, 'settlements');
      const newSettlementDoc = doc(settlementRef);

      const newSettlement: Settlement = {
        id: newSettlementDoc.id,
        ...settlement,
        status: 'pending',
        amounts_paid: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await setDoc(newSettlementDoc, newSettlement);

      // Invalidate cache for all settlements
      set((state) => ({
        settlements: [...state.settlements, newSettlement],
        cache: {
          ...state.cache,
          settlements: null,
          teamSettlements: {}, 
          teamTaskSettlements: {} 
        },
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
      const settlementRef = doc(db, 'settlements', id);
      const updates = {
        ...settlement,
        updated_at: new Date().toISOString(),
      };
      await updateDoc(settlementRef, updates);

      // Invalidate cache for all settlements
      set((state) => ({
        settlements: state.settlements.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
        cache: {
          ...state.cache,
          settlements: null, // Invalidate cache for all settlements
        },
      }));
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
      await deleteDoc(doc(db, 'settlements', id));

      // Invalidate cache for all settlements
      set((state) => ({
        settlements: state.settlements.filter((s) => s.id !== id),
        cache: {
          ...state.cache,
          settlements: null, // Invalidate cache for all settlements
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch all settlements
  fetchSettlements: async () => {
    try {
      set({ loading: true, error: null });

      // Check if settlements are already cached
      const cachedSettlements = get().cache.settlements;
      if (cachedSettlements) {
        set({ settlements: cachedSettlements, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching settlements from Firestore");

      const querySnapshot = await getDocs(
        query(collection(db, 'settlements'), orderBy('created_at', 'desc'))
      );

      const settlements = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      })) as Settlement[];

      // Update cache and state
      set({
        settlements,
        cache: { ...get().cache, settlements },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Add a payment to a settlement
  addPayment: async (settlementId, payment) => {
    try {
      set({ loading: true, error: null });
    const settlement = get().settlements.find((s) => s.id === settlementId);
    if (!settlement) throw new Error('Settlement not found');

    const newPayments = [...settlement.amounts_paid, payment];
    const totalPaid = newPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(settlement.total_amount);

    const status =
      totalPaid >= totalAmount
        ? 'completed'
        : totalPaid > 0
        ? 'partial'
        : 'pending';

    const updatedSettlement = {
      ...settlement,
      amounts_paid: newPayments,
      status,
      updated_at: new Date().toISOString()
    };

    // Update Firestore
    await updateDoc(doc(db, 'settlements', settlementId), updatedSettlement);
     

    const state = get();
      set({
        settlements: state.settlements.map((s) =>
          s.id === settlementId ? updatedSettlement : s
        ) as Settlement[],
        cache: {
          ...state.cache,
          settlements: null, // Invalidate cache for all settlements
          teamSettlements: {}, // Invalidate team-specific caches
          teamTaskSettlements: {} // Invalidate team-task-specific caches
        }
      });

    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Edit a payment in a settlement
  editPayment: async (settlementId, paymentIndex, payment) => {
    try {
      set({ loading: true, error: null });
      const settlement = get().settlements.find((s) => s.id === settlementId);
      if (!settlement) throw new Error('Settlement not found');
  
      const newPayments = [...settlement.amounts_paid];
      newPayments[paymentIndex] = payment;
  
      const totalPaid = newPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalAmount = parseFloat(settlement.total_amount);
  
      const status =
        totalPaid >= totalAmount
          ? 'completed'
          : totalPaid > 0
          ? 'partial'
          : 'pending';
  
      const updatedSettlement = {
        ...settlement,
        amounts_paid: newPayments,
        status,
        updated_at: new Date().toISOString()
      };
  
      // Update Firestore
      await updateDoc(doc(db, 'settlements', settlementId), updatedSettlement);
  
      // Update state
      const state = get();
      set({
        settlements: state.settlements.map((s) =>
          s.id === settlementId ? updatedSettlement : s
        ) as Settlement[],
        cache: {
          ...state.cache,
          settlements: null,
          teamSettlements: {}, 
          teamTaskSettlements: {} 
        }
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete a payment from a settlement
  deletePayment: async (settlementId, paymentIndex) => {
    try {
      set({ loading: true, error: null });
    const settlement = get().settlements.find((s) => s.id === settlementId);
    if (!settlement) throw new Error('Settlement not found');

    const newPayments = settlement.amounts_paid.filter((_, index) => index !== paymentIndex);
    const totalPaid = newPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(settlement.total_amount);

    const status =
      totalPaid >= totalAmount
        ? 'completed'
        : totalPaid > 0
        ? 'partial'
        : 'pending';

    const updatedSettlement = {
      ...settlement,
      amounts_paid: newPayments,
      status,
      updated_at: new Date().toISOString()
    };

    // Update Firestore
    await updateDoc(doc(db, 'settlements', settlementId), updatedSettlement);

    // Update state
    const state = get();
    set({
      settlements: state.settlements.map((s) =>
        s.id === settlementId ? updatedSettlement : s
      ) as Settlement[],
      cache: {
        ...state.cache,
        settlements: null,
        teamSettlements: {}, 
        teamTaskSettlements: {}
      }
    });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settlements for a specific team
  fetchTeamSettlements: async (teamId) => {
    try {
      set({ loading: true, error: null });

      // Check if settlements are already cached for this team
      const cachedSettlements = get().cache.teamSettlements[teamId];
      if (cachedSettlements) {
        set({ settlements: cachedSettlements, loading: false });
        return cachedSettlements;
      }

      // Log Firestore fetch
      console.log("Fetching team settlements from Firestore for team:", teamId);

      const q = query(
        collection(db, 'settlements'),
        where('team_id', '==', teamId),
      );
      const querySnapshot = await getDocs(q);
      const settlements = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        amounts_paid: doc.data().amounts_paid || [],
        status: doc.data().status || 'pending',
        created_at: doc.data().created_at || new Date().toISOString(),
        updated_at: doc.data().updated_at || new Date().toISOString(),
      })) as Settlement[];

      // Update cache and state
      set((state) => ({
        settlements,
        cache: {
          ...state.cache,
          teamSettlements: { ...state.cache.teamSettlements, [teamId]: settlements },
        },
        loading: false,
      }));

      return settlements;
    } catch (error) {
      console.error("Error fetching team settlements:", error);
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  // Fetch settlements for a specific team and task
  fetchTeamSettlementsWithTaskID: async (teamId, taskId) => {
    try {
      set({ loading: true, error: null });

      // Generate a unique cache key for team-task combination
      const cacheKey = `${teamId}-${taskId}`;

      // Check if settlements are already cached for this team-task combination
      const cachedSettlements = get().cache.teamTaskSettlements[cacheKey];
      if (cachedSettlements) {
        set({ settlements: cachedSettlements, loading: false });
        return cachedSettlements;
      }

      // Log Firestore fetch
      console.log("Fetching team-task settlements from Firestore for team:", teamId, "and task:", taskId);

      const q = query(
        collection(db, 'settlements'),
        where('team_id', '==', teamId),
        where('task_id', '==', taskId),
      );
      const querySnapshot = await getDocs(q);
      const settlements = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        amounts_paid: doc.data().amounts_paid || [],
        status: doc.data().status || 'pending',
        created_at: doc.data().created_at || new Date().toISOString(),
        updated_at: doc.data().updated_at || new Date().toISOString(),
      })) as Settlement[];

      // Update cache and state
      set((state) => ({
        settlements,
        cache: {
          ...state.cache,
          teamTaskSettlements: { ...state.cache.teamTaskSettlements, [cacheKey]: settlements },
        },
        loading: false,
      }));

      return settlements;
    } catch (error) {
      console.error("Error fetching team-task settlements:", error);
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ loading: false });
    }
  },
}));