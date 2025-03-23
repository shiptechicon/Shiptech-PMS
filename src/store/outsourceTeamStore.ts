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
  cache: {
    teams: OutsourceTeam[] | null; // Cache for all outsource teams
    teamById: { [id: string]: OutsourceTeam }; // Cache for individual teams by ID
  };
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
  cache: {
    teams: null, // Initialize cache for all teams
    teamById: {}, // Initialize cache for individual teams
  },

  // Add a new outsource team
  addTeam: async (team) => {
    try {
      set({ loading: true, error: null });
      const docRef = await addDoc(collection(db, 'outsource_teams'), team);
      const newTeam = { ...team, id: docRef.id };

      // Update cache and state
      set((state) => ({
        teams: [...state.teams, newTeam],
        cache: {
          ...state.cache,
          teams: state.cache.teams ? [...state.cache.teams, newTeam] : null, // Invalidate cache for all teams
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch all outsource teams
  fetchTeams: async () => {
    try {
      set({ loading: true, error: null });

      // Check if teams are already cached
      const cachedTeams = get().cache.teams;
      if (cachedTeams) {
        set({ teams: cachedTeams, loading: false });
        return;
      }

      // Log Firestore fetch
      console.log("Fetching outsource teams from Firestore");

      const querySnapshot = await getDocs(collection(db, 'outsource_teams'));
      const teams = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as OutsourceTeam[];

      // Update cache and state
      set({
        teams,
        cache: { ...get().cache, teams },
        loading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  // Fetch a single outsource team by ID
  fetchTeamById: async (id) => {
    try {
      set({ loading: true, error: null });

      // Check if the team is already cached
      const cachedTeam = get().cache.teamById[id];
      if (cachedTeam) {
        set({ loading: false });
        return cachedTeam;
      }

      // Log Firestore fetch
      console.log("Fetching outsource team from Firestore:", id);

      const docRef = doc(db, 'outsource_teams', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const team = { id: docSnap.id, ...docSnap.data() } as OutsourceTeam;

        // Update cache
        set((state) => ({
          cache: {
            ...state.cache,
            teamById: { ...state.cache.teamById, [id]: team },
          },
          loading: false,
        }));

        return team;
      }
      return null;
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  // Update an outsource team
  updateTeam: async (id, team) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'outsource_teams', id);
      await updateDoc(docRef, team);

      // Update cache and state
      set((state) => ({
        teams: state.teams.map(t => t.id === id ? { ...t, ...team } : t),
        cache: {
          ...state.cache,
          teams: state.cache.teams?.map(t => t.id === id ? { ...t, ...team } : t) || null,
          teamById: { ...state.cache.teamById, [id]: { ...state.cache.teamById[id], ...team } },
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  // Delete an outsource team
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

      // Update cache and state
      set((state) => ({
        teams: state.teams.filter(team => team.id !== id),
        cache: {
          ...state.cache,
          teams: state.cache.teams?.filter(team => team.id !== id) || null,
          teamById: Object.fromEntries(
            Object.entries(state.cache.teamById).filter(([key]) => key !== id)
          ),
        },
      }));
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));