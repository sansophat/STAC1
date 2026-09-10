import React from 'react';
import { SimulationResult, Translations } from '../types';
import {
  History,
  Trash2,
  Download,
  FileText,
  Play,
  Calendar,
  Layers,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { exportSimulationToCSV, exportSimulationToPDF } from '../utils/simulation';

interface HistoryViewProps {
  history: SimulationResult[];
  onLoadSimulation: (result: SimulationResult) => void;
  onDeleteHistoryItem: (id: string) => void;
  t: Translations;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onLoadSimulation,
  onDeleteHistoryItem,
  t,
}) => {
  const isKm = t.langToggle === 'English' || t.day === 'ថ្ងៃ';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-xl gradient-text">
            {t.historyTitle}
          </h1>
          <p className="text-xs text-slate-400">
            {isKm
              ? 'ការប៉ាន់ស្មានការក្លែងធ្វើដែលបានរក្សាទុក ព្រឹត្តិការណ៍ដើមទុន និងរបាយការណ៍ទាញយក'
              : 'Archived simulation projections, equity milestones, and downloadable reports'}
          </p>
        </div>
      </div>

      {/* History Items */}
      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <History className="w-6 h-6" />
          </div>
          <div className="text-slate-400 text-sm">{t.noHistory}</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isKm
              ? 'ដំណើរការការក្លែងធ្វើនៅក្នុងផ្ទាំងម៉ាស៊ីនក្លែងធ្វើ រួចចុច «រក្សាទុកលទ្ធផល» ដើម្បីរក្សាទុកនៅទីនេះ។'
              : 'Run simulations in the Simulator tab and click "Save Result" to archive projections here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg hover:border-slate-700 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-heading font-bold text-base text-slate-100">
                    {item.summary.projectName}
                  </h3>
                  {item.investor_name && (
                    <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/20 font-medium">
                      {item.investor_name}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.created_date).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {item.summary.startDate} → {item.summary.endDate} ({item.summary.days} {isKm ? 'ថ្ងៃ' : 'days'})
                  </span>
                  <span>•</span>
                  <span>
                    {isKm ? 'ដើមទុនដំបូង៖ ' : 'Initial: '}<strong className="text-slate-200">${item.summary.initialCapital.toLocaleString()}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    {isKm ? 'ចុងក្រោយ៖ ' : 'Final: '}<strong className="text-cyan-300">${item.summary.finalCapital.toLocaleString()}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold">
                    {isKm ? 'ចំណេញសុទ្ធ៖ ' : 'Net Profit: '}+${item.summary.netProfit.toLocaleString()} (+{item.summary.growthPct.toFixed(2)}%)
                  </span>
                  <span>•</span>
                  <span className="text-amber-300">
                    {isKm ? 'ឡូត៍ចុងក្រោយ៖ ' : 'Final Lot: '}{item.summary.finalLot.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end lg:self-center">
                <button
                  onClick={() => onLoadSimulation(item)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium"
                  title={isKm ? 'ផ្ទុកចូលក្នុងម៉ាស៊ីនក្លែងធ្វើ' : 'Load into Simulator'}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isKm ? 'ផ្ទុក' : 'Load'}</span>
                </button>

                <button
                  onClick={() => exportSimulationToCSV(item, item.investor_name)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-slate-100 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer"
                  title={isKm ? 'ទាញយក CSV' : 'Download CSV'}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => exportSimulationToPDF(item, item.investor_name)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer"
                  title={isKm ? 'ទាញយក PDF' : 'Download PDF'}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => onDeleteHistoryItem(item.id)}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-slate-800 hover:border-rose-500/40 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                  title={isKm ? 'លុបការក្លែងធ្វើ' : 'Delete Simulation'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
