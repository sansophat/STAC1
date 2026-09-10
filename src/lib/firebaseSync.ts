import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Investor, Trade, SimulationParams, BrandingConfig, SimulationResult, SimulatorSessionMemory } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Target designated firestore database instance
export const db: Firestore = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined
);

export const TRADES_COLLECTION = 'trades';
export const INVESTORS_COLLECTION = 'investors';
export const APP_SETTINGS_COLLECTION = 'app_settings';

export const DEMO_TRADE_IDS = ['tr-1', 'tr-2', 'tr-3'];
export const DEMO_INVESTOR_IDS = ['inv-1', 'inv-2', 'inv-3'];

export interface CloudSyncState {
  status: 'connecting' | 'connected' | 'offline' | 'error' | 'syncing';
  lastSyncedAt: Date | null;
  error?: string | null;
  cloudTradeCount?: number;
  cloudInvestorCount?: number;
}

// Subscribe to real-time updates for trades
export function subscribeToTrades(
  onData: (trades: Trade[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, TRADES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Trade[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Trade);
      });
      // Sort newest created or newest trade_date first
      list.sort((a, b) => {
        const dateDiff = new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return (new Date(b.created_at || '').getTime() || 0) - (new Date(a.created_at || '').getTime() || 0);
      });
      onData(list);
    },
    (err) => {
      console.warn('Firestore subscribeToTrades error:', err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time updates for investors/accounts
export function subscribeToInvestors(
  onData: (investors: Investor[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, INVESTORS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Investor[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Investor);
      });
      list.sort((a, b) => (new Date(b.created_at || '').getTime() || 0) - (new Date(a.created_at || '').getTime() || 0));
      onData(list);
    },
    (err) => {
      console.warn('Firestore subscribeToInvestors error:', err);
      if (onError) onError(err);
    }
  );
}

// Save or update an individual trade in Firestore
export async function syncSaveTrade(trade: Trade): Promise<void> {
  try {
    const docRef = doc(db, TRADES_COLLECTION, trade.id);
    await setDoc(docRef, trade, { merge: true });
  } catch (err) {
    console.error('Error saving trade to cloud:', err);
    throw err;
  }
}

