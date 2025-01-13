import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Enquiry } from './enquiryStore';

interface ProjectState {
  projects: Enquiry[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Enquiry | null>;
  createProject: (project: Omit<Enquiry, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  updateProject: (id: string, project: Omit<Enquiry, 'id' | '__id' | 'createdAt'>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as Enquiry[];
      set({ projects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const project = { ...docSnap.data(), id: docSnap.id } as Enquiry;
        set({ loading: false });
        return project;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      set({ loading: true, error: null });
      const internalId = 'p-' + Math.random().toString().slice(2, 8);
      const newProject = {
        ...projectData,
        __id: internalId,
        createdAt: new Date().toISOString(),
        type: 'project'
      };
      const docRef = await addDoc(collection(db, 'projects'), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateProject: async (id: string, projectData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      await updateDoc(docRef, projectData);
      const updatedProjects = get().projects.map(project =>
        project.id === id ? { ...projectData, id, __id: project.__id } : project
      );
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteProject: async (id: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'projects', id));
      const updatedProjects = get().projects.filter(project => project.id !== id);
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },
}));