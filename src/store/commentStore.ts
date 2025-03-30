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
  QueryDocumentSnapshot,
  DocumentData,
  orderBy,
  startAfter,
  deleteDoc,
  where,
  Timestamp,
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
  createdAt: Timestamp;
  project_id: string; // Add project_id to the comment
}

interface CommentState {
  comments: Comment[];
  loading: boolean;
  error: string | null;
  commentsCount: number; // New state variable for tracking fetched pages
  lastVisible: QueryDocumentSnapshot<DocumentData> | null; // Allow lastVisible to be null
  cache: {
    [projectId: string]: {
      comments: Comment[]; // Cached comments for each project
      lastVisible: QueryDocumentSnapshot<DocumentData> | null; // Last visible document for pagination
    };
  };
  fetchComments: (projectId: string) => Promise<void>; // Updated to only take projectId
  fetchMoreComments: (projectId: string) => Promise<void>; // Updated to only take projectId
  addComment: (projectId: string, text: string, userRole: string, attachments?: Attachment[]) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>; // Updated to only take commentId
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: [],
  loading: false,
  error: null,
  commentsCount: 0,
  lastVisible: null,
  cache: {},

  // Fetch comments for a project
  fetchComments: async (projectId: string) => {
    try {
      set({ loading: true, error: null });

      // Check if comments are already cached
      const cachedComments = get().cache[projectId]?.comments;
      if (cachedComments && cachedComments.length > 0) {
        set({
          comments: cachedComments,
          loading: false,
          lastVisible: get().cache[projectId]?.lastVisible || null,
        });
        return;
      }

      console.log("Fetching comments from Firestore for project:", projectId);

      const commentsRef = collection(db, "project_comments");
      const commentsQuery = query(
        commentsRef,
        where("project_id", "==", projectId),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      let lastVisibleTemp: QueryDocumentSnapshot<DocumentData> | null = null;

      if (!commentsSnapshot.empty) {
        lastVisibleTemp = commentsSnapshot.docs[commentsSnapshot.docs.length - 1]; // Store last document
      }

      // Extract data to match Comment type
      const comments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[]; // Ensure the data is cast to Comment type

      // Update cache
      set((state) => ({
        comments,
        loading: false,
        commentsCount: comments.length,
        lastVisible: lastVisibleTemp,
        cache: {
          ...state.cache,
          [projectId]: {
            comments,
            lastVisible: lastVisibleTemp,
          },
        },
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  // Fetch more comments for a project
  fetchMoreComments: async (projectId: string) => {
    try {
      const { lastVisible, comments, cache } = get();
      if (!lastVisible) return; // If there's no lastVisible, do nothing

      console.log("Fetching more comments from Firestore for project:", projectId);

      const commentsRef = collection(db, "project_comments");
      const commentsQuery = query(
        commentsRef,
        where("project_id", "==", projectId),
        orderBy("createdAt", "desc"),
        startAfter(lastVisible),
        limit(5)
      );

      const commentsSnapshot = await getDocs(commentsQuery);
      let newLastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      if (!commentsSnapshot.empty) {
        newLastVisible = commentsSnapshot.docs[commentsSnapshot.docs.length - 1]; // Store new last document
      }

      // Extract new comments and ensure they are cast to Comment type
      const newComments: Comment[] = commentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comment[];

      // Filter out duplicates before updating state
      const uniqueNewComments = newComments.filter(
        (newComment) => !comments.some((existingComment) => existingComment.id === newComment.id)
      );

      // Update cache and state
      set((state) => ({
        comments: [...state.comments, ...uniqueNewComments],
        lastVisible: newLastVisible,
        cache: {
          ...state.cache,
          [projectId]: {
            comments: [...(state.cache[projectId]?.comments || []), ...uniqueNewComments],
            lastVisible: newLastVisible,
          },
        },
      }));
    } catch (error) {
      console.error("Error fetching more comments:", error);
      set({ error: (error as Error).message });
    }
  },

  // Add a new comment
  addComment: async (projectId: string, text: string, userRole: string, attachments: Attachment[] = []) => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const newComment: Omit<Comment, 'id'> = {
        text,
        user: {
          id: currentUser.uid,
          name: currentUser.email || "Anonymous",
          role: userRole, // Include user role in comment
        },
        attachments: attachments.length > 0 ? attachments : [], // Set to empty array if no attachments
        createdAt: Timestamp.now(), // Use Firestore's Timestamp
        project_id: projectId, // Set project_id for the comment
      };

      // Add the new comment as a document in the Firestore collection
      const docRef = await addDoc(collection(db, "project_comments"), newComment);

      // Update cache and state with the new comment including the generated id
      set((state) => ({
        comments: [{ id: docRef.id, ...newComment }, ...state.comments], // Include the generated id
        loading: false,
        error: null,
        cache: {
          ...state.cache,
          [projectId]: {
            comments: [{ id: docRef.id, ...newComment }, ...(state.cache[projectId]?.comments || [])],
            lastVisible: state.cache[projectId]?.lastVisible || null,
          },
        },
      }));
    } catch (error) {
      console.error("Error adding comment:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  // Delete a comment
  deleteComment: async (commentId: string) => {
    try {
      const { comments, cache } = get();
      const commentToDelete = comments.find((comment) => comment.id === commentId);

      
      if (commentToDelete) {
        let attachmentsDeleted = true;
        
        // Delete attachments from GitHub if they exist
        if (commentToDelete.attachments) {
          for (const attachment of commentToDelete.attachments) {
            // const projectDocPath = `Projects/${projectId}/${doc.fileName}`;
            const projectDocPath = attachment.url.split("raw.githubusercontent.com/NoTimeInnovations/shiptech-data/main/")[1];
            console.log("commentToDelete",projectDocPath.replace(/%20/g, ' '))
            
            try {
              const response = await fetch('https://ship-backend-black.vercel.app/api/delete-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: projectDocPath.replace(/\\/g, '/').replace(/%20/g, ' ') }),
              });

              if (!response.ok) {
                console.warn("Failed to delete attachment from GitHub:", attachment.url);
                attachmentsDeleted = false;
              }
            } catch (error) {
              console.warn("Attachment deletion failed:", error);
              attachmentsDeleted = false;
            }
          }
        }

        // Correct Firestore path for comment document
        const commentRef = doc(db, "project_comments", commentId);
        if (attachmentsDeleted) {
          await deleteDoc(commentRef);

          // Update cache and state
          set((state) => ({
            comments: state.comments.filter((comment) => comment.id !== commentId),
            cache: {
              ...state.cache,
              [commentToDelete.project_id]: {
                comments: state.cache[commentToDelete.project_id]?.comments.filter(
                  (comment) => comment.id !== commentId
                ),
                lastVisible: state.cache[commentToDelete.project_id]?.lastVisible || null,
              },
            },
          }));
        } else {
          console.warn("Comment not deleted because attachments could not be deleted.");
        }
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      set({ error: (error as Error).message });
    }
  },
}));