import React, { useState } from 'react';
import {
  SimulationParams,
  SimulationResult,
  Translations,
  ProfitMode,
  SimulatorSessionMemory,
  BrandingConfig,
} from '../types';
import {
  calculateLotSize,
  exportSimulationToCSV,
  exportSimulationToPDF,
} from '../utils/simulation';
import {
  Play,
  RotateCcw,
  Save,
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Layers,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface SimulatorViewProps {
  params: SimulationParams;
  onParamsChange: (newParams: SimulationParams) => void;
  result: SimulationResult;
  onRunSimulation: () => void;
  onClear: () => void;
  onSaveResult: (result: SimulationResult) => void;
  t: Translations;
  activeInvestorName?: string;
  branding?: BrandingConfig;
  lastSessionMemory?: SimulatorSessionMemory | null;
  onRestoreLastSession?: () => void;
  onOpenRecentSessions?: () => void;
  recentSessionsCount?: number;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  params,
  onParamsChange,
  result,
  onRunSimulation,
  onClear,
  onSaveResult,
  t,
  activeInvestorName,
  branding,
  lastSessionMemory,
  onRestoreLastSession,
  onOpenRecentSessions,
  recentSessionsCount = 0,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [chartTab, setChartTab] = useState<'equity' | 'profit'>('equity');

  const updateParam = <K extends keyof SimulationParams>(
    key: K,
    value: SimulationParams[K]
  ) => {
    onParamsChange({
      ...params,
      [key]: value,
    });
  };

  const handleWithdrawPctChange = (val: number) => {
    const clampedWithdraw = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    const dynamicReinvest = Number((100 - clampedWithdraw).toFixed(2));
    onParamsChange({
      ...params,
      withdrawPct: clampedWithdraw,
      reinvestPct: dynamicReinvest,
    });
  };

  const handleReinvestPctChange = (val: number) => {
    const clampedReinvest = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    const dynamicWithdraw = Number((100 - clampedReinvest).toFixed(2));
    onParamsChange({
      ...params,
      reinvestPct: clampedReinvest,
      withdrawPct: dynamicWithdraw,
    });
  };

  const setProfitSplit = (withdraw: number, reinvest: number) => {
    onParamsChange({
      ...params,
      withdrawPct: withdraw,
      reinvestPct: reinvest,
    });
  };

  const handleSave = () => {
    onSaveResult(result);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const currentLot = calculateLotSize(
    params.initialCapital,
    params.baseEquity,
    params.baseLotSize,
    params.lotIncrement
  );

  const finalTier = result.summary.finalTier;

  // Format chart data for Recharts
  const chartData = result.rows.map((row, idx) => ({
    name: `D${row.day}`,
    day: row.day,
    date: row.date,
    equity: row.endEquity,
    withdraw: row.withdraw,
    cumWithdraw: result.chart.cumWithdrawSeries[idx] || 0,
    profit: row.profit,
    profitMin: result.chart.profitMinSeries[idx] || 0,
    profitMax: result.chart.profitMaxSeries[idx] || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Simulation Memory / Quick Restore Bar */}
      {lastSessionMemory && (
        <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0c1322] to-slate-900/90 p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {t.lastSessionMemory}:
                </span>
                <span className="text-xs font-mono text-cyan-300">
                  {lastSessionMemory.projectName}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({new Date(lastSessionMemory.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                <span>
                  ${lastSessionMemory.initialCapital.toLocaleString()} → <strong className="text-cyan-300">${lastSessionMemory.finalCapital.toLocaleString()}</strong>
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">
                  +{lastSessionMemory.growthPct.toFixed(1)}% (+${lastSessionMemory.netProfit.toLocaleString()})
                </span>
                <span>•</span>
                <span>{lastSessionMemory.tradingDays || lastSessionMemory.days} {t.tradingDaysLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRestoreLastSession && (
              <button
                type="button"
                onClick={onRestoreLastSession}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.restoreLastSim}</span>
              </button>
            )}

            {onOpenRecentSessions && (
              <button
                type="button"
                onClick={onOpenRecentSessions}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition-all cursor-pointer"
              >
                <History className="w-3 h-3 text-slate-400" />
                <span>Snapshots {recentSessionsCount > 0 ? `(${recentSessionsCount})` : ''}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Banner / Active Investor Indicator */}
      {activeInvestorName && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="text-xs text-purple-300">
              Active Investor Profile: <strong className="text-purple-200">{activeInvestorName}</strong>
            </span>
          </div>
          <span className="text-[11px] text-purple-400/80">Custom settings applied to simulator</span>
        </div>
      )}

      {/* Main Grid: Inputs vs Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Simulation Configuration Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-semibold text-slate-100 text-sm">
                  {t.inputTitle}
                </h3>
              </div>
              <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                v4.0 Scaled
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Initial Capital */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblCapital}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={params.initialCapital}
                    onChange={(e) => updateParam('initialCapital', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500 font-mono">$</span>
                </div>
              </div>

              {/* Days to Simulate */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblDays}
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="365"
                  value={params.days}
                  onChange={(e) => updateParam('days', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
              </div>

              {/* Daily Profit Min */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblProfitMin}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={params.profitMin}
                    onChange={(e) => updateParam('profitMin', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Daily Profit Max */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblProfitMax}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={params.profitMax}
                    onChange={(e) => updateParam('profitMax', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Profit Mode */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblMode}
                </label>
                <select
                  value={params.profitMode}
                  onChange={(e) => updateParam('profitMode', e.target.value as ProfitMode)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
                >
                  <option value="random">{t.modeRandom}</option>
                  <option value="fixed">{t.modeFixed}</option>
                  <option value="average">{t.modeAverage}</option>
                </select>
              </div>

              {/* Withdraw % from Profit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 text-xs font-medium">
                    {t.lblWithdrawPct}
                  </label>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {params.withdrawPct}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={params.withdrawPct}
                    onChange={(e) => handleWithdrawPctChange(parseFloat(e.target.value))}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Reinvest % of Profit */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 text-xs font-medium">
                    {t.lblReinvestPct}
                  </label>
                  <span className="text-[10px] font-mono text-purple-400">
                    {params.reinvestPct}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={params.reinvestPct}
                    onChange={(e) => handleReinvestPctChange(parseFloat(e.target.value))}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Dynamic Profit Allocation Bar & Quick Presets */}
              <div className="col-span-2 bg-[#111726]/70 p-2.5 rounded-xl border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    <span className="text-slate-400">Withdraw: <strong className="text-cyan-300">{params.withdrawPct}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span className="text-slate-400">Reinvest: <strong className="text-purple-300">{params.reinvestPct}%</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Total: 100%</span>
                </div>

                {/* Split Visual Progress */}
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, params.withdrawPct))}%` }}
                  />
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, params.reinvestPct))}%` }}
                  />
                </div>

                {/* Quick Split Buttons */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-500 mr-1">Split:</span>
                  {[
                    { label: '100% Reinvest', w: 0, r: 100 },
                    { label: '30W / 70R', w: 30, r: 70 },
                    { label: '50 / 50', w: 50, r: 50 },
                    { label: '70W / 30R', w: 70, r: 30 },
                    { label: '100% Withdraw', w: 100, r: 0 },
                  ].map((preset) => {
                    const isActive = params.withdrawPct === preset.w && params.reinvestPct === preset.r;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setProfitSplit(preset.w, preset.r)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Withdraw Fee */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblFee}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={params.withdrawFee}
                    onChange={(e) => updateParam('withdrawFee', parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500/60 transition-all"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-500">$</span>
                </div>
              </div>

              {/* Require Profit Enough */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblRequire}
                </label>
                <select
                  value={params.requireProfit ? 'yes' : 'no'}
                  onChange={(e) => updateParam('requireProfit', e.target.value === 'yes')}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all cursor-pointer"
                >
                  <option value="yes">{t.yes}</option>
                  <option value="no">{t.no}</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblStartDate}
                </label>
                <input
                  type="date"
                  value={params.startDate}
                  onChange={(e) => updateParam('startDate', e.target.value)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>

              {/* Trading Days Only / Exclude Weekends */}
              <div className="col-span-2">
                <label className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#111726]/80 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    checked={params.excludeWeekends ?? true}
                    onChange={(e) => updateParam('excludeWeekends', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500/30 bg-slate-900 cursor-pointer accent-cyan-400"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-slate-200 font-medium block">
                      {t.lblExcludeWeekends}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Calculates realistic market trading sessions (skips Saturday & Sunday)
                    </span>
                  </div>
                </label>
              </div>

              {/* Project Name */}
              <div className="col-span-2">
                <label className="text-slate-400 text-xs mb-1.5 block font-medium">
                  {t.lblProjectName}
                </label>
                <input
                  type="text"
                  value={params.projectName}
                  onChange={(e) => updateParam('projectName', e.target.value)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Equity Scaling (Lot Size Rule) Card */}
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/10 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="font-heading font-semibold text-emerald-300 text-sm">
                  {t.equityScaling}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Tier {finalTier}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">
                  {t.lblBaseEquity}
                </label>
                <input
                  type="number"
                  step="100"
                  value={params.baseEquity}
                  onChange={(e) => updateParam('baseEquity', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">
                  {t.lblBaseLot}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={params.baseLotSize}
                  onChange={(e) => updateParam('baseLotSize', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-1.5 block">
                  {t.lblLotIncrement}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={params.lotIncrement}
                  onChange={(e) => updateParam('lotIncrement', parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="flex items-end">
                <div className="w-full rounded-lg bg-slate-950/60 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                  <div className="flex items-center gap-1 text-slate-400 mb-0.5 text-[10px]">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>{t.scalingRule} {params.lotIncrement}</span>
                  </div>
                  <div className="font-mono font-bold text-xs">
                    Lot: <span className="text-cyan-300">{currentLot.toFixed(4)}</span> → End: <span className="text-emerald-400">{result.summary.finalLot.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={onRunSimulation}
              className="flex-1 min-w-[130px] flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>{t.runBtn}</span>
            </button>

            <button
              onClick={onClear}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
              title="Reset defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.clearBtn}</span>
            </button>

            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 border text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 hover:border-purple-500/40 text-purple-300 hover:text-purple-200'
              }`}
              title="Save to History"
            >
              {saveSuccess ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saveSuccess ? 'Saved!' : t.saveResult}</span>
            </button>

            <button
              onClick={() => exportSimulationToCSV(result, activeInvestorName, branding)}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 hover:text-cyan-200 text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
              title="Export as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportCsv}</span>
            </button>

            <button
              onClick={() => exportSimulationToPDF(result, activeInvestorName, branding)}
              className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs py-2.5 px-3 rounded-xl transition-all cursor-pointer"
              title="Export as PDF Report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.exportPdf}</span>
            </button>
          </div>
        </div>

        {/* Right Dashboard & Analytics (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Performance 6-Card Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total Profit */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelTotalProfit}</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-heading font-bold text-lg text-emerald-400 font-mono">
                +${result.summary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Total Withdrawn */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelTotalWithdraw}</span>
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="font-heading font-bold text-lg text-cyan-400 font-mono">
                ${result.summary.totalWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Total Fee */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelTotalFee}</span>
                <Info className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="font-heading font-bold text-lg text-amber-400 font-mono">
                ${result.summary.totalFee.toFixed(2)}
              </div>
            </div>

            {/* Net Profit */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelNetProfit}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="font-heading font-bold text-lg text-emerald-300 font-mono">
                +${result.summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Final Capital */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelFinalCapital}</span>
                <Layers className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="font-heading font-bold text-lg text-purple-300 font-mono">
                ${result.summary.finalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Growth % */}
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 shadow-md">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                <span>{t.labelGrowth}</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="font-heading font-bold text-lg text-cyan-300 font-mono">
                +{result.summary.growthPct.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Interactive Charts Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {chartTab === 'equity' ? 'Equity Growth & Withdrawals' : 'Daily Profit Distribution'}
                </span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setChartTab('equity')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartTab === 'equity'
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Growth Curve
                </button>
                <button
                  onClick={() => setChartTab('profit')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    chartTab === 'profit'
                      ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Daily Profit
                </button>
              </div>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartTab === 'equity' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#70d6ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#70d6ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWithdraw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64dfdf" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#64dfdf" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                      }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      name="End Equity ($)"
                      stroke="#70d6ff"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorEquity)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cumWithdraw"
                      name="Cum. Withdrawn ($)"
                      stroke="#64dfdf"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorWithdraw)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.5rem',
                        fontSize: '11px',
                      }}
                      formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="profit" name="Daily Profit ($)" fill="#10b981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="withdraw" name="Daily Withdraw ($)" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scaling Milestones / Log Accordion */}
          {result.scalingLog.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  {t.scalingMilestones} ({result.scalingLog.length})
                </span>
                <span className="text-[10px] text-slate-400">Auto Lot Increases</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
                {result.scalingLog.map((log, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 text-slate-300 text-[11px] flex items-center justify-between"
                  >
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Daily Simulation Results Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-sm text-slate-100">
                {t.statsTitle} — {result.summary.projectName}
              </h3>
              {result.summary.excludeWeekends && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Mon–Fri Only
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {result.summary.startDate} to {result.summary.endDate} • <strong className="text-cyan-300">{result.summary.tradingDays || result.summary.days} {t.tradingDaysLabel}</strong> ({result.summary.calendarDays || result.summary.days} {t.calendarDaysLabel})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Final Balance: </span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              ${result.summary.finalCapital.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
            </span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#111726] sticky top-0 z-10 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">{t.day}</th>
                <th className="py-2.5 px-3">{t.date}</th>
                <th className="py-2.5 px-3 text-right">{t.equity}</th>
                <th className="py-2.5 px-3 text-center">{t.lotSize}</th>
                <th className="py-2.5 px-3 text-right">{t.profitPct}</th>
                <th className="py-2.5 px-3 text-right">{t.profit}</th>
                <th className="py-2.5 px-3 text-right">{t.afterProfit}</th>
                <th className="py-2.5 px-3 text-right">{t.withdraw}</th>
                <th className="py-2.5 px-3 text-right">{t.reinvest}</th>
                <th className="py-2.5 px-3 text-right font-semibold">{t.endEquity}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {result.rows.map((row) => (
                <tr
                  key={row.day}
                  className="hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-2 px-3 text-slate-400">Day {row.day}</td>
                  <td className="py-2 px-3">
                    <span className="text-slate-200">{row.date}</span>
                    {row.dayOfWeek && (
                      <span className="ml-1.5 text-[10px] text-cyan-400 font-semibold px-1 py-0.2 rounded bg-cyan-950/40 border border-cyan-800/40">
                        {row.dayOfWeek}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-200">
                    ${row.startEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                      {row.lotSize.toFixed(4)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    {row.profitPct.toFixed(2)}%
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-300 font-medium">
                    +${row.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    ${row.afterProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2 px-3 text-right text-cyan-400">
                    {row.withdraw > 0 ? `$${row.withdraw.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-purple-300">
                    ${row.reinvest.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-100">
                    ${row.endEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
