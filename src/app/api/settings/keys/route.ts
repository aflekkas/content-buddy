import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isProviderId, PROVIDER_IDS, PROVIDERS } from "@/lib/providers";
import {
  clearProviderKey,
  listProviderKeyMeta,
  setProviderKey,
} from "@/lib/db/queries";
import { validateProviderKey } from "@/lib/provider-validate";

const PutBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
  key: z.string().min(8).max(500),
});

const DeleteBody = z.object({
  provider: z.enum(PROVIDER_IDS as [string, ...string[]]),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listProviderKeyMeta(user.id));
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
  const { provider, key } = parsed.data;
  if (!isProviderId(provider)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }

  const expectedPrefix = PROVIDERS[provider].keyPrefix;
  if (!key.trim().startsWith(expectedPrefix)) {
    return NextResponse.json(
      {
        error: "wrong_prefix",
        expected: expectedPrefix,
      },
      { status: 400 },
    );
  }

  const validation = await validateProviderKey(provider, key);
  if (!validation.ok && validation.reason === "auth") {
    return NextResponse.json(
      {
        error: "invalid_key",
        message: "Provider rejected this key. Check it and try again.",
      },
      { status: 400 },
    );
  }
  if (!validation.ok && validation.reason === "network") {
    // Network/timeout — log and continue, don't block the user.
    console.warn(
      `[provider-validate] Network error validating ${provider} key — storing anyway`,
    );
  }

  const meta = await setProviderKey(user.id, provider, key);
  return NextResponse.json(meta);
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = DeleteBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { provider } = parsed.data;
  if (!isProviderId(provider)) {
    return NextResponse.json({ error: "unknown_provider" }, { status: 400 });
  }

  await clearProviderKey(user.id, provider);
  return NextResponse.json({ ok: true });
}
