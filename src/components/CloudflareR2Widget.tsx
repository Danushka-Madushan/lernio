'use client';

import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
} from 'lucide-react';

export default function CloudflareR2Widget() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState({
    storageGB: 0,
    classAOps: 0,
    classBOps: 0,
  });

  // Handle clicking outside the popup to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Move calculations up so they can be shown on the trigger button
  const billableStorage = Math.max(0, data.storageGB - FREE_TIER_STORAGE);
  const billableClassA = Math.max(0, data.classAOps - FREE_TIER_CLASS_A);
  const billableClassB = Math.max(0, data.classBOps - FREE_TIER_CLASS_B);

  const storageCost = billableStorage * STORAGE_PRICE_PER_GB;
  const classACost = (billableClassA / 1000000) * CLASS_A_PRICE_PER_M;
  const classBCost = (billableClassB / 1000000) * CLASS_B_PRICE_PER_M;
  const totalCost = storageCost + classACost + classBCost;

  const formatOps = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Sized to match the "Upload New Video" button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-white border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] shadow-sm transition-all duration-150 hover:bg-[#f8f9fa] hover:border-[#c4c7cc]"
      >
        <Cloud size={15} className={loading ? "animate-pulse text-[#1a73e8]" : "text-[#f6821f]"} />
        {loading ? (
          <span>Syncing...</span>
        ) : error ? (
          <span className="text-[#d93025]">Error</span>
        ) : (
          <span>{data.storageGB.toFixed(2)}GB • ${totalCost.toFixed(2)}</span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Widget Popup */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 flex w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-1 ring-black/5 origin-top-right">
          {loading ? (
            <div className="flex h-80 flex-col items-center justify-center p-6 text-center">
              <Loader2 size={24} className="mb-3 animate-spin text-[#1a73e8]" />
              <p className="text-xs text-[#5f6368]">Syncing live metrics...</p>
            </div>
          ) : error ? (
            <div className="flex h-80 flex-col items-center justify-center p-6 text-center">
              <AlertTriangle size={24} className="mb-3 text-[#d93025]" />
              <p className="mb-1 text-sm font-medium text-[#202124]">Failed to load metrics</p>
              <p className="text-xs text-[#5f6368]">{error}</p>
            </div>
          ) : (
            <>
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
                    <p className="text-[11px] font-medium text-[#137333]">No Egress Fees</p>
                    <p className="text-[10px] text-[#5f6368]">Unlimited free outbound</p>
                  </div>
                </div>
              </div>

              {/* Usage Breakdown Grid */}
              <div className="grid grid-cols-2 divide-x divide-y border-t border-[#e8eaed]">
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

                <div className="p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
                    <Activity size={14} /> Bandwidth
                  </div>
                  <div className="mb-0.5 text-lg font-semibold text-[#202124]">Unlimited</div>
                  <div className="text-[10px] font-medium text-[#137333]">$0.00 billable</div>
                </div>

                <div className="p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-[#5f6368]">
                    <ArrowUpRight size={14} className="text-[#1a73e8]" /> Writes (Class A)
                  </div>
                  <div className="mb-0.5 text-lg font-semibold text-[#202124]">{formatOps(data.classAOps)}</div>
                  <div className="text-[10px] text-[#9aa0a6]">
                    {billableClassA > 0 ? `$${classACost.toFixed(2)} billable` : 'Within 1M free tier'}
                  </div>
                </div>

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
            </>
          )}
        </div>
      )}
    </div>
  );
}
