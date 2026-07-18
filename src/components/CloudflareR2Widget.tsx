'use client';

import { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// No props needed anymore — accountId/apiToken now live server-side only,
// read from process.env inside app/api/r2-metrics/route.ts.
export default function CloudflareR2Widget() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    storageGB: 0,
    classAOps: 0,
    classBOps: 0,
  });

  // 2026 Pricing Constants
  const STORAGE_PRICE_PER_GB = 0.015;
  const CLASS_A_PRICE_PER_M = 4.5;
  const CLASS_B_PRICE_PER_M = 0.36;

  const FREE_TIER_STORAGE = 10;
  const FREE_TIER_CLASS_A = 1000000;
  const FREE_TIER_CLASS_B = 10000000;

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetch('/api/r2-metrics', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || `Request failed with status ${res.status}`);
        }

        if (isMounted) {
          setData({
            storageGB: json.storageGB,
            classAOps: json.classAOps,
            classBOps: json.classBOps,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'An unknown error occurred while fetching metrics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-80 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
        <Loader2 size={24} className="animate-spin text-[#1a73e8] mb-3" />
        <p className="text-xs text-[#5f6368]">Syncing live metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-80 w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] p-6 text-center">
        <AlertTriangle size={24} className="text-[#d93025] mb-3" />
        <p className="text-sm font-medium text-[#202124] mb-1">Failed to load metrics</p>
        <p className="text-xs text-[#5f6368]">{error}</p>
      </div>
    );
  }

  // Cost Calculations
  const billableStorage = Math.max(0, data.storageGB - FREE_TIER_STORAGE);
  const billableClassA = Math.max(0, data.classAOps - FREE_TIER_CLASS_A);
  const billableClassB = Math.max(0, data.classBOps - FREE_TIER_CLASS_B);

  const storageCost = billableStorage * STORAGE_PRICE_PER_GB;
  const classACost = (billableClassA / 1000000) * CLASS_A_PRICE_PER_M;
  const classBCost = (billableClassB / 1000000) * CLASS_B_PRICE_PER_M;
  const totalCost = storageCost + classACost + classBCost;

  // Helper to format large numbers
  const formatOps = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e8eaed] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f6821f]/10">
            <Cloud size={18} className="text-[#f6821f]" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-[#202124]">Cloudflare R2</h2>
            <p className="text-[11px] text-[#5f6368]">Live Billing Cycle</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#e6f4ea] px-2 py-1 text-[10px] font-semibold text-[#137333]">
          <CheckCircle2 size={12} />
          Connected
        </div>
      </div>

      {/* Primary Stat: Estimated Cost */}
      <div className="bg-[#f8f9fa] px-5 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-[#5f6368]">Est. Monthly Cost</p>
            <div className="flex items-center gap-1">
              <DollarSign size={20} className="text-[#202124]" />
              <span className="text-3xl font-bold tracking-tight text-[#202124]">
                {totalCost.toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#137333] font-medium">No Egress Fees</p>
            <p className="text-[10px] text-[#5f6368]">Unlimited free outbound</p>
          </div>
        </div>
      </div>

      {/* Usage Breakdown Grid */}
      <div className="grid grid-cols-2 divide-x divide-y border-t border-[#e8eaed]">
        {/* Storage */}
        <div className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
            <HardDrive size={14} /> Storage
          </div>
          <div className="mb-0.5 text-lg font-semibold text-[#202124]">
            {data.storageGB.toFixed(2)} <span className="text-xs text-[#5f6368]">GB</span>
          </div>
          <div className="text-[10px] text-[#9aa0a6]">
            {billableStorage > 0 ? `$${storageCost.toFixed(2)} billable` : 'Within 10GB free tier'}
          </div>
        </div>

        {/* Egress */}
        <div className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
            <Activity size={14} /> Bandwidth
          </div>
          <div className="mb-0.5 text-lg font-semibold text-[#202124]">Unlimited</div>
          <div className="text-[10px] text-[#137333] font-medium">$0.00 billable</div>
        </div>

        {/* Class A Operations */}
        <div className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
            <ArrowUpRight size={14} className="text-[#1a73e8]" /> Writes (Class A)
          </div>
          <div className="mb-0.5 text-lg font-semibold text-[#202124]">{formatOps(data.classAOps)}</div>
          <div className="text-[10px] text-[#9aa0a6]">
            {billableClassA > 0 ? `$${classACost.toFixed(2)} billable` : 'Within 1M free tier'}
          </div>
        </div>

        {/* Class B Operations */}
        <div className="p-4">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
            <ArrowDownRight size={14} className="text-[#34a853]" /> Reads (Class B)
          </div>
          <div className="mb-0.5 text-lg font-semibold text-[#202124]">{formatOps(data.classBOps)}</div>
          <div className="text-[10px] text-[#9aa0a6]">
            {billableClassB > 0 ? `$${classBCost.toFixed(2)} billable` : 'Within 10M free tier'}
          </div>
        </div>
      </div>
    </div>
  );
}
