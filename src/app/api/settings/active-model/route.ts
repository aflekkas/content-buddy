import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isProviderId, PROVIDER_IDS } from "@/lib/providers";
import { getActiveModel, setActiveModel } from "@/lib/db/queries";

const PutBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  model: z.string().min(1).max(120),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getActiveModel(user.id));
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = PutBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { provider, model } = parsed.data;
  if (!isProviderId(provider)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }

  try {
    const result = await setActiveModel(user.id, provider, model);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "unknown_model" }, { status: 400 });
  }
}
