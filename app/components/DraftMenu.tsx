import { useState, useRef, useEffect, useCallback } from "react";
import { MoreVertical } from "lucide-react";

interface DraftMenuProps {
  onPublish: () => void;
  onDelete: () => void;
  variant?: "statusline" | "list";
  disabled?: boolean;
  publishLabel?: string;
}

export function DraftMenu({
  onPublish,
  onDelete,
  variant = "list",
  disabled = false,
  publishLabel = "Publish",
}: DraftMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pubState, setPubState] = useState<"idle" | "publishing" | "error">("idle");
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handlePublish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    onPublish();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(false);
    onDelete();
  };

  const isStatusline = variant === "statusline";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={
          isStatusline
            ? "bg-zinc-700 text-zinc-300 px-2 h-full hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            : "p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        }
        aria-label="Draft actions"
      >
        <MoreVertical size={isStatusline ? 14 : 18} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 bg-zinc-800 border border-zinc-700 rounded shadow-lg py-1 min-w-[120px] top-full right-0 mt-1"
        >
          <button
            onClick={handlePublish}
            className="w-full text-left px-3 py-1.5 text-sm font-mono text-zinc-300 hover:bg-zinc-700 hover:text-emerald-400 transition-colors"
          >
            {publishLabel}
          </button>
          <button
            onClick={handleDelete}
            className="w-full text-left px-3 py-1.5 text-sm font-mono text-zinc-300 hover:bg-zinc-700 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
