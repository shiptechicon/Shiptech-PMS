import { create } from 'zustand';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ContactPerson {
  name: string;
  phone: string;
}

export interface Customer {
  id?: string;
  name: string;
  address: string;
  billingAddress: string;
  gstNumber: string;
  contactPersons: ContactPerson[];
  endClient: string;
  email: string;
  logoUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  fetchCustomers: () => Promise<Customer[]>;
  fetchCustomer: (id: string) => Promise<Customer | null>;
  createCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
}

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,
  error: null,

  fetchCustomers: async () => {
    set({ loading: true, error: null });
    try {
      const customersCollection = collection(db, 'customers');
      const customersSnapshot = await getDocs(customersCollection);
      
      if (customersSnapshot.empty) {
        set({ customers: [], loading: false });
        return [];
      }
      
      const customersList = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      
      set({ customers: customersList, loading: false });
      return customersList;
    } catch (error) {
      console.error('Error fetching customers:', error);
      set({ error: 'Failed to fetch customers', loading: false });
      return [];
    }
  },

  fetchCustomer: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const customerDoc = await getDoc(doc(db, 'customers', id));
      
      if (!customerDoc.exists()) {
        set({ loading: false });
        return null;
      }
      
      const customerData = {
        id: customerDoc.id,
        ...customerDoc.data()
      } as Customer;
      
      set({ loading: false });
      return customerData;
    } catch (error) {
      console.error('Error fetching customer:', error);
      set({ error: 'Failed to fetch customer', loading: false });
      return null;
    }
  },
  createCustomer: async (customer) => {
    set({ loading: true, error: null });
    try {
      const customerData = {
        ...customer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'customers'), customerData);
      const newCustomer = {
        id: docRef.id,
        ...customerData
      } as Customer;
      
      set(state => ({
        customers: [...state.customers, newCustomer],
        loading: false
      }));
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      set({ error: 'Failed to create customer', loading: false });
      throw error;
    }
  },

  updateCustomer: async (id, customerUpdates) => {
    set({ loading: true, error: null });
    try {
      const customerRef = doc(db, 'customers', id);
      
      await updateDoc(customerRef, {
        ...customerUpdates,
        updatedAt: serverTimestamp()
      });
      
      set(state => ({
        customers: state.customers.map(customer => 
          customer.id === id ? { ...customer, ...customerUpdates } : customer
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating customer:', error);
      set({ error: 'Failed to update customer', loading: false });
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      await deleteDoc(doc(db, 'customers', id));
      
      set(state => ({
        customers: state.customers.filter(customer => customer.id !== id),
        loading: false
      }));
    } catch (error) {
      console.error('Error deleting customer:', error);
      set({ error: 'Failed to delete customer', loading: false });
      throw error;
    }
  }
}));
