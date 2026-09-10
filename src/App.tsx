import React, { useState, useEffect } from 'react';
import {
  SimulationParams,
  SimulationResult,
  Investor,
  Trade,
  Language,
  BrandingConfig,
  SimulatorSessionMemory,
} from './types';
import { TRANSLATIONS } from './utils/translations';
import {
  DEFAULT_SIMULATION_PARAMS,
  runSimulation,
} from './utils/simulation';
import {
  getStoredBranding,
  saveStoredBranding,
  DEFAULT_BRANDING,
  getLastSimulationMemory,
  saveSimulationMemory,
  getRecentSimulationsMemory,
  clearRecentSimulationsMemory,
  deleteRecentSimulationMemory,
  createSessionMemoryFromSimulation,
} from './utils/branding';
import { safeStorage } from './utils/safeStorage';
import { Header } from './components/Header';
import { SimulatorView } from './components/SimulatorView';
import { SpreadsheetView } from './components/SpreadsheetView';
import { GoldCalculatorView } from './components/GoldCalculatorView';
import { InvestorsView } from './components/InvestorsView';
import { TradeLogView } from './components/TradeLogView';
import { HistoryView } from './components/HistoryView';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminBrandingModal } from './components/AdminBrandingModal';
import { RecentSimulationsModal } from './components/RecentSimulationsModal';
import {
  CloudSyncState,
  subscribeToTrades,
  subscribeToInvestors,
  syncSaveTrade,
  syncDeleteTrade,
  syncSaveInvestor,
  syncDeleteInvestor,
  pushAllToCloud,
  checkCloudHasData,
} from './lib/firebaseSync';

