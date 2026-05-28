import { useState, useRef, useLayoutEffect } from "react";
import { X } from "lucide-react";

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
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useLayoutEffect(() => {
    autoResize(titleRef.current);
    autoResize(descriptionRef.current);
  }, [frontmatter.title, frontmatter.description]);

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

  return (
    <div className="mb-4 font-mono text-sm">
      {/* Opening delimiter */}
      <div className="text-zinc-600 select-none">---</div>

      {/* Title field */}
      <div className="flex items-start py-0.5">
        <span className="text-zinc-500 shrink-0">title:</span>
        <textarea
          ref={titleRef}
          value={frontmatter.title}
          onChange={(e) => handleChange("title", e.target.value)}
          onInput={(e) => autoResize(e.currentTarget)}
          rows={1}
          className="flex-1 bg-transparent text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-400 ml-1 resize-none overflow-hidden"
        />
      </div>

      {/* Slug field */}
      <div className="flex items-start py-0.5">
        <span className="text-zinc-500 shrink-0">slug:</span>
        <input
          type="text"
          value={slug}
          onChange={(e) => onSlugChange(e.target.value)}
          className="flex-1 bg-transparent text-zinc-300 focus:outline-none border-b border-transparent focus:border-emerald-400 ml-1 w-full"
        />
      </div>

      {/* Date field */}
      <div className="flex items-center py-0.5">
        <span className="text-zinc-500 shrink-0">date:</span>
        <input
          type="date"
          value={frontmatter.date}
          onChange={(e) => handleChange("date", e.target.value)}
          className="bg-transparent text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-400 ml-1"
        />
      </div>

      {/* Description field */}
      <div className="flex items-start py-0.5">
        <span className="text-zinc-500 shrink-0">description:</span>
        <textarea
          ref={descriptionRef}
          value={frontmatter.description}
          onChange={(e) => handleChange("description", e.target.value)}
          onInput={(e) => autoResize(e.currentTarget)}
          rows={1}
          className="flex-1 bg-transparent text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-400 ml-1 resize-none overflow-hidden"
        />
      </div>

      {/* Tags field */}
      <div className="flex items-center py-0.5">
        <span className="text-zinc-500 shrink-0">tags:</span>
        <div className="flex flex-wrap gap-1.5 ml-1 items-center">
          {frontmatter.tags.map((tag) => (
            <span
              key={tag}
              className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 text-xs inline-flex items-center gap-1"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-zinc-600 hover:text-zinc-300"
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
            className="bg-transparent text-zinc-400 w-12 focus:outline-none text-xs focus:w-20 transition-all"
          />
        </div>
      </div>

      {/* Closing delimiter */}
      <div className="text-zinc-600 select-none">---</div>
    </div>
  );
}
