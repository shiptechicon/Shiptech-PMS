import { create } from "zustand";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";

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
  projectId: string;
  parentId: string | null;
  name: string;
  description: string;
  hours?: number;
  costPerHour?: number;
  assignedTo?: User[];
  deadline?: string | null;
  completed: boolean;
  timeEntries?: TimeEntry[];
  percentage: number;
  maxAllowedPercentage?: number;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  status: "completed" | "ongoing" | "not-started";
  type: "project";
  project_due_date?: string | null;
  project_start_date?: string | null;
}

interface PathItem {
  id: string;
}

interface ProjectState {
  projects: Project[];
  project: Project | null;
  tasks: Task[];
  individualTask: Task | null;
  individualTaskSubtasks: Task[];
  loading: boolean;
  error: string | null;
  currentPath: PathItem[];
  activeTimer: {
    taskId: string | null;
    projectId: string | null;
    startTime: string | null;
  };
  userTasks: Task[];
  setCurrentPath: (path: PathItem[]) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  createProject: (
    project: Omit<Project, "id" | "__id" | "createdAt" | "project_due_date">
  ) => Promise<void>;
  updateProject: (
    id: string,
    project: Omit<Project, "id" | "__id" | "createdAt" | "type">
  ) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addTask: (
    projectId: string,
    parentTaskId:string,
    task: Omit<Task, "id" | "children" | "completed">
  ) => Promise<void>;
  updateTask: (
    projectId: string,
    taskId: string,
    data: Partial<Task>
  ) => Promise<void>;
  deleteTask: (
    projectId: string,
    path: PathItem[],
    taskId: string
  ) => Promise<void>;
  getTaskByPath: (projectId: string, taskId: string) => Promise<Task | null>;
  toggleTaskCompletion: (projectId: string, taskId: string) => Promise<void>;
  updateProjectDueDate: (
    projectId: string,
    dueDate: string | null
  ) => Promise<void>;
  updateProjectStartDate: (
    projectId: string,
    startDate: string | null
  ) => Promise<void>;
  fetchUserTasks: () => Promise<void>;
  startTimer: (projectId: string, taskId: string) => Promise<void>;
  stopTimer: (projectId: string, taskId: string) => Promise<void>;
  getTaskTimeEntries: (
    projectId: string,
    taskId: string
  ) => Promise<TimeEntry[]>;
  checkActiveTimer: () => Promise<void>;
  updateProjectStatus: (
    status: "completed" | "ongoing" | "not-started",
    projectId: string
  ) => Promise<void>;
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
  return Number(`${minutes}.${remainingSeconds.toString().padStart(2, "0")}`);
};

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  project: null,
  tasks: [],
  individualTask: null,
  individualTaskSubtasks: [],
  loading: false,
  error: null,
  currentPath: [],
  activeTimer: {
    taskId: null,
    projectId: null,
    startTime: null,
  },
  users: [],
  userTasks: [],

  setCurrentPath: (path) => set({ currentPath: path }),

  fetchProjects: async () => {
    try {
      set({ loading: true, error: null });
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[];
      set({ projects, loading: false });
    } catch (error) {
      console.error("Error fetching projects:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  fetchProject: async (id: string) => {
    try {
      set({ loading: true, error: null });

      // Fetch project
      const docRef = doc(db, "projects", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        set({ loading: false });
        return null;
      }

      const project = { ...docSnap.data(), id: docSnap.id } as Project;

      // Fetch tasks for this project
      const tasksSnapshot = await getDocs(
        query(collection(db, "tasks"), where("projectId", "==", project.__id))
      );

      const tasks = tasksSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Task[];

      set({
        project,
        tasks,
        loading: false,
      });

      return project;
    } catch (error) {
      console.error("Error fetching project:", error);
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
        type: "project" as const,
        project_due_date: null,
        project_start_date: null,
        status: "not-started" as const,
      };
      const docRef = await addDoc(collection(db, "projects"), newProject);
      const projectWithId = { ...newProject, id: docRef.id };
      const projects = [...get().projects, projectWithId];
      set({ projects, loading: false });
    } catch (error) {
      console.error("Error creating project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  fetchUsers: async () => {
    try {
      const querySnapshot = await getDocs(
        query(
          collection(db, "users"),
          where("verified", "==", true),
          where("role", "!=", "customer")
        )
      );
      const users = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];

      set({ users });
      return users;
    } catch (error) {
      console.error("Error fetching users:", error);
      return [];
    }
  },

  updateProject: async (id, projectData) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", id);

      if (get().projects.length == 0) {
        await get().fetchProjects();
      }

      const cleanTasks = (tasks: Task[]): Task[] => {
        return tasks.map((task) => ({
          id: task.id,
          name: task.name || "",
          description: task.description || "",
          hours: task.hours || 0,
          costPerHour: task.costPerHour || 0,
          assignedTo: task.assignedTo
            ? task.assignedTo.map((user) => ({
                id: user.id,
                fullName: user.fullName,
                email: user.email,
              }))
            : [],
          deadline: task.deadline || null,
          completed: Boolean(task.completed),
          children: task.children ? cleanTasks(task.children) : [],
          timeEntries: task.timeEntries || [],
          percentage: task.percentage || 0,
        }));
      };

      const cleanProjectData = {
        name: projectData.name || "",
        description: projectData.description || "",
        customer: {
          name: projectData.customer?.name || "",
          phone: projectData.customer?.phone || "",
          address: projectData.customer?.address || "",
        },
        tasks: cleanTasks(projectData.tasks || []),
        type: "project" as const,
        project_due_date: projectData.project_due_date || null,
      };

      await updateDoc(docRef, cleanProjectData);

      const updatedProject = {
        ...get().project,
        ...cleanProjectData,
        id,
        __id: get().project?.__id,
        createdAt: get().project?.createdAt,
      };

      set({ project: updatedProject as Project, loading: false });
    } catch (error) {
      console.error("Error updating project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteProject: async (projectId: string) => {
    try {
      set({ loading: true, error: null });
      await deleteDoc(doc(db, "projects", projectId));

      // Update local state
      const currentProjects = get().projects;
      set({
        projects: currentProjects.filter((p) => p.id !== projectId),
        loading: false,
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  getTaskByPath: async (projectId: string, taskId: string) => {
    try {
      set({ loading: true, error: null });

      // Fetch the task directly from tasks collection
      const taskDoc = await getDoc(doc(db, "tasks", taskId));
      if (!taskDoc.exists()) {
        set({ loading: false });
        return null;
      }

      const task = { ...taskDoc.data(), id: taskDoc.id } as Task;

      // Fetch subtasks
      const subtasksSnapshot = await getDocs(
        query(collection(db, "tasks"), where("parentId", "==", task.id))
      );

      const subtasks = subtasksSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Task[];

      set({
        individualTask: task,
        individualTaskSubtasks: subtasks,
        loading: false,
      });

      return task;
    } catch (error) {
      console.error("Error fetching task:", error);
      set({ error: (error as Error).message, loading: false });
      return null;
    }
  },

  addTask: async (
    projectId: string,
    parentTaskId: string | null,
    taskData: Omit<Task, "id">
  ) => {
    try {
      set({ loading: true, error: null });

      const newTask = {
        ...taskData,
        projectId,
        parentId: parentTaskId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, "tasks"), newTask);
      const taskWithId = { ...newTask, id: docRef.id } as Task;

      if (parentTaskId === get().individualTask?.id) {
        set((state) => ({
          individualTaskSubtasks: [...state.individualTaskSubtasks, taskWithId],
          loading: false,
        }));
      }

      return taskWithId;
    } catch (error) {
      console.error("Error adding task:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateTask: async (
    projectId: string,
    taskId: string,
    data: Partial<Task>
  ) => {
    try {
      set({ loading: true, error: null });

      const updateData = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, "tasks", taskId), updateData);

      // Update local state
      if (taskId === get().individualTask?.id) {
        set((state) => ({
          individualTask: { ...state.individualTask!, ...updateData },
          loading: false,
        }));
      } else {
        set((state) => ({
          individualTaskSubtasks: state.individualTaskSubtasks.map((task) =>
            task.id === taskId ? { ...task, ...updateData } : task
          ),
          loading: false,
        }));
      }
    } catch (error) {
      console.error("Error updating task:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  deleteTask: async (projectId: string, taskId: string) => {
    try {
      set({ loading: true, error: null });

      // Delete the task
      await deleteDoc(doc(db, "tasks", taskId));

      // Update local state
      if (taskId === get().individualTask?.id) {
        set({
          individualTask: null,
          individualTaskSubtasks: [],
          loading: false,
        });
      } else {
        set((state) => ({
          individualTaskSubtasks: state.individualTaskSubtasks.filter(
            (task) => task.id !== taskId
          ),
          loading: false,
        }));
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  toggleTaskCompletion: async (projectId, taskId) => {
    try {
      const task = await get().getTaskByPath(projectId, taskId);
      if (!task) throw new Error("Task not found");

      await get().updateTask(projectId, taskId, {
        completed: !task.completed,
      });
    } catch (error) {
      console.error("Error toggling task completion:", error);
      throw error;
    }
  },

  updateProjectDueDate: async (projectId, dueDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", projectId);
      await updateDoc(docRef, { project_due_date: dueDate });

      const updatedProjects = get().projects.map((project) =>
        project.id === projectId
          ? { ...project, project_due_date: dueDate }
          : project
      );

      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error("Error updating project due date:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  updateProjectStartDate: async (projectId, startDate) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", projectId);
      await updateDoc(docRef, { project_start_date: startDate });

      const updatedProjects = get().projects.map((project) =>
        project.id === projectId
          ? { ...project, project_start_date: startDate }
          : project
      );

      set({ projects: updatedProjects, loading: false });
    } catch (error) {
      console.error("Error updating project due date:", error);
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

      // Fetch all projects first
      const projectsSnapshot = await getDocs(collection(db, "projects"));
      const projects = projectsSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Project[];

      // Fetch all tasks
      const tasksSnapshot = await getDocs(collection(db, "tasks"));
      const allTasks = tasksSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Task[];

      // Filter tasks assigned to current user
      const userTasks = allTasks.filter((task) =>
        task.assignedTo?.some((user) => user.id === currentUser.uid)
      );

      set({ userTasks, loading: false, projects });
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      set({ error: (error as Error).message, loading: false });
    }
  },

  startTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error("Project not found");

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map((task) => {
          if (task.id === taskId) {
            const timeEntries = task.timeEntries || [];
            const existingUserEntry = timeEntries.find(
              (entry) => entry.userId === currentUser.uid
            );

            if (existingUserEntry) {
              // Keep the existing duration and just update start time
              const updatedEntries = timeEntries.map((entry) => {
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
                timeEntries: updatedEntries,
              };
            } else {
              // Create new entry for user
              const newEntry: TimeEntry = {
                id: crypto.randomUUID(),
                userId: currentUser.uid,
                userName: currentUser.email || "Unknown User",
                startTime: new Date().toISOString(),
                duration: 0, // Initial duration for new entries
              };
              return {
                ...task,
                timeEntries: [...timeEntries, newEntry],
              };
            }
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children),
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
          startTime: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error starting timer:", error);
      throw error;
    }
  },

  stopTimer: async (projectId: string, taskId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("User not authenticated");

      const project = await get().fetchProject(projectId);
      if (!project) throw new Error("Project not found");

      const updateTaskTimer = (tasks: Task[]): Task[] => {
        return tasks.map((task) => {
          if (task.id === taskId) {
            const timeEntries = task.timeEntries || [];
            const userEntry = timeEntries.find(
              (entry) => entry.userId === currentUser.uid
            );

            if (userEntry) {
              const elapsedDuration = calculateDurationWithDecimals(
                userEntry.startTime
              );

              const updatedEntries = timeEntries.map((entry) => {
                if (entry.userId === currentUser.uid) {
                  // Add new duration to existing duration, maintaining decimal format
                  const currentDuration = entry.duration || 0;
                  const totalMinutes =
                    Math.floor(currentDuration) + Math.floor(elapsedDuration);
                  const totalSeconds = Math.round(
                    ((currentDuration % 1) + (elapsedDuration % 1)) * 100
                  );

                  // Handle case where seconds >= 60
                  const adjustedMinutes =
                    totalMinutes + Math.floor(totalSeconds / 60);
                  const adjustedSeconds = totalSeconds % 60;

                  return {
                    ...entry,
                    duration: Number(
                      `${adjustedMinutes}.${adjustedSeconds
                        .toString()
                        .padStart(2, "0")}`
                    ),
                  };
                }
                return entry;
              });

              return {
                ...task,
                timeEntries: updatedEntries,
              };
            }
            return task;
          }
          if (task.children && task.children.length > 0) {
            return {
              ...task,
              children: updateTaskTimer(task.children),
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
          startTime: null,
        },
      });
    } catch (error) {
      console.error("Error stopping timer:", error);
      throw error;
    }
  },

  getTaskTimeEntries: async (projectId: string, taskId: string) => {
    try {
      const project = await get().fetchProject(projectId);
      if (!project) throw new Error("Project not found");

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
      console.error("Error getting task time entries:", error);
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
            startTime: null,
          },
        });
        return;
      }

      const querySnapshot = await getDocs(collection(db, "projects"));
      let foundActiveTimer = false;

      for (const projectDoc of querySnapshot.docs) {
        const projectData = projectDoc.data();
        const tasks = projectData.tasks || [];

        const findActiveTimer = (tasks: Task[]): boolean => {
          for (const task of tasks) {
            const timeEntries = task.timeEntries || [];
            const lastEntry = timeEntries[timeEntries.length - 1];

            if (lastEntry && lastEntry.userId === currentUser.uid) {
              set({
                activeTimer: {
                  taskId: task.id,
                  projectId: projectDoc.id,
                  startTime: lastEntry.startTime,
                },
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
            startTime: null,
          },
        });
      }
    } catch (error) {
      console.error("Error checking active timer:", error);
      set({
        activeTimer: {
          taskId: null,
          projectId: null,
          startTime: null,
        },
      });
    }
  },

  updateProjectStatus: async (
    status: "completed" | "ongoing" | "not-started",
    projectId: string
  ) => {
    try {
      set({ loading: true, error: null });
      const docRef = doc(db, "projects", projectId);
      await updateDoc(docRef, { status });

      set({
        loading: false,
        project: {
          ...get().project,
          status,
        } as Project,
      });
    } catch (error) {
      console.error("Error updating project status:", error);
      set({ error: (error as Error).message, loading: false });
      throw error;
    }
  },

  formatDuration: (duration: number) => {
    const minutes = Math.floor(duration);
    const seconds = Math.round((duration % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  },
}));
