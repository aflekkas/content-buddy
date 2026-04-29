import { NextRequest } from "next/server";
import { errorResponse, requireAuth } from "@/lib/api";
import { listVideos } from "@/lib/db/queries";
import { buildVideoExport, isVideoExportFormat } from "@/lib/video-export";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const format = req.nextUrl.searchParams.get("format");
  if (!isVideoExportFormat(format)) {
    return errorResponse("invalid_format", 400);
  }

  const videos = await listVideos(auth.user.id);
  const payload = buildVideoExport(videos, format);

  return new Response(payload.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${safeFilename(
        payload.filename,
      )}"`,
      "Content-Type": payload.contentType,
    },
  });
}

function safeFilename(filename: string): string {
  return filename.replace(/[^A-Za-z0-9._-]/g, "_");
}
