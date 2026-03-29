import React from 'react';
import JsonViewer from './JsonViewer';
import { BASESCAN_TX } from '../config';

export type StepState = {
  status: 'idle' | 'running' | 'success' | 'error';
  request?: unknown;
  response?: unknown;
  error?: string;
  txHash?: string;
  elapsed?: number;
};

type Props = {
  stepIndex: number;
  title: string;
  description: string;
  buttonLabel: string;
  onExecute: () => void;
  state: StepState;
  children?: React.ReactNode;
};

export default function StepCard({ stepIndex, title, description, buttonLabel, onExecute, state, children }: Props) {
  const statusIcon = state.status === 'success'
    ? <span className="text-green-400">✓</span>
    : state.status === 'error'
    ? <span className="text-red-400">✗</span>
    : stepIndex + 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
            state.status === 'success' ? 'bg-green-500/15 text-green-400'
            : state.status === 'error' ? 'bg-red-500/15 text-red-400'
            : 'bg-cyan/15 text-cyan'
          }`}>
            {statusIcon}
          </span>
          {title}
          {state.elapsed !== undefined && (
            <span className="text-xs font-normal text-gray-600 ml-1">({state.elapsed}ms)</span>
          )}
        </h2>
        <p className="text-sm text-gray-500 mt-1 ml-11">{description}</p>
      </div>

      {/* Custom step content (inputs, etc.) */}
      {children}

      {/* Execute button */}
      <button
        onClick={onExecute}
        disabled={state.status === 'running'}
        className={`ml-11 px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
          state.status === 'running'
            ? 'bg-cyan/20 text-cyan cursor-wait'
            : state.status === 'success'
            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
            : 'bg-cyan hover:bg-cyan/90 text-black hover:shadow-lg hover:shadow-cyan/20'
        }`}
      >
        {state.status === 'running' && (
          <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {state.status === 'running' ? 'Executing...' : state.status === 'success' ? `↺ Re-run` : buttonLabel}
      </button>

      {/* Request JSON */}
      {!!state.request && (
        <div className="ml-11">
          <JsonViewer data={state.request as Record<string, unknown>} label="→ Request" />
        </div>
      )}

      {/* Response JSON */}
      {!!state.response && (
        <div className="ml-11">
          <JsonViewer data={state.response as Record<string, unknown>} label="← Response" />
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="ml-11 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-mono whitespace-pre-wrap break-all">
          {state.error}
        </div>
      )}

      {/* BaseScan TX link */}
      {state.txHash && (
        <div className="ml-11 flex items-center gap-2 p-2 rounded-lg bg-green-500/5 border border-green-500/15">
          <span className="text-xs text-gray-500">TX:</span>
          <a
            href={`${BASESCAN_TX}${state.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-cyan hover:underline font-mono truncate"
          >
            {state.txHash}
          </a>
          <a href={`${BASESCAN_TX}${state.txHash}`} target="_blank" rel="noreferrer"
            className="text-xs text-cyan ml-auto shrink-0 hover:underline">↗ BaseScan</a>
        </div>
      )}
    </div>
  );
}
