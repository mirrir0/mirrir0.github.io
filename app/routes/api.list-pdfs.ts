import type { LoaderFunctionArgs } from "react-router";
import fs from "fs/promises";
import path from "path";

const PDFS_DIR = path.join(process.cwd(), "public", "pdfs");

interface PdfInfo {
  filename: string;
  size: number;
  modifiedAt: string;
}

export async function loader(_args: LoaderFunctionArgs) {
  // Dev-only endpoint
  if (!import.meta.env.DEV) {
    throw new Response("Not Found", { status: 404 });
  }

  try {
    // Ensure pdfs directory exists
    await fs.mkdir(PDFS_DIR, { recursive: true });

    const files = await fs.readdir(PDFS_DIR);
    const pdfFiles: PdfInfo[] = [];

    for (const filename of files) {
      // Only include PDF files
      if (!filename.toLowerCase().endsWith(".pdf")) {
        continue;
      }

      const filePath = path.join(PDFS_DIR, filename);
      const stats = await fs.stat(filePath);

      // Only include files, not directories
      if (stats.isFile()) {
        pdfFiles.push({
          filename,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        });
      }
    }

    // Sort by modifiedAt descending (newest first)
    pdfFiles.sort((a, b) =>
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    );

    return Response.json(pdfFiles);
  } catch (error) {
    console.error("Error listing PDFs:", error);
    return Response.json(
      { error: "Failed to list PDF files" },
      { status: 500 }
    );
  }
}
