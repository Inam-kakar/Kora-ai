import { cn } from "@/lib/classnames";

interface KoraAvatarProps {
  speaking: boolean;
  listening: boolean;
}

export function KoraAvatar({ speaking, listening }: KoraAvatarProps) {
  return (
    <div
      className={cn(
        "relative flex h-28 w-28 items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-br from-indigo-600/30 to-slate-800/90",
        speaking && "animate-pulse",
        listening && "ring-4 ring-emerald-400/50"
      )}
      aria-label="KORA avatar"
    >
      <div className="h-14 w-14 rounded-full bg-indigo-400/70" />
    </div>
  );
}
