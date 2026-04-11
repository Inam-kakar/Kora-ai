import { redirect } from "next/navigation";

import { MemoriesClient } from "@/app/(app)/memories/MemoriesClient";
import type { MemoryCardData } from "@/components/memory/MemoryCard";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { MemoryEntry } from "@/models/MemoryEntry";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();

  const entries = await MemoryEntry.find(
    { userId: session.user.id },
    { embedding: 0 }
  )
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const initialMemories: MemoryCardData[] = entries.map((entry) => ({
    id: String(entry._id),
    createdAt: new Date(entry.createdAt),
    summary: entry.summary,
    stressScore: entry.stressScore,
    emotion: {
      primary: entry.emotions.primary,
      intensity: entry.emotions.intensity,
    },
  }));

  return (
    <MemoriesClient initialMemories={initialMemories} />
  );
}
