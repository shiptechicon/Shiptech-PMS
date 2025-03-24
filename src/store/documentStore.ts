import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, deleteDoc } from 'firebase/firestore';

export interface Document {
  id: string;
  enquiryNumber: string;
  projectNumber: string;
  documentNumber: string;
  sentBy: string;
  date: string;
  medium: 'email' | 'physical' | 'other';
  fileUrl: string;
  fileName: string;
  projectId: string;
  createdAt: string;
}

interface DocumentState {
  documents: Document[];
  loading: boolean;
  error: string | null;
  cache: {
    [projectId: string]: Document[]; // Cache documents by projectId
  };
  fetchDocuments: (projectId: string) => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | null>;
  createDocument: (document: Omit<Document, 'id' | 'createdAt'>) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  loading: false,
  error: null,
  cache: {},

  // Fetch documents for a project
  fetchDocuments: async (projectId) => {
    set({ loading: true, error: null });

    // Check if documents are already cached
    const cachedDocuments = get().cache[projectId];
    if (cachedDocuments && cachedDocuments.length > 0) {
      set({ documents: cachedDocuments, loading: false });
      return;
    }

    // Log Firestore fetch
    console.log("Fetching documents from Firestore for project:", projectId);

    try {
      const q = query(collection(db, 'documents'), where('projectId', '==', projectId));
      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Document[];

      // Update cache and state
      set((state) => ({
        documents,
        loading: false,
        cache: { ...state.cache, [projectId]: documents },
      }));
    } catch (error) {
      set({ error: 'Failed to fetch documents', loading: false });
      console.error(error);
    }
  },

  // Fetch a single document by ID
  fetchDocument: async (id) => {
    try {
      // Check if the document is already in the documents list (cached)
      const cachedDocument = get().documents.find(doc => doc.id === id);
      if (cachedDocument) {
        return cachedDocument;
      }

      // Log Firestore fetch
      console.log("Fetching document from Firestore:", id);

      const docRef = doc(db, 'documents', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const document = { id: docSnap.id, ...docSnap.data() } as Document;
        return document;
      }
      return null;
    } catch (error) {
      set({ error: 'Failed to fetch document' });
      console.error(error);
      return null;
    }
  },

  // Create a new document
  createDocument: async (documentData) => {
    set({ loading: true, error: null });
    try {
      const newDocument = {
        ...documentData,
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'documents'), newDocument);
      const document = { ...newDocument, id: docRef.id };

      // Update cache and state
      set((state) => ({
        documents: [...state.documents, document],
        cache: {
          ...state.cache,
          [documentData.projectId]: [...(state.cache[documentData.projectId] || []), document],
        },
        loading: false,
      }));
      return document;
    } catch (error) {
      set({ error: 'Failed to create document', loading: false });
      throw error;
    }
  },

  // Update an existing document
  updateDocument: async (id, data) => {
    set({ loading: true, error: null });
    try {
      await updateDoc(doc(db, 'documents', id), data);

      // Update cache and state
      set((state) => {
        const updatedDocuments = state.documents.map(doc =>
          doc.id === id ? { ...doc, ...data } : doc
        );

        // Update cache if the document is in the cache
        const projectId = state.documents.find(doc => doc.id === id)?.projectId;
        if (projectId) {
          return {
            documents: updatedDocuments,
            cache: {
              ...state.cache,
              [projectId]: state.cache[projectId].map(doc =>
                doc.id === id ? { ...doc, ...data } : doc
              ),
            },
            loading: false,
          };
        }

        return { documents: updatedDocuments, loading: false };
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Delete a document
  deleteDocument: async (id) => {
    try {
      await deleteDoc(doc(db, 'documents', id));

      // Update cache and state
      set((state) => {
        const deletedDocument = state.documents.find(doc => doc.id === id);
        const projectId = deletedDocument?.projectId;

        if (projectId) {
          return {
            documents: state.documents.filter(doc => doc.id !== id),
            cache: {
              ...state.cache,
              [projectId]: state.cache[projectId].filter(doc => doc.id !== id),
            },
          };
        }

        return { documents: state.documents.filter(doc => doc.id !== id) };
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
}));