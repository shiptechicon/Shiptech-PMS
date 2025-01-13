import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface Deliverable {
  id: string;
  name: string;
  hours: number;
  costPerHour: number;
  total: number;
}

interface CustomerRequirement {
  id: string;
  text: string;
}

export interface Enquiry {
  id?: string; // Firebase document ID
  __id: string; // Internal ID for display
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  deliverables: Deliverable[];
  requirements: CustomerRequirement[];
  createdAt: string;
  type?: 'enquiry' | 'project';
}

interface EnquiryState {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  fetchEnquiry: (id: string) => Promise<Enquiry | null>;
  createEnquiry: (enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  updateEnquiry: (id: string, enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  deleteEnquiry: (id: string) => Promise<void>;
  convertToProject: (enquiryId: string) => Promise<void>;
}

export const useEnquiryStore = create<EnquiryState>((set, get) => ({
  enquiries: [],
  loading: false,
  error: null,

  fetchEnquiries: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'enquiries'));
      const enquiries = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Enquiry[];
      set({ enquiries, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchEnquiry: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const enquiry = { ...docSnap.data(), id: docSnap.id } as Enquiry;
        set({ loading: false });
        return enquiry;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createEnquiry: async (enquiryData) => {
    try {
      set({ loading: true, error: null });
      const internalId = 'e-' + Math.random().toString().slice(2, 8);
      const newEnquiry = {
        ...enquiryData,
        __id: internalId,
        createdAt: new Date().toISOString(),
        type: 'enquiry'
      };
      const docRef = await addDoc(collection(db, 'enquiries'), newEnquiry);
      const enquiryWithId = { ...newEnquiry, id: docRef.id };
      const enquiries = [...get().enquiries, enquiryWithId];
      set({ enquiries, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateEnquiry: async (id: string, enquiryData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'enquiries', id);
      await updateDoc(docRef, enquiryData);
      const updatedEnquiries = get().enquiries.map(enquiry =>
        enquiry.id === id ? { ...enquiryData, id, __id: enquiry.__id } : enquiry
      );
      set({ enquiries: updatedEnquiries, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteEnquiry: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'enquiries', id));
      const updatedEnquiries = get().enquiries.filter(enquiry => enquiry.id !== id);
      set({ enquiries: updatedEnquiries, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  convertToProject: async (enquiryId: string) => {
    try {
      set({ loading: true, error: null });
      const enquiry = await get().fetchEnquiry(enquiryId);
      if (!enquiry) throw new Error('Enquiry not found');

      const projectInternalId = 'p-' + enquiry.__id.split('-')[1];
      const projectData = {
        ...enquiry,
        __id: projectInternalId,
        type: 'project' as const
      };
      delete projectData.id; // Remove the old Firebase ID

      // Create new project document
      const docRef = await addDoc(collection(db, 'enquiries'), projectData);
      const projectWithId = { ...projectData, id: docRef.id };
      
      const updatedEnquiries = [...get().enquiries, projectWithId];
      set({ enquiries: updatedEnquiries, loading: false });
      return projectWithId;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));