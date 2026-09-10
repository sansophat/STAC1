import React, { useState } from 'react';
import { Investor, Translations } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Play,
  Mail,
  Phone,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  FileText,
  X,
  Check,
  Coins,
} from 'lucide-react';

interface InvestorsViewProps {
  investors: Investor[];
  onAddInvestor: (investor: Omit<Investor, 'id' | 'created_at'>) => void;
  onEditInvestor: (investor: Investor) => void;
  onDeleteInvestor: (id: string) => void;
  onSimulateForInvestor: (investor: Investor) => void;
  t: Translations;
}

const EMPTY_INVESTOR: Omit<Investor, 'id' | 'created_at'> = {
  name: '',
  email: '',
  phone: '',
  currency: 'USD',
  initial_capital: 2000,
  profit_min: 10,
  profit_max: 28,
  withdraw_pct: 30,
  reinvest_pct: 70,
  withdraw_fee: 1,
  base_equity: 2000,
  base_lot_size: 0.01,
  lot_increment: 0.01,
  notes: '',
};

export const InvestorsView: React.FC<InvestorsViewProps> = ({
  investors,
  onAddInvestor,
  onEditInvestor,
  onDeleteInvestor,
  onSimulateForInvestor,
  t,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [formData, setFormData] = useState<Omit<Investor, 'id' | 'created_at'>>(EMPTY_INVESTOR);

  const openAddModal = () => {
    setEditingInvestor(null);
    setFormData(EMPTY_INVESTOR);
    setModalOpen(true);
  };

  const openEditModal = (inv: Investor) => {
    setEditingInvestor(inv);
    setFormData({
      name: inv.name,
      email: inv.email,
      phone: inv.phone,
      initial_capital: inv.initial_capital,
      profit_min: inv.profit_min,
      profit_max: inv.profit_max,
      withdraw_pct: inv.withdraw_pct,
      reinvest_pct: inv.reinvest_pct,
      withdraw_fee: inv.withdraw_fee,
      base_equity: inv.base_equity,
      base_lot_size: inv.base_lot_size,
      lot_increment: inv.lot_increment,
      notes: inv.notes,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingInvestor) {
      onEditInvestor({
        ...editingInvestor,
        ...formData,
      });
    } else {
      onAddInvestor(formData);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl gradient-text">
              {t.investorsTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Manage accounts, customized risk profiles, and 1-click simulation parameters
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addInvestor}</span>
        </button>
      </div>

      {/* Investor Cards Grid */}
      {investors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="text-slate-400 text-sm">{t.noInvestors}</div>
          <button
            onClick={openAddModal}
            className="mt-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs px-4 py-2 rounded-lg transition-all cursor-pointer font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.addInvestor}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investors.map((inv) => (
            <div
              key={inv.id}
              className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div className="space-y-4">
                {/* Name, Currency Badge & Actions */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                          inv.currency === 'USC'
                            ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                        }`}
                      >
                        {inv.currency === 'USC' ? 'USC (Cent)' : 'USD Standard'}
                      </span>
                    </div>
                    <h3 className="font-heading font-bold text-base text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {inv.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      {inv.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          {inv.email}
                        </span>
                      )}
                      {inv.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {inv.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(inv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Edit Investor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteInvestor(inv.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="Delete Investor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capital & Parameters Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">{t.lblCapital}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-bold text-cyan-300">
                        {inv.currency === 'USC'
                          ? `${inv.initial_capital.toLocaleString()} USC`
                          : `$${inv.initial_capital.toLocaleString()} USD`}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {inv.currency === 'USC'
                          ? `≈ $${(inv.initial_capital / 100).toFixed(2)} USD`
                          : `≈ ${(inv.initial_capital * 100).toLocaleString()} USC`}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Daily Target</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {inv.profit_min}% - {inv.profit_max}%
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Withdraw / Reinvest</span>
                    <span className="text-xs font-mono text-purple-300">
                      {inv.withdraw_pct}% / {inv.reinvest_pct}%
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Base Lot / Step</span>
                    <span className="text-xs font-mono text-amber-300">
                      {inv.base_lot_size} (+{inv.lot_increment})
                    </span>
                  </div>
                </div>

                {inv.notes && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40">
                    {inv.notes}
                  </p>
                )}
              </div>

              {/* Action Button: Simulate for this investor */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => onSimulateForInvestor(inv)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{t.simulateFor}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Investor Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c111e] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-slate-100">
                {editingInvestor ? t.editInvestor : t.addInvestor}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1 font-medium">{t.investorName} *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Sokha Meng"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.investorEmail}</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="investor@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.investorPhone}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="+855 12 345 678"
                  />
                </div>

                {/* Account Currency & Type */}
                <div className="p-3 bg-[#111726]/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-cyan-400" />
                      Account Currency & Type
                    </label>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/70 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                      1 USD = 100 USC
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.currency === 'USC') {
                          // convert to USD (/ 100)
                          setFormData({
                            ...formData,
                            currency: 'USD',
                            initial_capital: parseFloat((formData.initial_capital / 100).toFixed(2)),
                            base_equity: parseFloat((formData.base_equity / 100).toFixed(2)),
                          });
                        } else {
                          setFormData({ ...formData, currency: 'USD' });
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        (formData.currency || 'USD') === 'USD'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-xs'
                          : 'bg-[#0c111e] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      USD ($ Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if ((formData.currency || 'USD') === 'USD') {
                          // convert to USC (* 100)
                          setFormData({
                            ...formData,
                            currency: 'USC',
                            initial_capital: parseFloat((formData.initial_capital * 100).toFixed(2)),
                            base_equity: parseFloat((formData.base_equity * 100).toFixed(2)),
                          });
                        } else {
                          setFormData({ ...formData, currency: 'USC' });
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        formData.currency === 'USC'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-xs'
                          : 'bg-[#0c111e] border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      USC (Cent Account ¢)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {formData.currency === 'USC'
                      ? 'Cent account: Balances are held in USC (100 USC = $1.00 USD). Ideal for DCA grid trading.'
                      : 'Standard account: Balances are held in US Dollars (USD / USDT).'}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      {t.lblCapital} ({formData.currency === 'USC' ? 'USC' : 'USD'})
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formData.currency === 'USC'
                        ? `≈ $${(formData.initial_capital / 100).toFixed(2)} USD`
                        : `≈ ${(formData.initial_capital * 100).toLocaleString()} USC`}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.initial_capital}
                    onChange={(e) => setFormData({ ...formData, initial_capital: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400">
                      {t.lblBaseEquity} ({formData.currency === 'USC' ? 'USC' : 'USD'})
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {formData.currency === 'USC'
                        ? `≈ $${(formData.base_equity / 100).toFixed(2)} USD`
                        : `≈ ${(formData.base_equity * 100).toLocaleString()} USC`}
                    </span>
                  </div>
                  <input
                    type="number"
                    step={formData.currency === 'USC' ? '1000' : '100'}
                    value={formData.base_equity}
                    onChange={(e) => setFormData({ ...formData, base_equity: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblProfitMin} (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.profit_min}
                    onChange={(e) => setFormData({ ...formData, profit_min: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblProfitMax} (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.profit_max}
                    onChange={(e) => setFormData({ ...formData, profit_max: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblWithdrawPct} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.withdraw_pct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const clampedW = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
                      setFormData({
                        ...formData,
                        withdraw_pct: clampedW,
                        reinvest_pct: Number((100 - clampedW).toFixed(2)),
                      });
                    }}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblReinvestPct} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.reinvest_pct}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      const clampedR = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
                      setFormData({
                        ...formData,
                        reinvest_pct: clampedR,
                        withdraw_pct: Number((100 - clampedR).toFixed(2)),
                      });
                    }}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-purple-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblBaseLot}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.base_lot_size}
                    onChange={(e) => setFormData({ ...formData, base_lot_size: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t.lblLotIncrement}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.lot_increment}
                    onChange={(e) => setFormData({ ...formData, lot_increment: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-slate-400 block mb-1">{t.investorNotes}</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Target return quarterly, risk conservative..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-500 text-slate-950 font-semibold text-xs hover:brightness-110 cursor-pointer"
                >
                  {t.saveInvestor}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
