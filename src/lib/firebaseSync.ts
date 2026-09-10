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

export interface CloudSyncState {
  status: 'connecting' | 'connected' | 'offline' | 'error' | 'syncing';
  lastSyncedAt: Date | null;
  error?: string | null;
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

// Batch upload all local trades & investors to Firestore (Seed or Force Push)
export async function pushAllToCloud(payload: {
  trades: Trade[];
  investors: Investor[];
  params?: SimulationParams;
  branding?: BrandingConfig;
  history?: SimulationResult[];
  recentSimulations?: SimulatorSessionMemory[];
}): Promise<void> {
  const batch = writeBatch(db);

  // Sync trades
  payload.trades.forEach((tr) => {
    const ref = doc(db, TRADES_COLLECTION, tr.id);
    batch.set(ref, tr, { merge: true });
  });

  // Sync investors
  payload.investors.forEach((inv) => {
    const ref = doc(db, INVESTORS_COLLECTION, inv.id);
    batch.set(ref, inv, { merge: true });
  });

  // Sync app settings / metadata
  const settingsRef = doc(db, APP_SETTINGS_COLLECTION, 'global_state');
  batch.set(
    settingsRef,
    {
      updated_at: new Date().toISOString(),
      params: payload.params || null,
      branding: payload.branding || null,
      historyCount: payload.history?.length || 0,
      recentSimulations: payload.recentSimulations || [],
    },
    { merge: true }
  );

  await batch.commit();
}

// Check if cloud already has data
export async function checkCloudHasData(): Promise<boolean> {
  try {
    const colRef = collection(db, TRADES_COLLECTION);
    const snap = await getDocs(colRef);
    return !snap.empty;
  } catch (e) {
    console.warn('checkCloudHasData check failed:', e);
    return false;
  }
}
