'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AllLocationsSalesData, getAllLocationsSalesSummary, LocationSalesSummary } from '@/actions/location-sales';
import DateRangePicker from '@/components/ui/date-range-picker'; // ← your existing picker


const GHS = (v: number) =>
  `GH₵ ${v.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (part: number, total: number) =>
  total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

/** Human-readable label for the active date range */
function rangeSummary(range: string): string {
  if (!range) return '';
  // preset
  const presets: Record<string, string> = {
    today: 'Today',
    '7d':  'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '12m': 'Last 12 months',
  };
  if (presets[range]) return presets[range];
  // single day  e.g. "2025-02-27"
  if (/^\d{4}-\d{2}-\d{2}$/.test(range)) {
    return new Date(range).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  // date range  e.g. "2025-02-01_2025-02-27"
  if (range.includes('_')) {
    const [from, to] = range.split('_');
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(from)} – ${fmt(to)}`;
  }
  return range;
}

const LOCATION_COLORS: Record<string, string> = {
  WAREHOUSE: '#3b82f6',
  SHOP:      '#10b981',
  VIRTUAL:   '#8b5cf6',
};

const TYPE_LABELS: Record<string, string> = {
  WAREHOUSE: 'Warehouse',
  SHOP:      'Shop',
  VIRTUAL:   'Virtual',
};

