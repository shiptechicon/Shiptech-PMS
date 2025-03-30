import { Task, useTaskStore } from "../store/taskStore";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import CompletionSummaryModal from "./CompletionSummaryModal";
import { toast } from "react-hot-toast";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

const statusOptions = [
  {
    value: "completed",
    label: "Completed",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "not-started",
    label: "Not Started",
    color: "bg-red-100 text-red-700",
  },
  { value: "ongoing", label: "Ongoing", color: "bg-blue-100 text-blue-700" },
];

interface ProjectStatusSelectProps {
  project: {
    id: string;
    status: "completed" | "ongoing" | "not-started";
  };
  updateProjectStatus?: (
    projectId: string,
    status: "completed" | "ongoing" | "not-started"
  ) => Promise<void>;
  tasks?: Task[];
}

const ProjectStatusSelect = ({
  project,
  updateProjectStatus,
  tasks = [],
}: ProjectStatusSelectProps) => {
  const { fetchAllTasksWithChildren } = useTaskStore();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(statusOptions[1]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const currentStatus =
      statusOptions.find((s) => s.value == project?.status) ?? statusOptions[1];

    setSelected(currentStatus);

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [project]);

  const handleStatusChange = async (option: (typeof statusOptions)[0]) => {
    if (option.value === "completed") {
      // Check if all tasks are completed

      const allTasks = await fetchAllTasksWithChildren(project.id);

      const hasUncompletedTasks = allTasks.some((task) => {
        const checkTaskCompletion = (t: Task): boolean => {
          if (!t.completed) return true;
          if (t.children && t.children.length > 0) {
            return t.children.some(checkTaskCompletion);
          }
          return false;
        };
        return checkTaskCompletion(task);
      });

      if (hasUncompletedTasks) {
        toast.error(
          "All tasks must be completed before marking project as complete"
        );
        return;
      }

      setShowCompletionModal(true);
    }

    if (updateProjectStatus && project.id) {
      await updateProjectStatus(
        project.id,
        option.value as "completed" | "ongoing" | "not-started"
      );
    }

    setSelected(option);
    setIsOpen(false);
  };

  return (
    <>
      <div className="relative inline-block" ref={dropdownRef}>
        {/* Selected Status (Badge) */}
        <div className="flex gap-3">
          <div
            className={`${
              updateProjectStatus ? "cursor-pointer text-base" : "text-[12px]"
            } flex items-center gap-1 justify-center px-4 py-2 rounded-2xl text-sm text-center transition-all ${
              selected.color
            }`}
            onClick={() => {
              if (updateProjectStatus) setIsOpen(!isOpen);
            }}
          >
            {selected.label}

            {updateProjectStatus && (
              <ChevronDown
                className={`${isOpen ? "rotate-180" : ""} transition-all`}
                size={20}
              />
            )}
          </div>
          {window.location.pathname !== "/dashboard/projects" && project.status === "completed" && (
            <button onClick={() => setShowCompletionModal(!showCompletionModal)} className="px-3 py-2 bg-blue-600 rounded-2xl text-white">
              Show Time Status
            </button>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute mt-2 w-full bg-white shadow-md rounded-md border border-gray-200 z-10">
            {statusOptions.map((option) => (
              <div
                key={option.value}
                className={`px-4 py-2 cursor-pointer text-sm transition-all hover:bg-gray-100 ${option.color}`}
                onClick={() => handleStatusChange(option)}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <CompletionSummaryModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          // Reset selected status if user cancels
          setSelected(
            statusOptions.find((s) => s.value === project.status) ||
              statusOptions[1]
          );
        }}
        onComplete={async () => {
          setShowCompletionModal(false);
        }}
        tasks={tasks}
      />
    </>
  );
};

export default ProjectStatusSelect;
