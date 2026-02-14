'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

export default function DashboardOverview() {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from('reconciliations')
        .select('id, name, created_at, total_orders, total_overcharges, total_credits, net_impact, total_findings')
        .order('created_at', { ascending: false })
        .limit(10);
      setReconciliations(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n) => '$' + Math.abs(Number(n || 0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const totalOvercharges = reconciliations.reduce((s, r) => s + (r.total_overcharges || 0), 0);
  const totalCredits = reconciliations.reduce((s, r) => s + (r.total_credits || 0), 0);

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Your reconciliation history and insights.</p>
        </div>
        <Link href="/dashboard/new"
          className="px-5 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition">
          + New Reconciliation
        </Link>
      </div>

      {/* Lifetime stats */}
      {reconciliations.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[var(--card)] border border-gray-800 rounded-xl p-5">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Audits Run</div>
            <div className="text-3xl font-extrabold text-white font-mono mt-1">{reconciliations.length}</div>
          </div>
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
            <div className="text-xs font-bold text-red-400 uppercase tracking-wide">Total Overcharges Found</div>
            <div className="text-3xl font-extrabold text-red-400 font-mono mt-1">{fmt(totalOvercharges)}</div>
          </div>
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
            <div className="text-xs font-bold text-green-400 uppercase tracking-wide">Total Credits Recovered</div>
            <div className="text-3xl font-extrabold text-green-400 font-mono mt-1">{fmt(totalCredits)}</div>
          </div>
        </div>
      )}

      {/* Recent reconciliations */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : reconciliations.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-lg font-bold text-white mb-2">No reconciliations yet</h3>
          <p className="text-sm text-gray-400 mb-6">Upload your first set of 3PL files to get started.</p>
          <Link href="/dashboard/new"
            className="inline-block px-6 py-2.5 rounded-lg bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition">
            Run Your First Audit
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wide">
            Recent Reconciliations
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase">
                <th className="px-5 py-2.5 text-left font-semibold">Name</th>
                <th className="px-5 py-2.5 text-left font-semibold">Date</th>
                <th className="px-5 py-2.5 text-right font-semibold">Orders</th>
                <th className="px-5 py-2.5 text-right font-semibold">Findings</th>
                <th className="px-5 py-2.5 text-right font-semibold">Overcharges</th>
                <th className="px-5 py-2.5 text-right font-semibold">Net Impact</th>
                <th className="px-5 py-2.5 text-right font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r) => (
                <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition">
                  <td className="px-5 py-3 text-sm font-semibold text-white">{r.name}</td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400 text-right font-mono">{(r.total_orders || 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-sm text-gray-400 text-right font-mono">{r.total_findings || 0}</td>
                  <td className="px-5 py-3 text-sm text-right font-mono font-bold text-red-400">{fmt(r.total_overcharges)}</td>
                  <td className="px-5 py-3 text-sm text-right font-mono font-bold" style={{ color: (r.net_impact || 0) > 0 ? '#EF4444' : '#10B981' }}>
                    {fmt(r.net_impact)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link href={`/dashboard/history?id=${r.id}`} className="text-xs text-blue-400 hover:text-blue-300">View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