// Delete an individual trade in Firestore
export async function syncDeleteTrade(tradeId: string): Promise<void> {
  try {
    const docRef = doc(db, TRADES_COLLECTION, tradeId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting trade in cloud:', err);
    throw err;
  }
}

// Save or update an individual investor in Firestore
export async function syncSaveInvestor(investor: Investor): Promise<void> {
  try {
    const docRef = doc(db, INVESTORS_COLLECTION, investor.id);
    await setDoc(docRef, investor, { merge: true });
  } catch (err) {
    console.error('Error saving investor to cloud:', err);
    throw err;
  }
}

// Delete an individual investor in Firestore
export async function syncDeleteInvestor(investorId: string): Promise<void> {
  try {
    const docRef = doc(db, INVESTORS_COLLECTION, investorId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting investor in cloud:', err);
    throw err;
  }
}

// Fetch current cloud counts and contents directly
export async function fetchCloudData(): Promise<{
  trades: Trade[];
  investors: Investor[];
  settings?: any;
}> {
  const tradesSnap = await getDocs(collection(db, TRADES_COLLECTION));
  const trades: Trade[] = [];
  tradesSnap.forEach((d) => trades.push(d.data() as Trade));

  const invSnap = await getDocs(collection(db, INVESTORS_COLLECTION));
  const investors: Investor[] = [];
  invSnap.forEach((d) => investors.push(d.data() as Investor));

  return { trades, investors };
}

// Clean all demo records from cloud
export async function purgeCloudDemoRecords(): Promise<{ tradesDeleted: number; investorsDeleted: number }> {
  let tradesDeleted = 0;
  let investorsDeleted = 0;

  for (const id of DEMO_TRADE_IDS) {
    try {
      await deleteDoc(doc(db, TRADES_COLLECTION, id));
      tradesDeleted++;
    } catch {
      // ignore
    }
  }

  for (const id of DEMO_INVESTOR_IDS) {
    try {
      await deleteDoc(doc(db, INVESTORS_COLLECTION, id));
      investorsDeleted++;
    } catch {
      // ignore
    }
  }

  return { tradesDeleted, investorsDeleted };
}

// Sanitize branding configuration for Firestore storage
// Firestore document maximum limit is 1,048,576 bytes (1 MB).
// Oversized raw base64 images and heavy data must be omitted from the cloud document.
function sanitizeBrandingForCloud(branding?: BrandingConfig): any {
  if (!branding) return null;
  const copy: any = { ...branding };

  // Strip any large base64 data URLs or long strings (> 5,000 characters)
  for (const key of Object.keys(copy)) {
    if (typeof copy[key] === 'string') {
      if (copy[key].startsWith('data:image') || copy[key].length > 5000) {
        delete copy[key];
      }
    }
  }
  return copy;
}

// Completely upload current local state to cloud and purge any stale/demo docs
export async function replaceCloudWithLocalData(payload: {
  trades: Trade[];
  investors: Investor[];
  params?: SimulationParams;
  branding?: BrandingConfig;
  history?: SimulationResult[];
  recentSimulations?: SimulatorSessionMemory[];
}): Promise<void> {
  // 1. Fetch current cloud docs to detect what needs deletion
  const [currentTradesSnap, currentInvSnap] = await Promise.all([
    getDocs(collection(db, TRADES_COLLECTION)),
    getDocs(collection(db, INVESTORS_COLLECTION)),
  ]);

  const targetTradeIds = new Set(payload.trades.map((t) => t.id));
  const targetInvIds = new Set(payload.investors.map((i) => i.id));

  // Delete docs in cloud that are not in target
  const deletePromises: Promise<void>[] = [];

  currentTradesSnap.forEach((docSnap) => {
    if (!targetTradeIds.has(docSnap.id)) {
      deletePromises.push(deleteDoc(doc(db, TRADES_COLLECTION, docSnap.id)));
    }
  });

  currentInvSnap.forEach((docSnap) => {
    if (!targetInvIds.has(docSnap.id)) {
      deletePromises.push(deleteDoc(doc(db, INVESTORS_COLLECTION, docSnap.id)));
    }
  });

  // Explicitly purge demo IDs too
  for (const demoId of DEMO_TRADE_IDS) {
    if (!targetTradeIds.has(demoId)) {
      deletePromises.push(deleteDoc(doc(db, TRADES_COLLECTION, demoId)));
    }
  }
  for (const demoId of DEMO_INVESTOR_IDS) {
    if (!targetInvIds.has(demoId)) {
      deletePromises.push(deleteDoc(doc(db, INVESTORS_COLLECTION, demoId)));
    }
  }

  await Promise.all(deletePromises);

  // 2. Batch write all target trades & investors
  // Firestore batch limit is 500 ops; chunk if needed
  const chunkSize = 400;
  for (let i = 0; i < payload.trades.length; i += chunkSize) {
    const chunk = payload.trades.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((tr) => {
      const ref = doc(db, TRADES_COLLECTION, tr.id);
      batch.set(ref, tr);
    });
    await batch.commit();
  }

  for (let i = 0; i < payload.investors.length; i += chunkSize) {
    const chunk = payload.investors.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((inv) => {
      const ref = doc(db, INVESTORS_COLLECTION, inv.id);
      batch.set(ref, inv);
    });
    await batch.commit();
  }

  // 3. Save global settings (safely guarded against 1MB Firestore document limit)
  try {
    const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'global_state');
    const sanitizedBranding = sanitizeBrandingForCloud(payload.branding);
    const lightweightSims = (payload.recentSimulations || []).slice(0, 5).map((s) => ({
      id: s.id,
      timestamp: s.timestamp,
      projectName: s.projectName,
      initialCapital: s.initialCapital,
      finalCapital: s.finalCapital,
      netProfit: s.netProfit,
      growthPct: s.growthPct,
      days: s.days,
      tradingDays: s.tradingDays,
      investorName: s.investorName,
    }));

    const docData: any = {
      updated_at: new Date().toISOString(),
      params: payload.params || null,
      branding: sanitizedBranding,
      historyCount: payload.history?.length || 0,
      recentSimulations: lightweightSims,
    };

    // Safely verify document size is well under Firestore's 1MB limit (e.g. max 500KB)
    try {
      const approxBytes = new TextEncoder().encode(JSON.stringify(docData)).length;
      if (approxBytes > 500000) {
        delete docData.recentSimulations;
        docData.branding = { brandName: payload.branding?.brandName || 'SNL AI DCA Future Trade' };
      }
    } catch {
      // ignore
    }

    await setDoc(settingsRef, docData, { merge: true });
  } catch (settingsError) {
    console.warn(
      'Could not save global_state settings document to cloud (exceeds size limit or restricted):',
      settingsError
    );
    // Non-fatal: All trades and investors were already successfully saved to Firestore!
  }
}

// Batch upload all local trades & investors to Firestore
export async function pushAllToCloud(payload: {
  trades: Trade[];
  investors: Investor[];
  params?: SimulationParams;
  branding?: BrandingConfig;
  history?: SimulationResult[];
  recentSimulations?: SimulatorSessionMemory[];
}): Promise<void> {
  return replaceCloudWithLocalData(payload);
}
