'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';
import { fmt, fmtN, CATEGORY_DEFS } from '@/lib/reconciler';

const C = {
  bg: '#0A0E17', card: '#111827', card2: '#1A2035', border: '#1F2937',
  dim: '#6B7280', blue: '#3B82F6', green: '#10B981', red: '#EF4444', amber: '#F59E0B',
};
const tierColors = { error: C.red, optimize: C.amber, info: C.blue };

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const detailId = searchParams.get('id');
  const [list, setList] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCats, setActiveCats] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (detailId) {
        const { data } = await supabase.from('reconciliations').select('*').eq('id', detailId).single();
        setDetail(data);
      } else {
        const { data } = await supabase.from('reconciliations').select('*').order('created_at', { ascending: false });
        setList(data || []);
      }
      setLoading(false);
    }
    load();
  }, [detailId]);

  async function deleteReport(id) {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    const supabase = createClient();
    await supabase.from('reconciliations').delete().eq('id', id);
    setList((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  // Detail view
  if (detail) {
    const findings = detail.findings || [];
    const rateCard = detail.rate_card || [];
    const catSummary = detail.category_summary || {};
    const activeKeys = Object.keys(activeCats).filter((k) => activeCats[k]);
    const filtered = activeKeys.length === 0 ? findings : findings.filter((f) => activeCats[f.category]);
    const filtOvercharges = filtered.filter((f) => f.isOvercharge).reduce((s, f) => s + Math.abs(f.amount), 0);
    const filtCredits = filtered.filter((f) => !f.isOvercharge && f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);

    const catKeys = Object.keys(catSummary).sort((a, b) => {
      const to = { error: 0, optimize: 1, info: 2 };
      return (to[(CATEGORY_DEFS[a] || {}).tier || 'info'] || 2) - (to[(CATEGORY_DEFS[b] || {}).tier || 'info'] || 2);
    });

    return (
      <div className="p-6" style={{ maxWidth: 1200 }}>
        <div className="flex items-center gap-3 mb-6">
          <a href="/dashboard/history" className="text-xs text-gray-500 hover:text-white transition">← All Reports</a>
          <span className="text-gray-700">|</span>
          <span className="text-xs text-gray-400">{new Date(detail.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
        <h1 className="text-xl font-extrabold text-white mb-1">{detail.name}</h1>
        <div className="text-xs text-gray-500 mb-5">
          {fmtN(detail.total_orders)} orders · {fmtN(detail.total_shipments)} shipments · Files: {(detail.files_uploaded || []).join(', ')}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl p-4" style={{ background: C.red + '12', border: '1px solid ' + C.red + '40' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: C.red }}>Overcharges</div>
            <div className="text-xl font-extrabold font-mono" style={{ color: C.red }}>{fmt(detail.total_overcharges)}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: C.green + '12', border: '1px solid ' + C.green + '40' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: C.green }}>Credits</div>
            <div className="text-xl font-extrabold font-mono" style={{ color: C.green }}>{fmt(detail.total_credits)}</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: (detail.net_impact > 0 ? C.red : C.green) + '12', border: '1px solid ' + (detail.net_impact > 0 ? C.red : C.green) + '40' }}>
            <div className="text-[10px] font-bold uppercase" style={{ color: detail.net_impact > 0 ? C.red : C.green }}>Net Impact</div>
            <div className="text-xl font-extrabold font-mono" style={{ color: detail.net_impact > 0 ? C.red : C.green }}>{fmt(detail.net_impact)}</div>
          </div>
        </div>

        {/* Category filters */}
        <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {catKeys.map((key) => {
            const cat = catSummary[key];
            const def = CATEGORY_DEFS[key] || { name: key, tier: 'info', icon: '•' };
            const clr = tierColors[def.tier];
            const isActive = activeCats[key];
            return (
              <div key={key} onClick={() => { setActiveCats((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; }); setExpanded(null); }}
                className="rounded-lg p-3 cursor-pointer transition"
                style={{ background: isActive ? clr + '18' : C.card, border: '1px solid ' + (isActive ? clr + '60' : C.border), opacity: activeKeys.length > 0 && !isActive ? 0.45 : 1 }}>
                <div className="text-xs font-bold text-white">{def.icon} {def.name}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-sm font-extrabold font-mono text-white">{fmtN(cat.count)}</span>
                  {cat.overcharges > 0 && <span className="text-xs font-bold font-mono" style={{ color: C.red }}>{fmt(cat.overcharges)}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Findings table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid ' + C.border }}>
          <div className="grid px-4 py-2 text-[10px] font-bold text-gray-500 uppercase" style={{ gridTemplateColumns: '100px 150px 1fr 100px 70px', background: C.card, borderBottom: '1px solid ' + C.border }}>
            <div>Order</div><div>Category</div><div>Description</div><div className="text-right">Amount</div><div className="text-right">Status</div>
          </div>
          <div style={{ maxHeight: 500, overflowY: 'auto' }}>
            {filtered.map((f, i) => {
              const isExp = expanded === f.id;
              const def = CATEGORY_DEFS[f.category] || {};
              const clr = tierColors[def.tier || 'info'];
              const labelClr = f.label === 'Overcharge' ? C.red : f.label === 'Credit' ? C.green : f.label === 'Surcharge' ? C.amber : C.dim;
              return (
                <div key={f.id || i}>
                  <div onClick={() => setExpanded(isExp ? null : f.id)}
                    className="grid px-4 py-2 cursor-pointer items-center text-xs"
                    style={{ gridTemplateColumns: '100px 150px 1fr 100px 70px', borderBottom: '1px solid ' + C.border, background: isExp ? C.card2 : (i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent') }}>
                    <div className="font-mono text-[11px]" style={{ color: C.blue }}>{f.order}</div>
                    <div><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: clr + '15', color: clr }}>{def.name || f.category}</span></div>
                    <div className="text-white overflow-hidden text-ellipsis whitespace-nowrap pr-2">{f.description}</div>
                    <div className="text-right font-mono font-bold" style={{ color: f.isOvercharge ? C.red : f.amount < 0 ? C.green : C.dim }}>{f.amount ? fmt(f.amount) : '—'}</div>
                    <div className="text-right"><span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: labelClr + '18', color: labelClr }}>{f.label}</span></div>
                  </div>
                  {isExp && (
                    <div className="px-6 py-3 text-xs" style={{ background: C.card2, borderBottom: '1px solid ' + C.border }}>
                      <div className="text-white mb-2">{f.description}</div>
                      {f.location && <div className="text-gray-500">Location: <span className="text-white">{f.location}</span></div>}
                      {f.zone && <div className="text-gray-500">Zone: <span className="text-white">{f.zone}</span></div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: '100px 150px 1fr 100px 70px', background: C.card, borderTop: '2px solid ' + C.border }}>
            <div className="text-xs font-extrabold text-white">TOTAL</div>
            <div className="text-[11px] text-gray-500">{fmtN(filtered.length)} findings</div>
            <div></div>
            <div className="text-right">
              {filtOvercharges > 0 && <div className="font-mono text-xs font-extrabold" style={{ color: C.red }}>{fmt(filtOvercharges)}</div>}
              {filtCredits > 0 && <div className="font-mono text-[11px] font-bold" style={{ color: C.green }}>{fmt(filtCredits)}</div>}
            </div>
            <div></div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-extrabold text-white mb-2">Past Reports</h1>
      <p className="text-sm text-gray-400 mb-8">View and manage your saved reconciliation reports.</p>

      {list.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-lg font-bold text-white mb-2">No saved reports</h3>
          <p className="text-sm text-gray-400">Run a reconciliation and save it to see it here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-5 rounded-xl border border-gray-800 bg-[var(--card)] hover:border-gray-700 transition">
              <div className="flex-1">
                <div className="text-sm font-bold text-white">{r.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} ·
                  {' '}{fmtN(r.total_orders)} orders · {fmtN(r.total_findings)} findings
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Overcharges</div>
                  <div className="text-sm font-bold font-mono text-red-400">{fmt(r.total_overcharges)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Net</div>
                  <div className="text-sm font-bold font-mono" style={{ color: r.net_impact > 0 ? '#EF4444' : '#10B981' }}>{fmt(r.net_impact)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/dashboard/history?id=${r.id}`} className="text-xs text-blue-400 hover:text-blue-300 font-semibold">View →</a>
                  <button onClick={() => deleteReport(r.id)} className="text-xs text-gray-600 hover:text-red-400 transition" title="Delete">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
