import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSettlementStore } from "@/store/settlementStore";
import toast from "react-hot-toast";

interface ContactPerson {
  name: string;
  phone: string;
}

export interface OutsourceTeam {
  id?: string;
  name: string;
  address: string;
  gst: string;
  contactPersons: ContactPerson[];
  billingAddress: string;
  isBillingAddressSame: boolean;
}

interface OutsourceTeamStore {
  teams: OutsourceTeam[];
  loading: boolean;
  error: string | null;
  addTeam: (team: Omit<OutsourceTeam, 'id'>) => Promise<void>;
  fetchTeams: () => Promise<void>;
  fetchTeamById: (id: string) => Promise<OutsourceTeam | null>;
  updateTeam: (id: string, team: Partial<OutsourceTeam>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
}

export const useOutsourceTeamStore = create<OutsourceTeamStore>((set, get) => ({
  teams: [],
  loading: false,
  error: null,

  addTeam: async (team) => {
    try {
      set({ loading: true, error: null });
      const docRef = await addDoc(collection(db, 'outsource_teams'), team);
      const newTeam = { ...team, id: docRef.id };
      set(state => ({ teams: [...state.teams, newTeam] }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTeams: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'outsource_teams'));
      const teams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OutsourceTeam[];
      set({ teams });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchTeamById: async (id) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'outsource_teams', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as OutsourceTeam;
      }
      return null;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateTeam: async (id, team) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'outsource_teams', id);
      await updateDoc(docRef, team);
      set(state => ({
        teams: state.teams.map(t => t.id === id ? { ...t, ...team } : t)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteTeam: async (id) => {
    try {
      set({ loading: true, error: null });
      
      // Check for existing settlements
      const settlements = await useSettlementStore.getState().fetchTeamSettlements(id);
      
      if (settlements.length > 0) {
        toast.error(
          'Cannot delete team - there are tasks outsourced to this team. Please remove all outsourced tasks first.'
        );
        return;
      }


      await deleteDoc(doc(db, 'outsource_teams', id));
      set(state => ({
        teams: state.teams.filter(team => team.id !== id)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  }
}));