import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

interface Deliverable {
  id: string;
  name: string;
  description?: string;
  hours?: number;
  costPerHour?: number;
  total: number;
}

interface CustomerRequirement {
  id: string;
  text: string;
}

export interface Enquiry {
  id?: string;
  __id: string;
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
  type: 'enquiry';
}

interface EnquiryState {
  enquiries: Enquiry[];
  loading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  fetchEnquiry: (id: string) => Promise<Enquiry | null>;
  createEnquiry: (enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
  updateEnquiry: (id: string, enquiry: Omit<Enquiry, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
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
        type: 'enquiry' as const
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
      await updateDoc(docRef, { ...enquiryData, type: 'enquiry' });
      const updatedEnquiries = get().enquiries.map(enquiry =>
        enquiry.id === id ? { ...enquiryData, id, __id: enquiry.__id, type: 'enquiry' } : enquiry
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

      // Convert deliverables to tasks
      const tasks = enquiry.deliverables.map(deliverable => ({
        id: crypto.randomUUID(),
        name: deliverable.name,
        description: deliverable.description || '',
        hours: deliverable.hours || 0,
        costPerHour: deliverable.costPerHour || 0,
        completed: false,
        children: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Create project data
      const projectData = {
        name: enquiry.name,
        description: enquiry.description,
        customer: enquiry.customer,
        tasks,
        __id: 'p-' + enquiry.__id.split('-')[1],
        type: 'project' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Create project in Firestore
      const projectRef = await addDoc(collection(db, 'projects'), projectData);

      // Delete original enquiry
      await deleteDoc(doc(db, 'enquiries', enquiryId));

      // Update local state
      const updatedEnquiries = get().enquiries.filter(e => e.id !== enquiryId);
      set({ enquiries: updatedEnquiries, loading: false });

      toast.success('Successfully converted to project');
    } catch (error) {
      console.error('Error converting to project:', error);
      set({ error: (error as Error).message, loading: false });
      toast.error('Failed to convert to project');
      throw error;
    }
  }
}));