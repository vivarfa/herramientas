import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

export type RateStatus = {
  allowed: boolean;
  count: number;
  remaining: number;
  limit: number;
  resetAt: string; // ISO date string for next day boundary
};

const LIMIT_PER_DAY = 2;
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "dni-rate-limit.json");

function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextDayResetISO(date = new Date()): string {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0); // midnight next day
  return next.toISOString();
}

type Store = Record<string, Record<string, { count: number; updatedAt: string }>>; // date -> ip -> record

async function ensureStore(): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
  try {
    await fs.promises.access(STORE_PATH, fs.constants.F_OK);
  } catch {
    const empty: Store = {};
    await fs.promises.writeFile(STORE_PATH, JSON.stringify(empty, null, 2), "utf-8");
  }
}

async function loadStore(): Promise<Store> {
  await ensureStore();
  try {
    const raw = await fs.promises.readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw || "{}");
    return parsed as Store;
  } catch {
    return {} as Store;
  }
}

async function saveStore(store: Store): Promise<void> {
  await fs.promises.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

export function getClientIp(req: NextRequest): string {
  const hdr = (name: string) => req.headers.get(name) || "";
  const forwarded = hdr("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(/,\s*/)[0];
    if (ip) return ip;
  }
  const realIp = hdr("x-real-ip") || hdr("cf-connecting-ip") || hdr("x-client-ip");
  if (realIp) return realIp;
  // @ts-ignore
  if ((req as any).ip) return (req as any).ip as string;
  return "unknown"; // fallback for local dev
}

export async function getRateStatus(ip: string, date = new Date()): Promise<RateStatus> {
  const store = await loadStore();
  const day = todayKey(date);
  const record = store[day]?.[ip];
  const count = record?.count ?? 0;
  const limit = LIMIT_PER_DAY;
  const remaining = Math.max(0, limit - count);
  const allowed = remaining > 0;
  const resetAt = nextDayResetISO(date);
  return { allowed, count, remaining, limit, resetAt };
}

export async function increment(ip: string, date = new Date()): Promise<RateStatus> {
  const store = await loadStore();
  const day = todayKey(date);
  if (!store[day]) store[day] = {};
  const record = store[day][ip] || { count: 0, updatedAt: new Date().toISOString() };
  record.count += 1;
  record.updatedAt = new Date().toISOString();
  store[day][ip] = record;
  await saveStore(store);
  return getRateStatus(ip, date);
}