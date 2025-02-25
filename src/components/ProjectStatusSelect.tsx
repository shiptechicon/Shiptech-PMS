import { Project } from "@/store/projectStore";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

const ProjectStatusSelect = ({
  project,
  updateProjectStatus,
}: {
  project: Project;
  updateProjectStatus?: (
    status: "completed" | "not-started" | "ongoing",
    id: string
  ) => Promise<void>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative inline-block w-40" ref={dropdownRef}>
      {/* Selected Status (Badge) */}
      <div
        className={`${updateProjectStatus ? 'cursor-pointer text-base' : 'text-[12px]'} flex items-center gap-1 w-fit min-w-28 justify-center  px-4 py-2 rounded-full text-sm text-center transition-all ${selected.color}`}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute mt-2 w-full bg-white shadow-md rounded-md border border-gray-200 z-10">
          {statusOptions.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-2 cursor-pointer text-sm transition-all hover:bg-gray-100 ${option.color}`}
              onClick={async () => {
                if (updateProjectStatus) {
                  await updateProjectStatus(
                    option.value as "completed" | "not-started" | "ongoing",
                    project.id ?? ""
                  );
                  setSelected(option);
                  setIsOpen(false);
                }
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectStatusSelect;
