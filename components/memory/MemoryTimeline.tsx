import { MemoryCard, type MemoryCardData } from "@/components/memory/MemoryCard";

export function MemoryTimeline({ memories }: { memories: MemoryCardData[] }) {
  if (memories.length === 0) {
    return <p className="text-sm text-slate-400">No memories found.</p>;
  }

  return (
    <div className="space-y-3">
      {memories.map((memory) => (
        <MemoryCard key={memory.id} memory={memory} />
      ))}
    </div>
  );
}
