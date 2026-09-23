// Demo provider fixture — clearly synthetic Nigerian bank data.
// Deterministic (fixed seed): stable provider_transaction_ids so repeated
// syncs dedupe. Pure (no imports): usable in Edge Functions and unit tests.
import {
  normalizeMerchantName,
  type NormalizedTransaction,
} from "./finance.ts";

export type DemoAccountKey = "gtb" | "uba" | "sterling";

export interface DemoAccount {
  key: DemoAccountKey;
  institutionId: string;
  institutionName: string;
  displayName: string;
  maskedAccountNumber: string;
  currency: string;
  openingBalanceMinor: number;
}

export interface DemoTransaction extends NormalizedTransaction {
  accountKey: DemoAccountKey;
}

export const DEMO_PROVIDER_ID = "demo";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "gtb",
    institutionId: "gtbank",
    institutionName: "GTBank",
    displayName: "GTBank Current",
    maskedAccountNumber: "•••• 4821",
    currency: "NGN",
    openingBalanceMinor: 85000000,
  },
  {
    key: "uba",
    institutionId: "uba",
    institutionName: "UBA",
    displayName: "UBA Savings",
    maskedAccountNumber: "•••• 1189",
    currency: "NGN",
    openingBalanceMinor: 320000000,
  },
  {
    key: "sterling",
    institutionId: "sterling",
    institutionName: "Sterling Bank",
    displayName: "Sterling Everyday",
    maskedAccountNumber: "•••• 7234",
    currency: "NGN",
    openingBalanceMinor: 14500000,
  },
];

interface MerchantPick {
  merchant: string;
  narration: string;
  minKobo: number;
  maxKobo: number;
}

