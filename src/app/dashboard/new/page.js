'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { detectParse, findAll, fmt, fmtN, CATEGORY_DEFS } from '@/lib/reconciler';

const C = {
  bg: '#0A0E17', card: '#111827', card2: '#1A2035', border: '#1F2937', text: '#F1F5F9',
  dim: '#6B7280', blue: '#3B82F6', green: '#10B981', red: '#EF4444', amber: '#F59E0B',
};

const tierColors = { error: C.red, optimize: C.amber, info: C.blue };
const tierLabels = { error: 'BILLING ERROR', optimize: 'OPTIMIZATION', info: 'INFORMATIONAL' };

export default function NewReconciliation() {
  const router = useRouter();
  const [view, setView] = useState('upload'); // upload | results
  const [wh, setWh] = useState([]);
  const [pc, setPc] = useState([]);
  const [err, setErr] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeCats, setActiveCats] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reportName, setReportName] = useState('');

  // Upload
  function processFiles(target, e) {
    e.preventDefault();
    const files = e.dataTransfer ? Array.from(e.dataTransfer.files) : (e.target?.files ? Array.from(e.target.files) : []);
    if (!files.length) return;
    setLoading(true); setErr([]);
    const errs = [];
    Promise.all(files.map((f) =>
      f.arrayBuffer().then((ab) => {
        const parsed = detectParse(new Uint8Array(ab), f.name);
        if (parsed.type === 'unknown') { errs.push(f.name + ': unrecognized'); return; }
        if (target === 'auto' || target === parsed.type) {
          if (parsed.type === 'warehouse') setWh((p) => [...p, parsed]);
          else setPc((p) => [...p, parsed]);
        }
      }).catch((ex) => { errs.push(f.name + ': ' + ex.message); })
    )).then(() => { setErr(errs); setLoading(false); });
  }

  function pick(target) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = (e) => processFiles(target, e); inp.click();
  }

  function runReconciliation() {
    const res = findAll(wh, pc);
    setResult(res);
    setView('results');
    // Auto-name based on first file
    const names = [...wh, ...pc].map((f) => f.fileName).join(', ');
    setReportName(names || 'Reconciliation ' + new Date().toLocaleDateString());
  }

  async function saveResults() {
    if (!result || saved) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      await supabase.from('reconciliations').insert({
        user_id: user.id,
        name: reportName || 'Untitled',
        total_orders: result.totalOrders,
        total_shipments: result.totalShipments,
        total_warehouse: result.totalWarehouse,
        total_parcel: result.totalParcel,
        shipping_cpo: result.shippingCPO,
        all_in_cpo: result.allInCPO,
        total_overcharges: result.totalOvercharges,
        total_credits: result.totalCredits,
        net_impact: result.netImpact,
        total_findings: result.findings.length,
        findings: result.findings,
        rate_card: result.rateCard,
        category_summary: result.catSummary,
        files_uploaded: [...wh, ...pc].map((f) => f.fileName),
      });
      setSaved(true);
    } catch (e) {
      alert('Error saving: ' + e.message);
    }
    setSaving(false);
  }

  // Upload view
  if (view === 'upload') {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-extrabold text-white mb-2">New Reconciliation</h1>
        <p className="text-sm text-gray-400 mb-8">Upload your 3PL files to begin the audit.</p>
        <div className="flex gap-5 mb-6">
          {[
            { target: 'warehouse', label: 'Warehouse / EOM', desc: 'Rate card + actuals', icon: '🏭', files: wh },
            { target: 'parcel', label: 'Parcel / Shipping', desc: 'Carrier charges + surcharges', icon: '📦', files: pc },
          ].map((z) => (
            <div key={z.target}
              onClick={() => pick(z.target)}
              onDrop={(e) => processFiles(z.target, e)}
              onDragOver={(e) => e.preventDefault()}
              className="flex-1 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition hover:border-gray-600"
              style={{ borderColor: z.files.length ? C.green : C.border, background: z.files.length ? C.green + '08' : 'transparent' }}>
              <div className="text-3xl mb-3">{z.icon}</div>
              <div className="text-sm font-bold text-white">{z.label}</div>
              <div className="text-xs text-gray-400 mt-1 mb-3">{z.desc}</div>
              {z.files.map((f, i) => (
                <div key={i} className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-md inline-block m-0.5 font-mono">✓ {f.fileName}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="text-center mb-6">
          <span onClick={() => pick('auto')} className="text-xs text-gray-500 cursor-pointer border-b border-dashed border-gray-700">or auto-detect</span>
        </div>
        {err.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            {err.map((e, i) => <div key={i} className="text-xs text-red-400">⚠ {e}</div>)}
          </div>
        )}
        <div className="text-center">
          <button onClick={runReconciliation} disabled={!wh.length && !pc.length}
            className="px-8 py-3 rounded-xl bg-blue-500 text-white font-bold hover:bg-blue-600 transition disabled:opacity-30">
            {loading ? 'Parsing...' : 'Run Reconciliation'}
          </button>
        </div>
      </div>
    );
  }

  // Results view
  const r = result;
  const activeKeys = Object.keys(activeCats).filter((k) => activeCats[k]);
  const filtered = activeKeys.length === 0 ? r.findings : r.findings.filter((f) => activeCats[f.category]);
  const filtOvercharges = filtered.filter((f) => f.isOvercharge).reduce((s, f) => s + Math.abs(f.amount), 0);
  const filtCredits = filtered.filter((f) => !f.isOvercharge && f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);

  const catKeys = Object.keys(r.catSummary).sort((a, b) => {
    const tierOrder = { error: 0, optimize: 1, info: 2 };
    const ta = (CATEGORY_DEFS[a] || {}).tier || 'info';
    const tb = (CATEGORY_DEFS[b] || {}).tier || 'info';
    if (tierOrder[ta] !== tierOrder[tb]) return tierOrder[ta] - tierOrder[tb];
    return (r.catSummary[b].overcharges + r.catSummary[b].neutral) - (r.catSummary[a].overcharges + r.catSummary[a].neutral);
  });

  return (
    <div className="p-6" style={{ maxWidth: 1200 }}>
      {/* Header + Save */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 mr-4">
          <input value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="Report name..."
            className="text-xl font-extrabold text-white bg-transparent border-none outline-none w-full placeholder-gray-600" />
          <div className="text-xs text-gray-500 mt-1">
            {fmtN(r.totalOrders)} orders · {fmtN(r.totalShipments)} shipments · Warehouse: {fmt(r.totalWarehouse)} · Parcel: {fmt(r.totalParcel)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Ship CPO</div>
            <div className="text-base font-extrabold font-mono" style={{ color: r.shippingCPO <= 10.30 ? C.green : C.red }}>{fmt(r.shippingCPO)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">All-In CPO</div>
            <div className="text-base font-extrabold font-mono" style={{ color: r.allInCPO <= 10.30 ? C.green : C.red }}>{fmt(r.allInCPO)}</div>
          </div>
          <button onClick={saveResults} disabled={saving || saved}
            className="px-4 py-2 rounded-lg text-sm font-bold transition"
            style={{ background: saved ? C.green : C.blue, color: '#fff', opacity: saving ? 0.5 : 1 }}>
            {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Report'}
          </button>
          <button onClick={() => { setView('upload'); setResult(null); setWh([]); setPc([]); setSaved(false); }}
            className="px-3 py-2 rounded-lg border text-xs text-gray-400 hover:text-white transition" style={{ borderColor: C.border }}>
            New
          </button>
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-xl p-5" style={{ background: C.red + '12', border: '1px solid ' + C.red + '40' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.red }}>Total Overcharges</div>
          <div className="text-2xl font-extrabold font-mono mt-1" style={{ color: C.red }}>{fmt(r.totalOvercharges)}</div>
          <div className="text-xs text-gray-500 mt-1">Amount you were overbilled</div>
        </div>
        <div className="rounded-xl p-5" style={{ background: C.green + '12', border: '1px solid ' + C.green + '40' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.green }}>Total Credits</div>
          <div className="text-2xl font-extrabold font-mono mt-1" style={{ color: C.green }}>{fmt(r.totalCredits)}</div>
          <div className="text-xs text-gray-500 mt-1">Corrections in your favor</div>
        </div>
        <div className="rounded-xl p-5" style={{ background: (r.netImpact > 0 ? C.red : C.green) + '12', border: '1px solid ' + (r.netImpact > 0 ? C.red : C.green) + '40' }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: r.netImpact > 0 ? C.red : C.green }}>Net Impact</div>
          <div className="text-2xl font-extrabold font-mono mt-1" style={{ color: r.netImpact > 0 ? C.red : C.green }}>{fmt(r.netImpact)}</div>
          <div className="text-xs text-gray-500 mt-1">{r.netImpact > 0 ? 'Net amount you are owed' : 'Net in your favor'}</div>
        </div>
      </div>

      {/* Category filter cards */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-gray-400">Filter by Category</div>
        {activeKeys.length > 0 && <span onClick={() => { setActiveCats({}); setExpanded(null); }} className="text-xs text-blue-400 cursor-pointer">Clear filters</span>}
      </div>
      <div className="grid gap-2 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {catKeys.map((key) => {
          const cat = r.catSummary[key];
          const def = CATEGORY_DEFS[key] || { name: key, tier: 'info', icon: '•', desc: '' };
          const clr = tierColors[def.tier];
          const isActive = activeCats[key];
          return (
            <div key={key} onClick={() => { setActiveCats((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; }); setExpanded(null); }}
              className="rounded-lg p-3 cursor-pointer transition"
              style={{ background: isActive ? clr + '18' : C.card, border: '1px solid ' + (isActive ? clr + '60' : C.border), opacity: activeKeys.length > 0 && !isActive ? 0.45 : 1 }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ color: clr, background: clr + '18' }}>{tierLabels[def.tier]}</span>
                {isActive && <span className="text-[10px]" style={{ color: clr }}>✓</span>}
              </div>
              <div className="text-xs font-bold text-white mb-0.5">{def.icon} {def.name}</div>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-lg font-extrabold font-mono text-white">{fmtN(cat.count)}</span>
                {(cat.overcharges > 0 || cat.credits > 0) && <span className="text-sm font-bold font-mono" style={{ color: cat.overcharges > cat.credits ? C.red : C.green }}>{fmt(cat.overcharges || cat.credits)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate card */}
      {r.rateCard.length > 0 && (
        <div className="rounded-xl p-4 mb-5" style={{ background: C.card, border: '1px solid ' + C.border }}>
          <div className="text-sm font-bold text-white mb-3">Rate Card 3-Way Match</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead><tr>{['Billing Type', 'UOM', 'Rate', 'Qty', 'Expected', 'Billed', 'Discrepancy', ''].map((h) => (
                <th key={h} className="px-2.5 py-2 font-semibold uppercase text-gray-500" style={{ textAlign: h === 'Billing Type' || h === 'UOM' ? 'left' : 'right', borderBottom: '1px solid ' + C.border, fontSize: 10 }}>{h}</th>
              ))}</tr></thead>
              <tbody>{r.rateCard.map((rc, i) => {
                const expected = rc.rate * rc.qty;
                const delta = rc.billed - expected;
                const ok = Math.abs(delta) < 0.02;
                return <tr key={i} style={{ background: !ok ? C.red + '08' : 'transparent' }}>
                  <td className="px-2.5 py-1.5 text-white" style={{ borderBottom: '1px solid ' + C.border }}>{rc.billingType}</td>
                  <td className="px-2.5 py-1.5 text-gray-400" style={{ borderBottom: '1px solid ' + C.border }}>{rc.uom}</td>
                  <td className="px-2.5 py-1.5 text-white text-right font-mono" style={{ borderBottom: '1px solid ' + C.border }}>{fmt(rc.rate)}</td>
                  <td className="px-2.5 py-1.5 text-white text-right font-mono" style={{ borderBottom: '1px solid ' + C.border }}>{fmtN(rc.qty)}</td>
                  <td className="px-2.5 py-1.5 text-white text-right font-mono" style={{ borderBottom: '1px solid ' + C.border }}>{fmt(expected)}</td>
                  <td className="px-2.5 py-1.5 text-white text-right font-mono" style={{ borderBottom: '1px solid ' + C.border }}>{fmt(rc.billed)}</td>
                  <td className="px-2.5 py-1.5 text-right font-mono" style={{ borderBottom: '1px solid ' + C.border, color: ok ? C.dim : (delta > 0 ? C.red : C.green), fontWeight: ok ? 400 : 700 }}>
                    {ok ? '—' : (delta > 0 ? 'Overcharge ' + fmt(delta) : 'Undercharge ' + fmt(delta))}
                  </td>
                  <td className="px-2.5 py-1.5 text-right text-sm" style={{ borderBottom: '1px solid ' + C.border }}>
                    {ok ? <span style={{ color: C.green }}>✓</span> : <span style={{ color: C.red }}>✗</span>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Findings header */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs font-bold text-white">
          {activeKeys.length > 0 ? `Filtered: ${fmtN(filtered.length)} of ${fmtN(r.findings.length)}` : `All ${fmtN(r.findings.length)} Findings`}
        </div>
        <div className="flex gap-4">
          {filtOvercharges > 0 && <span className="text-xs font-bold font-mono" style={{ color: C.red }}>Overcharges: {fmt(filtOvercharges)}</span>}
          {filtCredits > 0 && <span className="text-xs font-bold font-mono" style={{ color: C.green }}>Credits: {fmt(filtCredits)}</span>}
        </div>
      </div>

      {/* Findings table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid ' + C.border }}>
        <div className="grid gap-0 px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide" style={{ gridTemplateColumns: '100px 160px 1fr 110px 80px', background: C.card, borderBottom: '1px solid ' + C.border }}>
          <div>Order #</div><div>Category</div><div>Description</div><div className="text-right">Amount</div><div className="text-right">Status</div>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {filtered.map((f, i) => {
            const isExp = expanded === f.id;
            const def = CATEGORY_DEFS[f.category] || {};
            const clr = tierColors[def.tier || 'info'];
            const labelClr = f.label === 'Overcharge' ? C.red : f.label === 'Credit' ? C.green : f.label === 'Surcharge' ? C.amber : f.label === 'Short' ? C.red : C.dim;
            return (
              <div key={f.id}>
                <div onClick={() => setExpanded(isExp ? null : f.id)}
                  className="grid gap-0 px-4 py-2 cursor-pointer items-center text-xs"
                  style={{ gridTemplateColumns: '100px 160px 1fr 110px 80px', borderBottom: '1px solid ' + C.border, background: isExp ? C.card2 : (i % 2 ? 'rgba(255,255,255,0.01)' : 'transparent') }}>
                  <div className="font-mono text-[11px]" style={{ color: C.blue }}>{f.order}</div>
                  <div><span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: clr + '15', color: clr }}>{def.icon} {def.name}</span></div>
                  <div className="text-white overflow-hidden text-ellipsis whitespace-nowrap pr-3">{f.description}</div>
                  <div className="text-right font-mono font-bold" style={{ color: f.isOvercharge ? C.red : f.amount < 0 ? C.green : C.dim }}>
                    {f.amount !== 0 ? fmt(f.amount) : '—'}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: labelClr + '18', color: labelClr }}>{f.label}</span>
                  </div>
                </div>
                {isExp && (
                  <div className="px-6 py-3 text-xs" style={{ background: C.card2, borderBottom: '1px solid ' + C.border }}>
                    <div className="text-white mb-2" style={{ lineHeight: 1.5 }}>{f.description}</div>
                    {f.location && <div className="text-gray-500">Location: <span className="text-white">{f.location}</span></div>}
                    {f.zone && <div className="text-gray-500">Zone: <span className="text-white">{f.zone}</span></div>}
                    {f.service && <div className="text-gray-500">Service: <span className="text-white">{f.service}</span></div>}
                    {f.surcharges && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {f.surcharges.map((s, j) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded-md font-mono"
                            style={{ background: (s.type === 'Base Rate' || s.type === 'Freight' ? C.blue : C.amber) + '15', color: s.type === 'Base Rate' || s.type === 'Freight' ? C.blue : C.amber }}>
                            {s.type}: {fmt(s.charge)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid gap-0 px-4 py-2.5" style={{ gridTemplateColumns: '100px 160px 1fr 110px 80px', background: C.card, borderTop: '2px solid ' + C.border }}>
          <div className="text-xs font-extrabold text-white">TOTALS</div>
          <div className="text-[11px] text-gray-500">{fmtN(filtered.length)} findings</div>
          <div></div>
          <div className="text-right">
            {filtOvercharges > 0 && <div className="font-mono text-xs font-extrabold" style={{ color: C.red }}>Overcharges: {fmt(filtOvercharges)}</div>}
            {filtCredits > 0 && <div className="font-mono text-[11px] font-bold" style={{ color: C.green }}>Credits: {fmt(filtCredits)}</div>}
          </div>
          <div></div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 mt-3 text-[11px] text-gray-500 flex-wrap">
        <span><span className="font-bold" style={{ color: C.red }}>Overcharge</span> = Billed more than expected</span>
        <span><span className="font-bold" style={{ color: C.green }}>Credit</span> = Correction in your favor</span>
        <span><span className="font-bold" style={{ color: C.amber }}>Surcharge</span> = Legitimate fee, optimization opportunity</span>
        <span><span className="font-bold text-gray-400">Review</span> = Worth investigating</span>
      </div>
    </div>
  );
}
