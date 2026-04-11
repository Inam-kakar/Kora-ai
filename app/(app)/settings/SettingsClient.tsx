"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ElevenLabsVoiceOption } from "@/types/voice";

interface SettingsClientProps {
  proactiveAlerts: boolean;
  subscriptionTier: "free" | "pro" | "family";
  selectedVoice: ElevenLabsVoiceOption | null;
  availableVoices: ElevenLabsVoiceOption[];
  voiceLoadError: string | null;
}

export function SettingsClient({
  proactiveAlerts,
  subscriptionTier,
  selectedVoice,
  availableVoices,
  voiceLoadError,
}: SettingsClientProps) {
  const [alertsEnabled, setAlertsEnabled] = useState(proactiveAlerts);
  const [savedVoice, setSavedVoice] = useState<ElevenLabsVoiceOption | null>(
    selectedVoice
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState(
    selectedVoice?.voiceId ?? ""
  );
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveAlerts = async (nextValue: boolean) => {
    setSavingAlerts(true);
    setMessage(null);

    const response = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proactiveAlerts: nextValue }),
    });

    const payload: { error?: string } = await response.json();
    setSavingAlerts(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to update settings");
      return;
    }

    setAlertsEnabled(nextValue);
    setMessage("Settings updated.");
  };

  const saveVoice = async () => {
    const nextVoice = availableVoices.find(
      (voice) => voice.voiceId === selectedVoiceId
    );
    if (!nextVoice) {
      setMessage("Select a voice before saving.");
      return;
    }

    setSavingVoice(true);
    setMessage(null);

    const response = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedVoice: nextVoice }),
    });

    const payload: { error?: string } = await response.json();
    setSavingVoice(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save selected voice");
      return;
    }

    setSavedVoice(nextVoice);
    setMessage("Voice updated.");
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Proactive alerts</h2>
        <p className="text-sm text-slate-300">
          Enable KORA to proactively surface pattern warnings.
        </p>
        <Button
          onClick={() => saveAlerts(!alertsEnabled)}
          disabled={savingAlerts}
        >
          {alertsEnabled ? "Disable alerts" : "Enable alerts"}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">KORA voice</h2>
        <p className="text-sm text-slate-300">
          Choose the ElevenLabs voice KORA should use for spoken responses.
        </p>
        {voiceLoadError ? (
          <p className="text-sm text-rose-300">{voiceLoadError}</p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-slate-500 focus:outline-none"
              disabled={savingVoice || availableVoices.length === 0}
            >
              <option value="">Select a voice</option>
              {availableVoices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.name}
                  {voice.category ? ` (${voice.category})` : ""}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={saveVoice}
                disabled={savingVoice || !selectedVoiceId}
              >
                {savingVoice ? "Saving..." : "Save voice"}
              </Button>
              {savedVoice ? (
                <p className="text-xs text-slate-400">
                  Saved voice: <span className="font-medium">{savedVoice.name}</span>
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-100">Subscription</h2>
        <p className="text-sm text-slate-300">
          Current tier: <strong className="uppercase">{subscriptionTier}</strong>
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">Data</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled>
            Export Decision Log
          </Button>
          <Button variant="danger" disabled>
            Delete Account
          </Button>
        </div>
      </Card>

      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}
