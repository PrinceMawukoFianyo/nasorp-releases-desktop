"use client";

import { useEffect, useState } from "react";
import { checkNegativeMarginItems } from "@/actions/diagnostics";

export default function DiagnosticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDiagnostics() {
      try {
        const result = await checkNegativeMarginItems();
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load diagnostics");
      } finally {
        setLoading(false);
      }
    }
    fetchDiagnostics();
  }, []);

  if (loading) return <div className="p-8">Loading diagnostics...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-8">No data returned.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 Sales Diagnostics</h1>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
        <h2 className="font-semibold">Summary</h2>
        <p>Items with costPrice &gt; sellingPrice: <strong>{data.badItems.length}</strong></p>
        <p>Total Revenue (last 30d): <strong>GHS {data.summary.totalRevenue30d.toFixed(2)}</strong></p>
        <p>Total COGS (last 30d): <strong>GHS {data.summary.totalCOGS30d.toFixed(2)}</strong></p>
        <p>Gross Loss: <strong className="text-red-600">GHS {(data.summary.totalCOGS30d - data.summary.totalRevenue30d).toFixed(2)}</strong></p>
      </div>

      {data.badItems.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Items with costPrice &gt; sellingPrice</h2>
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">Name</th>
                  <th className="p-2 text-left">SKU</th>
                  <th className="p-2 text-right">Cost Price</th>
                  <th className="p-2 text-right">Selling Price</th>
                  <th className="p-2 text-right">Loss per unit</th>
                </tr>
              </thead>
              <tbody>
                {data.badItems.map((item: any, idx: number) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2">{item.sku}</td>
                    <td className="p-2 text-right">GHS {item.costPrice.toFixed(2)}</td>
                    <td className="p-2 text-right">GHS {item.sellingPrice.toFixed(2)}</td>
                    <td className="p-2 text-right text-red-600">GHS {item.diff.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="font-semibold text-lg mb-2">Worst Performing Items (last 30 days)</h2>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-right">Qty Sold</th>
                <th className="p-2 text-right">Revenue</th>
                <th className="p-2 text-right">COGS</th>
                <th className="p-2 text-right">Gross Profit</th>
                <th className="p-2 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {data.worstPerformers.map((item: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2">{item.sku}</td>
                  <td className="p-2 text-right">{item.qty}</td>
                  <td className="p-2 text-right">GHS {item.revenue.toFixed(2)}</td>
                  <td className="p-2 text-right">GHS {item.cogs.toFixed(2)}</td>
                  <td className={`p-2 text-right ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    GHS {item.profit.toFixed(2)}
                  </td>
                  <td className="p-2 text-right">{item.margin.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <p>🔍 This page is temporary — remove it after investigation.</p>
        <p>To use it again, navigate to <code>/dashboard/diagnostics</code>.</p>
      </div>
    </div>
  );
}