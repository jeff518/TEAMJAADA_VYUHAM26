import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('security.lead@securedoc.internal');
  const [password, setPassword] = useState('SecurePass2026!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const success = await login(email, password, rememberMe);
      if (success) {
        navigate('/');
      } else {
        setErrorMsg('Invalid email or password credentials. Please retry.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SecurePass2026!');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 items-center justify-center text-white shadow-xl shadow-brand-500/20 mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">SecureDoc Pipeline</h2>
          <p className="text-xs text-slate-400 font-mono mt-1 tracking-wider uppercase">
            Zero-Trust Document Verification Platform
          </p>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-850 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-brand-600 focus:ring-brand-500/30"
              />
              <span>Remember session</span>
            </label>
            <span className="text-slate-500 font-mono text-[11px]">JWT Auth Mode</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Pipeline</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-mono uppercase tracking-wider text-slate-400 text-center mb-3">
            Quick Demo Persona Fill
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => handleQuickLogin('security.lead@securedoc.internal')}
              className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors text-center"
            >
              👑 SecOps Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('auditor@securedoc.internal')}
              className="p-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors text-center"
            >
              🔍 Compliance Auditor
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400 font-mono">
        Zero-Trust Architecture • ClamAV • Sandbox Isolation • Gemini 1.5 Vision
      </div>
    </div>
  );
};
