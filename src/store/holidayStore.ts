import create from 'zustand';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface HolidayStore {
  holidays: Holiday[];
  fetchHolidays: () => Promise<void>;
  addHoliday: (name: string, startDate: string, endDate: string) => Promise<void>;
  updateHoliday: (id: string, name: string, startDate: string, endDate: string) => Promise<void>;
  removeHoliday: (id: string) => Promise<void>;
}

export const useHolidayStore = create<HolidayStore>((set) => ({
  holidays: [],
  fetchHolidays: async () => {
    const querySnapshot = await getDocs(collection(db, 'holidays'));
    const holidays = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Holiday[];
    set({ holidays });
  },
  addHoliday: async (name, startDate, endDate) => {
    const docRef = await addDoc(collection(db, 'holidays'), { name, startDate, endDate });
    set((state) => ({
      holidays: [...state.holidays, { id: docRef.id, name, startDate, endDate }]
    }));
  },
  updateHoliday: async (id, name, startDate, endDate) => {
    await updateDoc(doc(db, 'holidays', id), { name, startDate, endDate });
    set((state) => ({
      holidays: state.holidays.map(holiday => holiday.id === id ? { ...holiday, name, startDate, endDate } : holiday)
    }));
  },
  removeHoliday: async (id) => {
    await deleteDoc(doc(db, 'holidays', id));
    set((state) => ({
      holidays: state.holidays.filter(holiday => holiday.id !== id)
    }));
  },
})); 