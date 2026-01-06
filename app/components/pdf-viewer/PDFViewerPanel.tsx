"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { usePDFViewer } from "./PDFViewerContext";
import { PDFViewerToolbar } from "./PDFViewerToolbar";
import { escapeRegExp } from "~/lib/pdf-link-parser";

// Types for react-pdf components
type DocumentProps = {
  file: string;
  onLoadSuccess: (data: { numPages: number }) => void;
  loading: React.ReactNode;
  error: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

type PageProps = {
  pageNumber: number;
  width: number;
  customTextRenderer?: (textItem: { str: string }) => string;
  className?: string;
  onRenderSuccess?: () => void;
};

// Store scroll positions per file (persists across opens)
const scrollPositions = new Map<string, number>();

export function PDFViewerPanel() {
  const {
    isOpen,
    file,
    page,
    totalPages,
    highlight,
    scrollToPage,
    closePDF,
    setPage,
    setTotalPages,
    clearScrollRequest,
  } = usePDFViewer();

  const [containerWidth, setContainerWidth] = useState(500);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1);
  const [pdfComponents, setPdfComponents] = useState<{
    Document: React.ComponentType<DocumentProps>;
    Page: React.ComponentType<PageProps>;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const initialScrollDone = useRef(false);
  const lastFile = useRef<string | null>(null);

  // Load react-pdf dynamically on client
  useEffect(() => {
    if (typeof window === "undefined") return;

    import("react-pdf").then((mod) => {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url
      ).toString();
      setPdfComponents({
        Document: mod.Document as any,
        Page: mod.Page as any,
      });
    });

    // Import CSS
    import("react-pdf/dist/Page/TextLayer.css");
    import("react-pdf/dist/Page/AnnotationLayer.css");
  }, []);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closePDF();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closePDF]);

  // Resize observer for responsive PDF width
  useEffect(() => {
    if (!isOpen) return;

    const updateWidth = () => {
      // On desktop (md+), panel is 50% of screen; on mobile it's full width
      const isMd = window.innerWidth >= 768;
      const panelWidth = isMd ? window.innerWidth * 0.5 : window.innerWidth;
      setContainerWidth(panelWidth - 48); // Account for padding
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isOpen]);


  // Reset initial scroll flag when file changes (synchronous check)
  if (file !== lastFile.current) {
    initialScrollDone.current = false;
    lastFile.current = file;
  }

  // Scroll to initial page or restore position when PDF loads
  useEffect(() => {
    if (!isOpen || !totalPages || initialScrollDone.current) return;

    // Wait a bit for pages to render
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      // Check if we have a saved scroll position for this file
      const savedPosition = scrollPositions.get(file || "");

      // Only restore saved position if no specific page was requested
      if (savedPosition !== undefined && page === 1 && !scrollToPage) {
        container.scrollTop = savedPosition;
      } else {
        // Scroll to the requested page
        const targetPage = scrollToPage || page;
        const pageElement = pageRefs.current.get(targetPage);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }

      initialScrollDone.current = true;

      // Clear scroll request after initial scroll
      if (scrollToPage) {
        clearScrollRequest();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, page, totalPages, file, scrollToPage, clearScrollRequest]);

  // Handle scroll requests from link clicks when PDF is already open and loaded
  useEffect(() => {
    // Only handle if PDF is already loaded and we have a new scroll request
    if (!scrollToPage || !totalPages || !initialScrollDone.current) return;

    const pageElement = pageRefs.current.get(scrollToPage);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Clear the request after handling
    clearScrollRequest();
  }, [scrollToPage, totalPages, clearScrollRequest]);

  // Track visible page on scroll and save scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !totalPages || !file) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerTop = containerRect.top;

      let closestPage = 1;
      let closestDistance = Infinity;

      pageRefs.current.forEach((element, pageNum) => {
        const rect = element.getBoundingClientRect();
        const distance = Math.abs(rect.top - containerTop);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNum;
        }
      });

      setCurrentVisiblePage(closestPage);

      // Save scroll position on each scroll
      scrollPositions.set(file, container.scrollTop);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [totalPages, file]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
    },
    [setTotalPages]
  );

  // Custom text renderer for highlighting
  const textRenderer = useCallback(
    (textItem: { str: string }) => {
      if (!highlight) return textItem.str;

      const regex = new RegExp(`(${escapeRegExp(highlight)})`, "gi");
      return textItem.str.replace(
        regex,
        '<mark class="bg-yellow-300/50 text-zinc-900 rounded px-0.5">$1</mark>'
      );
    },
    [highlight]
  );

  // Store page ref
  const setPageRef = useCallback((pageNum: number, element: HTMLDivElement | null) => {
    if (element) {
      pageRefs.current.set(pageNum, element);
    } else {
      pageRefs.current.delete(pageNum);
    }
  }, []);

  // Handle page selection from toolbar
  const handlePageSelect = useCallback((pageNum: number) => {
    const pageElement = pageRefs.current.get(pageNum);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (!isOpen || !file) return null;

  const pdfUrl = `/pdfs/${file}`;
  const { Document, Page } = pdfComponents || {};

  return (
    <>
      {/* Backdrop - only on mobile */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden"
        onClick={closePDF}
        aria-hidden="true"
      />

      {/* Panel - fixed height, doesn't affect page layout */}
      <div
        className="fixed right-0 top-0 h-screen w-full z-50 md:w-1/2 bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 md:animate-none"
        role="dialog"
        aria-modal="true"
        aria-label="PDF Viewer"
      >
        {/* Toolbar */}
        <PDFViewerToolbar
          fileName={file}
          currentPage={currentVisiblePage}
          totalPages={totalPages}
          onClose={closePDF}
          onPageSelect={handlePageSelect}
        />

        {/* PDF Content - scrollable container with all pages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4"
        >
          {!pdfComponents ? (
            <div className="flex items-center justify-center h-64 text-zinc-500 font-mono text-sm">
              Loading PDF viewer...
            </div>
          ) : (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-64 text-zinc-500 font-mono text-sm">
                  Loading PDF...
                </div>
              }
              error={
                <div className="flex items-center justify-center h-64 text-red-400 font-mono text-sm">
                  Failed to load PDF
                </div>
              }
              className="flex flex-col items-center gap-4"
            >
              {Array.from({ length: totalPages }, (_, index) => (
                <div
                  key={index + 1}
                  ref={(el) => setPageRef(index + 1, el)}
                  className="shrink-0"
                >
                  <Page
                    pageNumber={index + 1}
                    width={containerWidth}
                    customTextRenderer={textRenderer}
                    className="shadow-lg"
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>
    </>
  );
}
