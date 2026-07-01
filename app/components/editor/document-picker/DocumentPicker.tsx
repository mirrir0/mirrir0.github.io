import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import DocumentList from "./DocumentList";
import DocumentUpload from "./DocumentUpload";

type TabType = "search" | "upload";

interface DocumentPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: string, page?: number) => void;
  defaultTab?: "search" | "upload";
}

export default function DocumentPicker({
  isOpen,
  onClose,
  onSelect,
  defaultTab = "search",
}: DocumentPickerProps) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Sync activeTab with defaultTab when it changes (e.g., when opening from different slash commands)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  const handleSelect = (filename: string, page?: number) => {
    onSelect(filename, page);
    onClose();
  };

  const handleUploadComplete = (filename: string) => {
    // After upload, select the newly uploaded file with default page 1
    handleSelect(filename, 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-card border border-border rounded-lg shadow-2xl w-[calc(100%-2rem)] max-w-md sm:max-w-lg"
        showCloseButton={true}
      >
        <DialogHeader className="pb-0">
          <DialogTitle className="text-foreground font-mono text-base">
            Select Document
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border -mx-6 px-6">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2.5 text-sm font-mono transition-colors ${
              activeTab === "search"
                ? "text-emerald-400 border-b-2 border-emerald-400 -mb-px"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2.5 text-sm font-mono transition-colors ${
              activeTab === "upload"
                ? "text-emerald-400 border-b-2 border-emerald-400 -mb-px"
                : "text-muted-foreground hover:text-card-foreground"
            }`}
          >
            Upload
          </button>
        </div>

        {/* Tab Content */}
        <div className="pt-2 min-h-0 overflow-hidden">
          {activeTab === "search" ? (
            <DocumentList onSelect={handleSelect} />
          ) : (
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
