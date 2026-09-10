import React from 'react';
import {
  History,
  X,
  Play,
  Trash2,
  Calendar,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { SimulatorSessionMemory, Translations } from '../types';

interface RecentSimulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SimulatorSessionMemory[];
  onRestoreSession: (session: SimulatorSessionMemory) => void;
  onClearSessions: () => void;
  onDeleteSession: (id: string) => void;
  t: Translations;
}

export const RecentSimulationsModal: React.FC<RecentSimulationsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  onRestoreSession,
  onClearSessions,
  onDeleteSession,
  t,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-[#0c111e] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0e1424]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-slate-100">
                {t.recentSimulations}
              </h2>
              <p className="text-xs text-slate-400">
                Auto-saved simulator projection snapshots and parameter memory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={onClearSessions}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List of Sessions */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
                <Clock className="w-5 h-5" />
              </div>
              <div className="text-xs text-slate-400">No recent simulator snapshots saved yet.</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Running or adjusting parameters in the Simulator automatically records snapshots here for fast recovery.
              </p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl border border-slate-800/90 bg-[#111726]/80 hover:border-cyan-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-semibold text-xs text-slate-200">
                      {session.projectName}
                    </span>
                    {index === 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Latest
                      </span>
                    )}
                    {session.investorName && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium">
                        {session.investorName}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span>
                      ${session.initialCapital.toLocaleString()} → <strong className="text-cyan-300">${session.finalCapital.toLocaleString()}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      +{session.growthPct.toFixed(1)}% (+${session.netProfit.toLocaleString()})
                    </span>
                    <span>•</span>
                    <span className="text-slate-400">
                      {session.tradingDays || session.days} Trading Days ({session.params.profitMin}%-{session.params.profitMax}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreSession(session);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs py-1.5 px-3 rounded-lg font-medium transition-all cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3" />
                    <span>Restore</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
