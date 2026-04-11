import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { normalizeUserSettings } from "@/lib/user-settings";
import { User } from "@/models/User";

const SelectedVoiceSchema = z.object({
  voiceId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  previewUrl: z.string().url().nullable().optional(),
  labels: z.record(z.string(), z.string()),
  raw: z.record(z.string(), z.unknown()),
});

const UpdateSettingsSchema = z.object({
  proactiveAlerts: z.boolean().optional(),
  selectedVoice: SelectedVoiceSchema.nullable().optional(),
}).refine(
  (value) =>
    value.proactiveAlerts !== undefined || value.selectedVoice !== undefined,
  { message: "At least one setting must be provided" }
);

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const settings = normalizeUserSettings(
    (user as { settings?: unknown }).settings
  );

  return NextResponse.json({
    proactiveAlerts: settings.proactiveAlerts,
    subscriptionTier: settings.subscriptionTier,
    timezone: settings.timezone,
    selectedVoice: settings.selectedVoice,
  });
}

export async function PATCH(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  await connectDB();

  const updates: Record<string, unknown> = {
    lastActiveAt: new Date(),
  };
  if (typeof parsed.data.proactiveAlerts === "boolean") {
    updates["settings.proactiveAlerts"] = parsed.data.proactiveAlerts;
  }
  if (parsed.data.selectedVoice !== undefined) {
    updates["settings.selectedVoice"] = parsed.data.selectedVoice;
  }

  const user = await User.findByIdAndUpdate(
    session.user.id,
    {
      $set: updates,
    },
    { returnDocument: "after" }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const settings = normalizeUserSettings(
    (user as { settings?: unknown }).settings
  );

  return NextResponse.json({
    proactiveAlerts: settings.proactiveAlerts,
    subscriptionTier: settings.subscriptionTier,
    timezone: settings.timezone,
    selectedVoice: settings.selectedVoice,
  });
}
