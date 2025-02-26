import { create } from 'zustand';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Todo {
  id: string;
  userId: string;
  title: string;
  description: string;
  endDate: string;
  createdAt: string;
  completed: boolean;
}

interface TodoState {
  todos: Todo[];
  loading: boolean;
  error: string | null;
  addTodo: (title: string, description: string, endDate: string) => Promise<void>;
  updateTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  fetchUserTodos: () => Promise<void>;
  toggleTodoComplete: (id: string) => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  addTodo: async (title: string, description: string, endDate: string) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const todoRef = collection(db, 'todos');
      const newTodo: Omit<Todo, 'id'> = {
        userId: currentUser.uid,
        title,
        description,
        endDate,
        createdAt: new Date().toISOString(),
        completed: false
      };

      await addDoc(todoRef, newTodo);
      await get().fetchUserTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  updateTodo: async (id: string, updates: Partial<Todo>) => {
    try {
      set({ loading: true, error: null });
      const todoRef = doc(db, 'todos', id);
      await updateDoc(todoRef, updates);
      await get().fetchUserTodos();
    } catch (error) {
      console.error('Error updating todo:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  deleteTodo: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const todoRef = doc(db, 'todos', id);
      await deleteDoc(todoRef);
      set(state => ({
        todos: state.todos.filter(todo => todo.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting todo:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchUserTodos: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const todosRef = collection(db, 'todos');
      const q = query(todosRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      const todos = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Todo[];

      set({ todos });
    } catch (error) {
      console.error('Error fetching todos:', error);
      set({ error: (error as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  toggleTodoComplete: async (id: string) => {
    const todo = get().todos.find(t => t.id === id);
    if (todo) {
      await get().updateTodo(id, { completed: !todo.completed });
    }
  }
})); 