export default function LocationsSalesSummaryPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const initialRange = searchParams.get('range') || '30d';

  const [dateRange, setDateRange] = useState(initialRange);
  const [data,      setData]      = useState<AllLocationsSalesData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllLocationsSalesSummary(range);
      setData(result);
    } catch {
      setError('Failed to load sales data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(dateRange); }, [dateRange, fetchData]);

  const handleRangeChange = (range: string) => {
    setDateRange(range);
    // Don't use syncToUrl on the picker — manage URL here so we control scroll behaviour
    router.replace(`?range=${range}`, { scroll: false });
  };

  const handleExport = async () => {
    if (!data) return;
    const xlsx = await import('xlsx');
    const wb   = xlsx.utils.book_new();
    const summaryRows = [
      ['Location Sales Summary Report'],
      [`Period: ${rangeSummary(dateRange)}`, '', `Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['GRAND TOTAL ACROSS ALL LOCATIONS'],
      ['Total Revenue',           data.grandTotal.totalRevenue],
      ['Subtotal (excl. tax)',    data.grandTotal.subtotal],
      ['Tax Collected',           data.grandTotal.taxCollected],
      ['Discounts Given',         data.grandTotal.discounts],
      ['Shipping Collected',      data.grandTotal.shippingCollected],
      ['Returns / Cancellations', data.grandTotal.returnsValue],
      ['Net Revenue',             data.grandTotal.netRevenue],
      ['Total Orders',            data.grandTotal.totalOrders],
      ['Completed Orders',        data.grandTotal.completedOrders],
      ['Active Orders',           data.grandTotal.activeOrders],
      ['Cancelled Orders',        data.grandTotal.cancelledOrders],
      ['Total Stock Value',       data.grandTotal.stockValue],
      [],
      ['BREAKDOWN BY LOCATION'],
      ['Location','Type','Total Revenue','Subtotal','Tax','Discounts','Shipping',
       'Returns','Net Revenue','Orders','Completed','Active','Cancelled','Stock Value','Items'],
      ...data.locations.map(loc => [
        loc.locationName, loc.type,      loc.totalRevenue,     loc.subtotal,
        loc.taxCollected, loc.discounts, loc.shippingCollected, loc.returnsValue,
        loc.netRevenue,   loc.totalOrders, loc.completedOrders, loc.activeOrders,
        loc.cancelledOrders, loc.stockValue, loc.itemCount,
      ]),
    ];
    const ws = xlsx.utils.aoa_to_sheet(summaryRows);
    xlsx.utils.book_append_sheet(wb, ws, 'Summary');
    xlsx.writeFile(wb, `locations-sales-${dateRange}-${Date.now()}.xlsx`);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading location sales data…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16 text-center">
        <div className="text-red-500 text-4xl mb-3">⚠️</div>
        <h3 className="font-semibold text-gray-800 mb-1">Something went wrong</h3>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => fetchData(dateRange)}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-700"
          >
            Retry
          </button>
          <Link
            href="/dashboard/settings/locations"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            ← Back to Locations
          </Link>
        </div>
      </div>
    );
  }

  const { locations, grandTotal } = data;
  const maxRevenue = Math.max(...locations.map(l => l.totalRevenue), 1);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Breadcrumb */}
          <nav className="text-xs text-gray-400 mb-1 flex items-center gap-1">
            <Link href="/dashboard" className="hover:text-gray-600 transition-colors">Dashboard</Link>
            <span>/</span>
            <Link href="/dashboard/settings/locations" className="hover:text-gray-600 transition-colors">Locations</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">Sales Report</span>
          </nav>
          <h1 className="text-xl font-bold text-gray-900">Sales by Location</h1>
          {/* Dynamic period label under title */}
          <p className="text-sm text-gray-500 mt-0.5">
            {rangeSummary(dateRange)}
            {' · '}
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ── Controls ── */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/*
            Your existing DateRangePicker already supports:
              • Quick presets  (Today, Last 7/30/90 days, Last 12 months)
              • Single-day pick from the calendar  → emits 'YYYY-MM-DD'
              • Custom range pick                  → emits 'YYYY-MM-DD_YYYY-MM-DD'
            All three formats are handled by getAllLocationsSalesSummary in location-sales.ts.
            syncToUrl is false — this page manages the URL itself via handleRangeChange.
          */}
          <DateRangePicker
            value={dateRange}
            onChange={handleRangeChange}
          />

          <Link
            href="/dashboard/settings/locations"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Manage Locations
          </Link>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>

      {/* ── Grand Total Banner ── */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-800 rounded-2xl p-5 text-white">
        <p className="text-rose-200 text-sm font-medium mb-1">
          Grand Total — All Locations &nbsp;·&nbsp; {rangeSummary(dateRange)}
        </p>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <p className="text-3xl font-bold">{GHS(grandTotal.totalRevenue)}</p>
            <p className="text-rose-200 text-xs mt-0.5">Total Revenue</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <p className="font-semibold">{GHS(grandTotal.taxCollected)}</p>
              <p className="text-rose-200 text-xs">Tax Collected</p>
            </div>
            <div>
              <p className="font-semibold">{GHS(grandTotal.returnsValue)}</p>
              <p className="text-rose-200 text-xs">Returns</p>
            </div>
            <div>
              <p className="font-semibold">{GHS(grandTotal.netRevenue)}</p>
              <p className="text-rose-200 text-xs">Net Revenue</p>
            </div>
            <div>
              <p className="font-semibold">{grandTotal.totalOrders}</p>
              <p className="text-rose-200 text-xs">Total Orders</p>
            </div>
            <div>
              <p className="font-semibold">{GHS(grandTotal.stockValue)}</p>
              <p className="text-rose-200 text-xs">Stock Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Per-Location Cards ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Breakdown by Location
        </h2>
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationCard
              key={loc.locationId}
              loc={loc}
              maxRevenue={maxRevenue}
              grandTotalRevenue={grandTotal.totalRevenue}
            />
          ))}
          {locations.length === 0 && (
            <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
              No sales found for{' '}
              <span className="font-medium text-gray-500">{rangeSummary(dateRange)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Summary Comparison Table ── */}
      {locations.length > 1 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Quick Comparison</h2>
            <span className="text-xs text-gray-400">{rangeSummary(dateRange)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="text-left px-5 py-3">Location</th>
                  <th className="text-left px-3 py-3">Type</th>
                  <th className="text-right px-3 py-3">Revenue</th>
                  <th className="text-right px-3 py-3">Tax</th>
                  <th className="text-right px-3 py-3">Returns</th>
                  <th className="text-right px-3 py-3">Net Revenue</th>
                  <th className="text-right px-3 py-3">Orders</th>
                  <th className="text-right px-5 py-3">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locations.map((loc) => (
                  <tr key={loc.locationId} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800">{loc.locationName}</td>
                    <td className="px-3 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${LOCATION_COLORS[loc.type] || '#6b7280'}20`,
                          color: LOCATION_COLORS[loc.type] || '#6b7280',
                        }}
                      >
                        {TYPE_LABELS[loc.type] || loc.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{GHS(loc.totalRevenue)}</td>
                    <td className="px-3 py-3 text-right text-gray-500">{GHS(loc.taxCollected)}</td>
                    <td className="px-3 py-3 text-right text-red-500">{GHS(loc.returnsValue)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-800">{GHS(loc.netRevenue)}</td>
                    <td className="px-3 py-3 text-right">{loc.totalOrders}</td>
                    <td className="px-5 py-3 text-right text-gray-500">
                      {pct(loc.totalRevenue, grandTotal.totalRevenue)}%
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                  <td className="px-5 py-3 text-gray-800">Grand Total</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right">{GHS(grandTotal.totalRevenue)}</td>
                  <td className="px-3 py-3 text-right text-gray-500">{GHS(grandTotal.taxCollected)}</td>
                  <td className="px-3 py-3 text-right text-red-500">{GHS(grandTotal.returnsValue)}</td>
                  <td className="px-3 py-3 text-right">{GHS(grandTotal.netRevenue)}</td>
                  <td className="px-3 py-3 text-right">{grandTotal.totalOrders}</td>
                  <td className="px-5 py-3 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Location Card ─────────────────────────────────────────────────────────────
function LocationCard({
  loc,
  maxRevenue,
  grandTotalRevenue,
}: {
  loc: LocationSalesSummary;
  maxRevenue: number;
  grandTotalRevenue: number;
}) {
  const color    = LOCATION_COLORS[loc.type] || '#6b7280';
  const barWidth = maxRevenue > 0 ? (loc.totalRevenue / maxRevenue) * 100 : 0;
  const share    = grandTotalRevenue > 0
    ? ((loc.totalRevenue / grandTotalRevenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-rose-200 hover:shadow-md transition-all shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{loc.locationName}</h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: `${color}18`, color }}
            >
              {TYPE_LABELS[loc.type] || loc.type}
            </span>
            {loc.address && (
              <span className="text-xs text-gray-400 truncate">{loc.address}</span>
            )}
          </div>

          {/* Revenue progress bar */}
          <div className="mt-3 mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Revenue share: {share}%</span>
              <span>{GHS(loc.totalRevenue)}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, backgroundColor: color }}
              />
            </div>
          </div>

          {/* Financial breakdown */}
          <div className="flex flex-wrap gap-3 mt-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Subtotal</span>
              <span className="font-medium text-gray-700">{GHS(loc.subtotal)}</span>
            </div>
            <div className="w-px bg-gray-200 self-stretch" />
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Tax</span>
              <span className="font-medium text-amber-600">{GHS(loc.taxCollected)}</span>
            </div>
            <div className="w-px bg-gray-200 self-stretch" />
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Returns</span>
              <span className="font-medium text-red-500">{GHS(loc.returnsValue)}</span>
            </div>
            <div className="w-px bg-gray-200 self-stretch" />
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Net</span>
              <span className="font-semibold text-green-600">{GHS(loc.netRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Order counts + stock */}
        <div className="flex sm:flex-col gap-4 sm:gap-2 sm:text-right shrink-0">
          <div>
            <p className="text-lg font-bold text-gray-800">{loc.totalOrders}</p>
            <p className="text-xs text-gray-400">Total Orders</p>
          </div>
          <div className="flex sm:flex-col gap-2 sm:gap-1 flex-wrap">
            <span className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1" />
              {loc.completedOrders} done
            </span>
            <span className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />
              {loc.activeOrders} active
            </span>
            <span className="text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />
              {loc.cancelledOrders} cancelled
            </span>
          </div>
          <div className="sm:mt-2">
            <p className="text-sm font-semibold text-gray-700">{GHS(loc.stockValue)}</p>
            <p className="text-xs text-gray-400">Stock Value ({loc.itemCount} items)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

