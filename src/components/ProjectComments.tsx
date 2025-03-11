import React, { useState, useEffect, useRef } from "react";
import { useCommentStore } from "../store/commentStore";
import {
  Loader2,
  Send,
  Paperclip,
  X,
  // FileText,
  Download,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadCommentFilesToGitHub } from "@/lib/githubComments";

interface ProjectCommentsProps {
  projectId: string;
}

export default function ProjectComments({ projectId }: ProjectCommentsProps) {
  const { comments, loading, fetchComments, addComment } = useCommentStore();
  const {  user , userData } = useAuthStore();
  const [newComment, setNewComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projectId && userData?.role) {
      fetchComments(projectId, userData.role);
    }
  }, [projectId, userData?.role, fetchComments]);

  useEffect(() => {
    const checkUserRole = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        setIsAdmin(userData?.role === "admin");
        setIsMember(userData?.role === "member");
      }
    };
    checkUserRole();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const attachments: { url: string; name: string }[] = [];

      // Upload files one by one
      if (selectedFiles.length > 0 ) {
        try {
          // Use the new upload function
          console.log("before github upload ",selectedFiles,projectId)
          const uploadedFiles = await uploadCommentFilesToGitHub(selectedFiles, projectId, comments.length);
          console.log("after upload : ",uploadedFiles)
          attachments.push(...uploadedFiles);
        } catch (uploadError) {
          console.error("Failed to upload files:", uploadError);
          toast.error("Failed to upload files. Please try again.");
          setUploadProgress(selectedFiles.map(() => 0)); // Reset progress on error
          return;
        }
      }

      // Add the comment with attachment URLs and names
      try {
        await addComment(projectId, newComment, userData?.role as string, attachments);
        setNewComment(""); // Clear the comment input
        setSelectedFiles([]); // Clear the selected files
        setUploadProgress([]); // Reset the upload progress
        toast.success("Comment added successfully");
      } catch (commentError) {
        console.error("Failed to add comment:", commentError);
        toast.error("Failed to add comment. Please try again.");
      }
    } catch (error) {
      console.error("Error in comment submission:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false); // Reset the submitting state
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {

    const files = e.target.files;
    if (files) {
      // if (files.length > 10) {
      //   toast.error("You can upload a maximum of 5 files");
      //   return;
      // }

      const validFiles = Array.from(files).filter((file) => {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`File ${file.name} size should be less than 50MB`);
          return false;
        }

        const allowedTypes = [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain",
        ];

        if (!allowedTypes.includes(file.type)) {
          toast.error(
            `Invalid file type for ${file.name}. Please upload a PDF, image, or document.`
          );
          return false;
        }

        return true;
      });

      // Append new files to the existing selected files
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setUploadProgress((prev) => [...prev, ...validFiles.map(() => 0)]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // const getFileIcon = (url: string) => {
  //   const extension = url.split(".").pop()?.toLowerCase();
  //   if (["pdf"].includes(extension || "")) {
  //     return <FileText className="h-4 w-4" />;
  //   }
  //   return <Paperclip className="h-4 w-4" />;
  // };

  // const handleOpenPdf = (url: string) => {
  //   const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
  //     url
  //   )}&embedded=true`;
  //   window.open(viewerUrl, "_blank");
  // };

  const getRevisionNumber = (index: number) => {
    const commentsWithAttachments = comments.filter(
      (comment) => comment.attachments && comment.attachments.length > 0
    );
    const totalRevisions = commentsWithAttachments.length;
    
    // Find position of current comment in the filtered array
    const currentComment = comments[index];
    if (currentComment.attachments && currentComment.attachments.length > 0) {
      const position = commentsWithAttachments.findIndex(
        (comment) => comment.id === currentComment.id
      );
      return totalRevisions - position; // Reverse the order
    }
    return null;
  };

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.name !== fileName));
    setUploadProgress((prev) => {
      const index = selectedFiles.findIndex((file) => file.name === fileName);
      const newProgress = [...prev];
      newProgress.splice(index, 1);
      return newProgress;
    });
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
              className="w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={file.name}
                  className="flex items-center space-x-2 bg-black/90 p-2 rounded"
                >
                  <span className="text-sm text-white">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.name)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {uploadProgress[index] > 0 && (
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[index]}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            {(
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={submitting}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Attach Files
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              multiple
            />

            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-black/90 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
        <div className="grid gap-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-black" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No comments yet</p>
          ) : (
            comments.map((comment, cmtIndex) => {

              const revisionNumber = getRevisionNumber(cmtIndex);

              return (
                <div
                  key={comment.id}
                  className="border-[1px] p-6 rounded-xl bg-gray-50"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-black/90 flex items-center justify-center">
                        <span className="text-white font-medium">
                          {comment.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {comment.user.name}
                          <span>
                            {(comment?.attachments?.length ?? 0) > 0 &&
                              ` - Revision ${revisionNumber}`}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-black whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-5 flex gap-3 flex-wrap">
                        {comment.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-zinc-800 p-3 rounded-full w-fit gap-5"
                          >
                            <span className="text-sm text-white">
                              {attachment.name}
                            </span>
                            {(isAdmin || isMember || cmtIndex == 0) && (
                              <div className="flex space-x-3 flex-1">
                                <a
                                  target="_blank"
                                  href={
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("png") &&
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("jpg") &&
                                    !attachment.name
                                      .toLowerCase()
                                      .includes("jpeg")
                                      ? `https://docs.google.com/viewer?url=${encodeURIComponent(
                                          attachment.url
                                        )}&embedded=true`
                                      : attachment.url
                                  }
                                  // onClick={() => handleOpenPdf(attachment.url)}
                                  className="text-white hover:text-white/80"
                                >
                                  <Eye className="h-4 w-4" />
                                </a>
                                <button
                                  onClick={() =>
                                    handleDownload(
                                      attachment.url,
                                      attachment.name
                                    )
                                  }
                                  className="text-white hover:text-white/80"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
