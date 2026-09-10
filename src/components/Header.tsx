import React from 'react';
import { Translations, Language, BrandingConfig } from '../types';
import { Activity, Users, ClipboardList, History, Globe, Coins, Table, Shield, Lock, Cloud, CloudCheck, RefreshCw } from 'lucide-react';
import { BrandedLogo } from './BrandedLogo';
import { CloudSyncState } from '../lib/firebaseSync';

interface HeaderProps {
  activeTab: 'simulator' | 'spreadsheet' | 'gold-calc' | 'investors' | 'trade-log' | 'history';
  onTabChange: (tab: 'simulator' | 'spreadsheet' | 'gold-calc' | 'investors' | 'trade-log' | 'history') => void;
  lang: Language;
  onToggleLang: () => void;
  branding: BrandingConfig;
  isAdmin: boolean;
  onOpenAdmin: () => void;
  t: Translations;
  cloudSync?: CloudSyncState;
  onOpenCloudSync?: () => void;
  onForceSyncToCloud?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  lang,
  onToggleLang,
  branding,
  isAdmin,
  onOpenAdmin,
  t,
  cloudSync,
  onOpenCloudSync,
  onForceSyncToCloud,
}) => {
  const navItems = [
    { id: 'simulator' as const, label: t.navSimulator, icon: Activity },
    { id: 'spreadsheet' as const, label: t.navSpreadsheet, icon: Table },
    { id: 'gold-calc' as const, label: t.navGoldCalc, icon: Coins },
    { id: 'investors' as const, label: t.navInvestors, icon: Users },
    { id: 'trade-log' as const, label: t.navTradeLog, icon: ClipboardList },
    { id: 'history' as const, label: t.navHistory, icon: History },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#0c111e]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Logo & Custom Brand Title */}
        <div
          className="flex items-center gap-3 flex-shrink-0 cursor-pointer group"
          onClick={() => onTabChange('simulator')}
        >
          <BrandedLogo branding={branding} size="md" />
          <div className="hidden sm:block">
            <div className="font-heading font-bold text-sm gradient-text leading-tight tracking-tight group-hover:brightness-110 transition-all">
              {branding.brandName || t.appTitle}
            </div>
            <div className="text-[10px] text-slate-400 leading-tight hidden md:block">
              {branding.brandSubtitle || t.appSubtitle}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Controls: Cloud Sync Status + Admin + Language Switcher */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Cloud Sync Status Indicator */}
          {cloudSync && (
            <button
              onClick={onOpenCloudSync || onForceSyncToCloud}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                cloudSync.status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : cloudSync.status === 'syncing'
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse'
                  : cloudSync.status === 'connecting'
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title={
                cloudSync.status === 'connected'
                  ? 'Cloud Synced across Mobile & Desktop. Click to push manual sync.'
                  : cloudSync.status === 'syncing'
                  ? 'Syncing trades to cloud...'
                  : 'Cloud Connecting. Click to push sync.'
              }
            >
              {cloudSync.status === 'syncing' ? (
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              ) : cloudSync.status === 'connected' ? (
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span className="hidden lg:inline text-[11px] font-mono">
                {cloudSync.status === 'connected' ? 'Cloud Synced' : cloudSync.status === 'syncing' ? 'Syncing...' : 'Cloud Sync'}
              </span>
            </button>
          )}

          {/* Admin Control Button */}
          <button
            onClick={onOpenAdmin}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm ${
              isAdmin
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-slate-900/80 text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30'
            }`}
            title={isAdmin ? 'Admin Settings & Branding' : 'Admin Login'}
          >
            {isAdmin ? (
              <>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline font-semibold">Admin</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline">Admin</span>
              </>
            )}
          </button>

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 hover:bg-slate-800/80 transition-all cursor-pointer shadow-sm"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-xs">{t.langToggle}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

