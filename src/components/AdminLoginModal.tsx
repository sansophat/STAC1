import React, { useState } from 'react';
import { Lock, Shield, Eye, EyeOff, X, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { Translations } from '../types';
import { DEFAULT_ADMIN_CREDENTIALS, ADMIN_CREDS_STORAGE_KEY } from '../utils/branding';
import { safeStorage } from '../utils/safeStorage';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  t: Translations;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  t,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Retrieve current credentials from storage or defaults
    const currentCreds = safeStorage.getJSON(ADMIN_CREDS_STORAGE_KEY, DEFAULT_ADMIN_CREDENTIALS);

    setTimeout(() => {
      if (
        username.trim() === currentCreds.username &&
        password.trim() === currentCreds.password
      ) {
        setIsLoading(false);
        onLoginSuccess();
        onClose();
      } else {
        setIsLoading(false);
        setError('Invalid username or password. Default is admin / admin123');
      }
    }, 250);
  };

  const handleQuickFill = () => {
    const currentCreds = safeStorage.getJSON(ADMIN_CREDS_STORAGE_KEY, DEFAULT_ADMIN_CREDENTIALS);
    setUsername(currentCreds.username);
    setPassword(currentCreds.password);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c111e] p-6 shadow-2xl shadow-cyan-500/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-100">
              {t.adminLogin}
            </h2>
            <p className="text-xs text-slate-400">
              Access branding settings, system backups, and manager controls
            </p>
          </div>
        </div>

        {/* Quick Credentials Banner */}
        <div className="mb-4 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-cyan-300">
            <KeyRound className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              Default: <strong className="font-mono text-cyan-200">admin</strong> / <strong className="font-mono text-cyan-200">admin123</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="text-[10px] font-medium px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
          >
            Auto-fill
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Admin Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              placeholder="e.g. admin"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Login to Admin Panel</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
