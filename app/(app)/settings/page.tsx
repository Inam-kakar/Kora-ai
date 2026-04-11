import { redirect } from "next/navigation";

import { SettingsClient } from "@/app/(app)/settings/SettingsClient";
import { auth } from "@/lib/auth";
import { listElevenLabsVoices } from "@/lib/elevenlabs";
import { connectDB } from "@/lib/mongodb";
import { normalizeUserSettings } from "@/lib/user-settings";
import { User } from "@/models/User";
import type { ElevenLabsVoiceOption } from "@/types/voice";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  let availableVoices: ElevenLabsVoiceOption[] = [];
  let voiceLoadError: string | null = null;

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300">
        User profile not found.
      </div>
    );
  }

  const settings = normalizeUserSettings(
    (user as { settings?: unknown }).settings
  );

  try {
    availableVoices = await listElevenLabsVoices();
  } catch (error) {
    voiceLoadError =
      error instanceof Error ? error.message : "Unable to load ElevenLabs voices";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
      <SettingsClient
        proactiveAlerts={settings.proactiveAlerts}
        subscriptionTier={settings.subscriptionTier}
        selectedVoice={settings.selectedVoice}
        availableVoices={availableVoices}
        voiceLoadError={voiceLoadError}
      />
    </div>
  );
}
