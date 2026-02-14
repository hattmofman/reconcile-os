import * as XLSX from 'xlsx';
import _ from 'lodash';

export function fmt(n) {
  return n == null || isNaN(n) ? '—' : '$' + Math.abs(Number(n)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
export function fmtN(n) {
  return n == null ? '—' : Number(n).toLocaleString();
}

// ── Parsers ──
function parseWarehouse(wb) {
  const r = { type: 'warehouse' };
  const sumRaw = XLSX.utils.sheet_to_json(wb.Sheets['Summary'], { header: 1 });
  const headerIdx = sumRaw.findIndex((row) => row && String(row[0] || '').includes('Billing Type'));
  if (headerIdx >= 0) {
    r.rateCard = [];
    for (let i = headerIdx + 1; i < sumRaw.length; i++) {
      const row = sumRaw[i];
      if (!row || !row[0] || String(row[0]).trim() === '') continue;
      if (String(row[0]).toUpperCase().includes('TOTAL')) continue;
      r.rateCard.push({
        billingType: String(row[0]).trim(), uom: String(row[1] || '').trim(),
        rate: parseFloat(row[2]) || 0, qty: parseFloat(row[3]) || 0, billed: parseFloat(row[4]) || 0,
      });
    }
  }
  if (wb.SheetNames.includes('OB Summary')) {
    r.outbound = XLSX.utils.sheet_to_json(wb.Sheets['OB Summary']).map((d) => ({
      orderNumber: d['Order Number'], lines: d['No of Lines'], units: d['Shipped Units'],
      carrier: d['Carrier Ship Option'], channel: d['Channel Category'],
    }));
  }
  if (wb.SheetNames.includes('IB Lines')) {
    r.inbound = XLSX.utils.sheet_to_json(wb.Sheets['IB Lines']).map((d) => ({
      order: d['Order Number'], sku: d['SKU'], received: d['Received Quantity'],
      expected: d['Expected Quantity'], discrepancy: d['Receipt Discrepancy'], status: d['Status'],
    }));
  }
  if (wb.SheetNames.includes('IB Report')) {
    const ibData = XLSX.utils.sheet_to_json(wb.Sheets['IB Report']);
    r.ibReport = { pallets: 0, cases: 0, each: 0 };
    ibData.forEach((d) => {
      const uom = d['UOM Received']; const qty = d['Quantity Received'] || 0;
      if (uom === 'Pallet') r.ibReport.pallets += qty;
      else if (uom === 'Case') r.ibReport.cases += qty;
      else if (uom === 'Each') r.ibReport.each += qty;
    });
  }
  if (wb.SheetNames.includes('VAS-Labor')) {
    r.vas = XLSX.utils.sheet_to_json(wb.Sheets['VAS-Labor']).map((d) => ({
      date: d['Date'], type: d['VAS Type'], category: d['Category'],
      qty: d['Total Quantity'], uom: d['Quantity UOM'], notes: d['Notes / Activity Summary'],
    }));
  }
  if (wb.SheetNames.includes('Materials')) {
    const raw = XLSX.utils.sheet_to_json(wb.Sheets['Materials'], { header: 1 });
    const hi = raw.findIndex((row) => row && String(row[1] || '').includes('Item Description'));
    if (hi >= 0) r.materials = raw.slice(hi + 1).filter((row) => row[1]).map((row) => ({ item: row[1], qty: row[2], cost: row[4] }));
  }
  if (wb.SheetNames.includes('Returns')) {
    r.returns = XLSX.utils.sheet_to_json(wb.Sheets['Returns']);
    r.returnUnits = (r.returns || []).reduce((s, d) => s + (d['Received Quantity'] || 0), 0);
  }
  return r;
}

function parseParcel(wb) {
  const r = { type: 'parcel' };
  if (wb.SheetNames.includes('Parcel Txns')) {
    r.txns = XLSX.utils.sheet_to_json(wb.Sheets['Parcel Txns']).map((d) => ({
      order: d['Order Number'], item: d['Billing Item'], rate: d['Rate/Unit'], charge: d['Total Charge'],
    }));
  }
  const bs = wb.SheetNames.find((s) => s.includes('Parcel Backup'));
  if (bs) {
    r.backup = XLSX.utils.sheet_to_json(wb.Sheets[bs]).map((d) => {
      const surcharges = [];
      for (let i = 1; i <= 10; i++) {
        const t = d['Fee Surcharge Type ' + i]; const ch = d['Fee Type Charges ' + i];
        if (t && ch != null) surcharges.push({ type: t, charge: parseFloat(ch) || 0 });
      }
      return {
        order: d['Order Number'], date: d['Shipped Date'], service: d['Service Level'],
        actualWt: d['Actual Weight'], h: d['Height'], w: d['Width'], l: d['Length'],
        dimWt: d['Dim Weight'], billWt: d['Bill Weight'], billWtType: d['Bill Weight Type'],
        city: d['City'], state: d['State'], zip: d['Postal Code'], zone: d['Zone'],
        total: d['Total Amount'], adjustment: d['Adjustment'], surcharges,
      };
    });
  }
  return r;
}

export function detectParse(buf, name) {
  const wb = XLSX.read(buf, { type: 'array' });
  const sn = wb.SheetNames.map((s) => s.toLowerCase());
  if (sn.includes('ob summary') || sn.includes('vas-labor')) return { ...parseWarehouse(wb), fileName: name };
  if (sn.some((s) => s.includes('parcel'))) return { ...parseParcel(wb), fileName: name };
  return { type: 'unknown', fileName: name };
}

// ── Category definitions ──
export const CATEGORY_DEFS = {
  qty_mismatch: { name: 'Quantity Mismatch', desc: "Billed quantities don't match actual receipts", tier: 'error', icon: '⚠️' },
  rate_card_math: { name: 'Rate Card Math Error', desc: "Rate × Quantity doesn't equal billed amount", tier: 'error', icon: '🧮' },
  phantom_charge: { name: 'Phantom Charges', desc: 'Parcel charges for orders not in Outbound Summary', tier: 'error', icon: '👻' },
  post_bill_increase: { name: 'Post-Bill Increases', desc: 'Charges added after the original invoice', tier: 'error', icon: '📈' },
  post_bill_credit: { name: 'Post-Bill Credits', desc: 'Credits applied after the original invoice', tier: 'error', icon: '📉' },
  delivery_surcharge: { name: 'Delivery Area Surcharges', desc: 'DAS/EDAS/RDAS/Residential carrier fees', tier: 'optimize', icon: '🚚' },
  peak_surcharge: { name: 'Peak Surcharges', desc: 'Seasonal peak carrier surcharges', tier: 'optimize', icon: '📅' },
  dim_weight: { name: 'Dim Weight Opportunities', desc: 'Packages billed on dimensional weight vs actual', tier: 'optimize', icon: '📦' },
  inbound_discrepancy: { name: 'Inbound Discrepancies', desc: 'Received quantities differ from expected', tier: 'info', icon: '📋' },
};

// ── Finding Engine ──
export function findAll(whFiles, pcFiles) {
  const wh = whFiles[0] || {};
  const ob = wh.outbound || [];
  const rateCard = wh.rateCard || [];
  const allTxns = pcFiles.flatMap((p) => p.txns || []);
  const allB = pcFiles.flatMap((p) => p.backup || []);
  const obOrderSet = {};
  ob.forEach((o) => { obOrderSet[String(o.orderNumber).replace('-OB-1', '')] = true; });
  const findings = [];

  // BILLING ERRORS
  if (wh.ibReport) {
    const ibCaseRC = rateCard.find((rc) => rc.billingType.includes('IB Handling - Case'));
    if (ibCaseRC && wh.ibReport.cases !== ibCaseRC.qty) {
      const extra = ibCaseRC.qty - wh.ibReport.cases;
      findings.push({ id: 'QTY-IB-CASE', category: 'qty_mismatch', order: '—', label: extra > 0 ? 'Overcharge' : 'Undercharge',
        description: `Billed for ${fmtN(ibCaseRC.qty)} cases but only ${fmtN(wh.ibReport.cases)} were actually received (${Math.abs(extra)} extra × ${fmt(ibCaseRC.rate)}/case)`,
        amount: extra * ibCaseRC.rate, isOvercharge: extra > 0 });
    }
    const ibPalRC = rateCard.find((rc) => rc.billingType.includes('IB Handling - Pallet'));
    if (ibPalRC && wh.ibReport.pallets !== ibPalRC.qty) {
      const extra = ibPalRC.qty - wh.ibReport.pallets;
      findings.push({ id: 'QTY-IB-PAL', category: 'qty_mismatch', order: '—', label: extra > 0 ? 'Overcharge' : 'Undercharge',
        description: `Billed for ${fmtN(ibPalRC.qty)} pallets but ${fmtN(wh.ibReport.pallets)} were received`,
        amount: extra * ibPalRC.rate, isOvercharge: extra > 0 });
    }
  }

  rateCard.forEach((rc) => {
    const expected = rc.rate * rc.qty;
    const delta = rc.billed - expected;
    if (Math.abs(delta) > 0.02) {
      findings.push({ id: 'RC-' + rc.billingType, category: 'rate_card_math', order: '—', label: delta > 0 ? 'Overcharge' : 'Credit',
        description: `${rc.billingType}: ${fmt(rc.rate)} × ${fmtN(rc.qty)} should be ${fmt(expected)} but was billed as ${fmt(rc.billed)}`,
        amount: delta, isOvercharge: delta > 0 });
    }
  });

  allB.forEach((r) => {
    if (!obOrderSet[String(r.order)]) {
      findings.push({ id: 'PHANTOM-' + r.order, category: 'phantom_charge', order: String(r.order), label: 'Overcharge',
        description: 'Parcel charge for an order that does not exist in the Outbound Summary',
        amount: r.total || 0, isOvercharge: true, location: `${r.city || ''}, ${r.state || ''} ${r.zip || ''}`, zone: r.zone, service: r.service });
    }
  });

  allTxns.forEach((t) => {
    if (t.item && t.item.toLowerCase().includes('adjusted') && t.charge > 0) {
      findings.push({ id: 'ADJUP-' + t.order + '-' + Math.random().toString(36).slice(2, 6), category: 'post_bill_increase', order: String(t.order), label: 'Overcharge',
        description: `Charge was increased by ${fmt(t.charge)} after the original invoice was issued`, amount: t.charge, isOvercharge: true });
    }
    if (t.item && t.item.toLowerCase().includes('adjusted') && t.charge < 0) {
      findings.push({ id: 'ADJDN-' + t.order + '-' + Math.random().toString(36).slice(2, 6), category: 'post_bill_credit', order: String(t.order), label: 'Credit',
        description: `A credit of ${fmt(Math.abs(t.charge))} was applied after the original invoice`, amount: t.charge, isOvercharge: false });
    }
  });

  // OPTIMIZATION
  const ruralTypes = ['DAS', 'EDAS', 'RDAS', 'RESIDENTIAL', 'RESIDENTIAL EXPRESS'];
  allB.forEach((r) => {
    const hits = r.surcharges.filter((s) => ruralTypes.includes(s.type));
    if (hits.length > 0) {
      findings.push({ id: 'DAS-' + r.order, category: 'delivery_surcharge', order: String(r.order), label: 'Surcharge',
        description: 'Carrier delivery area surcharge: ' + hits.map((h) => `${h.type} (${fmt(h.charge)})`).join(', '),
        amount: hits.reduce((a, s) => a + s.charge, 0), isOvercharge: false,
        location: `${r.city || ''}, ${r.state || ''} ${r.zip || ''}`, zone: r.zone, service: r.service, surcharges: r.surcharges });
    }
    const peaks = r.surcharges.filter((s) => s.type && s.type.includes('PEAK'));
    if (peaks.length > 0) {
      findings.push({ id: 'PEAK-' + r.order, category: 'peak_surcharge', order: String(r.order), label: 'Surcharge',
        description: 'Peak season surcharge: ' + peaks.map((h) => `${h.type} (${fmt(h.charge)})`).join(', '),
        amount: peaks.reduce((a, s) => a + s.charge, 0), isOvercharge: false, location: r.state || '' });
    }
    if (r.billWtType === 'Dimensional' && r.actualWt && r.billWt && r.billWt > r.actualWt * 2) {
      findings.push({ id: 'DIM-' + r.order, category: 'dim_weight', order: String(r.order), label: 'Review',
        description: `Billed at ${r.billWt}lb (dimensional) but actual weight is only ${r.actualWt}lb — smaller packaging could reduce this`,
        amount: 0, isOvercharge: false });
    }
  });

  // INFORMATIONAL
  (wh.inbound || []).forEach((r) => {
    if (r.discrepancy && r.discrepancy !== 0) {
      findings.push({ id: 'IB-' + r.order + '-' + r.sku, category: 'inbound_discrepancy', order: String(r.order),
        label: r.discrepancy < 0 ? 'Short' : 'Over',
        description: `SKU ${r.sku}: Expected ${r.expected} units, received ${r.received} (${r.discrepancy > 0 ? '+' : ''}${r.discrepancy} units)`,
        amount: 0, isOvercharge: false });
    }
  });

  // Summaries
  const catSummary = {};
  findings.forEach((f) => {
    if (!catSummary[f.category]) catSummary[f.category] = { key: f.category, count: 0, overcharges: 0, credits: 0, neutral: 0 };
    catSummary[f.category].count++;
    if (f.isOvercharge) catSummary[f.category].overcharges += Math.abs(f.amount);
    else if (f.amount < 0) catSummary[f.category].credits += Math.abs(f.amount);
    else catSummary[f.category].neutral += Math.abs(f.amount);
  });

  const totalOvercharges = findings.filter((f) => f.isOvercharge).reduce((s, f) => s + Math.abs(f.amount), 0);
  const totalCredits = findings.filter((f) => !f.isOvercharge && f.amount < 0).reduce((s, f) => s + Math.abs(f.amount), 0);
  const totalParcel = allB.reduce((s, r) => s + (r.total || 0), 0);
  const totalWarehouse = rateCard.reduce((s, r) => s + r.billed, 0);

  return {
    findings, rateCard, catDefs: CATEGORY_DEFS, catSummary,
    totalOvercharges, totalCredits, netImpact: totalOvercharges - totalCredits,
    totalOrders: ob.length, totalShipments: allB.length,
    totalParcel, totalWarehouse,
    shippingCPO: ob.length > 0 ? totalParcel / ob.length : 0,
    allInCPO: ob.length > 0 ? (totalParcel + totalWarehouse) / ob.length : 0,
  };
}
