import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Database,
  Smartphone,
  Laptop,
  Upload,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Trade, Investor, Translations } from '../types';
import { CloudSyncState, DEMO_TRADE_IDS, DEMO_INVESTOR_IDS, fetchCloudData } from '../lib/firebaseSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  investors: Investor[];
  cloudSync: CloudSyncState;
  onPushAllToCloud: () => Promise<void>;
  onPullFromCloud: () => Promise<void>;
  onPurgeDemoData: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  t: Translations;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  trades,
  investors,
  cloudSync,
  onPushAllToCloud,
  onPullFromCloud,
  onPurgeDemoData,
  onExportBackup,
  onImportBackup,
  t,
}) => {
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [cloudCounts, setCloudCounts] = useState<{ trades: number; investors: number; loaded: boolean }>({
    trades: 0,
    investors: 0,
    loaded: false,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Check if current local data contains sample demo data
  const hasDemoTrades = trades.some((tr) => DEMO_TRADE_IDS.includes(tr.id));
  const hasDemoInvestors = investors.some((inv) => DEMO_INVESTOR_IDS.includes(inv.id));
  const hasDemoData = hasDemoTrades || hasDemoInvestors;

  const realTradesCount = trades.filter((tr) => !DEMO_TRADE_IDS.includes(tr.id)).length;
  const realInvestorsCount = investors.filter((inv) => !DEMO_INVESTOR_IDS.includes(inv.id)).length;

  // Refresh live cloud counts when modal opens
  const checkLiveCloud = async () => {
    try {
      const data = await fetchCloudData();
      setCloudCounts({
        trades: data.trades.length,
        investors: data.investors.length,
        loaded: true,
      });
    } catch {
      setCloudCounts((prev) => ({ ...prev, loaded: true }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkLiveCloud();
      setNotification(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePush = async () => {
    setIsPushing(true);
    setNotification(null);
    try {
      await onPushAllToCloud();
      await checkLiveCloud();
      setNotification({
        type: 'success',
        text: `Successfully synced ${trades.length} trades and ${investors.length} accounts to Cloud Firestore! Ready on your mobile and desktop.`,
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        text: `Failed to push data to cloud: ${e?.message || 'Network error'}`,
      });
    } finally {
      setIsPushing(false);
    }
  };

  const handlePull = async () => {
    setIsPulling(true);
    setNotification(null);
    try {
      await onPullFromCloud();
      await checkLiveCloud();
      setNotification({
        type: 'success',
        text: 'Successfully downloaded latest cloud records into your workspace.',
      });
    } catch (e: any) {
      setNotification({
        type: 'error',
        text: `Failed to pull data from cloud: ${e?.message || 'Network error'}`,
      });
    } finally {
      setIsPulling(false);
    }
  };

  const handlePurge = () => {
    onPurgeDemoData();
    setNotification({
      type: 'info',
      text: 'Removed sample demo accounts & trades. Only your real data remains.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        onImportBackup(text);
        setNotification({
          type: 'success',
          text: 'Backup file successfully imported! You can now click "Sync My Current Data to Cloud" to sync it everywhere.',
        });
      } catch (err: any) {
        setNotification({
          type: 'error',
          text: `Invalid backup file: ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      id="cloud-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="cloud-sync-modal-card"
        className="relative w-full max-w-xl bg-[#0b101d] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-heading font-bold text-slate-100">
                  Firebase Cloud Sync Center
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                    cloudSync.status === 'connected'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      : cloudSync.status === 'syncing'
                      ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 animate-pulse'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <CloudCheck className="w-3 h-3" />
                  <span>{cloudSync.status === 'connected' ? 'LIVE SYNC' : cloudSync.status.toUpperCase()}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time multi-device sync across Mobile (Telegram / Web) & Desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Notification Alert */}
          {notification && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-scale-in ${
                notification.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : notification.type === 'error'
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{notification.text}</div>
            </div>
          )}

          {/* Comparison Cards: Local App vs Cloud Database */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Left: Current Active App Data */}
            <div className="p-4 rounded-xl bg-[#101729] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                  <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Current App Data</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Local View</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Trade Records:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{trades.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Investor Accounts:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">{investors.length}</span>
                </div>
                {hasDemoData && (
                  <div className="text-[11px] text-amber-400/90 pt-1 flex items-center gap-1 border-t border-slate-800">
                    <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Includes sample demo records</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cloud Firestore Database */}
            <div className="p-4 rounded-xl bg-[#101729] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Firestore</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Cloud Live
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cloud Trades:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">
                    {cloudCounts.loaded ? cloudCounts.trades : '...'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cloud Accounts:</span>
                  <span className="font-mono font-bold text-slate-100 text-sm">
                    {cloudCounts.loaded ? cloudCounts.investors : '...'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1 border-t border-slate-800">
                  <Smartphone className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>Syncs automatically to phones</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button: Push Current Data to Cloud */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isPushing}
              onClick={handlePush}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isPushing ? 'animate-spin' : ''}`} />
              <span>
                {isPushing
                  ? 'Uploading & Syncing...'
                  : `Sync My Current Data to Cloud (${trades.length} trades, ${investors.length} accounts)`}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Uploads everything currently on your screen to Cloud Firestore and purges any old demo records so all your devices show your exact trading data.
            </p>
          </div>

          {/* Secondary Actions */}
          <div className="pt-2 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isPulling}
              onClick={handlePull}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className={`w-3.5 h-3.5 text-cyan-400 ${isPulling ? 'animate-bounce' : ''}`} />
              <span>Pull Data from Cloud</span>
            </button>

            {hasDemoData ? (
              <button
                type="button"
                onClick={handlePurge}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium transition-all cursor-pointer"
                title="Removes sample records (Sokha Meng, Dara Chan, Vannak Kem)"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Clean Out Demo Records</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onExportBackup}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Local Backup JSON</span>
              </button>
            )}
          </div>

          {/* Backup Import Option */}
          <div className="p-3.5 rounded-xl bg-[#0f1422] border border-slate-800/80 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-slate-300">Have a backup file?</span>
              <p className="text-[11px] text-slate-400">Import a previously exported JSON backup file</p>
            </div>
            <label className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors shrink-0">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Import File</span>
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0c1220] flex items-center justify-between text-[11px] text-slate-400">
          <span>Project: gen-lang-client-0080669522</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
