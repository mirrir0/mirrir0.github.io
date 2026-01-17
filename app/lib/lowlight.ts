import { all, createLowlight } from "lowlight";

// Create lowlight instance with all languages
// This matches the languages available in shiki.server.ts
export const lowlight = createLowlight(all);

// Register shell as alias for bash
lowlight.registerAlias("bash", "shell");
