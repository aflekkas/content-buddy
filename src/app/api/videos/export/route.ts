import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listVideos } from "@/lib/db/queries";
import { buildVideoExport, isVideoExportFormat } from "@/lib/video-export";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format");
  if (!isVideoExportFormat(format)) {
    return NextResponse.json({ error: "invalid_format" }, { status: 400 });
  }

  const videos = await listVideos(user.id);
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