const MERCHANTS: MerchantPick[] = [
  { merchant: "Bolt Trip", narration: "Bolt trip Lekki Phase 1", minKobo: 180000, maxKobo: 650000 },
  { merchant: "Uber", narration: "Uber ride Ikeja", minKobo: 220000, maxKobo: 700000 },
  { merchant: "Shoprite", narration: "Shoprite groceries Palms", minKobo: 850000, maxKobo: 4200000 },
  { merchant: "Spar", narration: "Spar supermarket", minKobo: 500000, maxKobo: 2600000 },
  { merchant: "Ebeano", narration: "Ebeano supermarket Lekki", minKobo: 600000, maxKobo: 3100000 },
  { merchant: "DSTV", narration: "DSTV Compact Plus subscription", minKobo: 1980000, maxKobo: 1980000 },
  { merchant: "Netflix", narration: "Netflix monthly subscription", minKobo: 750000, maxKobo: 750000 },
  { merchant: "MTN", narration: "MTN airtime and data", minKobo: 100000, maxKobo: 1500000 },
  { merchant: "Airtel", narration: "Airtel data bundle", minKobo: 100000, maxKobo: 1000000 },
  { merchant: "IKEDC", narration: "IKEDC electricity token", minKobo: 500000, maxKobo: 2000000 },
  { merchant: "Jumia", narration: "Jumia order", minKobo: 450000, maxKobo: 3800000 },
  { merchant: "Chicken Republic", narration: "Chicken Republic dinner", minKobo: 350000, maxKobo: 1200000 },
  { merchant: "Filmhouse", narration: "Filmhouse Cinemas tickets", minKobo: 700000, maxKobo: 1400000 },
  { merchant: "Medplus Pharmacy", narration: "Medplus Pharmacy", minKobo: 250000, maxKobo: 1800000 },
  { merchant: "Udemy", narration: "Udemy course purchase", minKobo: 450000, maxKobo: 900000 },
  { merchant: "Spotify", narration: "Spotify Premium", minKobo: 130000, maxKobo: 130000 },
  { merchant: "Eko Electricity", narration: "Eko Electricity token", minKobo: 500000, maxKobo: 1500000 },
  { merchant: "Domino's Pizza", narration: "Domino's Pizza delivery", minKobo: 550000, maxKobo: 1500000 },
  { merchant: "Konga", narration: "Konga online order", minKobo: 300000, maxKobo: 2500000 },
  { merchant: "Glo", narration: "Glo data subscription", minKobo: 100000, maxKobo: 800000 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad3 = (n: number): string => String(n).padStart(3, "0");

export interface DemoDataset {
  accounts: DemoAccount[];
  transactions: DemoTransaction[];
}

/** ~55 synthetic transactions across ~60 days. Stable ids across calls. */
export function buildDemoDataset(nowMs: number): DemoDataset {
  const rng = mulberry32(20260923);
  const txns: DemoTransaction[] = [];
  const accountKeys: DemoAccountKey[] = ["gtb", "uba", "gtb", "sterling", "uba"];

  const at = (daysAgo: number, hour: number): string =>
    new Date(Math.floor(nowMs - daysAgo * DAY_MS) - (12 - hour) * 3600000).toISOString();

  let n = 0;
  const TOTAL_RANDOM = 48;
  for (let i = 0; i < TOTAL_RANDOM; i++) {
    const pick = MERCHANTS[Math.floor(rng() * MERCHANTS.length)];
    const daysAgo = Math.floor(rng() * 60);
    const accountKey = accountKeys[i % accountKeys.length];
    const amountMinor =
      pick.minKobo + Math.floor(rng() * (pick.maxKobo - pick.minKobo + 1));
    n += 1;
    txns.push({
      accountKey,
      providerTransactionId: `demo_${accountKey}_${pad3(n)}`,
      amountMinor,
      currency: "NGN",
      direction: "debit",
      semanticType: "expense",
      occurredAt: at(daysAgo, 8 + Math.floor(rng() * 12)),
      merchantName: pick.merchant,
      narration: `${pick.narration} ref ${100000 + Math.floor(rng() * 899999)}`,
      normalizedMerchant: normalizeMerchantName(pick.merchant),
      budgetEligible: true,
    });
  }

  // Income: two salary credits + one freelance credit.
  n += 1;
  txns.push({
    accountKey: "gtb",
    providerTransactionId: `demo_gtb_${pad3(n)}`,
    amountMinor: 45000000,
    currency: "NGN",
    direction: "credit",
    semanticType: "income",
    occurredAt: at(15, 9),
    merchantName: "Salary",
    narration: "Monthly salary payment",
    normalizedMerchant: normalizeMerchantName("Salary"),
    budgetEligible: false,
  });
  n += 1;
  txns.push({
    accountKey: "gtb",
    providerTransactionId: `demo_gtb_${pad3(n)}`,
    amountMinor: 45000000,
    currency: "NGN",
    direction: "credit",
    semanticType: "income",
    occurredAt: at(45, 9),
    merchantName: "Salary",
    narration: "Monthly salary payment",
    normalizedMerchant: normalizeMerchantName("Salary"),
    budgetEligible: false,
  });
  n += 1;
  txns.push({
    accountKey: "uba",
    providerTransactionId: `demo_uba_${pad3(n)}`,
    amountMinor: 12000000,
    currency: "NGN",
    direction: "credit",
    semanticType: "income",
    occurredAt: at(20, 14),
    merchantName: "Freelance Payment",
    narration: "Freelance design payment received",
    normalizedMerchant: normalizeMerchantName("Freelance Payment"),
    budgetEligible: false,
  });

  // Refunds: reduce eligible spend.
  n += 1;
  txns.push({
    accountKey: "gtb",
    providerTransactionId: `demo_gtb_${pad3(n)}`,
    amountMinor: 1850000,
    currency: "NGN",
    direction: "credit",
    semanticType: "refund",
    occurredAt: at(10, 11),
    merchantName: "Jumia Refund",
    narration: "Jumia order refund",
    normalizedMerchant: normalizeMerchantName("Jumia Refund"),
    budgetEligible: true,
  });
  n += 1;
  txns.push({
    accountKey: "uba",
    providerTransactionId: `demo_uba_${pad3(n)}`,
    amountMinor: 980000,
    currency: "NGN",
    direction: "credit",
    semanticType: "refund",
    occurredAt: at(40, 16),
    merchantName: "DSTV Reversal",
    narration: "DSTV duplicate charge reversal",
    normalizedMerchant: normalizeMerchantName("DSTV Reversal"),
    budgetEligible: true,
  });

  // Internal transfer pair: -₦50,000 UBA, +₦50,000 GTBank, same day.
  const pairDay = at(30, 10);
  n += 1;
  txns.push({
    accountKey: "uba",
    providerTransactionId: `demo_uba_${pad3(n)}`,
    amountMinor: 5000000,
    currency: "NGN",
    direction: "debit",
    semanticType: "expense",
    occurredAt: pairDay,
    merchantName: "Transfer to GTBank",
    narration: "Transfer to GTBank ••4821",
    normalizedMerchant: normalizeMerchantName("Transfer to GTBank"),
    budgetEligible: true,
  });
  n += 1;
  txns.push({
    accountKey: "gtb",
    providerTransactionId: `demo_gtb_${pad3(n)}`,
    amountMinor: 5000000,
    currency: "NGN",
    direction: "credit",
    semanticType: "external_transfer",
    occurredAt: pairDay,
    merchantName: "Transfer from UBA",
    narration: "Transfer from UBA ••1189",
    normalizedMerchant: normalizeMerchantName("Transfer from UBA"),
    budgetEligible: true,
  });

  return { accounts: DEMO_ACCOUNTS, transactions: txns };
}
