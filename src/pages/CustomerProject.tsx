import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectComments from '../components/ProjectComments';

interface Task {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  children: Task[];
}

interface Project {
  id: string;
  __id: string;
  name: string;
  description: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  tasks: Task[];
  createdAt: string;
  project_due_date?: string;
}

export default function CustomerProject() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const loadCustomerProject = async () => {
      try {
        if (!user) {
          navigate('/login');
          return;
        }

        // Get user data to check role and project ID
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        if (!userData || userData.role !== 'customer') {
          navigate('/dashboard');
          return;
        }

        // Get project data
        const projectDoc = await getDoc(doc(db, 'projects', userData.projectId));
        if (projectDoc.exists()) {
          setProject({
            ...projectDoc.data() as Project,
            id: projectDoc.id
          });
        } else {
          toast.error('Project not found');
        }
      } catch (error) {
        console.error('Error loading project:', error);
        toast.error('Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadCustomerProject();
  }, [user, navigate]);

  const calculateTaskProgress = (tasks: Task[]): { completed: number; total: number } => {
    let completed = 0;
    const total = tasks.length;

    for (const task of tasks) {
      if (task.completed) {
        completed++;
      }
    }

    return { completed, total };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-red-500">Project not found</p>
      </div>
    );
  }

  const { completed, total } = calculateTaskProgress(project.tasks);
  const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Project Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-2 capitalize">{project.name}</h1>
          <p className="text-gray-600 mb-4">{project.description}</p>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-gray-600">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {completed} of {total} main tasks completed
            </p>
          </div>
        </div>

        {/* Project Details */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Project Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Project ID</p>
              <p className="mt-1">{project.__id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="mt-1">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            {project.project_due_date && (
              <div>
                <p className="text-sm font-medium text-gray-500">Due Date</p>
                <p className="mt-1">{new Date(project.project_due_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Main Tasks</h2>
          <div className="space-y-4">
            {project.tasks.map(task => (
              <div 
                key={task.id}
                className="border rounded-lg p-4 hover:border-blue-100 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{task.name}</h3>
                    {task.description && (
                      <p className="text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    task.completed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {task.completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6">
          <ProjectComments projectId={project.id} />
        </div>
      </div>
    </div>
  );
}