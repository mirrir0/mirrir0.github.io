import { useState, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { FileText, Pencil, Trash2, Check, X } from "lucide-react";
import { usePDFViewer } from "~/components/pdf-viewer/PDFViewerContext";

export default function PDFLinkNodeView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const { file, page, highlight, label } = node.attrs;
  const { openPDF } = usePDFViewer();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Default display text: label or filename with page
  const defaultDisplayText = page && page !== 1 ? `${file}:${page}` : file;
  const displayText = label || defaultDisplayText;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!isEditing && file) {
      openPDF(file, page || 1, highlight || null);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(displayText || "");
    setIsEditing(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode();
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newLabel = editValue.trim();
    // If label matches default, clear it; otherwise save
    if (newLabel === defaultDisplayText || newLabel === "") {
      updateAttributes({ label: null });
    } else {
      updateAttributes({ label: newLabel });
    }
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave(e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel(e as unknown as React.MouseEvent);
    }
  };

  if (isEditing) {
    return (
      <NodeViewWrapper as="span" className="inline-block align-baseline">
        <span className="bg-secondary border border-emerald-400 rounded px-2 py-0.5 inline-flex items-center gap-1">
          <FileText size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="relative inline-block">
            {/* Hidden span to measure text width */}
            <span className="invisible whitespace-pre font-mono text-sm px-0.5">
              {editValue || " "}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="absolute inset-0 bg-transparent text-emerald-400 font-mono text-sm outline-none w-full"
              onClick={(e) => e.stopPropagation()}
            />
          </span>
          <button
            type="button"
            onClick={handleSave}
            className="text-emerald-400 hover:text-emerald-300 p-0.5"
          >
            <Check size={12} />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="text-card-foreground hover:text-card-foreground p-0.5"
          >
            <X size={12} />
          </button>
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="inline-block align-baseline max-w-full">
      <span
        className="relative inline-flex items-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Invisible bridge to toolbar */}
        {isHovered && <span className="absolute -top-2 left-0 w-full h-2" />}

        <button
          type="button"
          onClick={handleClick}
          className="bg-secondary border border-border rounded px-2 py-0.5 inline-flex items-center gap-1 cursor-pointer hover:bg-muted transition-colors max-w-full"
        >
          <FileText size={14} className="text-emerald-400 flex-shrink-0" />
          <span className="text-emerald-400 font-mono text-sm truncate" title={displayText}>
            {displayText}
          </span>
        </button>

        {isHovered && (
          <span className="absolute -top-8 left-0 pb-2 z-10">
            <span className="flex items-center gap-0.5 bg-card border border-border rounded px-1 py-0.5 shadow-lg">
              <button
                type="button"
                onClick={handleEdit}
                className="text-card-foreground hover:text-foreground p-1 rounded hover:bg-secondary transition-colors"
                title="Edit label"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="text-card-foreground hover:text-red-400 p-1 rounded hover:bg-secondary transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </span>
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}
