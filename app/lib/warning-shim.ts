// Shim for the warning module to fix ESM compatibility
export default function warning(condition: unknown, message: string): void {
  if (process.env.NODE_ENV !== "production" && !condition) {
    console.warn("Warning: " + message);
  }
}
