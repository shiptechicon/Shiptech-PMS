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
import { auth, db } from '@/lib/firebase';
import { useAuthStore } from '@/store/authStore';
import { CloudCog } from 'lucide-react';

interface Notification {
  id: string;
  content: string;
  url: string;
  createdAt: Date;
  userId: string;
  assignedTo?: Array<string>;
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
            assignedTo: [],
          };

          const docRef = await addDoc(collection(db, 'notifications'), notificationData);
          
          const newNotification = {
            id: docRef.id,
            content,
            url,
            userId,
            createdAt: new Date(),
            assignedTo: [],
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
        const user = useAuthStore.getState().user;
        const userData = useAuthStore.getState().userData;

        set({ loading: true, error: null });
        
        try {
          let q;
          
          if (userData?.role === 'admin') {
            // Admin query - get all notifications
            q = query(
              collection(db, 'notifications'),
              orderBy('createdAt', 'desc')
            );
          } else {
            // Regular user query - only get notifications assigned to them
            q = query(
              collection(db, 'notifications'),
              where('assignedTo', 'array-contains', userData?.id || ''),
              orderBy('createdAt', 'desc')
            );
          }
    
          // if (user) {
          //   console.log(`Fetching notifications for ${userData?.role} user:`, userData?.id);
          // } else {
          //   console.warn('User is null, cannot fetch notifications.');
          // }
    
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
                assignedTo: data.assignedTo || [],
                type: data.type || 'task' // Assuming notifications have a type field
              };
            });
    
            // For regular users, you might want to filter further if needed
            if (userData?.role == 'member') {
              const filteredNotifications = notifications.filter(notification => 
                ['task', 'todo'].includes(notification.type) // Only show tasks and todos
              );
              
              set({ notifications: filteredNotifications, loading: false });
            } else {
              console.log("user",user);
              console.log("current user",auth.currentUser?.uid);
              
              
              // Filter notifications containing "Todo" to check assignedTo
              // Filter todo notifications where user is the creator
              const todoNotifications = notifications.filter(notification => 
                notification.content.toLowerCase().includes('todo') && 
                notification.userId === auth.currentUser?.uid
              );

              // Filter non-todo notifications
              const nonTodoNotifications = notifications.filter(notification => 
                !notification.content.toLowerCase().includes('todo')
              );

              // Combine both arrays
              const filteredNotifications = [...todoNotifications, ...nonTodoNotifications];
              console.log(filteredNotifications);
              
              set({ notifications: filteredNotifications, loading: false });
            }
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
          console.log("userID",userId)
          // console.log('Clearing all notifications for user:', userId);
          const querySnapshot = await getDocs(collection(db, 'notifications'));
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
); 