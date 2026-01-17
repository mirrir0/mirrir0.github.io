interface Frontmatter {
  title: string;
  date: string;
  description: string;
  tags: string[];
}

interface FrontmatterEditorProps {
  frontmatter: Frontmatter;
  onChange: (frontmatter: Frontmatter) => void;
}

export default function FrontmatterEditor({ frontmatter, onChange }: FrontmatterEditorProps) {
  const handleChange = (field: keyof Frontmatter, value: string) => {
    if (field === "tags") {
      onChange({ ...frontmatter, tags: value.split(",").map(t => t.trim()) });
    } else {
      onChange({ ...frontmatter, [field]: value });
    }
  };

  return (
    <div className="border border-zinc-800 rounded-lg px-4 py-3 mb-4 bg-zinc-900/50">
      <div className="grid grid-cols-[1fr_190px] gap-3 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-zinc-500 text-sm font-mono shrink-0">title:</label>
          <input
            type="text"
            value={frontmatter.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-500 text-sm font-mono shrink-0">date:</label>
          <input
            type="date"
            value={frontmatter.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div className="flex items-start gap-2">
          <label className="text-zinc-500 text-sm font-mono shrink-0 pt-1">desc:</label>
          <textarea
            value={frontmatter.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={2}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-sm focus:border-emerald-400 focus:outline-none resize-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-zinc-500 text-sm font-mono shrink-0">tags:</label>
          <input
            type="text"
            value={frontmatter.tags.join(", ")}
            onChange={(e) => handleChange("tags", e.target.value)}
            placeholder="tag1, tag2"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-100 font-mono text-sm focus:border-emerald-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
