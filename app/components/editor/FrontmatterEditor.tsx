import { useState, useRef, useLayoutEffect } from "react";
import { X, ChevronRight } from "lucide-react";

interface Frontmatter {
  title: string;
  date: string;
  description: string;
  tags: string[];
}

interface FrontmatterEditorProps {
  frontmatter: Frontmatter;
  onChange: (frontmatter: Frontmatter) => void;
  slug: string;
  onSlugChange: (slug: string) => void;
}

export default function FrontmatterEditor({ frontmatter, onChange, slug, onSlugChange }: FrontmatterEditorProps) {
  const [tagInput, setTagInput] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Re-run on expand too: the textareas don't exist while collapsed, so they
  // need sizing once they remount.
  useLayoutEffect(() => {
    autoResize(titleRef.current);
    autoResize(descriptionRef.current);
  }, [frontmatter.title, frontmatter.description, collapsed]);

  const handleChange = (field: keyof Frontmatter, value: string) => {
    onChange({ ...frontmatter, [field]: value });
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !frontmatter.tags.includes(tag)) {
      onChange({ ...frontmatter, tags: [...frontmatter.tags, tag] });
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    onChange({ ...frontmatter, tags: frontmatter.tags.filter(t => t !== tagToRemove) });
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  // Shared field styles: persistent hairline bottom border for affordance,
  // swaps to emerald on focus. All colors drive from host vars with fallbacks.
  const fieldClass =
    "bg-transparent focus:outline-none ml-2 " +
    "border-b border-[var(--color-border-secondary,oklch(0.26_0.005_60))] " +
    "focus:border-[#34d399] " +
    "text-[var(--color-text-primary,oklch(0.88_0.005_90))]";

  return (
    <div
      className="mb-1 text-sm"
      style={{ fontFamily: "var(--font-mono, ui-monospace, monospace)" }}
    >
      {/* Disclosure header — collapses the metadata block to reclaim vertical
          space. Collapsed, it shows the title so the draft is still identifiable. */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Show frontmatter" : "Hide frontmatter"}
        className="flex items-center gap-1.5 w-full text-left py-0.5"
        style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
      >
        <ChevronRight
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{ transform: collapsed ? "none" : "rotate(90deg)" }}
        />
        {collapsed ? (
          <span
            className="truncate"
            style={{ color: "var(--color-text-primary, oklch(0.88 0.005 90))" }}
          >
            {frontmatter.title || "untitled"}
          </span>
        ) : (
          <span className="uppercase tracking-[0.04em] text-[10px]">frontmatter</span>
        )}
      </button>

      {!collapsed && (
      <>
      {/* Title field */}
      <div className="flex items-start py-1">
        <span
          className="shrink-0 w-24"
          style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
        >
          title:
        </span>
        <textarea
          ref={titleRef}
          value={frontmatter.title}
          onChange={(e) => handleChange("title", e.target.value)}
          onInput={(e) => autoResize(e.currentTarget)}
          rows={1}
          className={`flex-1 resize-none overflow-hidden ${fieldClass}`}
        />
      </div>

      {/* Slug field */}
      <div className="flex items-start py-1">
        <span
          className="shrink-0 w-24"
          style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
        >
          slug:
        </span>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          className={`flex-1 w-full ${fieldClass} text-[var(--color-text-secondary,oklch(0.6_0.005_90))]`}
        />
      </div>

      {/* Date field */}
      <div className="flex items-center py-1">
        <span
          className="shrink-0 w-24"
          style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
        >
          date:
        </span>
        <input
          type="date"
          value={frontmatter.date}
          onChange={(e) => handleChange("date", e.target.value)}
          className={fieldClass}
        />
      </div>

      {/* Description field */}
      <div className="flex items-start py-1">
        <span
          className="shrink-0 w-24"
          style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
        >
          description:
        </span>
        <textarea
          ref={descriptionRef}
          value={frontmatter.description}
          onChange={(e) => handleChange("description", e.target.value)}
          onInput={(e) => autoResize(e.currentTarget)}
          rows={1}
          className={`flex-1 resize-none overflow-hidden ${fieldClass}`}
        />
      </div>

      {/* Tags field */}
      <div className="flex items-start py-1">
        <span
          className="shrink-0 w-24"
          style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
        >
          tags:
        </span>
        <div className="flex flex-wrap gap-1.5 ml-2 items-center">
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs inline-flex items-center gap-1"
              style={{
                background: "var(--color-background-secondary, oklch(0.205 0.005 60))",
                color: "var(--color-text-secondary, oklch(0.6 0.005 90))",
                borderRadius: "var(--border-radius-sm, 4px)",
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                style={{ color: "var(--color-text-tertiary, oklch(0.5 0.005 90))" }}
                className="hover:text-[var(--color-text-primary,oklch(0.88_0.005_90))]"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder="+"
            className="bg-transparent w-8 focus:outline-none text-xs focus:w-20 transition-all"
            style={{ color: "#34d399" }}
          />
        </div>
      </div>
      </>
      )}
    </div>
  );
}