const INITIAL_INVESTORS: Investor[] = [
  {
    id: 'inv-1',
    name: 'Sokha Meng (VIP Account)',
    email: 'sokha.m@investor.kh',
    phone: '+855 12 888 999',
    currency: 'USD',
    initial_capital: 5000,
    profit_min: 12,
    profit_max: 30,
    withdraw_pct: 30,
    reinvest_pct: 70,
    withdraw_fee: 1,
    base_equity: 2000,
    base_lot_size: 0.02,
    lot_increment: 0.02,
    notes: 'Long-term equity scaling strategy. Weekly performance review.',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: 'inv-2',
    name: 'Dara Chan',
    email: 'dara.chan@investor.kh',
    phone: '+855 93 456 789',
    currency: 'USD',
    initial_capital: 2000,
    profit_min: 10,
    profit_max: 25,
    withdraw_pct: 25,
    reinvest_pct: 75,
    withdraw_fee: 1,
    base_equity: 2000,
    base_lot_size: 0.01,
    lot_increment: 0.01,
    notes: 'Conservative DCA scaling profile.',
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'inv-3',
    name: 'Vannak Kem (Cent Account)',
    email: 'vannak.kem@investor.kh',
    phone: '+855 89 112 233',
    currency: 'USC',
    initial_capital: 5000,
    profit_min: 15,
    profit_max: 35,
    withdraw_pct: 30,
    reinvest_pct: 70,
    withdraw_fee: 1,
    base_equity: 2000,
    base_lot_size: 0.01,
    lot_increment: 0.01,
    notes: 'MetaTrader Cent (USC) DCA grid account on Gold XAUUSD.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const INITIAL_TRADES: Trade[] = [
  {
    id: 'tr-1',
    investor_name: 'Sokha Meng (VIP Account)',
    currency: 'USD',
    trade_date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    start_equity: 5000,
    lot_size: 0.02,
    profit_pct: 14.8,
    profit_amount: 740,
    withdraw: 222,
    reinvest: 518,
    end_equity: 5518,
    notes: 'BTC/USDT AI DCA trigger hit target tier 1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'tr-2',
    investor_name: 'Dara Chan',
    currency: 'USD',
    trade_date: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
    start_equity: 2000,
    lot_size: 0.01,
    profit_pct: 18.2,
    profit_amount: 364,
    withdraw: 109.2,
    reinvest: 254.8,
    end_equity: 2254.8,
    notes: 'ETH/USDT breakout swing with auto lot increment',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'tr-3',
    investor_name: 'Vannak Kem (Cent Account)',
    currency: 'USC',
    trade_date: new Date().toISOString().slice(0, 10),
    start_equity: 5000,
    lot_size: 0.01,
    profit_pct: 12.0,
    profit_amount: 600,
    withdraw: 180,
    reinvest: 420,
    end_equity: 5420,
    notes: 'XAUUSD Cent DCA safety cycle completed (+600 USC ≈ +$6.00 USD)',
    created_at: new Date().toISOString(),
  },
];

export function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'spreadsheet' | 'gold-calc' | 'investors' | 'trade-log' | 'history'>('spreadsheet');
  const [lang, setLang] = useState<Language>(() => {
    return (safeStorage.getItem('snl_app_lang') as Language) || 'en';
  });

  const [activeInvestorName, setActiveInvestorName] = useState<string | undefined>();

  // Admin & Branding State
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return safeStorage.getItem('snl_admin_session') === 'true';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);

  const [branding, setBranding] = useState<BrandingConfig>(() => {
    return getStoredBranding();
  });

  // Simulator State
  const [params, setParams] = useState<SimulationParams>(() => {
    return safeStorage.getJSON<SimulationParams>('snl_sim_params', DEFAULT_SIMULATION_PARAMS);
  });

  const [simulationResult, setSimulationResult] = useState<SimulationResult>(() => {
    return runSimulation(params);
  });

  // Simulator Session Memory State
  const [lastSessionMemory, setLastSessionMemory] = useState<SimulatorSessionMemory | null>(() => {
    return getLastSimulationMemory();
  });
  const [recentSessions, setRecentSessions] = useState<SimulatorSessionMemory[]>(() => {
    return getRecentSimulationsMemory();
  });

  // Record simulation helper
  const recordSimulationMemory = (res: SimulationResult, curParams: SimulationParams, invName?: string) => {
    const mem = createSessionMemoryFromSimulation(res, curParams, invName);
    saveSimulationMemory(mem);
    setLastSessionMemory(mem);
    setRecentSessions(getRecentSimulationsMemory());
  };

  // Investors State
  const [investors, setInvestors] = useState<Investor[]>(() => {
    return safeStorage.getJSON<Investor[]>('snl_investors', INITIAL_INVESTORS);
  });

  // Trade Log State
  const [trades, setTrades] = useState<Trade[]>(() => {
    const loaded = safeStorage.getJSON<Trade[]>('snl_trades', INITIAL_TRADES);
    if (Array.isArray(loaded)) {
      return loaded.map((tr: Trade) => {
        if (tr.investor_name === 'General Account' || !tr.investor_name) {
          return { ...tr, investor_name: 'Dara Chan' };
        }
        return tr;
      });
    }
    return INITIAL_TRADES;
  });

  // History State
  const [history, setHistory] = useState<SimulationResult[]>(() => {
    return safeStorage.getJSON<SimulationResult[]>('snl_sim_history', []);
  });

  // Cloud Sync State
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    status: 'connecting',
    lastSyncedAt: null,
    error: null,
  });

  // 1. Subscribe to real-time updates from Firebase Firestore
  useEffect(() => {
    let isSubscribed = true;

    // Check if cloud already has trades; if empty, seed local data so phones don't start empty!
    checkCloudHasData()
      .then(async (hasData) => {
        if (!hasData && isSubscribed) {
          // Push current state to seed cloud database
          try {
            await pushAllToCloud({
              trades,
              investors,
              params,
              branding,
              history,
              recentSimulations: recentSessions,
            });
            if (isSubscribed) {
              setCloudSync({
                status: 'connected',
                lastSyncedAt: new Date(),
                error: null,
              });
            }
          } catch (seedErr) {
            console.warn('Initial cloud seed attempt:', seedErr);
          }
        }
      })
      .catch((err) => console.warn('checkCloudHasData err:', err));

    // Listen to real-time Trades from Firestore
    const unsubTrades = subscribeToTrades(
      (cloudTrades) => {
        if (!isSubscribed) return;
        if (cloudTrades.length > 0) {
          setTrades(cloudTrades);
        }
        setCloudSync((prev) => ({
          ...prev,
          status: 'connected',
          lastSyncedAt: new Date(),
          error: null,
        }));
      },
      (err) => {
        if (!isSubscribed) return;
        console.warn('Trades subscription error:', err);
        setCloudSync((prev) => ({
          ...prev,
          status: 'error',
          error: err.message,
        }));
      }
    );

    // Listen to real-time Investors/Accounts from Firestore
    const unsubInvestors = subscribeToInvestors(
      (cloudInvestors) => {
        if (!isSubscribed) return;
        if (cloudInvestors.length > 0) {
          setInvestors(cloudInvestors);
        }
      },
      (err) => {
        console.warn('Investors subscription error:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubTrades();
      unsubInvestors();
    };
  }, []);

  // Save changes to safeStorage
  useEffect(() => {
    safeStorage.setItem('snl_app_lang', lang);
  }, [lang]);

  useEffect(() => {
    safeStorage.setJSON('snl_sim_params', params);
  }, [params]);

  useEffect(() => {
    safeStorage.setJSON('snl_investors', investors);
  }, [investors]);

  useEffect(() => {
    safeStorage.setJSON('snl_trades', trades);
  }, [trades]);

  useEffect(() => {
    safeStorage.setJSON('snl_sim_history', history);
  }, [history]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'km' : 'en'));
  };

  // Admin Controls
  const handleOpenAdmin = () => {
    if (isAdmin) {
      setIsBrandingModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdmin(true);
    safeStorage.setItem('snl_admin_session', 'true');
    setIsBrandingModalOpen(true);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    safeStorage.removeItem('snl_admin_session');
    setIsBrandingModalOpen(false);
  };

  const handleSaveBranding = (updated: BrandingConfig) => {
    setBranding(updated);
    saveStoredBranding(updated);
  };

  const handleResetBranding = () => {
    setBranding(DEFAULT_BRANDING);
    saveStoredBranding(DEFAULT_BRANDING);
  };

  // Simulation Handlers
  const handleRunSimulation = () => {
    const result = runSimulation(params);
    setSimulationResult(result);
    recordSimulationMemory(result, params, activeInvestorName);
  };

  const handleClearParams = () => {
    setParams(DEFAULT_SIMULATION_PARAMS);
    setActiveInvestorName(undefined);
    const res = runSimulation(DEFAULT_SIMULATION_PARAMS);
    setSimulationResult(res);
  };

  const handleRestoreSession = (session: SimulatorSessionMemory) => {
    setParams(session.params);
    setActiveInvestorName(session.investorName);
    const res = runSimulation(session.params);
    setSimulationResult(res);
    setActiveTab('simulator');
  };

  const handleRestoreLastSession = () => {
    if (lastSessionMemory) {
      handleRestoreSession(lastSessionMemory);
    }
  };

  const handleClearRecentSessions = () => {
    clearRecentSimulationsMemory();
    setRecentSessions([]);
    setLastSessionMemory(null);
  };

  const handleDeleteRecentSession = (id: string) => {
    deleteRecentSimulationMemory(id);
    const updated = getRecentSimulationsMemory();
    setRecentSessions(updated);
    if (lastSessionMemory?.id === id) {
      setLastSessionMemory(updated[0] || null);
    }
  };

  const handleSaveResult = (res: SimulationResult) => {
    const newEntry: SimulationResult = {
      ...res,
      id: 'sim-' + Date.now(),
      created_date: new Date().toISOString(),
      investor_name: activeInvestorName,
    };
    setHistory((prev) => [newEntry, ...prev]);
    recordSimulationMemory(res, params, activeInvestorName);
  };

  // Backup & Recovery Handlers
  const handleExportBackup = () => {
    const backup = {
      app: 'SNL AI DCA Future Trade',
      version: '4.0',
      exportTimestamp: new Date().toISOString(),
      investors,
      trades,
      history,
      params,
      branding,
      recentSimulations: recentSessions,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SNL_Backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.investors && Array.isArray(parsed.investors)) {
        setInvestors(parsed.investors);
      }
      if (parsed.trades && Array.isArray(parsed.trades)) {
        setTrades(parsed.trades);
      }
      if (parsed.history && Array.isArray(parsed.history)) {
        setHistory(parsed.history);
      }
      if (parsed.params) {
        setParams(parsed.params);
      }
      if (parsed.branding) {
        setBranding(parsed.branding);
        saveStoredBranding(parsed.branding);
      }
      if (parsed.recentSimulations && Array.isArray(parsed.recentSimulations)) {
        safeStorage.setJSON('snl_sim_memories', parsed.recentSimulations);
        setRecentSessions(parsed.recentSimulations);
        if (parsed.recentSimulations.length > 0) {
          setLastSessionMemory(parsed.recentSimulations[0]);
        }
      }
      alert('Backup database successfully restored!');
    } catch (err) {
      alert('Failed to parse backup JSON file. Please ensure it is a valid format.');
    }
  };

  // Investor Handlers
  const handleAddInvestor = async (newInv: Omit<Investor, 'id' | 'created_at'>) => {
    const item: Investor = {
      ...newInv,
      id: 'inv-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setInvestors((prev) => [item, ...prev]);
    try {
      await syncSaveInvestor(item);
    } catch (e) {
      console.warn('Could not sync new investor to cloud:', e);
    }
  };

  const handleEditInvestor = async (updatedInv: Investor) => {
    setInvestors((prev) => prev.map((inv) => (inv.id === updatedInv.id ? updatedInv : inv)));
    try {
      await syncSaveInvestor(updatedInv);
    } catch (e) {
      console.warn('Could not sync updated investor to cloud:', e);
    }
  };

  const handleDeleteInvestor = async (id: string) => {
    setInvestors((prev) => prev.filter((inv) => inv.id !== id));
    try {
      await syncDeleteInvestor(id);
    } catch (e) {
      console.warn('Could not delete investor from cloud:', e);
    }
  };

  const handleSimulateForInvestor = (inv: Investor) => {
    const newParams: SimulationParams = {
      initialCapital: inv.initial_capital,
      days: params.days,
      profitMin: inv.profit_min,
      profitMax: inv.profit_max,
      profitMode: params.profitMode,
      withdrawPct: inv.withdraw_pct,
      reinvestPct: inv.reinvest_pct,
      withdrawFee: inv.withdraw_fee,
      requireProfit: params.requireProfit,
      startDate: new Date().toISOString().slice(0, 10),
      projectName: `${inv.name} — DCA Scaling`,
      baseEquity: inv.base_equity,
      baseLotSize: inv.base_lot_size,
      lotIncrement: inv.lot_increment,
      excludeWeekends: params.excludeWeekends ?? true,
    };

    setParams(newParams);
    setActiveInvestorName(inv.name);
    const res = runSimulation(newParams);
    setSimulationResult(res);
    recordSimulationMemory(res, newParams, inv.name);
    setActiveTab('simulator');
  };

  // Trade Handlers
  const handleAddTrade = async (newTr: Omit<Trade, 'id' | 'created_at'>) => {
    const item: Trade = {
      ...newTr,
      id: 'tr-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    setTrades((prev) => [item, ...prev]);
    try {
      await syncSaveTrade(item);
    } catch (e) {
      console.warn('Could not sync new trade to cloud:', e);
    }
  };

  const handleEditTrade = async (updatedTr: Trade) => {
    setTrades((prev) => prev.map((tr) => (tr.id === updatedTr.id ? updatedTr : tr)));
    try {
      await syncSaveTrade(updatedTr);
    } catch (e) {
      console.warn('Could not sync updated trade to cloud:', e);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    setTrades((prev) => prev.filter((tr) => tr.id !== id));
    try {
      await syncDeleteTrade(id);
    } catch (e) {
      console.warn('Could not delete trade from cloud:', e);
    }
  };

  // Force Push All Local Data to Cloud
  const handlePushAllToCloud = async () => {
    setCloudSync((prev) => ({ ...prev, status: 'syncing' }));
    try {
      await pushAllToCloud({
        trades,
        investors,
        params,
        branding,
        history,
        recentSimulations: recentSessions,
      });
      setCloudSync({
        status: 'connected',
        lastSyncedAt: new Date(),
        error: null,
      });
    } catch (err: any) {
      setCloudSync((prev) => ({
        ...prev,
        status: 'error',
        error: err?.message || 'Sync error',
      }));
      throw err;
    }
  };

  // History Handlers
  const handleLoadSimulation = (res: SimulationResult) => {
    setSimulationResult(res);
    setActiveInvestorName(res.investor_name);
    setActiveTab('simulator');
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const t = TRANSLATIONS[lang];

  return (
    <div className={`min-h-screen bg-[#080c14] text-slate-100 ${lang === 'km' ? 'khmer' : ''}`}>
      {/* Sticky Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onToggleLang={toggleLanguage}
        branding={branding}
        isAdmin={isAdmin}
        onOpenAdmin={handleOpenAdmin}
        t={t}
        cloudSync={cloudSync}
        onForceSyncToCloud={handlePushAllToCloud}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'simulator' && (
          <SimulatorView
            params={params}
            onParamsChange={(newP) => {
              setParams(newP);
              const res = runSimulation(newP);
              setSimulationResult(res);
              recordSimulationMemory(res, newP, activeInvestorName);
            }}
            result={simulationResult}
            onRunSimulation={handleRunSimulation}
            onClear={handleClearParams}
            onSaveResult={handleSaveResult}
            t={t}
            activeInvestorName={activeInvestorName}
            branding={branding}
            lastSessionMemory={lastSessionMemory}
            onRestoreLastSession={handleRestoreLastSession}
            onOpenRecentSessions={() => setIsRecentModalOpen(true)}
            recentSessionsCount={recentSessions.length}
          />
        )}

        {activeTab === 'spreadsheet' && (
          <SpreadsheetView t={t} />
        )}

        {activeTab === 'gold-calc' && (
          <GoldCalculatorView t={t} />
        )}

        {activeTab === 'investors' && (
          <InvestorsView
            investors={investors}
            onAddInvestor={handleAddInvestor}
            onEditInvestor={handleEditInvestor}
            onDeleteInvestor={handleDeleteInvestor}
            onSimulateForInvestor={handleSimulateForInvestor}
            t={t}
          />
        )}

        {activeTab === 'trade-log' && (
          <TradeLogView
            trades={trades}
            investors={investors}
            onAddTrade={handleAddTrade}
            onEditTrade={handleEditTrade}
            onDeleteTrade={handleDeleteTrade}
            t={t}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onLoadSimulation={handleLoadSimulation}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            t={t}
          />
        )}
      </main>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        t={t}
      />

      {/* Admin Branding & System Backup Modal */}
      <AdminBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        branding={branding}
        onSaveBranding={handleSaveBranding}
        onResetBranding={handleResetBranding}
        onLogout={handleLogout}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
        t={t}
        cloudSync={cloudSync}
        onPushAllToCloud={handlePushAllToCloud}
      />

      {/* Recent Simulation Snapshots Modal */}
      <RecentSimulationsModal
        isOpen={isRecentModalOpen}
        onClose={() => setIsRecentModalOpen(false)}
        sessions={recentSessions}
        onRestoreSession={handleRestoreSession}
        onClearSessions={handleClearRecentSessions}
        onDeleteSession={handleDeleteRecentSession}
        t={t}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 mt-12 bg-[#0a0f1a]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            {branding.companyFooter || `© 2025 ${branding.brandName || 'SNL AI DCA Future Trade'}`}
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            {branding.contactEmail && <span>{branding.contactEmail}</span>}
            {branding.contactPhone && (
              <>
                <span>•</span>
                <span>{branding.contactPhone}</span>
              </>
            )}
            {branding.telegram && (
              <>
                <span>•</span>
                <span>{branding.telegram}</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
