/**
 * In-memory and localStorage API Cache for Master / Static data.
 * Prevents redundant network requests on every route switch.
 */
import { API_BASE_URL } from './api';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function getCachedData<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  // 1. Memory check
  const mem = MEMORY_CACHE.get(key);
  if (mem && Date.now() - mem.timestamp < ttlMs) {
    return mem.data as T;
  }

  // 2. LocalStorage check
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`finshield_cache_${key}`);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < ttlMs) {
          MEMORY_CACHE.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(key, entry);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`finshield_cache_${key}`, JSON.stringify(entry));
    } catch {}
  }
}

// ── Master data helpers ──

export async function fetchBanksCached(): Promise<any[]> {
  const cached = getCachedData<any[]>('banks');
  if (cached && cached.length > 0) return cached;

  try {
    const res = await fetch(`${API_BASE_URL}/simulator/banks`);
    if (res.ok) {
      const data = await res.json();
      setCachedData('banks', data);
      return data;
    }
  } catch (e) {
    console.error('[apiCache] fetchBanksCached error', e);
  }
  return cached || [];
}

export async function fetchInsurancePlansCached(): Promise<any[]> {
  const cached = getCachedData<any[]>('insurance_plans');
  if (cached && cached.length > 0) return cached;

  try {
    const res = await fetch(`${API_BASE_URL}/insurance/plans`);
    if (res.ok) {
      const data = await res.json();
      setCachedData('insurance_plans', data);
      return data;
    }
  } catch (e) {
    console.error('[apiCache] fetchInsurancePlansCached error', e);
  }
  return cached || [];
}

export async function fetchInflationCached(): Promise<number> {
  const cached = getCachedData<number>('macro_inflation', 60 * 60 * 1000); // 1 hour TTL
  if (cached !== null && cached !== undefined) return cached;

  try {
    const res = await fetch(`${API_BASE_URL}/simulator/macro/inflation`);
    if (res.ok) {
      const data = await res.json();
      const rate = data?.rate ?? data?.inflationRate ?? 1.95;
      setCachedData('macro_inflation', rate);
      return rate;
    }
  } catch (e) {
    console.error('[apiCache] fetchInflationCached error', e);
  }
  return cached ?? 1.95;
}

export async function fetchAssetsCached(): Promise<any[]> {
  const cached = getCachedData<any[]>('assets');
  if (cached && cached.length > 0) return cached;

  try {
    const res = await fetch(`${API_BASE_URL}/simulator/assets`);
    if (res.ok) {
      const data = await res.json();
      setCachedData('assets', data);
      return data;
    }
  } catch (e) {
    console.error('[apiCache] fetchAssetsCached error', e);
  }
  return cached || [];
}
