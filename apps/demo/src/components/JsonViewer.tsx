import React from 'react';

function colorize(json: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let i = 0;
  const lines = json.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const tokens = line.match(/"[^"]*"\s*:|"[^"]*"|[\d.]+(?:e[+-]?\d+)?|true|false|null|[{}\[\],:\s]+/gi) || [line];
    for (const tok of tokens) {
      if (/^"[^"]*"\s*:$/.test(tok)) {
        parts.push(<span key={i++} className="text-purple-400">{tok}</span>);
      } else if (/^"/.test(tok)) {
        parts.push(<span key={i++} className="text-green-400">{tok}</span>);
      } else if (/^(true|false)$/.test(tok)) {
        parts.push(<span key={i++} className="text-yellow-400">{tok}</span>);
      } else if (/^null$/.test(tok)) {
        parts.push(<span key={i++} className="text-red-400">{tok}</span>);
      } else if (/^[\d.]+/.test(tok)) {
        parts.push(<span key={i++} className="text-cyan">{tok}</span>);
      } else {
        parts.push(<span key={i++} className="text-gray-500">{tok}</span>);
      }
    }
    if (li < lines.length - 1) parts.push(<br key={i++} />);
  }
  return parts;
}

export default function JsonViewer({ data, label }: { data: Record<string, unknown> | unknown[]; label?: string }) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="rounded-lg bg-black/40 border border-white/[0.06] overflow-hidden">
      {label && (
        <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.06] text-xs text-gray-500 font-mono">
          {label}
        </div>
      )}
      <pre className="p-4 text-xs font-mono leading-relaxed overflow-x-auto max-h-80 overflow-y-auto">
        {colorize(json)}
      </pre>
    </div>
  );
}
