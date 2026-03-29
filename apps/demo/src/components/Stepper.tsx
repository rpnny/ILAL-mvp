import { STEP_INFO } from '../config';

type Props = {
  current: number;
  completed: Set<number>;
  onSelect: (i: number) => void;
};

export default function Stepper({ current, completed, onSelect }: Props) {
  return (
    <nav className="space-y-1">
      {STEP_INFO.map((step, i) => {
        const isActive = i === current;
        const isDone = completed.has(i);
        const isLocked = i > 0 && !completed.has(i - 1) && !isActive;

        return (
          <button
            key={i}
            onClick={() => !isLocked && onSelect(i)}
            disabled={isLocked}
            className={`w-full text-left px-4 py-3 rounded-lg transition-all group flex items-start gap-3 ${
              isActive
                ? 'bg-cyan/10 border border-cyan/20'
                : isDone
                ? 'bg-green-500/5 border border-green-500/10 hover:bg-green-500/10'
                : isLocked
                ? 'opacity-40 cursor-not-allowed border border-transparent'
                : 'hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                isDone
                  ? 'bg-green-500 text-black'
                  : isActive
                  ? 'bg-cyan text-black'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              {isDone ? '✓' : i + 1}
            </div>
            <div className="min-w-0">
              <div className={`text-sm font-medium truncate ${isActive ? 'text-cyan' : isDone ? 'text-green-400' : 'text-gray-300'}`}>
                {step.title}
              </div>
              <div className="text-xs text-gray-600 truncate">{step.subtitle}</div>
            </div>
          </button>
        );
      })}
    </nav>
  );
}
