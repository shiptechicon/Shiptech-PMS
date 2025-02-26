import { create } from 'zustand';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface Attachment {
  url: string;
  name: string;
}

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    role?: string;  // Add role to user info
  };
  attachments?: Attachment[]; // Array of attachment objects (URL + name)
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
  fetchComments: (projectId: string, userRole?: string) => Promise<void>;
  addComment: (projectId: string, text: string, userRole: string, attachments?: Attachment[]) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,

  fetchComments: async (projectId: string, userRole?: string) => {
    try {
      set({ loading: true, error: null });
      const commentsRef = doc(db, 'project_comments', projectId);
      const commentsDoc = await getDoc(commentsRef);

      if (commentsDoc.exists()) {
        const data = commentsDoc.data() as ProjectComments;
        let filteredComments = data.comments;

        // If user is a member, filter out customer comments
        if (userRole === 'member') {
          filteredComments = data.comments.filter(comment => 
            comment.user.role !== 'customer'
          );
        }

        // Sort comments by date
        set({
          comments: filteredComments.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
          loading: false,
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

  addComment: async (projectId: string, text: string, userRole: string, attachments: Attachment[] = []) => {
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
          role: userRole,  // Include user role in comment
        },
        attachments: attachments.length > 0 ? attachments : [], // Set to undefined if no attachments
        createdAt: new Date().toISOString(),
      };

      if (commentsDoc.exists()) {
        // Update existing document
        const currentData = commentsDoc.data() as ProjectComments;
        await updateDoc(commentsRef, {
          comments: [...currentData.comments, newComment],
        });
      } else {
        // Create new document
        await setDoc(commentsRef, {
          projectId,
          comments: [newComment],
        });
      }

      // Update local state based on user role
      if (userRole === 'member') {
        // Only add to local state if it's not a customer comment
        const currentComments = get().comments;
        set({
          comments: [newComment, ...currentComments],
          loading: false,
          error: null,
        });
      } else {
        // Refetch to ensure proper filtering
        await get().fetchComments(projectId, userRole);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));