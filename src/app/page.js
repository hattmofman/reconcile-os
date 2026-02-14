'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function LandingPage() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => { if (data?.user) setUser(data.user); });
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-sm">R</div>
          <span className="text-lg font-extrabold text-white tracking-tight">Reconcile<span className="text-blue-400">OS</span></span>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <Link href="/dashboard" className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white transition">Log In</Link>
              <Link href="/signup" className="px-5 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition">
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-block px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6">
          3PL Invoice Reconciliation
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Stop overpaying<br />your 3PL.
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your warehouse billing and parcel files. ReconcileOS automatically matches invoices against rate cards, flags overcharges, and pinpoints every discrepancy — down to the order level.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className="px-8 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base hover:bg-blue-600 transition shadow-lg shadow-blue-500/25">
            Start Your First Audit →
          </Link>
          <Link href="#how-it-works" className="px-8 py-3.5 rounded-xl border border-gray-700 text-gray-300 font-semibold text-base hover:border-gray-500 transition">
            See How It Works
          </Link>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-gray-800 py-8">
        <div className="max-w-4xl mx-auto px-8 grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-extrabold text-white font-mono">$2,757</div>
            <div className="text-sm text-gray-500 mt-1">Discrepancies found in first Kaged audit</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono">3,299</div>
            <div className="text-sm text-gray-500 mt-1">Orders reconciled in under 10 seconds</div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-white font-mono">15+</div>
            <div className="text-sm text-gray-500 mt-1">Billing line items verified against rate card</div>
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">The Problem</div>
            <h2 className="text-2xl font-bold text-white mb-4">3PL invoices are complex by design.</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Your 3PL sends you a monthly EOM report with dozens of billing lines — pick and pack fees, storage, VAS labor, materials, software fees — each with different rates and units of measure.
              </p>
              <p>
                On top of that, you get weekly parcel transaction files with thousands of shipment-level charges, surcharges stacked on surcharges, and post-billing adjustments that change after the fact.
              </p>
              <p>
                Most brands just pay the invoice. The ones that audit manually spend days in spreadsheets. Either way, overcharges slip through.
              </p>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">The Solution</div>
            <h2 className="text-2xl font-bold text-white mb-4">ReconcileOS automates the entire audit.</h2>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>
                Upload your files. ReconcileOS parses every sheet, extracts the rate card, cross-references quantities against actuals, and flags every discrepancy automatically.
              </p>
              <p>
                You get a clear report: confirmed overcharges in red, credits in green, and optimization opportunities in amber. Every finding links to the specific order and explains the issue in plain English.
              </p>
              <p>
                What used to take days now takes seconds. And you catch things manual audits miss — phantom charges, post-billing cost increases, quantity mismatches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-[var(--card)] border-y border-gray-800 py-24">
        <div className="max-w-5xl mx-auto px-8">
          <div className="text-center mb-16">
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">How It Works</div>
            <h2 className="text-3xl font-bold text-white">Three steps. Every discrepancy found.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Your Files', desc: 'Drop in your warehouse EOM billing file and parcel transaction reports. We auto-detect file types and parse every sheet.', icon: '📁' },
              { step: '02', title: 'Automatic 3-Way Match', desc: 'We extract the rate card, verify Rate × Quantity = Billed for every line, cross-reference parcel charges against outbound orders, and flag anomalies.', icon: '🔍' },
              { step: '03', title: 'Get Your Report', desc: 'See every overcharge, credit, and optimization opportunity. Filter by category, click any finding to drill down, export or save for your records.', icon: '📊' },
            ].map((s) => (
              <div key={s.step} className="bg-[var(--bg)] border border-gray-800 rounded-xl p-8">
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className="text-xs font-bold text-blue-400 mb-2">STEP {s.step}</div>
                <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we catch */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center mb-16">
          <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">What We Catch</div>
          <h2 className="text-3xl font-bold text-white">Every type of billing discrepancy.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { icon: '⚠️', title: 'Quantity Mismatches', desc: 'Billed for more units than were actually received or shipped', color: 'red' },
            { icon: '🧮', title: 'Rate Card Math Errors', desc: 'When Rate × Quantity doesn\'t equal the billed amount', color: 'red' },
            { icon: '👻', title: 'Phantom Charges', desc: 'Parcel charges for orders that don\'t exist in your outbound data', color: 'red' },
            { icon: '📈', title: 'Post-Billing Increases', desc: 'Charges quietly added after the original invoice was issued', color: 'red' },
            { icon: '🚚', title: 'Delivery Surcharges', desc: 'DAS, EDAS, RDAS, and residential fees that may be avoidable', color: 'amber' },
            { icon: '📦', title: 'Dim Weight Opportunities', desc: 'Packages billed on dimensional weight where packaging could be optimized', color: 'amber' },
            { icon: '📅', title: 'Peak Surcharges', desc: 'Seasonal carrier surcharges tracked and quantified', color: 'amber' },
            { icon: '📋', title: 'Inbound Discrepancies', desc: 'When received quantities don\'t match what was expected', color: 'blue' },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 p-5 rounded-xl border border-gray-800 bg-[var(--card)]">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--card)] border-t border-gray-800 py-20">
        <div className="max-w-2xl mx-auto px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to audit your 3PL?</h2>
          <p className="text-gray-400 mb-8">Upload your first set of files in under a minute. No credit card required.</p>
          <Link href="/signup" className="inline-block px-8 py-3.5 rounded-xl bg-blue-500 text-white font-bold text-base hover:bg-blue-600 transition shadow-lg shadow-blue-500/25">
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-8 text-center text-sm text-gray-600">
        © 2026 ReconcileOS. Built for brands tired of overpaying their 3PL.
      </footer>
    </div>
  );
}
