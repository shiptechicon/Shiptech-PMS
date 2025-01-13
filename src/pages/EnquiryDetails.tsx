import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEnquiryStore } from '../store/enquiryStore';
import { useProjectStore } from '../store/projectStore';
import { Loader2, Pencil, FileDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

export default function EnquiryDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEnquiry, deleteEnquiry } = useEnquiryStore();
  const { createProject } = useProjectStore();
  const [enquiry, setEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadEnquiry = async () => {
      if (id) {
        const data = await fetchEnquiry(id);
        setEnquiry(data);
        setLoading(false);
      }
    };

    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === 'admin');
      }
    };

    loadEnquiry();
    checkUserRole();
  }, [id, user, fetchEnquiry]);

  const handleConvertToProject = async () => {
    try {
      if (!enquiry) return;
      
      // Create new project
      const projectData = {
        ...enquiry,
        type: 'project'
      };
      await createProject(projectData);
      
      // Delete original enquiry
      if (id) {
        await deleteEnquiry(id);
      }
      
      toast.success('Successfully converted to project');
      navigate('/dashboard/projects');
    } catch (error) {
      toast.error('Failed to convert to project');
    }
  };

  // ... rest of the component code remains the same ...
}