import React, { useState } from 'react';
import {
  TradingCalculationInputs,
  TradingCalculationOutputs,
  SavedPreset,
  Translations,
  TradeDirection,
  RiskMode,
  DCAScalingType,
} from '../types';
import {
  calculateGoldTrade,
  exportGoldCalculationToCSV,
  DEFAULT_GOLD_INPUTS,
  DEFAULT_GOLD_PRESETS,
} from '../utils/calculations';
import { safeStorage } from '../utils/safeStorage';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Percent,
  Layers,
  ArrowRight,
  Download,
  RotateCcw,
  Sparkles,
  Target,
  Sliders,
  DollarSign,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';

interface GoldCalculatorViewProps {
  t: Translations;
}

export const GoldCalculatorView: React.FC<GoldCalculatorViewProps> = ({ t }) => {
  const [inputs, setInputs] = useState<TradingCalculationInputs>(() => {
    return safeStorage.getJSON<TradingCalculationInputs>('snl_gold_inputs', DEFAULT_GOLD_INPUTS);
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Save to safeStorage when changed
  const updateInputs = (partial: Partial<TradingCalculationInputs>) => {
    setInputs((prev) => {
      const updated = { ...prev, ...partial };
      safeStorage.setJSON('snl_gold_inputs', updated);
      return updated;
    });
  };

  const outputs: TradingCalculationOutputs = calculateGoldTrade(inputs);

  const applyPreset = (preset: SavedPreset) => {
    setActivePresetId(preset.id);
    const merged = { ...inputs, ...preset.inputs };
    updateInputs(merged);
  };

  const resetDefaults = () => {
    setActivePresetId(null);
    updateInputs(DEFAULT_GOLD_INPUTS);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-bold">
            <Coins className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
                <span>{t.goldCalcTitle}</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-semibold">
                  XAUUSD
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {t.goldCalcSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportGoldCalculationToCSV(inputs, outputs)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCalc}</span>
          </button>
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Preset Strategy Cards */}
      <div className="bg-[#0c111e]/90 rounded-2xl border border-slate-800/80 p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.presetsTitle}</span>
          </div>
          <span className="text-[11px] text-slate-500">Click to apply instant trading configuration</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEFAULT_GOLD_PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="font-heading font-semibold text-xs text-slate-200 truncate">
                  {p.name}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-Column Layout: Inputs & Calculated Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Inputs (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg space-y-5">
            {/* Direction Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>{t.lblDirection}</span>
                <span className="text-[11px] font-normal text-slate-400">Position Type</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateInputs({ direction: 'BUY' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    inputs.direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>BUY (LONG)</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateInputs({ direction: 'SELL' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    inputs.direction === 'SELL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                  <span>SELL (SHORT)</span>
                </button>
              </div>
            </div>

            {/* Account Settings */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                <span>Account & Risk</span>
              </div>

              {/* Balance */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{t.lblBalance}</span>
                  <span className="font-mono text-cyan-300">${inputs.balance.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  value={inputs.balance}
                  onChange={(e) => updateInputs({ balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500/50"
                  step="100"
                  min="10"
                />
              </div>

              {/* Risk Mode Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateInputs({ riskMode: 'percent' })}
                  className={`text-xs py-1.5 px-3 rounded-lg border font-medium transition-all ${
                    inputs.riskMode === 'percent'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  % Risk per Trade
                </button>
                <button
                  type="button"
                  onClick={() => updateInputs({ riskMode: 'fixed' })}
                  className={`text-xs py-1.5 px-3 rounded-lg border font-medium transition-all ${
                    inputs.riskMode === 'fixed'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  Fixed $ Amount
                </button>
              </div>

              {/* Risk Input */}
              {inputs.riskMode === 'percent' ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t.lblRiskPct}</span>
                    <span className="font-mono text-amber-300">{inputs.riskPercent}% (${((inputs.balance * inputs.riskPercent) / 100).toFixed(2)})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0.25"
                      max="10"
                      step="0.25"
                      value={inputs.riskPercent}
                      onChange={(e) => updateInputs({ riskPercent: parseFloat(e.target.value) || 1 })}
                      className="flex-1 accent-amber-400 cursor-pointer"
                    />
                    <input
                      type="number"
                      value={inputs.riskPercent}
                      onChange={(e) => updateInputs({ riskPercent: parseFloat(e.target.value) || 1 })}
                      className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono text-center"
                      step="0.25"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{t.lblRiskAmount}</span>
                    <span className="font-mono text-amber-300">${inputs.riskAmount.toFixed(2)}</span>
                  </div>
                  <input
                    type="number"
                    value={inputs.riskAmount}
                    onChange={(e) => updateInputs({ riskAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500/50"
                    step="10"
                  />
                </div>
              )}

              {/* Leverage & Spread */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t.lblLeverage}</label>
                  <select
                    value={inputs.leverage}
                    onChange={(e) => updateInputs({ leverage: parseInt(e.target.value) || 500 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                  >
                    <option value={100}>1:100</option>
                    <option value={200}>1:200</option>
                    <option value={500}>1:500 (Standard)</option>
                    <option value={1000}>1:1000</option>
                    <option value={2000}>1:2000</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">{t.lblSpread}</label>
                  <input
                    type="number"
                    value={inputs.spreadPips}
                    onChange={(e) => updateInputs({ spreadPips: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/50"
                    step="0.5"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Price Targets */}
            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                <span>Price Levels (XAUUSD)</span>
              </div>

              {/* Entry Price */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{t.lblEntryPrice}</span>
                  <span className="text-[11px] text-slate-500">Market / Limit</span>
                </div>
                <input
                  type="number"
                  value={inputs.entryPrice}
                  onChange={(e) => updateInputs({ entryPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-cyan-500/50 font-bold"
                  step="0.5"
                />
              </div>

              {/* Stop Loss Price */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="text-rose-300 font-medium">{t.lblStopLoss}</span>
                  <span className="font-mono text-[11px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    {outputs.slDistancePips} Pips (${outputs.slDistancePrice.toFixed(2)})
                  </span>
                </div>
                <input
                  type="number"
                  value={inputs.stopLossPrice}
                  onChange={(e) => updateInputs({ stopLossPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900/80 border border-rose-900/40 rounded-xl px-3 py-2 text-sm text-rose-200 font-mono focus:outline-none focus:border-rose-500/50 font-bold"
                  step="0.5"
                />
              </div>

              {/* Take Profit 1 Price */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="text-emerald-300 font-medium">{t.lblTakeProfit} (TP1)</span>
                  <span className="font-mono text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {outputs.tpDistancePips} Pips | 1:{outputs.riskRewardRatio} R:R
                  </span>
                </div>
                <input
                  type="number"
                  value={inputs.takeProfitPrice}
                  onChange={(e) => updateInputs({ takeProfitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900/80 border border-emerald-900/40 rounded-xl px-3 py-2 text-sm text-emerald-200 font-mono focus:outline-none focus:border-emerald-500/50 font-bold"
                  step="0.5"
                />
              </div>

              {/* Extended TP2 & TP3 */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">TP2 Extended ($)</label>
                  <input
                    type="number"
                    value={inputs.takeProfitPrice2 || ''}
                    onChange={(e) => updateInputs({ takeProfitPrice2: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                    placeholder="Optional TP2"
                    step="0.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">TP3 Runner ($)</label>
                  <input
                    type="number"
                    value={inputs.takeProfitPrice3 || ''}
                    onChange={(e) => updateInputs({ takeProfitPrice3: parseFloat(e.target.value) || undefined })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                    placeholder="Optional TP3"
                    step="0.5"
                  />
                </div>
              </div>
            </div>

            {/* Custom Lot Override */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.useCustomLot}
                    onChange={(e) => updateInputs({ useCustomLot: e.target.checked })}
                    className="accent-amber-500 rounded cursor-pointer"
                  />
                  <span>Manual Lot Override</span>
                </label>
                {inputs.useCustomLot && (
                  <span className="text-[10px] text-amber-400 font-mono">Custom Sizing Active</span>
                )}
              </div>

              {inputs.useCustomLot && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputs.customLotSize || 0.01}
                    onChange={(e) => updateInputs({ customLotSize: parseFloat(e.target.value) || 0.01 })}
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-amber-200 font-mono font-bold"
                    step="0.01"
                    min="0.01"
                  />
                  <span className="text-xs text-slate-400 font-mono">Lots</span>
                </div>
              )}
            </div>

            {/* DCA Ladder Parameters */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>DCA Grid Settings</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Layers (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={inputs.dcaLayers}
                    onChange={(e) => updateInputs({ dcaLayers: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Step Distance (Pips)</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={inputs.dcaStepPips}
                    onChange={(e) => updateInputs({ dcaStepPips: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Scaling Type</label>
                  <select
                    value={inputs.dcaScalingType}
                    onChange={(e) => updateInputs({ dcaScalingType: e.target.value as DCAScalingType })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value="linear">Linear (+step)</option>
                    <option value="multiplier">Multiplier (x1.5)</option>
                    <option value="martingale">Martingale (x2.0)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">Basket TP (Pips)</label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={inputs.dcaTakeProfitPips}
                    onChange={(e) => updateInputs({ dcaTakeProfitPips: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Calculations Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Recommended Lot & Risk Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#121929] via-[#0d1424] to-[#080d18] p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {t.recommendedLot}
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-heading font-extrabold text-4xl text-amber-300 font-mono">
                    {outputs.actualLot.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Standard Lots ({outputs.actualLot * 100} oz)</span>
                </div>
              </div>

              <div className="text-right sm:text-right space-y-1">
                <div className="text-xs text-slate-400">Max Risk Allowed</div>
                <div className="font-mono text-lg font-bold text-rose-400">
                  -${outputs.moneyAtRisk.toFixed(2)} ({outputs.riskPercentActual}%)
                </div>
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[11px] text-slate-400">{t.riskReward}</div>
                <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                  1 : {outputs.riskRewardRatio}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Target ratio</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[11px] text-slate-400">{t.potentialProfit}</div>
                <div className="font-mono text-base font-bold text-emerald-300 mt-0.5">
                  +${outputs.potentialProfitTP1.toFixed(2)}
                </div>
                <div className="text-[10px] text-emerald-500 mt-0.5">+{outputs.potentialRoiTP1}% ROI</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[11px] text-slate-400">{t.marginReq}</div>
                <div className="font-mono text-base font-bold text-cyan-300 mt-0.5">
                  ${outputs.marginRequired.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">1:{inputs.leverage} Lev</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                <div className="text-[11px] text-slate-400">{t.pipValue}</div>
                <div className="font-mono text-base font-bold text-slate-200 mt-0.5">
                  ${outputs.pipValue.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">per 0.10$ move</div>
              </div>
            </div>
          </div>

          {/* Account Health & Margin Safety Indicator */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Account Margin & Liquidation Safety</span>
              </h3>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  outputs.marginLevel > 500
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : outputs.marginLevel > 200
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                }`}
              >
                Margin Level: {outputs.marginLevel.toFixed(0)}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Free Margin Remaining</div>
                <div className="font-mono text-sm font-bold text-slate-100 mt-1">
                  ${outputs.freeMargin.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Breakeven Price (Spread)</div>
                <div className="font-mono text-sm font-bold text-cyan-300 mt-1">
                  ${outputs.breakevenPrice.toFixed(2)}
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Recovery Reverse Lot</div>
                <div className="font-mono text-sm font-bold text-amber-300 mt-1">
                  {outputs.reverseTargetRecoveryLot.toFixed(2)} Lots
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Target TP Comparison */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg space-y-3">
            <h3 className="font-heading font-semibold text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Target Profit Scenarios</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400 font-bold">TP1 Target</span>
                  <span className="font-mono text-slate-400">${inputs.takeProfitPrice.toFixed(2)}</span>
                </div>
                <div className="font-mono text-lg font-bold text-emerald-300">
                  +${outputs.potentialProfitTP1.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  1:{outputs.riskRewardRatio} R:R ({outputs.tpDistancePips} Pips)
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-400 font-semibold">TP2 Extended</span>
                  <span className="font-mono text-slate-400">
                    ${(inputs.takeProfitPrice2 || inputs.takeProfitPrice + 10).toFixed(2)}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-cyan-300">
                  +${outputs.potentialProfitTP2.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Extended expansion target
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-400 font-semibold">TP3 Runner</span>
                  <span className="font-mono text-slate-400">
                    ${(inputs.takeProfitPrice3 || inputs.takeProfitPrice + 25).toFixed(2)}
                  </span>
                </div>
                <div className="font-mono text-lg font-bold text-purple-300">
                  +${outputs.potentialProfitTP3.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Full trend runner target
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DCA Multi-Entry Position Ladder Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-slate-100">
                {t.dcaLadder} (Grid Averaging)
              </h2>
              <p className="text-xs text-slate-400">
                Multi-layer entry projections, average price shifts, and basket exit calculations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span>
              Total Basket Lots: <strong className="text-amber-300">{outputs.totalDcaLots}</strong>
            </span>
            <span>•</span>
            <span>
              Total Margin: <strong className="text-cyan-300">${outputs.totalDcaMargin.toFixed(2)}</strong>
            </span>
            <span>•</span>
            <span>
              Basket Net Profit: <strong className="text-emerald-400">+${outputs.dcaTotalProfitAtTp.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-[#111728] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3.5">{t.layer}</th>
                <th className="py-3 px-3.5">Entry Price ($)</th>
                <th className="py-3 px-3.5">Pips from #1</th>
                <th className="py-3 px-3.5">Layer Lot</th>
                <th className="py-3 px-3.5">Cum. Lots</th>
                <th className="py-3 px-3.5">{t.avgPrice} ($)</th>
                <th className="py-3 px-3.5">Layer Margin ($)</th>
                <th className="py-3 px-3.5">Drawdown ($)</th>
                <th className="py-3 px-3.5">Basket TP ($)</th>
                <th className="py-3 px-3.5">Profit at TP ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {outputs.ladderRows.map((row) => (
                <tr
                  key={row.layer}
                  className={`hover:bg-slate-800/40 transition-colors ${
                    row.layer === 1 ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="py-2.5 px-3.5 font-bold text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px]">
                      #{row.layer}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-semibold text-slate-100">
                    ${row.entryPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-400">
                    {row.pipsFromFirst} pips
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-amber-300">
                    {row.lotSize.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-300">
                    {row.cumulativeLots.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 font-semibold text-cyan-300">
                    ${row.avgEntryPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 text-slate-400">
                    ${row.marginRequired.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 text-rose-400 font-medium">
                    -${row.drawdownAtCurrent.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 font-semibold text-emerald-400">
                    ${row.targetTpPrice.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3.5 font-bold text-emerald-300">
                    +${row.profitAtTp.toFixed(2)}
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
