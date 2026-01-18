import { useState, useEffect } from "react";
import { FileText, Search, Loader2 } from "lucide-react";

interface PdfInfo {
  filename: string;
  size: number;
  modifiedAt: string;
}

interface DocumentListProps {
  onSelect: (filename: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DocumentList({ onSelect }: DocumentListProps) {
  const [pdfs, setPdfs] = useState<PdfInfo[]>([]);
  const [filteredPdfs, setFilteredPdfs] = useState<PdfInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPdfs() {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/list-pdfs");
        if (!response.ok) {
          throw new Error("Failed to fetch PDFs");
        }
        const data = await response.json();
        setPdfs(data);
        setFilteredPdfs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load PDFs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPdfs();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPdfs(pdfs);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPdfs(
        pdfs.filter((pdf) => pdf.filename.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, pdfs]);

  const handleSelect = (filename: string) => {
    setSelectedFile(filename);
    onSelect(filename);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          size={16}
        />
        <input
          type="text"
          placeholder="Search PDFs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition-colors"
        />
      </div>

      <div className="max-h-72 overflow-y-auto -mx-1 px-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {filteredPdfs.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="mx-auto text-zinc-600 mb-3" size={32} />
            <p className="text-zinc-500 text-sm">
              {pdfs.length === 0 ? "No PDFs uploaded yet" : "No matching PDFs"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredPdfs.map((pdf) => (
              <button
                key={pdf.filename}
                type="button"
                onClick={() => handleSelect(pdf.filename)}
                className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer text-left transition-all w-full ${
                  selectedFile === pdf.filename
                    ? "bg-emerald-400/10 ring-1 ring-emerald-400"
                    : "hover:bg-zinc-800/70"
                }`}
              >
                <div className="flex-shrink-0">
                  <FileText
                    size={18}
                    className={
                      selectedFile === pdf.filename
                        ? "text-emerald-400"
                        : "text-zinc-500"
                    }
                  />
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p
                    className="text-zinc-300 truncate font-mono text-sm leading-tight"
                    title={pdf.filename}
                  >
                    {pdf.filename}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {formatFileSize(pdf.size)} · {formatDate(pdf.modifiedAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
