import { IoClose, IoDownloadOutline } from "react-icons/io5";
import { VscFilePdf } from "react-icons/vsc";

interface PDFViewerToolbarProps {
  fileName: string;
  currentPage: number;
  totalPages: number;
  onClose: () => void;
  onPageSelect: (page: number) => void;
}

export function PDFViewerToolbar({
  fileName,
  currentPage,
  totalPages,
  onClose,
  onPageSelect,
}: PDFViewerToolbarProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `/pdfs/${fileName}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const page = parseInt(e.target.value, 10);
    onPageSelect(page);
  };

  return (
    <div className="font-mono text-xs flex shrink-0">
      <span className="bg-emerald-400 text-background px-2 py-1 font-bold flex items-center gap-1">
        <VscFilePdf className="text-sm" />
        PDF
      </span>
      <span className="bg-secondary text-card-foreground px-2 py-1 truncate flex-1 flex items-center gap-2">
        <span className="truncate">{fileName}</span>
        {totalPages > 0 && (
          <span className="text-muted-foreground flex items-center gap-1 shrink-0">
            <select
              value={currentPage}
              onChange={handlePageChange}
              className="bg-muted text-card-foreground px-1 py-0.5 rounded border-none outline-none cursor-pointer hover:bg-secondary"
              aria-label="Select page"
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <span>/ {totalPages}</span>
          </span>
        )}
      </span>
      <button
        onClick={handleDownload}
        className="bg-muted hover:bg-secondary text-card-foreground px-2 py-1 transition-colors flex items-center"
        aria-label="Download PDF"
      >
        <IoDownloadOutline className="text-sm" />
      </button>
      <button
        onClick={onClose}
        className="bg-muted hover:bg-secondary text-card-foreground px-2 py-1 transition-colors flex items-center border-l border-border"
        aria-label="Close PDF viewer"
      >
        <IoClose className="text-sm" />
      </button>
    </div>
  );
}
