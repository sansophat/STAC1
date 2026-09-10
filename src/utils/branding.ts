import { BrandingConfig, SimulatorSessionMemory, SimulationResult, SimulationParams } from '../types';
import { safeStorage } from './safeStorage';

export const DEFAULT_BRANDING: BrandingConfig = {
  brandName: 'SNL AI DCA Future Trade',
  brandSubtitle: 'Equity Scaling & Gold Pro Formula v4.0',
  logoType: 'preset',
  logoPreset: 'rocket',
  logoText: 'SNL',
  logoImage: '',
  accentColor: 'cyan',
  companyFooter: '© 2025 SNL AI DCA Future Trade — Equity Scaling v4.0',
  contactEmail: 'support@snltrading.ai',
  contactPhone: '+855 12 888 999',
  telegram: 'https://t.me/snl_trading_bot',
  disclaimer: 'Disclaimer: Trading futures and foreign exchange involves substantial risk. Projections are mathematical simulations for strategy planning.',
};

export const DEFAULT_ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

export const BRANDING_STORAGE_KEY = 'snl_branding_config';
export const ADMIN_AUTH_STORAGE_KEY = 'snl_admin_auth';
export const ADMIN_CREDS_STORAGE_KEY = 'snl_admin_creds';
export const SIM_SESSIONS_MEMORY_KEY = 'snl_sim_recent_sessions';

export function getStoredBranding(): BrandingConfig {
  const saved = safeStorage.getJSON<BrandingConfig | null>(BRANDING_STORAGE_KEY, null);
  if (saved) {
    return { ...DEFAULT_BRANDING, ...saved };
  }
  return DEFAULT_BRANDING;
}

export function saveStoredBranding(config: BrandingConfig): void {
  safeStorage.setJSON(BRANDING_STORAGE_KEY, config);
}

export function getRecentSimulationsMemory(): SimulatorSessionMemory[] {
  return safeStorage.getJSON<SimulatorSessionMemory[]>(SIM_SESSIONS_MEMORY_KEY, []);
}

export function getLastSimulationMemory(): SimulatorSessionMemory | null {
  const sessions = getRecentSimulationsMemory();
  return sessions.length > 0 ? sessions[0] : null;
}

export function saveSimulationMemory(session: SimulatorSessionMemory): void {
  const sessions = getRecentSimulationsMemory();
  // Keep max 15 recent session snapshots, avoid duplicates
  const filtered = sessions.filter((s) => s.id !== session.id);
  const updated = [session, ...filtered].slice(0, 15);
  safeStorage.setJSON(SIM_SESSIONS_MEMORY_KEY, updated);
}

export function deleteRecentSimulationMemory(id: string): void {
  const sessions = getRecentSimulationsMemory();
  const updated = sessions.filter((s) => s.id !== id);
  safeStorage.setJSON(SIM_SESSIONS_MEMORY_KEY, updated);
}

export function clearRecentSimulationsMemory(): void {
  safeStorage.removeItem(SIM_SESSIONS_MEMORY_KEY);
}

export function createSessionMemoryFromSimulation(
  result: SimulationResult,
  params: SimulationParams,
  investorName?: string
): SimulatorSessionMemory {
  return {
    id: 'mem-' + Date.now(),
    timestamp: new Date().toISOString(),
    projectName: params.projectName || 'Simulation Run',
    investorName,
    initialCapital: result.summary.initialCapital,
    finalCapital: result.summary.finalCapital,
    growthPct: result.summary.growthPct,
    netProfit: result.summary.netProfit,
    days: result.summary.days,
    tradingDays: result.summary.tradingDays,
    params: { ...params },
  };
}
