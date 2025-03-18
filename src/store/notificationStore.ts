import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    deleteDoc, 
    serverTimestamp, 
    where,
    query,
    orderBy,
    onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface Notification {
  id: string;
  content: string;
  url: string;
  createdAt: Date;
  userId: string;
}

interface NotificationStore {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  addNotification: (content: string, url: string, userId: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: (userId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      loading: false,
      error: null,

      addNotification: async (content: string, url: string, userId: string) => {
        try {
          const notificationData = {
            content,
            url,
            userId,
            createdAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, 'notifications'), notificationData);
          
          const newNotification = {
            id: docRef.id,
            content,
            url,
            userId,
            createdAt: new Date(),
          };

          set(state => ({
            notifications: [newNotification, ...state.notifications]
          }));

          await get().fetchNotifications();
        } catch (error) {
          console.error('Error adding notification:', error);
          set({ error: 'Failed to add notification' });
        }
      },

      fetchNotifications: async () => {
        set({ loading: true, error: null });
        
        try {
          const q = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc')
          );

          // Set up real-time listener
          onSnapshot(q, (snapshot) => {
            const notifications = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                content: data.content,
                url: data.url,
                userId: data.userId,
                createdAt: data.createdAt?.toDate() || new Date(),
              };
            });

            // console.log('Fetched notifications:', notifications);

            set({ notifications, loading: false });
          }, (error) => {
            console.error('Error in notification listener:', error);
            set({ error: 'Failed to fetch notifications', loading: false });
          });

        } catch (error) {
          console.error('Error setting up notification listener:', error);
          set({ error: 'Failed to fetch notifications', loading: false });
        }
      },

      deleteNotification: async (id: string) => {
        try {
          // console.log('Deleting notification:', id);
          await deleteDoc(doc(db, 'notifications', id));
          
          set(state => ({
            notifications: state.notifications.filter(n => n.id !== id)
          }));
          // console.log('Notification deleted successfully');
        } catch (error) {
          console.error('Error deleting notification:', error);
          set({ error: 'Failed to delete notification' });
        }
      },

      clearAllNotifications: async (userId: string) => {
        try {
          // console.log('Clearing all notifications for user:', userId);
          const q = query(collection(db, 'notifications'), where('userId', '==', userId));
          const querySnapshot = await getDocs(q);
          
          const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
          await Promise.all(deletePromises);
          
          set({ notifications: [] });
          // console.log('All notifications cleared successfully');
        } catch (error) {
          console.error('Error clearing notifications:', error);
          set({ error: 'Failed to clear notifications' });
        }
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({ notifications: state.notifications }),
    }
  )
); 