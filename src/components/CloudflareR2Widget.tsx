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

interface StorageMetrics {
  storageGB: number;
  classAOps: number;
  classBOps: number;
  percentUsed: number;
  status: 'healthy' | 'warning' | 'critical';
  role?: 'ADMIN' | 'TEACHER';
}

interface CloudflareR2WidgetProps {
  isAdmin?: boolean;
}

const CloudflareR2Widget = ({ isAdmin = false }: CloudflareR2WidgetProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<StorageMetrics>({
    storageGB: 0,
    classAOps: 0,
    classBOps: 0,
    percentUsed: 0,
    status: 'healthy',
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

  // 2026 Pricing Constants (for Admin view)
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
            storageGB: json.storageGB || 0,
            classAOps: json.classAOps || 0,
            classBOps: json.classBOps || 0,
            percentUsed: json.percentUsed || 0,
            status: json.status || 'healthy',
            role: json.role,
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

  const isEffectiveAdmin = isAdmin || data.role === 'ADMIN';

  // Cost calculations for Admin view
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

  // Status color helpers
  const getStatusColor = () => {
    if (data.status === 'critical') return 'text-rose-600 bg-rose-50 border-rose-200';
    if (data.status === 'warning') return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  };

  const getProgressBarColor = () => {
    if (data.status === 'critical') return 'bg-rose-500';
    if (data.status === 'warning') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // ── Teacher Minimal Trigger Button ─────────────────────────────────────────
  const renderTeacherTrigger = () => (
    <button
      onClick={() => setIsOpen(!isOpen)}
      type="button"
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium shadow-2xs transition-all duration-150 ${
        data.status === 'critical'
          ? 'bg-rose-50/80 border-rose-300 text-rose-700 hover:bg-rose-100'
          : data.status === 'warning'
          ? 'bg-amber-50/80 border-amber-300 text-amber-800 hover:bg-amber-100'
          : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8f9fa] hover:border-[#c4c7cc]'
      }`}
    >
      <HardDrive
        size={14}
        className={
          loading
            ? 'animate-pulse text-blue-500'
            : data.status === 'critical'
            ? 'text-rose-600'
            : data.status === 'warning'
            ? 'text-amber-600'
            : 'text-gray-500'
        }
      />
      {loading ? (
        <span>Checking storage…</span>
      ) : error ? (
        <span className="text-gray-500">Storage</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              data.status === 'critical'
                ? 'bg-rose-500 animate-pulse'
                : data.status === 'warning'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
          <span>Storage • {data.percentUsed}%</span>
          {data.status === 'critical' && <span className="font-semibold text-rose-600">(Low)</span>}
        </div>
      )}
      <ChevronDown size={13} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  // ── Admin Trigger Button ───────────────────────────────────────────────────
  const renderAdminTrigger = () => (
    <button
      onClick={() => setIsOpen(!isOpen)}
      type="button"
      className="flex items-center gap-2 rounded-full bg-white border border-[#dadce0] px-4 py-2 text-sm font-medium text-[#5f6368] shadow-2xs transition-all duration-150 hover:bg-[#f8f9fa] hover:border-[#c4c7cc]"
    >
      <Cloud size={15} className={loading ? 'animate-pulse text-blue-500' : 'text-[#f6821f]'} />
      {loading ? (
        <span>Syncing...</span>
      ) : error ? (
        <span className="text-red-500">Error</span>
      ) : (
        <span>{data.storageGB.toFixed(2)}GB • ${totalCost.toFixed(2)}</span>
      )}
      <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {isEffectiveAdmin ? renderAdminTrigger() : renderTeacherTrigger()}

      {/* Floating Widget Popup */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 flex w-84 sm:w-96 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] ring-1 ring-black/5 origin-top-right">
          {loading ? (
            <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
              <Loader2 size={24} className="mb-3 animate-spin text-blue-500" />
              <p className="text-xs text-[#5f6368]">Checking system storage…</p>
            </div>
          ) : error ? (
            <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
              <AlertTriangle size={24} className="mb-3 text-red-500" />
              <p className="mb-1 text-sm font-medium text-[#202124]">Storage check unavailable</p>
              <p className="text-xs text-[#5f6368]">{error}</p>
            </div>
          ) : isEffectiveAdmin ? (
            // ── Admin Full Cloudflare View ─────────────────────────────────
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
                    <ArrowUpRight size={14} className="text-blue-500" /> Writes (Class A)
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
          ) : (
            // ── Teacher Minimal View (Sanitized, No Cloudflare exposure) ────
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      data.status === 'critical'
                        ? 'bg-rose-100 text-rose-600'
                        : data.status === 'warning'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <HardDrive size={18} />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-semibold text-[#202124]">Storage Status</h2>
                    <p className="text-[11px] text-[#5f6368]">Video upload capacity</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusColor()}`}>
                  {data.status === 'critical' ? (
                    <>
                      <AlertTriangle size={12} className="animate-pulse" />
                      Running Low
                    </>
                  ) : data.status === 'warning' ? (
                    <>
                      <AlertTriangle size={12} />
                      Moderate
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      Normal
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar & Status Section */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#5f6368]">Capacity Used</span>
                  <span className={`font-bold ${data.status === 'critical' ? 'text-rose-600' : data.status === 'warning' ? 'text-amber-600' : 'text-[#202124]'}`}>
                    {data.percentUsed}%
                  </span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                    style={{ width: `${Math.min(100, Math.max(5, data.percentUsed))}%` }}
                  />
                </div>

                <p className="text-[12px] text-[#5f6368] leading-relaxed pt-1">
                  {data.status === 'critical'
                    ? 'Storage is running low (red). Please notify the administrator so they can manually check and expand capacity.'
                    : data.status === 'warning'
                    ? 'Storage usage is approaching high capacity. Keep an eye on storage if planning to upload large video files.'
                    : 'Storage capacity is normal and healthy. All video lessons will upload and stream smoothly.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CloudflareR2Widget;
