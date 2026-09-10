import React, { useState, useMemo } from 'react';
import { Trade, Investor, Translations } from '../types';
import { calculateLotSize } from '../utils/simulation';
import { CentUsdConverterModal } from './CentUsdConverterModal';
import { safeStorage } from '../utils/safeStorage';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Layers,
  Activity,
  X,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Zap,
  Download,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Coins,
  ArrowRightLeft,
  Calculator,
} from 'lucide-react';

interface TradeLogViewProps {
  trades: Trade[];
  investors: Investor[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
  t: Translations;
  initialSelectedAccount?: string;
}

const getTodayDateStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseLocalDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
};

export const getDayOfWeekInfo = (dateStr: string) => {
  const d = parseLocalDate(dateStr);
  if (!d) return { shortDay: '', fullDay: '', dayNum: '', isWeekend: false };

  const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' }); // e.g. Mon, Tue
  const fullDay = d.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. Monday, Tuesday
  const dayNum = String(d.getDate()).padStart(2, '0');
  const dayOfWeek = d.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return { shortDay, fullDay, dayNum, isWeekend };
};

const EMPTY_TRADE: Omit<Trade, 'id' | 'created_at'> = {
  investor_name: '',
  currency: 'USD',
  trade_date: getTodayDateStr(),
  start_equity: 2000,
  lot_size: 0.01,
  profit_pct: 12.5,
  profit_amount: 250,
  withdraw: 0,
  reinvest: 250,
  end_equity: 2250,
  notes: '',
};

