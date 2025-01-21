import React, { useState, useEffect, useRef } from 'react';
import { useCommentStore } from '../store/commentStore';
import { Loader2, Send, Paperclip, X, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadToCloudinary } from '../lib/cloudinary';

interface ProjectCommentsProps {
  projectId: string;
}

export default function ProjectComments({ projectId }: ProjectCommentsProps) {
  const { comments, loading, fetchComments, addComment } = useCommentStore();
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments(projectId);
  }, [projectId, fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      let attachmentUrl: string | null = null;

      if (selectedFile) {
        try {
          setUploadProgress(50);
          attachmentUrl = await uploadToCloudinary(selectedFile);
          setUploadProgress(100);
        } catch (uploadError) {
          toast.error('Failed to upload file. Please try again.');
          setUploadProgress(0);
          return;
        }
      }

      try {
        await addComment(projectId, newComment, attachmentUrl);
        setNewComment('');
        setSelectedFile(null);
        setUploadProgress(0);
        toast.success('Comment added successfully');
      } catch (commentError) {
        toast.error('Failed to add comment. Please try again.');
      }
    } catch (error) {
      console.error('Error in comment submission:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size should be less than 10MB');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload a PDF, image, or document.');
        return;
      }

      setSelectedFile(file);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getFileIcon = (url: string) => {
    const extension = url.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) {
      return <FileText className="h-4 w-4" />;
    }
    return <Paperclip className="h-4 w-4" />;
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
      </div>

      <div className="p-6">
        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {selectedFile && (
            <div className="mb-4">
              <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded">
                <span className="text-sm text-blue-700">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-blue-700 hover:text-blue-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {uploadProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              disabled={submitting}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Attach File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
            />

            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Comment
            </button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-800 font-medium">
                        {comment.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{comment.user.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(comment.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                  {comment.attachmentUrl && (
                    <div className="mt-2">
                      <button
                        onClick={() => handleDownload(comment.attachmentUrl!)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-md"
                      >
                        {getFileIcon(comment.attachmentUrl)}
                        <span className="ml-2">View Attachment</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}