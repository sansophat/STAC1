import React, { useState } from 'react';
import {
  GoldSpreadsheetInputs,
  GoldSpreadsheetOutputs,
  Translations,
} from '../types';
import {
  calculateGoldSpreadsheet,
  exportGoldSpreadsheetToCSV,
  DEFAULT_GOLD_SPREADSHEET_INPUTS,
} from '../utils/calculations';
import { safeStorage } from '../utils/safeStorage';
import {
  Table,
  Calculator,
  Download,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Target,
  Layers,
  TrendingUp,
  DollarSign,
  Percent,
  Hash,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';

interface SpreadsheetViewProps {
  t: Translations;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({ t }) => {
  const isKm = t.langToggle === 'English' || t.day === 'ថ្ងៃ';
  const [inputs, setInputs] = useState<GoldSpreadsheetInputs>(() => {
    return safeStorage.getJSON<GoldSpreadsheetInputs>('snl_spreadsheet_inputs', DEFAULT_GOLD_SPREADSHEET_INPUTS);
  });

  const [copied, setCopied] = useState(false);

  const updateInputs = (partial: Partial<GoldSpreadsheetInputs>) => {
    setInputs((prev) => {
      const updated = { ...prev, ...partial };
      safeStorage.setJSON('snl_spreadsheet_inputs', updated);
      return updated;
    });
  };

  const outputs: GoldSpreadsheetOutputs = calculateGoldSpreadsheet(inputs);

  const handleReset = () => {
    updateInputs(DEFAULT_GOLD_SPREADSHEET_INPUTS);
  };

  const handleCopySummary = () => {
    const summary = `--- SNL GOLD FORMULA CALCULATION ---
BALANCE: $${outputs.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
THRESHOLD: ${outputs.thresholdPct}% ($${outputs.thresholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
MAX POSITION: ${outputs.maxPosition}
TARGET: ${outputs.targetPct}% ($${outputs.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})
LOTSIZE: ${outputs.lotSize}
REVERSE: $${outputs.reverseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
EQUITY: $${outputs.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
Risk per Position: $${outputs.riskPerPosition}
Target per Position: $${outputs.targetPerPosition}
Total Lot Volume: ${outputs.totalLotVolume} Lots`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets: { name: string; desc: string; values: Partial<GoldSpreadsheetInputs> }[] = [
    {
      name: isKm ? 'រូបមន្តដើម ($12,022)' : 'Original Formula ($12,022)',
      desc: isKm ? 'ហានិភ័យ 30%, កូតា 500, គោលដៅ 11.5%, Lot 0.01' : '30% Threshold, 500 Max Pos, 11.5% Target, 0.01 Lot',
      values: {
        balance: 12022.0,
        thresholdPct: 30.0,
        maxPosition: 500,
        targetPct: 11.5,
        lotSize: 0.01,
        autoReverseMatch: true,
      },
    },
    {
      name: isKm ? 'គណនីពង្រីក $5,000' : '$5,000 Scaling Account',
      desc: isKm ? 'ហានិភ័យ 25% ($1,250), កូតា 250, គោលដៅ 10% ($500), Lot 0.01' : '25% Threshold ($1,250), 250 Max Pos, 10% Target ($500), 0.01 Lot',
      values: {
        balance: 5000.0,
        thresholdPct: 25.0,
        maxPosition: 250,
        targetPct: 10.0,
        lotSize: 0.01,
        autoReverseMatch: true,
      },
    },
    {
      name: isKm ? 'គណនី Pro $20,000' : '$20,000 Pro Account',
      desc: isKm ? 'ហានិភ័យ 30% ($6,000), កូតា 1000, គោលដៅ 12% ($2,400), Lot 0.02' : '30% Threshold ($6,000), 1000 Max Pos, 12% Target ($2,400), 0.02 Lot',
      values: {
        balance: 20000.0,
        thresholdPct: 30.0,
        maxPosition: 1000,
        targetPct: 12.0,
        lotSize: 0.02,
        autoReverseMatch: true,
      },
    },
    {
      name: isKm ? 'ហានិភ័យទាប 15%' : 'Conservative 15% Risk',
      desc: isKm ? 'ហានិភ័យ 15%, កូតា 300, គោលដៅ 8%, Lot 0.01' : '15% Threshold, 300 Max Pos, 8% Target, 0.01 Lot',
      values: {
        balance: 10000.0,
        thresholdPct: 15.0,
        maxPosition: 300,
        targetPct: 8.0,
        lotSize: 0.01,
        autoReverseMatch: true,
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 via-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-bold">
            <Table className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-bold text-xl text-slate-100 flex items-center gap-2">
                <span>{isKm ? 'សន្លឹកគណនារូបមន្តមាស' : 'Gold Formula Calculation Sheet'}</span>
                <span className="text-[11px] bg-yellow-400 text-slate-950 font-bold px-2 py-0.5 rounded-md font-mono">
                  {isKm ? 'គំរូផ្ទាល់' : 'LIVE MODEL'}
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              {isKm
                ? 'ប្រព័ន្ធគណនាសន្លឹកកិច្ចការអន្តរកម្ម៖ សមតុល្យ, ភាគរយហានិភ័យ Threshold, ចំនួន Position អតិបរមា, ភាគរយគោលដៅ, ទំហំ Lot, ការគណនា Reverse & Equity'
                : 'Interactive spreadsheet engine: Balance, Threshold Risk %, Max Position count, Target %, Lot size, Reverse & Equity calculations.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (isKm ? 'បានចម្លង!' : 'Copied!') : (isKm ? 'ចម្លងសង្ខេប' : 'Copy Summary')}</span>
          </button>

          <button
            onClick={() => exportGoldSpreadsheetToCSV(inputs, outputs)}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isKm ? 'ទាញយក CSV' : 'Export CSV'}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isKm ? 'កំណត់ឡើងវិញ' : 'Reset Default'}</span>
          </button>
        </div>
      </div>

      {/* Preset Strategy Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.map((p, idx) => (
          <button
            key={idx}
            onClick={() => updateInputs(p.values)}
            className="text-left p-3.5 rounded-xl border border-slate-800/80 bg-[#0c111e]/90 hover:border-amber-500/50 hover:bg-slate-900/90 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-xs text-slate-200 group-hover:text-amber-300 transition-colors">
                {p.name}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
              {p.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Main Grid: Visual Spreadsheet Table vs Interactive Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Excel Spreadsheet Style (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/95 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Table className="w-4 h-4 text-yellow-400" />
                <span>{isKm ? 'ទិដ្ឋភាពក្រឡាសន្លឹកការងារ' : 'Spreadsheet Grid View'}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">{isKm ? 'រូបមន្តធ្វើសមកាលកម្មផ្ទាល់' : 'Live Sync Formula'}</span>
            </div>

            {/* Exact Spreadsheet Layout from User's Screenshot */}
            <div className="bg-white rounded-xl p-4 shadow-inner overflow-x-auto text-slate-900 font-mono text-sm border-2 border-slate-300">
              <table className="w-full border-collapse">
                <tbody>
                  {/* Row 1: BALANCE */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right w-1/3">
                      {isKm ? 'សមតុល្យ (BALANCE)' : 'BALANCE'}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 w-8 text-center">
                      $
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base">
                      {outputs.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 w-1/4"></td>
                  </tr>

                  {/* Row 2: THRESHOLD */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right">
                      {isKm ? 'កម្រិតហានិភ័យ (THRESHOLD)' : 'THRESHOLD'}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center">
                      {outputs.thresholdPct}%
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center w-8">
                      $
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base">
                      {outputs.thresholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Row 3: MAX POSITION */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right">
                      {isKm ? 'ចំនួនអតិបរមា (MAX POSITION)' : 'MAX POSITION'}
                    </td>
                    <td className="py-2.5 px-2"></td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base" colSpan={2}>
                      {outputs.maxPosition.toLocaleString()}
                    </td>
                  </tr>

                  {/* Row 4: TARGET */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right">
                      {isKm ? 'គោលដៅ (TARGET)' : 'TARGET'}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center">
                      {outputs.targetPct}%
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center w-8">
                      $
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base">
                      {outputs.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Row 5: LOTSIZE */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right">
                      {isKm ? 'ទំហំ LOT (LOTSIZE)' : 'LOTSIZE'}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center">
                      $
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base" colSpan={2}>
                      {outputs.lotSize}
                    </td>
                  </tr>

                  {/* Row 6: REVERSE */}
                  <tr className="border-b border-slate-200">
                    <td className="py-2.5 px-4 font-bold text-slate-800 tracking-wider text-right">
                      {isKm ? 'បម្រុងទុក (REVERSE)' : 'REVERSE'}
                    </td>
                    <td className="py-2.5 px-2 font-semibold text-slate-700 text-center">
                      $
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 text-right text-base" colSpan={2}>
                      {outputs.reverseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Row 7: EQUITY (Yellow Highlighted with Red Bold Text) */}
                  <tr className="bg-[#ffff00] border-2 border-yellow-500">
                    <td className="py-3 px-4 font-black text-slate-950 tracking-wider text-right text-base">
                      {isKm ? 'ទ្រព្យសកម្មសុទ្ធ (EQUITY)' : 'EQUITY'}
                    </td>
                    <td className="py-3 px-2 font-black text-red-600 text-center text-lg">
                      $
                    </td>
                    <td className="py-3 px-4 font-black text-red-600 text-right text-xl" colSpan={2}>
                      {outputs.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quick Formula Explainers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block font-semibold">{isKm ? 'រូបមន្តកម្រិតហានិភ័យ៖' : 'Threshold Formula:'}</span>
                <code className="text-amber-300 font-mono text-[11px]">
                  {isKm ? 'សមតុល្យ' : 'Balance'} ({outputs.balance.toLocaleString()}) × {outputs.thresholdPct}% = ${outputs.thresholdAmount.toLocaleString()}
                </code>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block font-semibold">{isKm ? 'រូបមន្តទ្រព្យសកម្មសុទ្ធ៖' : 'Equity Formula:'}</span>
                <code className="text-emerald-400 font-mono text-[11px]">
                  {isKm ? 'សមតុល្យ' : 'Balance'} ({outputs.balance.toLocaleString()}) + {isKm ? 'គោលដៅ' : 'Target'} (${outputs.targetAmount.toLocaleString()}) = ${outputs.equity.toLocaleString()}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Parameter Tuning & Analytical Breakdown (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/95 p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>{isKm ? 'ការបញ្ចូលប៉ារ៉ាម៉ែត្រ' : 'Parameter Inputs'}</span>
              </div>
              <span className="text-[11px] text-cyan-400 font-mono">{isKm ? 'ការគណនាផ្ទាល់ភ្លាមៗ' : 'Real-time Calculation'}</span>
            </div>

            <div className="space-y-4">
              {/* BALANCE Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isKm ? 'សមតុល្យ ($)' : 'Balance ($)'}</span>
                  </label>
                  <span className="font-mono text-cyan-300 font-bold">${inputs.balance.toLocaleString()}</span>
                </div>
                <input
                  type="number"
                  step="100"
                  value={inputs.balance}
                  onChange={(e) => updateInputs({ balance: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm font-bold"
                />
              </div>

              {/* THRESHOLD % & MAX POSITION Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isKm ? 'កម្រិតហានិភ័យ (%)' : 'Threshold (%)'}</span>
                    </label>
                    <span className="font-mono text-amber-300">{inputs.thresholdPct}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={inputs.thresholdPct}
                    onChange={(e) => updateInputs({ thresholdPct: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm font-bold"
                  />
                  <span className="text-[11px] text-slate-400 block font-mono">
                    = ${outputs.thresholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isKm ? 'ចំនួន Position អតិបរមា' : 'Max Position'}</span>
                    </label>
                    <span className="font-mono text-purple-300">{inputs.maxPosition}</span>
                  </div>
                  <input
                    type="number"
                    step="50"
                    min="1"
                    value={inputs.maxPosition}
                    onChange={(e) => updateInputs({ maxPosition: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-purple-500/50 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm font-bold"
                  />
                  <span className="text-[11px] text-slate-400 block font-mono">
                    = ${outputs.riskPerPosition} / position
                  </span>
                </div>
              </div>

              {/* TARGET % & LOT SIZE Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isKm ? 'គោលដៅ (%)' : 'Target (%)'}</span>
                    </label>
                    <span className="font-mono text-emerald-300">{inputs.targetPct}%</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    value={inputs.targetPct}
                    onChange={(e) => updateInputs({ targetPct: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm font-bold"
                  />
                  <span className="text-[11px] text-slate-400 block font-mono">
                    = ${outputs.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <label className="text-slate-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{isKm ? 'ទំហំ Lot' : 'Lot Size'}</span>
                    </label>
                    <span className="font-mono text-cyan-300">{inputs.lotSize}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="200"
                    value={inputs.lotSize}
                    onChange={(e) =>
                      updateInputs({
                        lotSize: Math.min(200, Math.max(0.01, parseFloat(e.target.value) || 0.01)),
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500/50 rounded-xl px-3.5 py-2.5 text-slate-100 font-mono text-sm font-bold"
                  />
                  <span className="text-[11px] text-slate-400 block font-mono">
                    {isKm ? 'សរុប៖' : 'Total:'} {outputs.totalLotVolume} Lots
                  </span>
                </div>
              </div>

              {/* REVERSE Value */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.autoReverseMatch}
                      onChange={(e) => updateInputs({ autoReverseMatch: e.target.checked })}
                      className="accent-yellow-400 rounded cursor-pointer"
                    />
                    <span>{isKm ? 'ផ្គូផ្គងស្វ័យប្រវត្តិ Reverse ទៅ Target ($)' : 'Auto-Match Reverse to Target ($)'}</span>
                  </label>
                  <span className="font-mono text-xs text-yellow-400 font-bold">
                    ${outputs.reverseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {!inputs.autoReverseMatch && (
                  <input
                    type="number"
                    step="10"
                    value={inputs.reverseAmount || 0}
                    onChange={(e) => updateInputs({ reverseAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-yellow-500/40 rounded-xl px-3.5 py-2 text-slate-100 font-mono text-sm"
                  />
                )}
              </div>
            </div>

            {/* Performance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400">{isKm ? 'ហានិភ័យ/Pos' : 'Risk / Pos'}</span>
                <div className="font-mono text-sm font-bold text-rose-400">
                  ${outputs.riskPerPosition}
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400">{isKm ? 'គោលដៅ/Pos' : 'Target / Pos'}</span>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  ${outputs.targetPerPosition}
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400">{isKm ? 'បរិមាណសរុប' : 'Total Volume'}</span>
                <div className="font-mono text-sm font-bold text-cyan-300">
                  {outputs.totalLotVolume} Lots
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compounding Projections Table (10 Cycles) */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-sm text-slate-100">
                {isKm ? 'តារាងបូកបន្តទ្រព្យសកម្ម ១០ វដ្ត (Compounding)' : '10-Cycle Equity Compounding Schedule'}
              </h2>
              <p className="text-xs text-slate-400">
                {isKm
                  ? `គន្លងកំណើនបូកបន្តដោយអនុវត្តគោលដៅ ${inputs.targetPct}% និងកម្រិតហានិភ័យ ${inputs.thresholdPct}% ក្នុងមួយវដ្ត`
                  : `Compounding growth trajectory applying ${inputs.targetPct}% target and ${inputs.thresholdPct}% risk threshold per cycle`}
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            {isKm ? 'ការប៉ាន់ស្មានវដ្តទី ១០៖ ' : 'Cycle 10 Projected: '}<strong className="text-emerald-400">${outputs.compoundingCycles[outputs.compoundingCycles.length - 1]?.endEquity.toLocaleString()}</strong>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left font-mono">
            <thead className="bg-[#111728] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">{isKm ? 'វដ្ត' : 'Cycle'}</th>
                <th className="py-3 px-4">{isKm ? 'សមតុល្យដើម ($)' : 'Start Balance ($)'}</th>
                <th className="py-3 px-4">{isKm ? `ចំណេញគោលដៅ +${inputs.targetPct}% ($)` : `Target Profit +${inputs.targetPct}% ($)`}</th>
                <th className="py-3 px-4">{isKm ? `ហានិភ័យកម្រិត ${inputs.thresholdPct}% ($)` : `Threshold Risk ${inputs.thresholdPct}% ($)`}</th>
                <th className="py-3 px-4">{isKm ? 'ទុនចុងក្រោយ ($)' : 'End Equity ($)'}</th>
                <th className="py-3 px-4">{isKm ? 'កំណើនសរុប (%)' : 'Cumulative Gain (%)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {outputs.compoundingCycles.map((c) => (
                <tr key={c.cycle} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-bold text-slate-200">
                    {isKm ? `វដ្តទី #${c.cycle}` : `Cycle #${c.cycle}`}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-slate-100">
                    ${c.startBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-emerald-400">
                    +${c.targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 text-rose-400">
                    -${c.thresholdAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-yellow-300">
                    ${c.endEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-emerald-300">
                    +{c.gainPct}%
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