export const TradeLogView: React.FC<TradeLogViewProps> = ({
  trades,
  investors,
  onAddTrade,
  onEditTrade,
  onDeleteTrade,
  t,
  initialSelectedAccount,
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    if (initialSelectedAccount && initialSelectedAccount !== 'General Account') {
      return initialSelectedAccount;
    }
    return 'all';
  });
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [formData, setFormData] = useState<Omit<Trade, 'id' | 'created_at'>>(EMPTY_TRADE);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customLotOverride, setCustomLotOverride] = useState(false);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [dateDisplayMode, setDateDisplayMode] = useState<'ddd' | 'dddd'>(() => {
    const saved = safeStorage.getItem('snl_trade_date_mode');
    return saved === 'dddd' ? 'dddd' : 'ddd';
  });

  // Cent (USC) vs USD Currency Utilities & State
  const [converterModalOpen, setConverterModalOpen] = useState(false);
  const [displayCurrencyMode, setDisplayCurrencyMode] = useState<'native' | 'USD' | 'USC'>(() => {
    const saved = safeStorage.getItem('snl_display_currency_mode');
    return (saved as 'native' | 'USD' | 'USC') || 'native';
  });
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'USD' | 'USC'>('all');
  const [currencySwitchModalTrade, setCurrencySwitchModalTrade] = useState<Trade | null>(null);

  const toggleDateDisplayMode = () => {
    setDateDisplayMode((prev) => {
      const next = prev === 'ddd' ? 'dddd' : 'ddd';
      safeStorage.setItem('snl_trade_date_mode', next);
      return next;
    });
  };

  const handleSetDisplayCurrencyMode = (mode: 'native' | 'USD' | 'USC') => {
    setDisplayCurrencyMode(mode);
    safeStorage.setItem('snl_display_currency_mode', mode);
  };

  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Sort trades chronologically descending (newest trade at index 0)
  const sortedAllTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const dateDiff = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      const createdDiff =
        (new Date(b.created_at || '').getTime() || 0) - (new Date(a.created_at || '').getTime() || 0);
      return createdDiff;
    });
  }, [trades]);

  // Intra-day sequence numbering for same-day multiple trades
  const tradeSequenceMap = useMemo(() => {
    const ascending = [...trades].sort((a, b) => {
      const dDiff = new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime();
      if (dDiff !== 0) return dDiff;
      return (
        (new Date(a.created_at || '').getTime() || 0) - (new Date(b.created_at || '').getTime() || 0)
      );
    });

    const dayCounts = new Map<string, number>();
    ascending.forEach((tr) => {
      const key = `${tr.investor_name || 'Account'}_${tr.trade_date}`;
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    });

    const dayCurrent = new Map<string, number>();
    const seqMap = new Map<string, { seq: number; totalOnDay: number }>();
    ascending.forEach((tr) => {
      const key = `${tr.investor_name || 'Account'}_${tr.trade_date}`;
      const curr = (dayCurrent.get(key) || 0) + 1;
      dayCurrent.set(key, curr);
      seqMap.set(tr.id, { seq: curr, totalOnDay: dayCounts.get(key) || 1 });
    });

    return seqMap;
  }, [trades]);

  // Helper to get investor lot configuration & account currency
  const getInvestorConfig = (invName?: string) => {
    const inv = investors.find((i) => i.name === invName);
    return {
      currency: inv?.currency || 'USD',
      baseEquity: inv?.base_equity || 2000,
      baseLotSize: inv?.base_lot_size || 0.01,
      lotIncrement: inv?.lot_increment || 0.01,
      initialCapital: inv?.initial_capital || 2000,
    };
  };

  const getInvestorCurrency = (invName?: string): 'USD' | 'USC' => {
    const inv = investors.find((i) => i.name === invName);
    return inv?.currency || 'USD';
  };

  // Helper to calculate lot and tier
  const getLotAndTier = (equity: number, invName?: string) => {
    const config = getInvestorConfig(invName);
    const lot = calculateLotSize(equity, config.baseEquity, config.baseLotSize, config.lotIncrement);
    const tier = Math.max(1, Math.floor(equity / config.baseEquity));
    return { lot: parseFloat(lot.toFixed(4)), tier };
  };

  // List of distinct investor accounts
  const accountOptions = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    investors.forEach((inv) => {
      if (!list.some((a) => a.name === inv.name)) {
        list.push({ id: inv.name, name: inv.name });
      }
    });
    trades.forEach((tr) => {
      if (tr.investor_name && !list.some((a) => a.name === tr.investor_name)) {
        list.push({ id: tr.investor_name, name: tr.investor_name });
      }
    });
    return list;
  }, [investors, trades]);

  // Account-level metrics for each distinct account with multi-currency awareness
  const accountMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        accountName: string;
        currency: 'USD' | 'USC';
        currentEquity: number;
        initialCapital: number;
        totalProfit: number;
        totalWithdrawn: number;
        tradeCount: number;
        latestTrade?: Trade;
        equityUSD: number;
        initialUSD: number;
        profitUSD: number;
        withdrawnUSD: number;
      }
    >();

    accountOptions.forEach((acc) => {
      const accTrades = sortedAllTrades.filter((tr) => tr.investor_name === acc.name);

      const inv = investors.find((i) => i.name === acc.name);
      const accCurrency: 'USD' | 'USC' = inv?.currency || accTrades[0]?.currency || 'USD';
      const initialCapital = inv ? inv.initial_capital : (accCurrency === 'USC' ? 5000 : 2000);
      const latestTrade = accTrades[0];
      const currentEquity = latestTrade ? latestTrade.end_equity : initialCapital;
      const totalProfit = accTrades.reduce((sum, tr) => sum + (tr.profit_amount || 0), 0);
      const totalWithdrawn = accTrades.reduce((sum, tr) => sum + (tr.withdraw || 0), 0);

      // Converted to USD
      const equityUSD = accCurrency === 'USC' ? currentEquity / 100 : currentEquity;
      const initialUSD = accCurrency === 'USC' ? initialCapital / 100 : initialCapital;
      const profitUSD = accCurrency === 'USC' ? totalProfit / 100 : totalProfit;
      const withdrawnUSD = accCurrency === 'USC' ? totalWithdrawn / 100 : totalWithdrawn;

      map.set(acc.name, {
        accountName: acc.name,
        currency: accCurrency,
        currentEquity,
        initialCapital,
        totalProfit,
        totalWithdrawn,
        tradeCount: accTrades.length,
        latestTrade,
        equityUSD,
        initialUSD,
        profitUSD,
        withdrawnUSD,
      });
    });

    return map;
  }, [accountOptions, sortedAllTrades, investors]);

  // Filtered trades by account and currency
  const displayTrades = useMemo(() => {
    let list = sortedAllTrades;
    if (selectedAccount !== 'all') {
      list = list.filter((tr) => tr.investor_name === selectedAccount);
    }
    if (currencyFilter !== 'all') {
      list = list.filter((tr) => (tr.currency || getInvestorCurrency(tr.investor_name)) === currencyFilter);
    }
    return list;
  }, [sortedAllTrades, selectedAccount, currencyFilter, investors]);

  // Today's Trades and Metrics for active account / view
  const todayTrades = useMemo(() => {
    return displayTrades.filter((tr) => tr.trade_date === todayStr);
  }, [displayTrades, todayStr]);

  const todayMetrics = useMemo(() => {
    const count = todayTrades.length;
    const wins = todayTrades.filter((tr) => (tr.profit_amount || 0) > 0).length;
    const losses = todayTrades.filter((tr) => (tr.profit_amount || 0) < 0).length;
    const winRate = count > 0 ? (wins / count) * 100 : 0;

    // Currency normalized sums
    let profitUSD = 0;
    let withdrawnUSD = 0;
    todayTrades.forEach((tr) => {
      const c = tr.currency || getInvestorCurrency(tr.investor_name);
      profitUSD += c === 'USC' ? (tr.profit_amount || 0) / 100 : (tr.profit_amount || 0);
      withdrawnUSD += c === 'USC' ? (tr.withdraw || 0) / 100 : (tr.withdraw || 0);
    });

    // Oldest trade of today is at the end of todayTrades (since sorted DESC)
    const oldestToday = todayTrades[todayTrades.length - 1];
    const newestToday = todayTrades[0];
    const startEqToday = oldestToday ? oldestToday.start_equity : 0;
    const endEqToday = newestToday ? newestToday.end_equity : 0;
    const dayGainPct =
      startEqToday > 0 ? ((endEqToday - startEqToday) / startEqToday) * 100 : 0;

    return {
      count,
      profitUSD,
      profit: profitUSD, // alias for backwards compatibility
      withdrawnUSD,
      wins,
      losses,
      winRate,
      startEqToday: startEqToday || 0,
      endEqToday: endEqToday || 0,
      dayGainPct: dayGainPct || 0,
    };
  }, [todayTrades, investors]);

  // Filtered by Timeframe for table view
  const filteredTrades = useMemo(() => {
    if (timeframe === 'today') {
      return todayTrades;
    }
    if (timeframe === 'week') {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return displayTrades.filter((tr) => new Date(tr.trade_date + 'T00:00:00') >= monday);
    }
    if (timeframe === 'month') {
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return displayTrades.filter((tr) => tr.trade_date.startsWith(yearMonth));
    }
    return displayTrades;
  }, [displayTrades, timeframe, todayTrades]);

  // Dynamic Portfolio & View Metrics with dual-currency conversion
  const viewMetrics = useMemo(() => {
    if (selectedAccount === 'all') {
      let totalPortfolioEquityUSD = 0;
      let totalPortfolioInitialUSD = 0;
      accountMetricsMap.forEach((m) => {
        totalPortfolioEquityUSD += m.equityUSD;
        totalPortfolioInitialUSD += m.initialUSD;
      });

      let totalProfitUSD = 0;
      let totalWithdrawnUSD = 0;
      trades.forEach((tr) => {
        const c = tr.currency || getInvestorCurrency(tr.investor_name);
        totalProfitUSD += c === 'USC' ? (tr.profit_amount || 0) / 100 : (tr.profit_amount || 0);
        totalWithdrawnUSD += c === 'USC' ? (tr.withdraw || 0) / 100 : (tr.withdraw || 0);
      });

      const avgProfitPct =
        trades.length > 0
          ? trades.reduce((sum, tr) => sum + (tr.profit_pct || 0), 0) / trades.length
          : 0;
      const netGrowthPct =
        totalPortfolioInitialUSD > 0
          ? ((totalPortfolioEquityUSD - totalPortfolioInitialUSD) / totalPortfolioInitialUSD) * 100
          : 0;

      return {
        currentEquityUSD: totalPortfolioEquityUSD,
        initialCapitalUSD: totalPortfolioInitialUSD,
        totalProfitUSD,
        totalWithdrawnUSD,
        avgProfitPct,
        netGrowthPct,
        tradeCount: trades.length,
        isPortfolioAggregate: true,
        accountCurrency: 'USD' as const,
      };
    } else {
      const accMetric = accountMetricsMap.get(selectedAccount) || {
        currentEquity: 2000,
        initialCapital: 2000,
        totalProfit: 0,
        totalWithdrawn: 0,
        tradeCount: 0,
        equityUSD: 2000,
        initialUSD: 2000,
        profitUSD: 0,
        withdrawnUSD: 0,
        currency: 'USD' as const,
      };

      const avgProfitPct =
        displayTrades.length > 0
          ? displayTrades.reduce((sum, tr) => sum + (tr.profit_pct || 0), 0) / displayTrades.length
          : 0;
      const netGrowthPct =
        accMetric.initialCapital > 0
          ? ((accMetric.currentEquity - accMetric.initialCapital) / accMetric.initialCapital) * 100
          : 0;

      return {
        currentEquityUSD: accMetric.equityUSD,
        initialCapitalUSD: accMetric.initialUSD,
        totalProfitUSD: accMetric.profitUSD,
        totalWithdrawnUSD: accMetric.withdrawnUSD,
        nativeEquity: accMetric.currentEquity,
        nativeInitial: accMetric.initialCapital,
        nativeProfit: accMetric.totalProfit,
        nativeWithdrawn: accMetric.totalWithdrawn,
        accountCurrency: accMetric.currency,
        avgProfitPct,
        netGrowthPct,
        tradeCount: accMetric.tradeCount,
        isPortfolioAggregate: false,
      };
    }
  }, [selectedAccount, accountMetricsMap, trades, displayTrades, investors]);

  // Open modal with smart initial balance pre-filled from latest trade
  const openAddModal = (defaultInvestorName?: string) => {
    setEditingTrade(null);
    setShowAdvanced(false);
    setCustomLotOverride(false);
    setSavedToast(null);

    let invName = defaultInvestorName !== undefined ? defaultInvestorName : '';
    if (!invName && selectedAccount !== 'all') {
      invName = selectedAccount;
    }
    if (!invName && investors.length > 0) {
      invName = investors[0].name;
    }

    const config = getInvestorConfig(invName);
    const matchingTrades = sortedAllTrades.filter((tr) => tr.investor_name === invName);
    const lastTrade = matchingTrades[0];
    const initialEq = lastTrade ? lastTrade.end_equity : config.initialCapital;
    const { lot } = getLotAndTier(initialEq, invName);

    const defaultEndEq = parseFloat((initialEq * 1.1).toFixed(2));
    const profitAmt = parseFloat((defaultEndEq - initialEq).toFixed(2));
    const profitPct = initialEq > 0 ? parseFloat(((profitAmt / initialEq) * 100).toFixed(2)) : 0;

    // Count trades today for note hint
    const tradesTodayForAccount = matchingTrades.filter((t) => t.trade_date === todayStr).length;
    const accountCurrency = lastTrade?.currency || config.currency || 'USD';

    setFormData({
      ...EMPTY_TRADE,
      investor_name: invName,
      currency: accountCurrency,
      start_equity: initialEq,
      end_equity: defaultEndEq,
      lot_size: lot,
      profit_pct: profitPct,
      profit_amount: profitAmt,
      withdraw: 0,
      reinvest: profitAmt,
      trade_date: todayStr,
      notes: tradesTodayForAccount > 0 ? `Trade #${tradesTodayForAccount + 1}` : '',
    });
    setModalOpen(true);
  };

  // Open modal chained directly from a specific balance (for multi-trade workflow)
  const openAddModalWithStart = (
    startEq: number,
    invName?: string,
    dateStr?: string,
    tradeCurrency?: 'USD' | 'USC'
  ) => {
    setEditingTrade(null);
    setShowAdvanced(false);
    setCustomLotOverride(false);
    setSavedToast(null);

    const account =
      invName ||
      (selectedAccount !== 'all' ? selectedAccount : (investors[0]?.name || ''));
    const { lot } = getLotAndTier(startEq, account);

    const defaultEndEq = parseFloat((startEq * 1.1).toFixed(2));
    const profitAmt = parseFloat((defaultEndEq - startEq).toFixed(2));
    const profitPct = startEq > 0 ? parseFloat(((profitAmt / startEq) * 100).toFixed(2)) : 0;
    const targetDate = dateStr || todayStr;

    const existingCount = sortedAllTrades.filter(
      (tr) => tr.investor_name === account && tr.trade_date === targetDate
    ).length;

    const resolvedCurrency = tradeCurrency || getInvestorCurrency(account);

    setFormData({
      ...EMPTY_TRADE,
      investor_name: account,
      currency: resolvedCurrency,
      start_equity: startEq,
      end_equity: defaultEndEq,
      lot_size: lot,
      profit_pct: profitPct,
      profit_amount: profitAmt,
      withdraw: 0,
      reinvest: profitAmt,
      trade_date: targetDate,
      notes: existingCount > 0 ? `Trade #${existingCount + 1}` : '',
    });
    setModalOpen(true);
  };

  const openEditModal = (tr: Trade) => {
    setEditingTrade(tr);
    setShowAdvanced(Boolean(tr.withdraw > 0 || tr.notes));
    setCustomLotOverride(false);
    setSavedToast(null);
    setFormData({
      investor_name: tr.investor_name,
      currency: tr.currency || getInvestorCurrency(tr.investor_name),
      trade_date: tr.trade_date,
      start_equity: tr.start_equity,
      lot_size: tr.lot_size,
      profit_pct: tr.profit_pct,
      profit_amount: tr.profit_amount,
      withdraw: tr.withdraw,
      reinvest: tr.reinvest,
      end_equity: tr.end_equity,
      notes: tr.notes,
    });
    setModalOpen(true);
  };

  // Currency Switch handlers inside Modal
  const handleToggleFormCurrency = (targetCurrency: 'USD' | 'USC') => {
    if (formData.currency === targetCurrency) return;
    setFormData((prev) => ({
      ...prev,
      currency: targetCurrency,
    }));
  };

  // Convert numbers in Add/Edit modal by 100x or /100
  const handleConvertFormDataValues = () => {
    setFormData((prev) => {
      const isCurrentlyUsc = prev.currency === 'USC';
      const factor = isCurrentlyUsc ? 0.01 : 100;
      const newCurrency = isCurrentlyUsc ? 'USD' : 'USC';
      return {
        ...prev,
        currency: newCurrency,
        start_equity: parseFloat((prev.start_equity * factor).toFixed(2)),
        end_equity: parseFloat((prev.end_equity * factor).toFixed(2)),
        profit_amount: parseFloat((prev.profit_amount * factor).toFixed(2)),
        withdraw: parseFloat((prev.withdraw * factor).toFixed(2)),
        reinvest: parseFloat((prev.reinvest * factor).toFixed(2)),
      };
    });
  };

  // Quick switch currency for an existing trade in the log table
  const handleQuickSwitchTradeCurrency = (trade: Trade, mode: 'convert_values' | 'label_only') => {
    const currentCurr = trade.currency || getInvestorCurrency(trade.investor_name);
    const targetCurr = currentCurr === 'USD' ? 'USC' : 'USD';
    const factor = targetCurr === 'USC' ? 100 : 0.01;

    if (mode === 'convert_values') {
      const updated: Trade = {
        ...trade,
        currency: targetCurr,
        start_equity: parseFloat((trade.start_equity * factor).toFixed(2)),
        end_equity: parseFloat((trade.end_equity * factor).toFixed(2)),
        profit_amount: parseFloat((trade.profit_amount * factor).toFixed(2)),
        withdraw: parseFloat((trade.withdraw * factor).toFixed(2)),
        reinvest: parseFloat((trade.reinvest * factor).toFixed(2)),
        notes: trade.notes ? `${trade.notes} [Converted to ${targetCurr}]` : `[Converted to ${targetCurr}]`,
      };
      onEditTrade(updated);
    } else {
      const updated: Trade = {
        ...trade,
        currency: targetCurr,
      };
      onEditTrade(updated);
    }
    setCurrencySwitchModalTrade(null);
  };

  // Batch convert all trades of an account between USD and USC
  const handleBatchConvertAccountTrades = (investorName: string, targetCurrency: 'USD' | 'USC') => {
    const factor = targetCurrency === 'USC' ? 100 : 0.01;
    const targetTrades = trades.filter((tr) => tr.investor_name === investorName);

    targetTrades.forEach((tr) => {
      const currentCurr = tr.currency || getInvestorCurrency(tr.investor_name);
      if (currentCurr === targetCurrency) return;

      const updated: Trade = {
        ...tr,
        currency: targetCurrency,
        start_equity: parseFloat((tr.start_equity * factor).toFixed(2)),
        end_equity: parseFloat((tr.end_equity * factor).toFixed(2)),
        profit_amount: parseFloat((tr.profit_amount * factor).toFixed(2)),
        withdraw: parseFloat((tr.withdraw * factor).toFixed(2)),
        reinvest: parseFloat((tr.reinvest * factor).toFixed(2)),
        notes: tr.notes ? `${tr.notes} [Converted to ${targetCurrency}]` : `[Converted to ${targetCurrency}]`,
      };
      onEditTrade(updated);
    });

    setSavedToast(`Converted ${targetTrades.length} trades for "${investorName}" to ${targetCurrency}!`);
    setTimeout(() => setSavedToast(null), 3500);
  };

  // Create a new trade primed with real converted data
  const handleCreateNewTradeFromConverter = (tradeData: Partial<Trade>) => {
    const invName = tradeData.investor_name || (selectedAccount !== 'all' ? selectedAccount : investors[0]?.name || '');
    const currency = tradeData.currency || getInvestorCurrency(invName);
    const startEq = tradeData.start_equity ?? 1000;
    const { lot: autoLot } = getLotAndTier(startEq, invName);

    setEditingTrade(null);
    setFormData({
      investor_name: invName,
      currency: currency,
      trade_date: tradeData.trade_date || getTodayDateStr(),
      start_equity: startEq,
      lot_size: tradeData.lot_size ?? autoLot,
      profit_pct: tradeData.profit_pct ?? 15,
      profit_amount: tradeData.profit_amount ?? parseFloat(((startEq * 15) / 100).toFixed(2)),
      withdraw: tradeData.withdraw ?? 0,
      reinvest: tradeData.reinvest ?? parseFloat(((startEq * 15) / 100).toFixed(2)),
      end_equity: tradeData.end_equity ?? parseFloat((startEq + (startEq * 15) / 100).toFixed(2)),
      notes: tradeData.notes || `New trade based on real converted data (${startEq} ${currency})`,
    });
    setModalOpen(true);
  };

  // Dynamic recalculator: When Start Balance, End Balance, or Investor changes
  const recalculateFromBalances = (
    startEq: number,
    endEq: number,
    withdrawAmt: number = formData.withdraw,
    invName: string = formData.investor_name,
    lockLot: boolean = customLotOverride
  ) => {
    const profitAmt = parseFloat((endEq - startEq).toFixed(2));
    const profitPct = startEq > 0 ? parseFloat(((profitAmt / startEq) * 100).toFixed(2)) : 0;
    const reinvestAmt = parseFloat((profitAmt - withdrawAmt).toFixed(2));

    const { lot: autoLot } = getLotAndTier(startEq, invName);
    const finalLot = lockLot ? formData.lot_size : autoLot;

    setFormData((prev) => ({
      ...prev,
      investor_name: invName,
      start_equity: startEq,
      end_equity: endEq,
      profit_amount: profitAmt,
      profit_pct: profitPct,
      withdraw: withdrawAmt,
      reinvest: reinvestAmt,
      lot_size: finalLot,
    }));
  };

  const applyProfitPreset = (pct: number) => {
    const startEq = formData.start_equity;
    const profit = (startEq * pct) / 100;
    const endEq = parseFloat((startEq + profit).toFixed(2));
    recalculateFromBalances(startEq, endEq);
  };

  const handleInvestorSelect = (invName: string) => {
    const config = getInvestorConfig(invName);
    const invCurrency = getInvestorCurrency(invName);
    const matchingTrades = sortedAllTrades.filter((tr) => tr.investor_name === invName);

    const lastTrade = matchingTrades[0];
    const initialEq = lastTrade ? lastTrade.end_equity : config.initialCapital;
    const currentPct = formData.profit_pct || 10;
    const endEq = parseFloat((initialEq * (1 + currentPct / 100)).toFixed(2));

    setFormData((prev) => ({
      ...prev,
      currency: lastTrade?.currency || invCurrency,
    }));
    recalculateFromBalances(initialEq, endEq, formData.withdraw, invName, false);
  };

  // Save Trade & Close
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTrade) {
      onEditTrade({
        ...editingTrade,
        ...formData,
      });
    } else {
      onAddTrade(formData);
    }
    setModalOpen(false);
  };

  // Multi-Trade Workflow: "Save & Add Next Trade"
  const handleSaveAndAddNext = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTrade(formData);

    const nextStartEq = formData.end_equity;
    const { lot: nextLot } = getLotAndTier(nextStartEq, formData.investor_name);
    const currentPct = formData.profit_pct || 10;
    const nextEndEq = parseFloat((nextStartEq * (1 + currentPct / 100)).toFixed(2));
    const nextProfitAmt = parseFloat((nextEndEq - nextStartEq).toFixed(2));

    const existingTradesToday = sortedAllTrades.filter(
      (t) => t.investor_name === formData.investor_name && t.trade_date === formData.trade_date
    ).length;
    const nextTradeIndex = existingTradesToday + 2;

    const unitStr = formData.currency === 'USC' ? 'USC' : '$';

    setFormData({
      ...EMPTY_TRADE,
      investor_name: formData.investor_name,
      currency: formData.currency,
      trade_date: formData.trade_date,
      start_equity: nextStartEq,
      end_equity: nextEndEq,
      lot_size: nextLot,
      profit_pct: currentPct,
      profit_amount: nextProfitAmt,
      withdraw: 0,
      reinvest: nextProfitAmt,
      notes: `Trade #${nextTradeIndex} (${formData.trade_date})`,
    });

    setSavedToast(
      `Trade #${nextTradeIndex - 1} saved! Next trade primed with ${unitStr}${nextStartEq.toLocaleString(
        undefined,
        { minimumFractionDigits: 2 }
      )} ${formData.currency === 'USC' ? 'USC' : ''} starting equity.`
    );
    setTimeout(() => setSavedToast(null), 4000);
  };

  // CSV Export for trade log with currency specification
  const handleExportCSV = () => {
    const headers = [
      'Trade Date',
      'Day of Week (ddd)',
      'Day of Week (dddd)',
      'Investor',
      'Currency',
      'Initial Balance',
      'Initial Balance (USD Equiv)',
      'Lot Size',
      'Profit (%)',
      'Net Profit',
      'Net Profit (USD Equiv)',
      'Withdraw',
      'Reinvest',
      'End Balance / Equity',
      'End Equity (USD Equiv)',
      'Notes',
    ];

    const rows = filteredTrades.map((tr) => {
      const dayInfo = getDayOfWeekInfo(tr.trade_date);
      const curr = tr.currency || getInvestorCurrency(tr.investor_name);
      const factorToUSD = curr === 'USC' ? 0.01 : 1;

      return [
        tr.trade_date,
        dayInfo.shortDay,
        dayInfo.fullDay,
        `"${(tr.investor_name || 'Unassigned').replace(/"/g, '""')}"`,
        curr,
        tr.start_equity.toFixed(2),
        (tr.start_equity * factorToUSD).toFixed(2),
        tr.lot_size.toFixed(4),
        `${tr.profit_pct.toFixed(2)}%`,
        tr.profit_amount.toFixed(2),
        (tr.profit_amount * factorToUSD).toFixed(2),
        tr.withdraw.toFixed(2),
        tr.reinvest.toFixed(2),
        tr.end_equity.toFixed(2),
        (tr.end_equity * factorToUSD).toFixed(2),
        `"${(tr.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snl_trade_log_${
      selectedAccount === 'all' ? 'portfolio' : selectedAccount.toLowerCase().replace(/\s+/g, '_')
    }_${timeframe}_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentTier = Math.max(
    1,
    Math.floor(
      formData.start_equity / (getInvestorConfig(formData.investor_name).baseEquity || 2000)
    )
  );
  const isProfit = formData.profit_amount >= 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl gradient-text">
              {t.tradeLogTitle}
            </h1>
            <p className="text-xs text-slate-400">
              Track live account equity, intra-day multiple executions, and verified profit records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cent ↔ USD Quick Converter Modal Launcher */}
          <button
            onClick={() => setConverterModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#111726] hover:bg-[#1a233a] border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium shadow-xs"
            title="Open Cent (USC) ↔ USD Calculator & Pip Size Simulator"
          >
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            <span>Cent / USD Converter</span>
          </button>

          {trades.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-[#111726] hover:bg-[#1a233a] border border-slate-800 text-slate-300 hover:text-cyan-300 text-xs py-2 px-3 rounded-xl transition-all cursor-pointer font-medium"
              title="Export Current Filtered View to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => openAddModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-semibold text-xs py-2 px-4 rounded-xl shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addTrade}</span>
          </button>
        </div>
      </div>

      {/* Account Selector Bar with Live Equity Indicators and Currency Badges */}
      <div className="bg-[#0c111e]/90 p-3 rounded-2xl border border-slate-800/80 shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-medium text-slate-300">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter by Investor & Live Balances:</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click an investor to isolate records & live equity (USD & USC accounts supported)
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {/* Master Portfolio Pill */}
          {(() => {
            let totalEqUSD = 0;
            accountMetricsMap.forEach((m) => {
              totalEqUSD += m.equityUSD;
            });
            const isSelected = selectedAccount === 'all';
            return (
              <button
                type="button"
                onClick={() => setSelectedAccount('all')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                    : 'bg-[#111726] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                <span>All Investors (Portfolio)</span>
                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 font-bold">
                  ${totalEqUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </span>
              </button>
            );
          })()}

          {/* Individual Investor Pills with Currency Indicators */}
          {accountOptions.length === 0 ? (
            <div className="py-1 px-2 text-xs text-slate-500 italic">
              No investors found. Add investors in the Investors tab to manage individual portfolios.
            </div>
          ) : (
            accountOptions.map((acc) => {
              const metric = accountMetricsMap.get(acc.name);
              const inv = investors.find((i) => i.name === acc.name);
              const accCurr: 'USD' | 'USC' = inv?.currency || metric?.currency || 'USD';
              const isCent = accCurr === 'USC';
              const eq = metric ? metric.currentEquity : (isCent ? 5000 : 2000);
              const isSelected = selectedAccount === acc.name;
              const hasTrades = (metric?.tradeCount || 0) > 0;

              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setSelectedAccount(acc.name)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-sm shadow-cyan-500/20'
                      : 'bg-[#111726] border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{acc.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase ${
                        isCent
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {accCurr}
                    </span>
                  </span>
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded border font-bold ${
                      hasTrades
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {isCent
                      ? `${eq.toLocaleString(undefined, { minimumFractionDigits: 0 })} USC`
                      : `$${eq.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Analytics Cards Grid (Dual Currency & Multi-Account Aware) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Live Current Equity Card */}
        <div className="rounded-xl border border-cyan-500/40 bg-gradient-to-br from-[#0c1424] to-[#0c111e] p-4 shadow-lg shadow-cyan-950/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-cyan-300 flex items-center gap-1.5 font-semibold">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>
                {viewMetrics.isPortfolioAggregate ? 'Portfolio Equity' : 'Current Equity'}
              </span>
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                viewMetrics.netGrowthPct >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {viewMetrics.netGrowthPct >= 0 ? '+' : ''}
              {viewMetrics.netGrowthPct.toFixed(2)}%
            </span>
          </div>
          <div className="font-heading font-extrabold text-2xl text-cyan-300 font-mono tracking-tight">
            {!viewMetrics.isPortfolioAggregate && viewMetrics.accountCurrency === 'USC' ? (
              <span>
                {(viewMetrics.nativeEquity ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}{' '}
                <span className="text-xs font-bold text-purple-400 font-sans">USC</span>
              </span>
            ) : (
              <span>${(viewMetrics.currentEquityUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            {!viewMetrics.isPortfolioAggregate && viewMetrics.accountCurrency === 'USC' ? (
              <>
                <span>≈ ${(viewMetrics.currentEquityUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</span>
                <span className="text-purple-300/80 font-mono font-semibold">Cent Account</span>
              </>
            ) : (
              <>
                <span>Base: ${(viewMetrics.initialCapitalUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-cyan-400/80 font-mono">
                  Net: {(viewMetrics.currentEquityUSD ?? 0) - (viewMetrics.initialCapitalUSD ?? 0) >= 0 ? '+' : ''}$
                  {((viewMetrics.currentEquityUSD ?? 0) - (viewMetrics.initialCapitalUSD ?? 0)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* 2. TODAY'S PROFIT CARD */}
        <div
          className={`rounded-xl border p-4 shadow-md transition-all relative overflow-hidden ${
            todayMetrics.profitUSD > 0
              ? 'border-emerald-500/40 bg-gradient-to-br from-[#0c1c1b] to-[#0c111e]'
              : todayMetrics.profitUSD < 0
              ? 'border-rose-500/40 bg-gradient-to-br from-[#1c0c11] to-[#0c111e]'
              : 'border-slate-800 bg-[#0c111e]/90'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>{t.todayProfit}</span>
            </span>
            <button
              onClick={() => setTimeframe(timeframe === 'today' ? 'all' : 'today')}
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                timeframe === 'today'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title="Click to toggle filter for Today's trades only"
            >
              {timeframe === 'today' ? 'Filtering Today' : 'Today'}
            </button>
          </div>
          <div
            className={`font-heading font-extrabold text-2xl font-mono tracking-tight ${
              todayMetrics.profitUSD > 0
                ? 'text-emerald-400'
                : todayMetrics.profitUSD < 0
                ? 'text-rose-400'
                : 'text-slate-200'
            }`}
          >
            {todayMetrics.profitUSD > 0 ? '+' : ''}$
            {todayMetrics.profitUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
            <span>
              {todayMetrics.count} trade{todayMetrics.count === 1 ? '' : 's'} today
            </span>
            {todayMetrics.count > 0 ? (
              <span className="font-mono text-emerald-400/90 font-semibold">
                {todayMetrics.dayGainPct >= 0 ? '+' : ''}
                {todayMetrics.dayGainPct.toFixed(2)}% day
              </span>
            ) : (
              <span className="text-slate-500">Ready for trades</span>
            )}
          </div>
        </div>

        {/* 3. All-Time Real Profit Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-4 shadow-md">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>{t.totalRealProfit}</span>
          </div>
          <div
            className={`font-heading font-bold text-2xl font-mono ${
              (viewMetrics.totalProfitUSD ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(viewMetrics.totalProfitUSD ?? 0) >= 0 ? '+' : ''}$
            {(viewMetrics.totalProfitUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Withdrawn: ${(viewMetrics.totalWithdrawnUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* 4. Average Profit % Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-4 shadow-md">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            <span>{t.avgProfitPct}</span>
          </div>
          <div className="font-heading font-bold text-2xl text-purple-300 font-mono">
            {viewMetrics.avgProfitPct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Across {viewMetrics.tradeCount} executions
          </div>
        </div>

        {/* 5. Total Trades Card */}
        <div className="rounded-xl border border-slate-800 bg-[#0c111e]/90 p-4 shadow-md col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Total Executions</span>
          </div>
          <div className="font-heading font-bold text-2xl text-amber-300 font-mono">
            {viewMetrics.tradeCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {selectedAccount === 'all' ? 'All Accounts' : selectedAccount}
          </div>
        </div>
      </div>

      {/* TODAY'S MULTI-TRADE SESSION PROGRESSION BANNER (when today has trades) */}
      {todayTrades.length > 0 && (
        <div className="bg-gradient-to-r from-[#0a1526] via-[#0b1b2d] to-[#0c111e] border border-cyan-500/30 rounded-2xl p-4 shadow-lg shadow-cyan-950/20 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-slate-100">
                    Today's Multi-Trade Session ({getDayOfWeekInfo(todayStr).fullDay}, {todayStr})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                    {todayTrades.length} Trade{todayTrades.length > 1 ? 's' : ''} Logged
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Day Opening Balance:{' '}
                  <span className="font-mono text-slate-300 font-medium">
                    ${(todayMetrics.startEqToday ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {' → '}
                  Current Equity:{' '}
                  <span className="font-mono text-cyan-300 font-bold">
                    ${(todayMetrics.endEqToday ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {' • '}
                  Net Session Gain:{' '}
                  <span
                    className={`font-mono font-bold ${
                      (todayMetrics.profitUSD ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(todayMetrics.profitUSD ?? 0) >= 0 ? '+' : ''}$
                    {(todayMetrics.profitUSD ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} (
                    {(todayMetrics.dayGainPct ?? 0) >= 0 ? '+' : ''}
                    {(todayMetrics.dayGainPct ?? 0).toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAddModalWithStart(
                    todayMetrics.endEqToday,
                    selectedAccount === 'all' ? '' : selectedAccount,
                    todayStr
                  )
                }
                className="flex items-center gap-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs px-3.5 py-1.5 rounded-xl font-medium transition-all cursor-pointer shadow-sm shadow-cyan-500/10"
              >
                <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Add Trade #{todayTrades.length + 1} for Today</span>
              </button>
            </div>
          </div>

          {/* Sequential Execution Progression Pills */}
          {todayTrades.length > 1 && (
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Today's Chain:
              </span>
              {[...todayTrades].reverse().map((tr, idx) => {
                const trPos = tr.profit_amount >= 0;
                return (
                  <div key={tr.id} className="flex items-center gap-1">
                    <div className="flex items-center gap-1.5 bg-[#111726] border border-slate-800 px-2 py-1 rounded-lg text-[11px] font-mono">
                      <span className="text-cyan-400 font-bold">#{idx + 1}</span>
                      <span className="text-slate-400">
                        ${tr.start_equity.toFixed(0)}→${tr.end_equity.toFixed(0)}
                      </span>
                      <span className={`font-bold ${trPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ({trPos ? '+' : ''}${tr.profit_amount.toFixed(0)})
                      </span>
                    </div>
                    {idx < todayTrades.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar: Timeframes, Currency Filter & Display Currency Mode */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-[#0c111e]/90 rounded-xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Timeframe:</span>
          </span>

          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium ${
              timeframe === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            All Time ({displayTrades.length})
          </button>

          <button
            onClick={() => setTimeframe('today')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
              timeframe === 'today'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <span>Today</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                todayTrades.length > 0
                  ? 'bg-emerald-500/30 text-emerald-200'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              {todayTrades.length}
            </span>
          </button>

          <button
            onClick={() => setTimeframe('week')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium ${
              timeframe === 'week'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            This Week
          </button>

          <button
            onClick={() => setTimeframe('month')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer font-medium ${
              timeframe === 'month'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            This Month
          </button>
        </div>

        {/* Currency Filter & Table Display Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Currency Isolation Filter */}
          <div className="flex items-center gap-1 bg-[#111726] p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5 font-medium flex items-center gap-1">
              <Coins className="w-3 h-3 text-cyan-400" />
              <span>Currency:</span>
            </span>
            <button
              type="button"
              onClick={() => setCurrencyFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                currencyFilter === 'all'
                  ? 'bg-cyan-500/25 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('USD')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                currencyFilter === 'USD'
                  ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>USD</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrencyFilter('USC')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                currencyFilter === 'USC'
                  ? 'bg-purple-500/25 text-purple-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Cent (USC)</span>
            </button>
          </div>

          {/* Table Display Mode (Native vs Unified USD vs Unified USC) */}
          <div className="flex items-center gap-1 bg-[#111726] p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 px-1.5 font-medium">View:</span>
            <button
              type="button"
              onClick={() => handleSetDisplayCurrencyMode('native')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                displayCurrencyMode === 'native'
                  ? 'bg-cyan-500/25 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show exact amounts in account native currency (USD or Cent)"
            >
              Native
            </button>
            <button
              type="button"
              onClick={() => handleSetDisplayCurrencyMode('USD')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                displayCurrencyMode === 'USD'
                  ? 'bg-emerald-500/25 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Normalize all trades to standard USD ($) equivalents (1 USD = 100 USC)"
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => handleSetDisplayCurrencyMode('USC')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                displayCurrencyMode === 'USC'
                  ? 'bg-purple-500/25 text-purple-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Show all values in Cent (USC) units"
            >
              USC (¢)
            </button>
          </div>

          <div className="text-slate-400 text-[11px] font-mono pl-1">
            {filteredTrades.length} record{filteredTrades.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Trades Table */}
      {filteredTrades.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-500">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="text-slate-400 text-sm">
            {timeframe === 'today'
              ? 'No trades logged today yet. Ready to log your first trade for today?'
              : currencyFilter !== 'all'
              ? `No ${currencyFilter === 'USC' ? 'Cent (USC)' : 'USD'} trades found for this filter.`
              : selectedAccount === 'all'
              ? t.noTrades
              : `No trades logged for ${selectedAccount} in this view.`}
          </div>
          <button
            onClick={() => openAddModal(selectedAccount === 'all' ? undefined : selectedAccount)}
            className="mt-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs px-4 py-2 rounded-lg transition-all cursor-pointer font-medium inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>
              {t.addTrade}{' '}
              {selectedAccount !== 'all' ? `for ${selectedAccount}` : ''}
            </span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-[#0c111e]/90 overflow-hidden shadow-xl">
          <div className="p-3 bg-[#111726]/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-300 font-medium flex items-center gap-2">
              <span>
                Showing {filteredTrades.length} Trade Record{filteredTrades.length > 1 ? 's' : ''}{' '}
                {selectedAccount !== 'all' ? `for ${selectedAccount}` : ''}
              </span>
              {currencyFilter !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30">
                  {currencyFilter === 'USC' ? 'Cent Accounts Only' : 'USD Accounts Only'}
                </span>
              )}
              {timeframe === 'today' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Today's Executions
                </span>
              )}
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span>USD = Standard</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-purple-400" />
                <span>USC = Cent (100:1)</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#111726] border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span>{t.lblTradeDate}</span>
                      <button
                        type="button"
                        onClick={toggleDateDisplayMode}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-slate-700/80 transition-colors cursor-pointer"
                        title={`Toggle day format: ddd (e.g. Tue) vs dddd (e.g. Tuesday). Current: ${dateDisplayMode}`}
                      >
                        <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{dateDisplayMode}</span>
                      </button>
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Investor</th>
                  <th className="py-2.5 px-3 text-center">Type / Unit</th>
                  <th className="py-2.5 px-3 text-right">{t.lblStartEquity}</th>
                  <th className="py-2.5 px-3 text-center">{t.lblLotSize}</th>
                  <th className="py-2.5 px-3 text-right">{t.lblProfitPct}</th>
                  <th className="py-2.5 px-3 text-right">Profit Amount</th>
                  <th className="py-2.5 px-3 text-right">Withdraw</th>
                  <th className="py-2.5 px-3 text-right">Reinvest</th>
                  <th className="py-2.5 px-3 text-right font-semibold">End Equity</th>
                  <th className="py-2.5 px-3">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredTrades.map((tr, idx) => {
                  const trCurrency = tr.currency || getInvestorCurrency(tr.investor_name);
                  const isCent = trCurrency === 'USC';
                  const trIsProfit = tr.profit_amount >= 0;
                  const isLatestForAccount =
                    idx ===
                    filteredTrades.findIndex(
                      (t) => t.investor_name === tr.investor_name
                    );
                  const isToday = tr.trade_date === todayStr;
                  const seqInfo = tradeSequenceMap.get(tr.id);
                  const dayInfo = getDayOfWeekInfo(tr.trade_date);
                  const dayLabel = dateDisplayMode === 'dddd' ? dayInfo.fullDay : dayInfo.shortDay;

                  // Dual currency formatting helpers
                  const formatCurrencyVal = (val: number) => {
                    if (displayCurrencyMode === 'USD') {
                      const usd = isCent ? val / 100 : val;
                      return {
                        primary: `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        secondary: isCent ? `${val.toLocaleString()} USC` : null,
                      };
                    }
                    if (displayCurrencyMode === 'USC') {
                      const usc = isCent ? val : val * 100;
                      return {
                        primary: `${usc.toLocaleString(undefined, { minimumFractionDigits: isCent ? 2 : 0 })} USC`,
                        secondary: !isCent ? `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : null,
                      };
                    }
                    // Native mode
                    return {
                      primary: isCent
                        ? `${val.toLocaleString(undefined, { minimumFractionDigits: 2 })} USC`
                        : `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                      secondary: isCent ? `≈ $${(val / 100).toFixed(2)} USD` : null,
                    };
                  };

                  const startFmt = formatCurrencyVal(tr.start_equity);
                  const endFmt = formatCurrencyVal(tr.end_equity);
                  const profitFmt = formatCurrencyVal(Math.abs(tr.profit_amount));
                  const withdrawFmt = tr.withdraw > 0 ? formatCurrencyVal(tr.withdraw) : null;
                  const reinvestFmt = formatCurrencyVal(tr.reinvest);

                  return (
                    <tr
                      key={tr.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isToday ? 'bg-cyan-500/[0.02]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-slate-300 font-sans">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {dayInfo.shortDay && (
                            <span
                              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shadow-xs ${
                                dayInfo.isWeekend
                                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/50'
                                  : 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50'
                              }`}
                              title={`${dayInfo.fullDay}, ${tr.trade_date}`}
                            >
                              {dayLabel}
                            </span>
                          )}
                          <span className="font-mono text-slate-200 font-medium">{tr.trade_date}</span>
                          {dateDisplayMode === 'ddd' && dayInfo.fullDay && (
                            <span className="text-[10px] text-slate-400 font-sans hidden xl:inline">
                              ({dayInfo.fullDay})
                            </span>
                          )}
                          {isToday && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                              Today
                            </span>
                          )}
                          {seqInfo && seqInfo.totalOnDay > 1 && (
                            <span
                              className="text-[9px] px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold"
                              title={`Trade #${seqInfo.seq} of ${seqInfo.totalOnDay} executed on ${tr.trade_date} (${dayInfo.fullDay})`}
                            >
                              #{seqInfo.seq}
                            </span>
                          )}
                          {isLatestForAccount && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold uppercase tracking-wider">
                              Latest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-cyan-300 font-sans font-medium">
                        {tr.investor_name || 'Unassigned'}
                      </td>

                      {/* Interactive Currency Badge with Quick Switch */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setCurrencySwitchModalTrade(tr)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                            isCent
                              ? 'bg-purple-950/80 text-purple-300 border-purple-500/40 hover:bg-purple-900/60 hover:border-purple-400'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60 hover:border-emerald-400'
                          }`}
                          title={`Click to switch between USD ($) and Cent (USC)`}
                        >
                          <span>{trCurrency}</span>
                          <ArrowRightLeft className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-300">
                        <div>{startFmt.primary}</div>
                        {startFmt.secondary && (
                          <div className="text-[9px] text-slate-500">{startFmt.secondary}</div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                          {tr.lot_size.toFixed(4)}
                        </span>
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right font-semibold ${
                          trIsProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {trIsProfit ? '+' : ''}
                        {tr.profit_pct.toFixed(2)}%
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          trIsProfit ? 'text-emerald-300' : 'text-rose-400'
                        }`}
                      >
                        <div>
                          {trIsProfit ? '+' : '-'}
                          {profitFmt.primary}
                        </div>
                        {profitFmt.secondary && (
                          <div className="text-[9px] text-slate-500 font-normal">
                            {trIsProfit ? '+' : '-'}
                            {profitFmt.secondary}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right text-cyan-400">
                        {withdrawFmt ? (
                          <div>
                            <div>{withdrawFmt.primary}</div>
                            {withdrawFmt.secondary && (
                              <div className="text-[9px] text-slate-500 font-normal">
                                {withdrawFmt.secondary}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right text-purple-300">
                        <div>{reinvestFmt.primary}</div>
                        {reinvestFmt.secondary && (
                          <div className="text-[9px] text-slate-500 font-normal">
                            {reinvestFmt.secondary}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-100">
                        <span className="text-cyan-300 font-bold">{endFmt.primary}</span>
                        {endFmt.secondary && (
                          <div className="text-[9px] text-slate-500 font-normal">
                            {endFmt.secondary}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 font-sans max-w-[150px] truncate text-[10px]">
                        {tr.notes || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Currency Switch Button */}
                          <button
                            type="button"
                            onClick={() => setCurrencySwitchModalTrade(tr)}
                            className="p-1 rounded text-purple-400 hover:text-purple-200 hover:bg-purple-950/40"
                            title={`Switch trade currency between Cent (USC) and USD ($)`}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Chain Next Trade Button */}
                          <button
                            type="button"
                            onClick={() =>
                              openAddModalWithStart(tr.end_equity, tr.investor_name, tr.trade_date)
                            }
                            className="p-1 rounded text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40"
                            title={`Log Next Trade chained from end equity`}
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditModal(tr)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                            title="Edit Trade"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteTrade(tr.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30"
                            title="Delete Trade"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Trade Modal — Fast Dynamic Entry & Multi-Trade Add */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c111e] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-slate-100">
                      {editingTrade ? t.editTrade : t.addTrade}
                    </h3>
                    {!editingTrade && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                        Auto Lots & Profit
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter Initial & End Balances — live equity and lots calculate instantly
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Success Notification Banner for Multi-Trade Chaining */}
            {savedToast && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs shadow-md shadow-emerald-950/30 animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{savedToast}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Account & Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 font-medium">
                    Investor
                  </label>
                  {investors.length > 0 ? (
                    <select
                      value={formData.investor_name}
                      onChange={(e) => handleInvestorSelect(e.target.value)}
                      required
                      className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      {investors.map((inv) => (
                        <option key={inv.id} value={inv.name}>
                          {inv.name} (Base: ${inv.initial_capital.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        required
                        value={formData.investor_name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, investor_name: e.target.value }))
                        }
                        className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="Investor Name (e.g. Dara Chan)"
                      />
                      <p className="text-[10px] text-amber-400/80 mt-1">
                        Tip: Add investors in the Investors tab to auto-configure lots & tiers.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-400 font-medium">{t.lblTradeDate}</label>
                    <div className="flex items-center gap-2">
                      {formData.trade_date && (
                        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/50 px-1.5 py-0.5 rounded font-mono">
                          {getDayOfWeekInfo(formData.trade_date).fullDay} ({getDayOfWeekInfo(formData.trade_date).shortDay})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, trade_date: todayStr }))
                        }
                        className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                      >
                        Set Today
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.trade_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, trade_date: e.target.value }))
                    }
                    className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {/* ACCOUNT CURRENCY & UNIT CONTROLLER (USD vs Cent / USC) */}
              <div className="p-3 bg-[#0c111e] rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Account Trading Type & Currency</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setConverterModalOpen(true)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
                    title="Open Pip & Balance Simulator"
                  >
                    <Calculator className="w-3 h-3" />
                    <span>Open Converter Calculator</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFormCurrency('USD')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      formData.currency === 'USD'
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-xs'
                        : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Standard USD ($)</span>
                      {formData.currency === 'USD' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">1 Lot = 100,000 units • $10/pip</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleFormCurrency('USC')}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      formData.currency === 'USC'
                        ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-xs'
                        : 'bg-[#111726] border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">Cent Account (USC)</span>
                      {formData.currency === 'USC' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">100 USC = $1.00 USD • Micro risk</p>
                  </button>
                </div>

                {/* Quick value conversion helper (e.g. accidentally typed 2,000 instead of 200,000 or vice versa) */}
                <div className="flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-slate-800/60 text-[11px]">
                  <span className="text-slate-400">
                    Active Unit:{' '}
                    <strong className={formData.currency === 'USC' ? 'text-purple-300' : 'text-emerald-300'}>
                      {formData.currency === 'USC' ? 'Cent (USC)' : 'Standard USD ($)'}
                    </strong>
                    {formData.currency === 'USC' && formData.start_equity > 0 && (
                      <span className="text-[10px] text-slate-400 ml-1">
                        (≈ ${(formData.start_equity / 100).toFixed(2)} USD start)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleConvertFormDataValues}
                    className="text-xs text-amber-300 hover:text-amber-200 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-all hover:bg-amber-900/40"
                    title="Convert all balance inputs by factor of 100"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                    <span>
                      {formData.currency === 'USC' ? 'Convert Values to USD (÷100)' : 'Convert Values to Cent (×100)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* CORE INPUTS: Initial Balance & End Balance */}
              <div className="p-4 bg-[#111726]/80 rounded-xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Core Balance Inputs
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Auto-Calculates Profit & Lots ({formData.currency})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-medium">
                      Initial Balance ({formData.currency === 'USC' ? 'USC / Cent' : 'USDT / $'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">
                        {formData.currency === 'USC' ? '¢' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.start_equity || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          recalculateFromBalances(val, formData.end_equity);
                        }}
                        className="w-full bg-[#0c111e] border border-slate-700/80 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                        placeholder={formData.currency === 'USC' ? '200000' : '2000.00'}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-medium">
                      End Balance / Equity ({formData.currency === 'USC' ? 'USC / Cent' : 'USDT / $'})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">
                        {formData.currency === 'USC' ? '¢' : '$'}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.end_equity || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          recalculateFromBalances(formData.start_equity, val);
                        }}
                        className="w-full bg-[#0c111e] border border-cyan-500/40 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
                        placeholder={formData.currency === 'USC' ? '225000' : '2250.00'}
                      />
                    </div>
                  </div>
                </div>

                {/* Quick % Growth Presets */}
                <div className="pt-1">
                  <div className="text-[10px] text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Quick End Balance Presets:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Break-Even (0%)', pct: 0 },
                      { label: '+5%', pct: 5 },
                      { label: '+10%', pct: 10 },
                      { label: '+12.5%', pct: 12.5 },
                      { label: '+15%', pct: 15 },
                      { label: '+20%', pct: 20 },
                      { label: '+25%', pct: 25 },
                    ].map((preset) => (
                      <button
                        key={preset.pct}
                        type="button"
                        onClick={() => applyProfitPreset(preset.pct)}
                        className={`text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer border ${
                          Math.abs(formData.profit_pct - preset.pct) < 0.05
                            ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                            : 'bg-[#0c111e] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* DYNAMIC CALCULATION RESULTS CARD */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#090d16] p-3 rounded-xl border border-slate-800">
                <div className="p-2 bg-[#0e1424] rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">
                    Net Profit ({formData.currency})
                  </span>
                  <div
                    className={`font-mono text-xs font-bold flex items-center gap-0.5 ${
                      isProfit ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {isProfit ? '+' : ''}
                      {formData.currency === 'USC' ? '' : '$'}
                      {formData.profit_amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                      {formData.currency === 'USC' ? ' USC' : ''}
                    </span>
                  </div>
                  {formData.currency === 'USC' && (
                    <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                      ≈ {isProfit ? '+' : ''}${(formData.profit_amount / 100).toFixed(2)} USD
                    </span>
                  )}
                </div>

                <div className="p-2 bg-[#0e1424] rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Profit %</span>
                  <div
                    className={`font-mono text-xs font-bold ${
                      isProfit ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {isProfit ? '+' : ''}
                    {formData.profit_pct.toFixed(2)}%
                  </div>
                </div>

                <div className="p-2 bg-[#0e1424] rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">DCA Lot Size</span>
                  <div className="font-mono text-xs font-bold text-cyan-300">
                    {formData.lot_size.toFixed(4)}
                  </div>
                </div>

                <div className="p-2 bg-[#0e1424] rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block mb-0.5">DCA Tier</span>
                  <div className="font-mono text-xs font-bold text-purple-300">
                    Tier {currentTier}
                  </div>
                </div>
              </div>

              {/* ADVANCED TOGGLE: Withdraw, Custom Lot Size, Notes */}
              <div className="border-t border-slate-800 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    Additional Details (Withdrawal, Custom Lot, Notes)
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 bg-[#0e1424]/60 p-3 rounded-xl border border-slate-800/60 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">
                          Withdrawal from Profit (USDT)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-500 text-xs font-mono">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.withdraw || 0}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              recalculateFromBalances(
                                formData.start_equity,
                                formData.end_equity,
                                val
                              );
                            }}
                            className="w-full bg-[#111726] border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                            placeholder="0.00"
                          />
                        </div>
                        {formData.profit_amount > 0 && (
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const w = parseFloat((formData.profit_amount * 0.3).toFixed(2));
                                recalculateFromBalances(
                                  formData.start_equity,
                                  formData.end_equity,
                                  w
                                );
                              }}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            >
                              30% Split (${(formData.profit_amount * 0.3).toFixed(2)})
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                recalculateFromBalances(
                                  formData.start_equity,
                                  formData.end_equity,
                                  0
                                )
                              }
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                            >
                              0% Withdraw
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-slate-400">Manual Lot Size Override</label>
                          <label className="text-[10px] text-slate-500 flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customLotOverride}
                              onChange={(e) => setCustomLotOverride(e.target.checked)}
                              className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                            />
                            <span>Customize</span>
                          </label>
                        </div>
                        <input
                          type="number"
                          step="0.0001"
                          disabled={!customLotOverride}
                          value={formData.lot_size}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              lot_size: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none ${
                            customLotOverride
                              ? 'bg-[#111726] border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">{t.lblNotes}</label>
                      <input
                        type="text"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        className="w-full bg-[#111726] border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. DCA Long Gold (XAUUSD) scale-out at TP3"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Action Buttons: Cancel, Save & Add Next, and Save */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer font-medium order-3 sm:order-1"
                >
                  {t.cancel}
                </button>

                <div className="flex items-center gap-2 order-1 sm:order-2">
                  {!editingTrade && (
                    <button
                      type="button"
                      onClick={handleSaveAndAddNext}
                      className="px-4 py-2 rounded-lg bg-[#14233c] hover:bg-[#1b2f52] border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      title="Save this trade and immediately prime the next trade with this end equity"
                    >
                      <PlusCircle className="w-4 h-4 text-cyan-400" />
                      <span>{t.saveAndAddNext}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                  >
                    <span>{t.saveTrade}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Trade Currency Switch / Conversion Modal */}
      {currencySwitchModalTrade && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c111e] border border-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-sm text-slate-100">
                    Switch Trade Currency
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currencySwitchModalTrade.trade_date} • {currencySwitchModalTrade.investor_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrencySwitchModalTrade(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Details */}
            <div className="p-3 bg-[#111726] rounded-xl border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Current Currency:</span>
                <span className="font-bold text-slate-200">
                  {currencySwitchModalTrade.currency || getInvestorCurrency(currencySwitchModalTrade.investor_name)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Start Balance:</span>
                <span className="font-mono text-slate-200">
                  {currencySwitchModalTrade.start_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Net Profit:</span>
                <span className="font-mono text-emerald-400">
                  {currencySwitchModalTrade.profit_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>End Equity:</span>
                <span className="font-mono text-cyan-300 font-bold">
                  {currencySwitchModalTrade.end_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Actions: Option A: Convert Numerical Values */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300">Choose conversion method:</p>

              {(() => {
                const cur = currencySwitchModalTrade.currency || getInvestorCurrency(currencySwitchModalTrade.investor_name);
                const targetCurr: 'USD' | 'USC' = cur === 'USC' ? 'USD' : 'USC';
                const factor = targetCurr === 'USC' ? 100 : 0.01;
                const convertedStart = (currencySwitchModalTrade.start_equity * factor).toFixed(2);
                const convertedEnd = (currencySwitchModalTrade.end_equity * factor).toFixed(2);

                return (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleQuickSwitchTradeCurrency(currencySwitchModalTrade, 'convert_values')}
                      className="w-full text-left p-3 rounded-xl bg-[#111726] hover:bg-[#151d30] border border-cyan-500/30 hover:border-cyan-500/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Convert Values to {targetCurr} ({targetCurr === 'USC' ? '×100' : '÷100'})</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Adjusts balances by factor of 100 so real value is preserved.
                      </p>
                      <p className="text-[10px] text-slate-300 font-mono mt-1">
                        Preview: Start {convertedStart} {targetCurr} • End {convertedEnd} {targetCurr}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickSwitchTradeCurrency(currencySwitchModalTrade, 'label_only')}
                      className="w-full text-left p-3 rounded-xl bg-[#111726] hover:bg-[#151d30] border border-slate-800 hover:border-slate-700 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-300 group-hover:text-slate-100 flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-purple-400" />
                          <span>Change Currency Tag Only to {targetCurr}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Keeps exact numbers unchanged. Use if you originally entered numbers meant for {targetCurr}.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setConverterModalOpen(true);
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-800/40 text-xs text-cyan-300 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Open in Full Cent / USD Trade Log Converter</span>
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400/80">1 USD = 100 USC →</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setCurrencySwitchModalTrade(null)}
                className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cent / USC ↔ Standard USD Converter Modal */}
      <CentUsdConverterModal
        isOpen={converterModalOpen}
        onClose={() => setConverterModalOpen(false)}
        trades={trades}
        investors={investors}
        initialSelectedAccount={
          currencySwitchModalTrade ? currencySwitchModalTrade.investor_name : selectedAccount !== 'all' ? selectedAccount : undefined
        }
        initialSelectedTradeId={currencySwitchModalTrade?.id}
        defaultStartEquity={formData.start_equity || viewMetrics.nativeEquity || 1000}
        onUpdateTrade={onEditTrade}
        onBatchConvertAccountTrades={handleBatchConvertAccountTrades}
        onCreateNewTrade={handleCreateNewTradeFromConverter}
        onApplyToTrade={(convertedData) => {
          setFormData((prev) => ({
            ...prev,
            currency: convertedData.currency,
            start_equity: convertedData.start_equity,
            end_equity: convertedData.end_equity,
            profit_amount: convertedData.profit_amount,
            profit_pct: convertedData.profit_pct,
          }));
          if (!modalOpen) {
            setModalOpen(true);
          }
        }}
      />
    </div>
  );
};
