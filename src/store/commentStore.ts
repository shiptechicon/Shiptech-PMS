import { create } from "zustand";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  limit,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

interface Attachment {
  url: string;
  name: string;
  number: string; // Add number to attachment
}

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    role?: string; // Add role to user info
  };
  attachments?: Attachment[]; // Array of attachment objects (URL + name + number)
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
  commentsCount: number; // New state variable for tracking fetched pages
  fetchComments: (
    projectId: string,
    userRole?: string,
    page?: number
  ) => Promise<void>;
  addComment: (
    projectId: string,
    text: string,
    userRole: string,
    attachments?: Attachment[]
  ) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,
  commentsCount: 0,
  lastVisible: null,

  fetchComments: async (
    projectId: string,
    userRole?: string,
    page: number = 0
  ) => {
    console.log("page", page);
    try {
      set({ loading: true, error: null });
      const commentsRef = collection(
        db,
        "project_comments",
        projectId,
        "comments"
      );
      const commentsQuery = query(commentsRef, limit(5)); // Fetch only 5 comments

      const commentsSnapshot = await getDocs(commentsQuery);
      let lastVisibleTemp = null;
      if (!commentsSnapshot.empty) {
        lastVisibleTemp =
          commentsSnapshot.docs[commentsSnapshot.docs.length - 1]; // Store last document
      }

      const comments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      // If user is a member, filter out customer comments
      if (userRole === "member") {
        set({
          comments: comments.filter(
            (comment) => comment.user.role !== "customer"
          ),
          loading: false,
          commentsCount: page + 1, // Increment commentsCount
        });
      } else {
        set({
          comments,
          loading: false,
          commentsCount: page + 1, // Increment commentsCount
        });
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  addComment: async (
    projectId: string,
    text: string,
    userRole: string,
    attachments: Attachment[] = []
  ) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const newComment: Comment = {
        id: crypto.randomUUID(),
        text,
        user: {
          id: currentUser.uid,
          name: currentUser.email || "Anonymous",
          role: userRole, // Include user role in comment
        },
        attachments: attachments.length > 0 ? attachments : [], // Set to empty array if no attachments
        createdAt: new Date().toISOString(),
      };

      // Add the new comment as a document in the Firestore collection
      await addDoc(
        collection(db, "project_comments", projectId, "comments"),
        newComment
      );

      // Update local state
      set((state) => ({
        comments: [newComment, ...state.comments],
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },
}));
