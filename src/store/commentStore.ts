import { create } from 'zustand';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
  };
  attachmentUrl?: string | null;
  createdAt: string;
}

interface ProjectComments {
  projectId: string;
  comments: Comment[];
}

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  fetchComments: (projectId: string) => Promise<void>;
  addComment: (projectId: string, text: string, attachmentUrl?: string | null) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,

  fetchComments: async (projectId: string) => {
    try {
      set({ loading: true, error: null });
      const commentsRef = doc(db, 'project_comments', projectId);
      const commentsDoc = await getDoc(commentsRef);
      
      if (commentsDoc.exists()) {
        const data = commentsDoc.data() as ProjectComments;
        set({ 
          comments: data.comments.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          loading: false 
        });
      } else {
        // If no comments exist yet, initialize with empty array
        set({ comments: [], loading: false });
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  addComment: async (projectId: string, text: string, attachmentUrl: string | null = null) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const commentsRef = doc(db, 'project_comments', projectId);
      const commentsDoc = await getDoc(commentsRef);

      const newComment: Comment = {
        id: crypto.randomUUID(),
        text,
        user: {
          id: currentUser.uid,
          name: currentUser.email || 'Anonymous',
        },
        attachmentUrl: attachmentUrl,
        createdAt: new Date().toISOString(),
      };

      if (commentsDoc.exists()) {
        // Update existing document
        const currentData = commentsDoc.data() as ProjectComments;
        await updateDoc(commentsRef, {
          comments: [...currentData.comments, newComment]
        });
      } else {
        // Create new document
        await setDoc(commentsRef, {
          projectId,
          comments: [newComment]
        });
      }

      // Update local state
      const currentComments = get().comments;
      set({
        comments: [newComment, ...currentComments],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));