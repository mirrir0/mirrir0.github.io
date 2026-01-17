import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface EditorState {
  saveStatus: "idle" | "saving" | "saved";
  isSaving: boolean;
  isPublishing: boolean;
  onSave: (() => void) | null;
  onPublish: (() => void) | null;
  onDelete: (() => void) | null;
}

interface EditorContextValue extends EditorState {
  setEditorState: (state: Partial<EditorState>) => void;
  registerEditor: (handlers: {
    onSave: () => void;
    onPublish: () => void;
    onDelete: () => void;
  }) => void;
  unregisterEditor: () => void;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EditorState>({
    saveStatus: "idle",
    isSaving: false,
    isPublishing: false,
    onSave: null,
    onPublish: null,
    onDelete: null,
  });

  const setEditorState = useCallback((newState: Partial<EditorState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  }, []);

  const registerEditor = useCallback(
    (handlers: { onSave: () => void; onPublish: () => void; onDelete: () => void }) => {
      setState((prev) => ({
        ...prev,
        onSave: handlers.onSave,
        onPublish: handlers.onPublish,
        onDelete: handlers.onDelete,
      }));
    },
    []
  );

  const unregisterEditor = useCallback(() => {
    setState({
      saveStatus: "idle",
      isSaving: false,
      isPublishing: false,
      onSave: null,
      onPublish: null,
      onDelete: null,
    });
  }, []);

  return (
    <EditorContext.Provider
      value={{ ...state, setEditorState, registerEditor, unregisterEditor }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditorContext() {
  return useContext(EditorContext);
}
