import { create } from 'zustand';
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface User {
  id: string;
  fullName: string;
  email: string;
}

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  duration: number; // in minutes - total accumulated time
}

export interface Task {
  id: string;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User[];
  deadline?: string | null;
  completed: boolean;
  children: Task[];
  projectId?: string;
  path?: string;
  timeEntries?: TimeEntry[];
  percentage: number;
  maxAllowedPercentage?: number;
}

export interface Project {
  id?: string;
  __id: string;
  projectNumber: string;
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  createdAt: string;
  status: 'completed' | 'ongoing' | 'not-started';
  type: 'project';
  project_due_date?: string | null;
  project_start_date?: string | null;
}

interface PathItem {
  id: string;
}

interface ProjectState {
  projects: Project[];
  project: Project | null;
  userTasks: Task[];
  loading: boolean;
  error: string | null;
  currentPath: PathItem[];
  activeTimer: {
    taskId: string | null;
    projectId: string | null;
    startTime: string | null;
  };
  setCurrentPath: (path: PathItem[]) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (project: Omit<Project, 'id' | '__id' | 'createdAt' | 'project_due_date'> & { tasks: Task[]; type: 'project' }) => Promise<void>;
  updateProject: (id: string, project: Omit<Project, 'id' | '__id' | 'createdAt' | 'type'>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addTask: (projectId: string, path: PathItem[], task: Omit<Task, 'id' | 'children' | 'completed'>) => Promise<void>;
  updateTask: (projectId: string, path: PathItem[], taskId: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (projectId: string, path: PathItem[], taskId: string) => Promise<void>;
  getTaskByPath: (projectId: string, path: PathItem[]) => Promise<Task | null>;
  toggleTaskCompletion: (projectId: string, path: PathItem[]) => Promise<void>;
  updateProjectDueDate: (projectId: string, dueDate: string | null) => Promise<void>;
  updateProjectStartDate: (projectId: string, startDate: string | null) => Promise<void>;
  fetchUserTasks: () => Promise<void>;
  startTimer: (projectId: string, taskId: string) => Promise<void>;
  stopTimer: (projectId: string, taskId: string) => Promise<void>;
  getTaskTimeEntries: (projectId: string, taskId: string) => Promise<TimeEntry[]>;
  checkActiveTimer: () => Promise<void>;
  updateProjectStatus: (status: 'completed' | 'ongoing' | 'not-started', projectId: string) => Promise<void>;
  fetchUsers: () => Promise<User[]>;
  users: User[];
}

const calculateDurationWithDecimals = (startTime: string): number => {
  const start = new Date(startTime).getTime();
  const now = new Date().getTime();
  const elapsedSeconds = (now - start) / 1000;
  const minutes = Math.floor(elapsedSeconds / 60);
  const remainingSeconds = Math.floor(elapsedSeconds % 60);
  // Convert to format like 1.23 for 1 minute 23 seconds
  return Number(`${minutes}.${remainingSeconds.toString().padStart(2, '0')}`);
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  project: null,
  userTasks: [],
  loading: false,
  error: null,
  currentPath: [],
  activeTimer: {
    taskId: null,
    projectId: null,
    startTime: null,
  },
  users: [],

  setCurrentPath: (path) => set({ currentPath: path }),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tasks: doc.data().tasks || []
      })) as Project[];
      set({ projects, loading: false });
    } catch (error) {
      console.error('Error fetching projects:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const project = {
          ...docSnap.data(),
          id: docSnap.id,
          tasks: docSnap.data().tasks || []
        } as Project;
        set({ loading: false, project: project });
        return project;
      }
      set({ loading: false });
      return null;
    } catch (error) {
      console.error('Error fetching project:', error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  createProject: async (projectData) => {
    try {
      set({ loading: true, error: null });
      const newProject = {
        ...projectData,
        __id: `p-${projectData.projectNumber}`,
        createdAt: new Date().toISOString(),
        type: 'project' as const,
        tasks: [],
        project_due_date: null,
        project_start_date: null,
        status: 'not-started' as const
      };
      const docRef = await addDoc(collection(db, 'projects'), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      console.error('Error creating project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProject: async (id, projectData) => {
    try {

      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', id);

      if(get().projects.length == 0) {
        await get().fetchProjects();
      }
      
      const cleanTasks = (tasks: Task[]): Task[] => {
        return tasks.map(task => ({
          id: task.id,
          name: task.name || '',
          description: task.description || '',
          hours: task.hours || 0,
          costPerHour: task.costPerHour || 0,
          assignedTo: task.assignedTo ? task.assignedTo.map(user => ({
            id: user.id,
            fullName: user.fullName,
            email: user.email
          })) : [],
          deadline: task.deadline || null,
          completed: Boolean(task.completed),
          children: task.children ? cleanTasks(task.children) : [],
          timeEntries: task.timeEntries || [],
          percentage: task.percentage || 0
        }));
      };

      const cleanProjectData = {
        name: projectData.name || '',
        description: projectData.description || '',
        customer: {
          name: projectData.customer?.name || '',
          phone: projectData.customer?.phone || '',
          address: projectData.customer?.address || ''
        },
        tasks: cleanTasks(projectData.tasks || []),
        type: 'project' as const,
        project_due_date: projectData.project_due_date || null
      };

       await updateDoc(docRef, cleanProjectData);

      const updatedProject = {
        ...get().project,
        ...cleanProjectData,
        id,
        __id: get().project?.__id,
        createdAt: get().project?.createdAt
      };
      
      set({ project: updatedProject as Project, loading: false });
    } catch (error) {
      console.error('Error updating project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, 'projects', projectId));
      
      // Update local state
      const currentProjects = get().projects;
      set({ 
        projects: currentProjects.filter(p => p.id !== projectId),
        loading: false 
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getTaskByPath: async (projectId, path) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) return null;

      let current: Task | null = null;
      let items = project.tasks;

      for (const pathItem of path) {
        const found = items.find(item => item.id === pathItem.id);
        if (!found) return null;
        current = found;
        items = found.children || [];
      }

      return current;
    } catch (error) {
      console.error('Error getting task by path:', error);
      return null;
    }
  },

  addTask: async (projectId, path, taskData) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const newTask: Task = {
        ...taskData,
        id: crypto.randomUUID(),
        name: taskData.name || '',
        description: taskData.description || '',
        completed: false,
        children: [],
        timeEntries: [],
        percentage: taskData.percentage || 0
      };

      const updateNestedTasks = (tasks: Task[], currentPath: PathItem[]): Task[] => {
        if (currentPath.length === 0) {
          return [...tasks, newTask];
        }

        return tasks.map(task => {
          if (task.id === currentPath[0].id) {
            return {
              ...task,
              children: updateNestedTasks(task.children || [], currentPath.slice(1))
            };
          }
          return task;
        });
      };

      const updatedTasks = path.length === 0 
        ? [...project.tasks, newTask]
        : updateNestedTasks(project.tasks, path);


      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      set({ loading: false });
    } catch (error) {
      console.error('Error adding task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateTask: async (projectId, path, taskId, data) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateNestedTask = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              ...data,
              percentage: typeof data.percentage === 'number' ? 
                Math.min(data.percentage, 100) : task.percentage,
              children: task.children || []
            };
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateNestedTask(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateNestedTask(project.tasks);
      const updatedProject = { ...project, tasks: updatedTasks };
      
      // Update Firebase
      await get().updateProject(projectId, updatedProject);
      
      // Update Zustand state
      set(state => ({
        ...state,
        projects: state.projects.map(p => 
          p.id === projectId ? updatedProject : p
        ),
        loading: false
      }));
    } catch (error) {
      console.error('Error updating task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteTask: async (projectId, path, taskId) => {
    try {
      set({ loading: true, error: null });
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const deleteNestedTask = (tasks: Task[]): Task[] => {
        return tasks.filter(task => {
          if (task.id === taskId) return false;
          if (task.children && task.children.length > 0) {
            task.children = deleteNestedTask(task.children);
          }
          return true;
        });
      };

      const updatedTasks = deleteNestedTask(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      set({ loading: false });
    } catch (error) {
      console.error('Error deleting task:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  toggleTaskCompletion: async (projectId, path) => {
    try {
      const task = await get().getTaskByPath(projectId, path);
      if (!task) throw new Error('Task not found');

      const lastPathItem = path[path.length - 1];
      await get().updateTask(projectId, path.slice(0, -1), lastPathItem.id, {
        completed: !task.completed
      });
    } catch (error) {
      console.error('Error toggling task completion:', error);
      throw error;
    }
  },

  updateProjectDueDate: async (projectId, dueDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { project_due_date: dueDate });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, project_due_date: dueDate } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project due date:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProjectStartDate: async (projectId, startDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { project_start_date: startDate });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, project_start_date: startDate } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project due date:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchUserTasks: async () => {
    try {
      set({ loading: true, error: null });
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        set({ userTasks: [], loading: false });
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projects = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tasks: doc.data().tasks || []
      })) as Project[];

      const flattenTasks = (tasks: Task[], projectId: string, parentPath: string = ''): Task[] => {
        return tasks.reduce((acc: Task[], task) => {
          const currentPath = parentPath ? `${parentPath}/${task.id}` : task.id;
          const isAssignedToUser = task.assignedTo?.some(user => user.id === currentUser.uid);
          
          const flatTask = isAssignedToUser ? [{
            ...task,
            projectId,
            path: currentPath
          }] : [];

          return [
            ...acc,
            ...flatTask,
            ...flattenTasks(task.children || [], projectId, currentPath)
          ];
        }, []);
      };

      const userTasks = projects.reduce((acc: Task[], project) => {
        if (!project.id) return acc;
        const projectTasks = flattenTasks(project.tasks, project.id);
        return [...acc, ...projectTasks];
      }, []);

      set({ userTasks, loading: false });
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  startTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            const timeEntries = task.timeEntries || [];
            const existingUserEntry = timeEntries.find(entry => entry.userId === currentUser.uid);

            if (existingUserEntry) {
              // Keep the existing duration and just update start time
              const updatedEntries = timeEntries.map(entry => {
                if (entry.userId === currentUser.uid) {
                  return {
                    ...entry,
                    startTime: new Date().toISOString(),
                    // Keep the existing duration - don't reset to 0
                  };
                }
                return entry;
              });
              return {
                ...task,
                timeEntries: updatedEntries
              };
            } else {
              // Create new entry for user
              const newEntry: TimeEntry = {
                id: crypto.randomUUID(),
                userId: currentUser.uid,
                userName: currentUser.email || 'Unknown User',
                startTime: new Date().toISOString(),
                duration: 0 // Initial duration for new entries
              };
              return {
                ...task,
                timeEntries: [...timeEntries, newEntry]
              };
            }
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateTaskTimer(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      
      set({ 
        activeTimer: {
          taskId,
          projectId,
          startTime: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  },

  stopTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map(task => {
          if (task.id === taskId) {
            const timeEntries = task.timeEntries || [];
            const userEntry = timeEntries.find(entry => entry.userId === currentUser.uid);
            
            if (userEntry) {
              const elapsedDuration = calculateDurationWithDecimals(userEntry.startTime);
              
              const updatedEntries = timeEntries.map(entry => {
                if (entry.userId === currentUser.uid) {
                  // Add new duration to existing duration, maintaining decimal format
                  const currentDuration = entry.duration || 0;
                  const totalMinutes = Math.floor(currentDuration) + Math.floor(elapsedDuration);
                  const totalSeconds = Math.round((
                    (currentDuration % 1 + elapsedDuration % 1) * 100
                  ));
                  
                  // Handle case where seconds >= 60
                  const adjustedMinutes = totalMinutes + Math.floor(totalSeconds / 60);
                  const adjustedSeconds = totalSeconds % 60;
                  
                  return {
                    ...entry,
                    duration: Number(`${adjustedMinutes}.${adjustedSeconds.toString().padStart(2, '0')}`)
                  };
                }
                return entry;
              });

              return {
                ...task,
                timeEntries: updatedEntries
              };
            }
            return task;
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children)
            };
          }
          return task;
        });
      };

      const updatedTasks = updateTaskTimer(project.tasks);
      await get().updateProject(projectId, { ...project, tasks: updatedTasks });
      
      set({ 
        activeTimer: {
          taskId: null,
          projectId: null,
          startTime: null
        }
      });
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  },

  getTaskTimeEntries: async (projectId: string, taskId: string) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error('Project not found');

      const findTask = (tasks: Task[]): Task | null => {
        for (const task of tasks) {
          if (task.id === taskId) return task;
          if (task.children && task.children.length > 0) {
            const found = findTask(task.children);
            if (found) return found;
          }
        }
        return null;
      };

      const task = findTask(project.tasks);
      return task?.timeEntries || [];
    } catch (error) {
      console.error('Error getting task time entries:', error);
      return [];
    }
  },

  checkActiveTimer: async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        set({ 
          activeTimer: {
            taskId: null,
            projectId: null,
            startTime: null
          }
        });
        return;
      }

      const querySnapshot = await getDocs(collection(db, 'projects'));
      let foundActiveTimer = false;

      for (const projectDoc of querySnapshot.docs) {
        const projectData = projectDoc.data();
        const tasks = projectData.tasks || [];

        const findActiveTimer = (tasks: Task[]): boolean => {
          for (const task of tasks) {
            const timeEntries = task.timeEntries || [];
            const lastEntry = timeEntries[timeEntries.length - 1];
            
            if (lastEntry && 
                lastEntry.userId === currentUser.uid ) {
              set({ 
                activeTimer: {
                  taskId: task.id,
                  projectId: projectDoc.id,
                  startTime: lastEntry.startTime
                }
              });
              return true;
            }

            if (task.children && task.children.length > 0) {
              if (findActiveTimer(task.children)) {
                return true;
              }
            }
          }
          return false;
        };

        if (findActiveTimer(tasks)) {
          foundActiveTimer = true;
          break;
        }
      }

      if (!foundActiveTimer) {
        set({
          activeTimer: {
            taskId: null,
            projectId: null,
            startTime: null
          }
        });
      }
    } catch (error) {
      console.error('Error checking active timer:', error);
      set({
        activeTimer: {
          taskId: null,
          projectId: null,
          startTime: null
        }
      });
    }
  },

  updateProjectStatus: async (status: 'completed' | 'ongoing' | 'not-started', projectId: string) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, 'projects', projectId);
      await updateDoc(docRef, { status });
      
      const updatedProjects = get().projects.map(project =>
        project.id === projectId ? { ...project, status } : project
      );
      
      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error('Error updating project status:', error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchUsers: async () => {
    if (get().users.length > 0) {
      return get().users;
    }

    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as User[];
      
      set({ users });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  formatDuration: (duration: number) => {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}));