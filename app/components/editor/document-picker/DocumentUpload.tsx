import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface DocumentUploadProps {
  onUploadComplete: (filename: string) => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    // Validate file type
    if (file.type !== "application/pdf") {
      setUploadStatus("error");
      setErrorMessage("Only PDF files are allowed");
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus("error");
      setErrorMessage("File too large. Maximum size is 10MB.");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress since fetch doesn't support upload progress natively
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await response.json();
      setUploadProgress(100);
      setUploadStatus("success");
      setUploadedFilename(data.filename);
      onUploadComplete(data.filename);
    } catch (err) {
      setUploadStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  const handleClick = () => {
    if (uploadStatus !== "uploading") {
      fileInputRef.current?.click();
    }
  };

  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    setUploadedFilename(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-400 bg-emerald-400/5"
            : uploadStatus === "error"
            ? "border-red-400/50 hover:border-red-400"
            : uploadStatus === "success"
            ? "border-emerald-400/50"
            : "border-border hover:border-border hover:bg-secondary/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadStatus === "idle" && (
          <>
            <Upload className="mx-auto text-card-foreground mb-3" size={32} />
            <p className="text-card-foreground mb-1">
              Drag and drop a PDF here, or click to select
            </p>
            <p className="text-muted-foreground text-sm">Maximum file size: 10MB</p>
          </>
        )}

        {uploadStatus === "uploading" && (
          <>
            <Loader2 className="mx-auto text-emerald-400 mb-3 animate-spin" size={32} />
            <p className="text-card-foreground mb-2">Uploading...</p>
            <div className="w-full max-w-xs mx-auto bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-400 h-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        )}

        {uploadStatus === "success" && (
          <>
            <CheckCircle className="mx-auto text-emerald-400 mb-3" size={32} />
            <p className="text-emerald-400 mb-1">Upload complete!</p>
            <p className="text-card-foreground text-sm font-mono">{uploadedFilename}</p>
          </>
        )}

        {uploadStatus === "error" && (
          <>
            <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
            <p className="text-red-400 mb-1">{errorMessage}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetUpload();
              }}
              className="text-card-foreground text-sm hover:text-card-foreground underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {uploadStatus === "success" && (
        <button
          type="button"
          onClick={resetUpload}
          className="text-card-foreground text-sm hover:text-card-foreground"
        >
          Upload another file
        </button>
      )}
    </div>
  );
}
