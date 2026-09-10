import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  DollarSign,
  Coins,
  Copy,
  Check,
  Info,
  Calculator,
  PlusCircle,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Trade, Investor } from '../types';

interface CentUsdConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades?: Trade[];
  investors?: Investor[];
  initialSelectedAccount?: string;
  initialSelectedTradeId?: string;
  defaultStartEquity?: number;
  onUpdateTrade?: (trade: Trade) => void;
  onBatchConvertAccountTrades?: (investorName: string, targetCurrency: 'USD' | 'USC') => void;
  onCreateNewTrade?: (tradeData: Partial<Trade>) => void;
  onApplyToTrade?: (convertedData: {
    currency: 'USD' | 'USC';
    start_equity: number;
    end_equity: number;
    profit_amount: number;
    profit_pct: number;
  }) => void;
}

export const CentUsdConverterModal: React.FC<CentUsdConverterModalProps> = ({
  isOpen,
  onClose,
  trades = [],
  investors = [],
  initialSelectedAccount,
  initialSelectedTradeId,
  defaultStartEquity = 2000,
  onUpdateTrade,
  onBatchConvertAccountTrades,
  onCreateNewTrade,
  onApplyToTrade,
}) => {
  const [activeTab, setActiveTab] = useState<'real_data' | 'calculator'>('real_data');

  // Real data selection state
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('latest');
  const [targetCurrency, setTargetCurrency] = useState<'USD' | 'USC'>('USC');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Standalone calculator state
  const [usdInput, setUsdInput] = useState<string>('20');
  const [uscInput, setUscInput] = useState<string>('2000');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [simLot, setSimLot] = useState<number>(0.01);
  const [simPips, setSimPips] = useState<number>(50);

  // Distinct account list from investors and trades
  const accountList = useMemo(() => {
    const list: { name: string; currency: 'USD' | 'USC'; tradeCount: number }[] = [];
    investors.forEach((inv) => {
      if (inv.name !== 'General Account' && !list.some((a) => a.name === inv.name)) {
        const count = trades.filter((t) => t.investor_name === inv.name).length;
        list.push({
          name: inv.name,
          currency: inv.currency || 'USD',
          tradeCount: count,
        });
      }
    });
    trades.forEach((tr) => {
      if (tr.investor_name && tr.investor_name !== 'General Account' && !list.some((a) => a.name === tr.investor_name)) {
        const count = trades.filter((t) => t.investor_name === tr.investor_name).length;
        list.push({
          name: tr.investor_name,
          currency: tr.currency || 'USD',
          tradeCount: count,
        });
      }
    });
    return list;
  }, [investors, trades]);

  // Synchronize initial selections when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialSelectedAccount && accountList.some((a) => a.name === initialSelectedAccount)) {
      setSelectedAccountName(initialSelectedAccount);
    } else if (accountList.length > 0 && !selectedAccountName) {
      setSelectedAccountName(accountList[0].name);
    }

    if (initialSelectedTradeId) {
      setSelectedTradeId(initialSelectedTradeId);
    } else {
      setSelectedTradeId('latest');
    }
  }, [isOpen, initialSelectedAccount, initialSelectedTradeId, accountList, selectedAccountName]);

  // Current investor config and trades
  const currentInvestor = useMemo(() => {
    return investors.find((inv) => inv.name === selectedAccountName);
  }, [investors, selectedAccountName]);

  const currentAccountTrades = useMemo(() => {
    if (!selectedAccountName) return [];
    return trades
      .filter((tr) => tr.investor_name === selectedAccountName)
      .sort((a, b) => {
        const dDiff = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (dDiff !== 0) return dDiff;
        return (new Date(b.created_at || '').getTime() || 0) - (new Date(a.created_at || '').getTime() || 0);
      });
  }, [trades, selectedAccountName]);

  // Determine active recorded trade or latest balance
  const activeRecord = useMemo(() => {
    if (selectedTradeId === 'latest') {
      if (currentAccountTrades.length > 0) {
        return currentAccountTrades[0];
      }
      // If no trades exist yet, synthesize a starting baseline record from investor info
      const initCap = currentInvestor?.initial_capital || defaultStartEquity || 2000;
      const cur = currentInvestor?.currency || 'USD';
      return {
        id: 'synthetic-init',
        investor_name: selectedAccountName || 'Account',
        currency: cur,
        trade_date: new Date().toISOString().slice(0, 10),
        start_equity: initCap,
        lot_size: currentInvestor?.base_lot_size || 0.01,
        profit_pct: 15,
        profit_amount: (initCap * 15) / 100,
        withdraw: 0,
        reinvest: (initCap * 15) / 100,
        end_equity: initCap + (initCap * 15) / 100,
        notes: 'Initial Account Capital Baseline',
        created_at: new Date().toISOString(),
      } as Trade;
    }
    return currentAccountTrades.find((t) => t.id === selectedTradeId) || currentAccountTrades[0] || null;
  }, [selectedTradeId, currentAccountTrades, currentInvestor, selectedAccountName, defaultStartEquity]);

  // Source currency of the active record
  const sourceCurrency: 'USD' | 'USC' = useMemo(() => {
    if (activeRecord?.currency) return activeRecord.currency;
    if (currentInvestor?.currency) return currentInvestor.currency;
    return 'USD';
  }, [activeRecord, currentInvestor]);

  // Automatically update target currency to the opposite when source record changes
  useEffect(() => {
    setTargetCurrency(sourceCurrency === 'USD' ? 'USC' : 'USD');
  }, [sourceCurrency]);

  // Conversion factor: 1 USD = 100 USC
  // USD -> USC = * 100
  // USC -> USD = / 100 (or * 0.01)
  const factor = targetCurrency === 'USC' ? 100 : 0.01;

  const convertedData = useMemo(() => {
    if (!activeRecord) {
      return {
        start_equity: 0,
        end_equity: 0,
        profit_amount: 0,
        profit_pct: 0,
        withdraw: 0,
        reinvest: 0,
        currency: targetCurrency,
      };
    }

    return {
      start_equity: parseFloat((activeRecord.start_equity * factor).toFixed(2)),
      end_equity: parseFloat((activeRecord.end_equity * factor).toFixed(2)),
      profit_amount: parseFloat((activeRecord.profit_amount * factor).toFixed(2)),
      profit_pct: activeRecord.profit_pct,
      withdraw: parseFloat((activeRecord.withdraw * factor).toFixed(2)),
      reinvest: parseFloat((activeRecord.reinvest * factor).toFixed(2)),
      currency: targetCurrency,
    };
  }, [activeRecord, factor, targetCurrency]);

  // Handlers for real data actions
  const handleUpdateSelectedTrade = () => {
    if (!activeRecord || activeRecord.id === 'synthetic-init') {
      setToastMessage('No real trade log selected to update.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (onUpdateTrade) {
      const updated: Trade = {
        ...activeRecord,
        currency: targetCurrency,
        start_equity: convertedData.start_equity,
        end_equity: convertedData.end_equity,
        profit_amount: convertedData.profit_amount,
        profit_pct: convertedData.profit_pct,
        withdraw: convertedData.withdraw,
        reinvest: convertedData.reinvest,
        notes: activeRecord.notes
          ? `${activeRecord.notes} [Converted from ${sourceCurrency} to ${targetCurrency}]`
          : `[Converted from ${sourceCurrency} to ${targetCurrency}]`,
      };
      onUpdateTrade(updated);
      setToastMessage(`Trade ${activeRecord.trade_date} successfully converted to ${targetCurrency}!`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleCreateNewTradeFromConverted = () => {
    if (!convertedData) return;

    // The start equity for the new trade is based on the converted end equity of the recorded trade
    const nextStartEquity = convertedData.end_equity;
    const baseLot = currentInvestor?.base_lot_size || 0.01;
    const baseEq = currentInvestor?.base_equity || 2000;
    const lotInc = currentInvestor?.lot_increment || 0.01;

    // Calculate appropriate lot size
    let calculatedLot = baseLot;
    if (baseEq > 0) {
      const tiers = Math.max(0, Math.floor(nextStartEquity / baseEq) - 1);
      calculatedLot = parseFloat((baseLot + tiers * lotInc).toFixed(4));
    }

    const defaultProfitPct = currentInvestor ? (currentInvestor.profit_min + currentInvestor.profit_max) / 2 : 15;
    const profitAmount = parseFloat(((nextStartEquity * defaultProfitPct) / 100).toFixed(2));
    const withdrawPct = currentInvestor?.withdraw_pct ?? 30;
    const withdrawAmt = parseFloat(((profitAmount * withdrawPct) / 100).toFixed(2));
    const reinvestAmt = parseFloat((profitAmount - withdrawAmt).toFixed(2));
    const endEquity = parseFloat((nextStartEquity + reinvestAmt).toFixed(2));

    if (onCreateNewTrade) {
      onCreateNewTrade({
        investor_name: selectedAccountName,
        currency: targetCurrency,
        trade_date: new Date().toISOString().slice(0, 10),
        start_equity: nextStartEquity,
        lot_size: calculatedLot,
        profit_pct: defaultProfitPct,
        profit_amount: profitAmount,
        withdraw: withdrawAmt,
        reinvest: reinvestAmt,
        end_equity: endEquity,
        notes: `New trade created from real recorded data converted to ${targetCurrency} (1 USD = 100 USC)`,
      });
      onClose();
    } else if (onApplyToTrade) {
      onApplyToTrade({
        currency: targetCurrency,
        start_equity: nextStartEquity,
        end_equity: endEquity,
        profit_amount: profitAmount,
        profit_pct: defaultProfitPct,
      });
      onClose();
    }
  };

  const handleBatchConvertAccount = () => {
    if (!selectedAccountName) return;
    if (onBatchConvertAccountTrades) {
      onBatchConvertAccountTrades(selectedAccountName, targetCurrency);
      setToastMessage(`Converted all ${currentAccountTrades.length} trades for ${selectedAccountName} to ${targetCurrency}!`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Standalone Calculator methods
  const handleUsdChange = (val: string) => {
    setUsdInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setUscInput(String(Math.round(num * 100 * 100) / 100));
    } else {
      setUscInput('');
    }
  };

  const handleUscChange = (val: string) => {
    setUscInput(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      setUsdInput(String(Math.round((num / 100) * 10000) / 10000));
    } else {
      setUsdInput('');
    }
  };

  const handleSelectPreset = (usd: number) => {
    setUsdInput(String(usd));
    setUscInput(String(usd * 100));
  };

  const handleLoadRealEquityIntoCalc = () => {
    if (activeRecord) {
      if (sourceCurrency === 'USD') {
        handleUsdChange(String(activeRecord.end_equity));
      } else {
        handleUscChange(String(activeRecord.end_equity));
      }
      setActiveTab('calculator');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Lot size & pip simulator logic
  const standardPipValPerLot001 = 0.1; // $0.10 for 0.01 lot on XAUUSD
  const standardProfitUsd = simLot * 100 * standardPipValPerLot001 * simPips;
  const centProfitUsc = simLot * 100 * 0.1 * simPips;
  const centProfitInUsd = centProfitUsc / 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-[#0c111e] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 max-h-[92vh] overflow-y-auto space-y-5">
        {/* Header with Title & Formula Pill */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-heading font-bold text-slate-100">
                  Cent (USC) ⇄ USD Trade Log Converter
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono font-bold flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  1 USD = 100 Cents (USC)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Convert existing recorded Trade Logs or generate new trades based on real recorded account equity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('real_data')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'real_data'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Real Trade Log Converter</span>
              {currentAccountTrades.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {currentAccountTrades.length} Trades
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'calculator'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calculator className="w-4 h-4 text-purple-400" />
              <span>Manual Calculator & Pip Simulator</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>Rate:</span>
            <span className="text-slate-200 font-semibold">$1.00 = 100¢</span>
            <span>•</span>
            <span className="text-slate-200 font-semibold">1¢ = $0.01</span>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: REAL TRADE LOG CONVERTER */}
        {activeTab === 'real_data' && (
          <div className="space-y-4">
            {/* Account & Trade Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#111726] border border-slate-800">
              {/* Account Dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Select Investor Account (Real Data)</span>
                </label>
                <select
                  value={selectedAccountName}
                  onChange={(e) => {
                    setSelectedAccountName(e.target.value);
                    setSelectedTradeId('latest');
                  }}
                  className="w-full bg-[#0c111e] border border-slate-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  {accountList.map((acc) => (
                    <option key={acc.name} value={acc.name}>
                      {acc.name} ({acc.currency} • {acc.tradeCount} trades)
                    </option>
                  ))}
                </select>
              </div>

              {/* Trade or Balance Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Recorded Source Entry</span>
                </label>
                <select
                  value={selectedTradeId}
                  onChange={(e) => setSelectedTradeId(e.target.value)}
                  className="w-full bg-[#0c111e] border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="latest">
                    ⭐ Latest Account Balance ({currentAccountTrades[0] ? `${currentAccountTrades[0].trade_date} - ${currentAccountTrades[0].end_equity.toLocaleString()} ${sourceCurrency}` : 'Initial Baseline'})
                  </option>
                  {currentAccountTrades.map((t, idx) => (
                    <option key={t.id} value={t.id}>
                      Trade #{currentAccountTrades.length - idx}: {t.trade_date} (End: {t.end_equity.toLocaleString()} {t.currency || sourceCurrency} • Profit: +{t.profit_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side Real Data Comparison */}
            <div className="p-4 rounded-xl bg-[#111726] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">Conversion Matrix</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    (Multiplier: {factor === 100 ? '×100 USC' : '÷100 USD'})
                  </span>
                </div>

                {/* Target Currency Toggle Pill */}
                <div className="flex items-center gap-1 bg-[#0c111e] p-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-400 px-2">Convert to:</span>
                  <button
                    type="button"
                    onClick={() => setTargetCurrency('USD')}
                    className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer ${
                      targetCurrency === 'USD'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetCurrency('USC')}
                    className={`px-2.5 py-1 rounded font-bold font-mono transition-all cursor-pointer ${
                      targetCurrency === 'USC'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    USC (¢ Cent)
                  </button>
                </div>
              </div>

              {/* Dual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* SOURCE CARD */}
                <div className="p-3.5 rounded-xl bg-[#0c111e] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      {sourceCurrency === 'USD' ? (
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Coins className="w-4 h-4 text-purple-400" />
                      )}
                      <span>Real Recorded Entry ({sourceCurrency})</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        sourceCurrency === 'USD'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      Original {sourceCurrency}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Trade Date:</span>
                      <span className="font-mono text-slate-200">{activeRecord?.trade_date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Start Balance:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {activeRecord?.start_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400">{sourceCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Net Profit:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{activeRecord?.profit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400">{sourceCurrency}</span> ({activeRecord?.profit_pct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Withdrawn:</span>
                      <span className="font-mono text-slate-300">
                        {activeRecord?.withdraw.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400">{sourceCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Reinvested:</span>
                      <span className="font-mono text-slate-300">
                        {activeRecord?.reinvest.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-400">{sourceCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1.5 border-t border-slate-800/80">
                      <span className="font-semibold">End Equity:</span>
                      <span className="font-mono font-extrabold text-cyan-300 text-sm">
                        {activeRecord?.end_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-cyan-400">{sourceCurrency}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* CONVERTED TARGET CARD */}
                <div className="p-3.5 rounded-xl bg-[#0c111e] border border-cyan-500/30 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      {targetCurrency === 'USD' ? (
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Coins className="w-4 h-4 text-purple-400" />
                      )}
                      <span>Converted Equivalent ({targetCurrency})</span>
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        targetCurrency === 'USD'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                      }`}
                    >
                      1 USD = 100 USC
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Unit Value:</span>
                      <span className="font-mono text-cyan-300">
                        {targetCurrency === 'USC' ? '100 USC Cents per Dollar' : '$0.01 USD per Cent'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Converted Start:</span>
                      <span className="font-mono font-semibold text-slate-100">
                        {convertedData.start_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-cyan-400 font-bold">{targetCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Converted Profit:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{convertedData.profit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-cyan-400 font-bold">{targetCurrency}</span> ({convertedData.profit_pct}%)
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Converted Withdrawn:</span>
                      <span className="font-mono text-slate-200">
                        {convertedData.withdraw.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-cyan-400">{targetCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Converted Reinvested:</span>
                      <span className="font-mono text-slate-200">
                        {convertedData.reinvest.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-cyan-400">{targetCurrency}</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-200 pt-1.5 border-t border-slate-800/80">
                      <span className="font-semibold text-cyan-200">Converted End Equity:</span>
                      <span className="font-mono font-extrabold text-cyan-300 text-sm">
                        {convertedData.end_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                        <span className="text-xs text-cyan-400">{targetCurrency}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons with Real Data */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-400">Available Actions with Converted Data:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Action 1: Create New Trade based on converted real data */}
                  <button
                    type="button"
                    onClick={handleCreateNewTradeFromConverted}
                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/40 text-left transition-all cursor-pointer group shadow-xs"
                  >
                    <div>
                      <span className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1.5">
                        <PlusCircle className="w-4 h-4 text-cyan-400" />
                        <span>Create New Trade with Converted Data</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Opens Add Trade form using start balance {convertedData.end_equity.toLocaleString()} {targetCurrency}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
                  </button>

                  {/* Action 2: Update Selected Recorded Trade in Log */}
                  <button
                    type="button"
                    disabled={!activeRecord || activeRecord.id === 'synthetic-init'}
                    onClick={handleUpdateSelectedTrade}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      activeRecord && activeRecord.id !== 'synthetic-init'
                        ? 'bg-purple-600/15 hover:bg-purple-600/25 border-purple-500/40 cursor-pointer group'
                        : 'bg-slate-900/50 border-slate-800/80 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <span className="font-bold text-xs text-purple-300 group-hover:text-purple-200 flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-purple-400" />
                        <span>Update Selected Trade in Log</span>
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Replaces this trade's values with {targetCurrency} units in database
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 ml-2" />
                  </button>
                </div>

                {/* Batch Convert Account Option */}
                {currentAccountTrades.length > 1 && onBatchConvertAccountTrades && (
                  <div className="pt-2 flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300">
                        Batch convert all <strong className="text-cyan-300">{currentAccountTrades.length} trades</strong> of {selectedAccountName} to {targetCurrency}?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleBatchConvertAccount}
                      className="px-3 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Convert All ({targetCurrency})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL CALCULATOR & PIP SIMULATOR */}
        {activeTab === 'calculator' && (
          <div className="space-y-4">
            {/* Live Bidirectional Converter Card */}
            <div className="p-4 rounded-xl bg-[#111726] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <span>Bidirectional Live Calculator</span>
                </span>
                {activeRecord && (
                  <button
                    type="button"
                    onClick={handleLoadRealEquityIntoCalc}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Load Real Equity: {activeRecord.end_equity.toLocaleString()} {sourceCurrency}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* USD Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      Standard Dollar (USD $)
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(usdInput, 'usd')}
                      className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      title="Copy USD value"
                    >
                      {copiedKey === 'usd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'usd' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">$</span>
                    <input
                      type="number"
                      step="any"
                      value={usdInput}
                      onChange={(e) => handleUsdChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#0c111e] border border-slate-800 focus:border-emerald-500 rounded-lg pl-7 pr-3 py-2 text-sm font-mono text-emerald-300 font-bold focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">1 USD = 100 Cent (USC)</p>
                </div>

                {/* USC Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-purple-400 flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      Cent Account (USC ¢)
                    </label>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(uscInput, 'usc')}
                      className="text-[11px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      title="Copy USC value"
                    >
                      {copiedKey === 'usc' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedKey === 'usc' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={uscInput}
                      onChange={(e) => handleUscChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#0c111e] border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-sm font-mono text-purple-300 font-bold focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-purple-400/80 font-mono text-xs font-bold">USC</span>
                  </div>
                  <p className="text-[10px] text-slate-400">100 USC = 1.00 USD</p>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { usd: 10, label: '$10 = 1,000 USC' },
                    { usd: 20, label: '$20 = 2,000 USC' },
                    { usd: 50, label: '$50 = 5,000 USC' },
                    { usd: 100, label: '$100 = 10,000 USC' },
                    { usd: 200, label: '$200 = 20,000 USC' },
                    { usd: 500, label: '$500 = 50,000 USC' },
                    { usd: 1000, label: '$1,000 = 100,000 USC' },
                  ].map((p) => (
                    <button
                      key={p.usd}
                      type="button"
                      onClick={() => handleSelectPreset(p.usd)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-mono ${
                        parseFloat(usdInput) === p.usd
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apply directly */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(usdInput) || 0;
                    if (onCreateNewTrade) {
                      onCreateNewTrade({
                        currency: 'USD',
                        start_equity: val,
                        investor_name: selectedAccountName,
                      });
                      onClose();
                    } else if (onApplyToTrade) {
                      onApplyToTrade({
                        currency: 'USD',
                        start_equity: val,
                        end_equity: val * 1.15,
                        profit_amount: val * 0.15,
                        profit_pct: 15,
                      });
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-colors cursor-pointer"
                >
                  Create Trade as USD (${usdInput})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(uscInput) || 0;
                    if (onCreateNewTrade) {
                      onCreateNewTrade({
                        currency: 'USC',
                        start_equity: val,
                        investor_name: selectedAccountName,
                      });
                      onClose();
                    } else if (onApplyToTrade) {
                      onApplyToTrade({
                        currency: 'USC',
                        start_equity: val,
                        end_equity: val * 1.15,
                        profit_amount: val * 0.15,
                        profit_pct: 15,
                      });
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold hover:bg-purple-500/30 transition-colors cursor-pointer"
                >
                  Create Trade as Cent ({uscInput} USC)
                </button>
              </div>
            </div>

            {/* Pip Value Simulator */}
            <div className="p-4 rounded-xl bg-[#111726] border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span>Broker Pip Value & Lot Size Comparison (Gold XAUUSD)</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Simulate Lot Size</label>
                  <select
                    value={simLot}
                    onChange={(e) => setSimLot(parseFloat(e.target.value))}
                    className="w-full bg-[#111726] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value={0.01}>0.01 Lot</option>
                    <option value={0.02}>0.02 Lot</option>
                    <option value={0.05}>0.05 Lot</option>
                    <option value={0.1}>0.10 Lot</option>
                    <option value={0.5}>0.50 Lot</option>
                    <option value={1.0}>1.00 Lot</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Simulate Pips Movement</label>
                  <select
                    value={simPips}
                    onChange={(e) => setSimPips(parseInt(e.target.value, 10))}
                    className="w-full bg-[#111726] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10 Pips (Quick Scalp)</option>
                    <option value={25}>25 Pips</option>
                    <option value={50}>50 Pips (Intraday)</option>
                    <option value={100}>100 Pips</option>
                    <option value={200}>200 Pips (DCA Swing)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/40 border border-emerald-500/20 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    Standard USD Account
                  </span>
                  <div className="font-mono text-sm font-bold text-slate-100">
                    +${standardProfitUsd.toFixed(2)} USD
                  </div>
                  <p className="text-[10px] text-slate-400">
                    1 Pip with 0.01 lot = $0.10 USD
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/40 border border-purple-500/20 space-y-1">
                  <span className="text-[11px] font-semibold text-purple-400 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    Cent Account (USC)
                  </span>
                  <div className="font-mono text-sm font-bold text-slate-100">
                    +{centProfitUsc.toFixed(2)} USC{' '}
                    <span className="text-xs text-slate-400 font-normal">(≈ ${centProfitInUsd.toFixed(4)} USD)</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    1 Pip with 0.01 lot = 0.10 USC (≈ $0.001 USD)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Informative Guidance Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-slate-300">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-cyan-300">Real Data Conversion Rule: 1 USD = 100 Cents</p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When converting a real trade log from USD to Cent (USC), all equity amounts and profits are multiplied by 100 while percentage returns remain identical. To convert Cent to USD, amounts are divided by 100.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Converter
          </button>
        </div>
      </div>
    </div>
  );
};
