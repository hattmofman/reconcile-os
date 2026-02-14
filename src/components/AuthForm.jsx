'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AuthForm({ mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white font-black text-sm">R</div>
            <span className="text-lg font-extrabold text-white tracking-tight">Reconcile<span className="text-blue-400">OS</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-gray-400 mt-2">
            {isSignup ? 'Start auditing your 3PL invoices in minutes.' : 'Log in to your ReconcileOS dashboard.'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--card)] border border-gray-800 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none transition"
                  placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none transition"
                placeholder="you@company.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-lg bg-[var(--bg)] border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none transition"
                placeholder={isSignup ? 'At least 6 characters' : 'Your password'} />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 text-sm text-red-400">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition disabled:opacity-50">
              {loading ? 'Please wait...' : isSignup ? 'Create Account' : 'Log In'}
            </button>
          </form>
        </div>

        {/* Switch mode */}
        <p className="text-center text-sm text-gray-500 mt-6">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link href={isSignup ? '/login' : '/signup'} className="text-blue-400 hover:text-blue-300 font-semibold">
            {isSignup ? 'Log In' : 'Sign Up'}
          </Link>
        </p>
      </div>
    </div>
  );
}
