"use client";

const EMOJIS = [
  "😀", "😊", "👍", "👎", "👏", "🙏", "🎉", "💬", "💡", "✅", "❌", "🔥", "⭐", "❤️", "😂", "😅",
  "📋", "📌", "💊", "📦", "🏥", "📈", "🤝", "⚠️", "🔔", "✨", "👍🏻", "👀", "🙌", "😊",
];

type Props = {
  onInsert: (emoji: string) => void;
  label?: string;
};

export default function ForumEmojiBar({ onInsert, label = "Insert emoji" }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-white/50 text-xs mr-1 shrink-0">{label}</span>
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          title={emoji}
          onClick={() => onInsert(emoji)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-lg hover:bg-white/10 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-gold/50"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
