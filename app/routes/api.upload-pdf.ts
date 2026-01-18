import type { ActionFunctionArgs } from "react-router";
import fs from "fs/promises";
import path from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const PDFS_DIR = path.join(process.cwd(), "public", "pdfs");

function sanitizeFilename(filename: string): string {
  // Remove extension, sanitize, then add .pdf back
  const nameWithoutExt = filename.replace(/\.pdf$/i, "");
  // Keep only alphanumeric, dashes, and underscores
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, "");
  // Ensure we have a valid filename
  return sanitized || "document";
}

export async function action({ request }: ActionFunctionArgs) {
  // Dev-only endpoint
  if (!import.meta.env.DEV) {
    throw new Response("Not Found", { status: 404 });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate MIME type
    if (file.type !== "application/pdf") {
      return Response.json(
        { error: "Invalid file type. Only PDF files are allowed." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 }
      );
    }

    // Ensure pdfs directory exists
    await fs.mkdir(PDFS_DIR, { recursive: true });

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);
    let finalFilename = `${sanitizedName}.pdf`;
    let filePath = path.join(PDFS_DIR, finalFilename);

    // Handle filename collisions by appending timestamp
    try {
      await fs.access(filePath);
      // File exists, append timestamp
      const timestamp = Date.now();
      finalFilename = `${sanitizedName}-${timestamp}.pdf`;
      filePath = path.join(PDFS_DIR, finalFilename);
    } catch {
      // File doesn't exist, use original sanitized name
    }

    // Save the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    return Response.json({ success: true, filename: finalFilename });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return Response.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
