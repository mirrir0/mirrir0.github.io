import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface PDFViewerState {
  isOpen: boolean;
  file: string | null;
  page: number;
  totalPages: number;
  highlight: string | null;
  scrollToPage: number | null; // Page requested by link click
}

interface PDFViewerContextValue extends PDFViewerState {
  openPDF: (file: string, page?: number, highlight?: string | null) => void;
  closePDF: () => void;
  setPage: (page: number) => void;
  setTotalPages: (total: number) => void;
  clearScrollRequest: () => void;
}

// Export for layout to check if panel is open
export { type PDFViewerContextValue };

const PDFViewerContext = createContext<PDFViewerContextValue | null>(null);

export function PDFViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PDFViewerState>({
    isOpen: false,
    file: null,
    page: 1,
    totalPages: 0,
    highlight: null,
    scrollToPage: null,
  });

  const openPDF = useCallback(
    (file: string, page = 1, highlight: string | null = null) => {
      setState((prev) => {
        // If same file is already open, just update scroll request
        if (prev.isOpen && prev.file === file) {
          return { ...prev, scrollToPage: page, highlight };
        }
        // Otherwise open new file
        return { isOpen: true, file, page, totalPages: 0, highlight, scrollToPage: page };
      });
    },
    []
  );

  const closePDF = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, scrollToPage: null }));
  }, []);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const setTotalPages = useCallback((totalPages: number) => {
    setState((prev) => ({ ...prev, totalPages }));
  }, []);

  const clearScrollRequest = useCallback(() => {
    setState((prev) => ({ ...prev, scrollToPage: null }));
  }, []);

  return (
    <PDFViewerContext.Provider
      value={{ ...state, openPDF, closePDF, setPage, setTotalPages, clearScrollRequest }}
    >
      {children}
    </PDFViewerContext.Provider>
  );
}

export function usePDFViewer() {
  const context = useContext(PDFViewerContext);
  if (!context) {
    // Return safe defaults when context is not available (e.g., during SSR)
    return {
      isOpen: false,
      file: null,
      page: 1,
      totalPages: 0,
      highlight: null,
      scrollToPage: null,
      openPDF: () => {},
      closePDF: () => {},
      setPage: () => {},
      setTotalPages: () => {},
      clearScrollRequest: () => {},
    } as PDFViewerContextValue;
  }
  return context;
}
