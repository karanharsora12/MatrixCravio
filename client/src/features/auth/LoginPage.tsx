import React, { useState } from 'react';
import { useAuthStore } from './AuthStore.js';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { QrCode, Lock, Mail, Sparkles, ChefHat, UserCheck, ShieldCheck, CreditCard } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const [email, setEmail] = useState('karan@craviobistro.com');
  const [password, setPassword] = useState('cravio123');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  // Demo 1-click presets
  const presets = [
    { label: 'Restaurant Owner', email: 'karan@craviobistro.com', pass: 'cravio123', icon: ShieldCheck },
    { label: 'Floor Manager', email: 'priya@craviobistro.com', pass: 'manager123', icon: UserCheck },
    { label: 'Head Chef (KDS)', email: 'chef.raj@craviobistro.com', pass: 'chef123', icon: ChefHat },
    { label: 'Table Waiter', email: 'waiter.arun@craviobistro.com', pass: 'waiter123', icon: Sparkles },
    { label: 'Billing Cashier', email: 'cashier.neha@craviobistro.com', pass: 'cashier123', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 font-sans selection:bg-primary/20">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25">
            <QrCode className="h-9 w-9" />
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-foreground">Matrix Cravio</h1>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest font-display">
            Scan. Crave. Enjoy.
          </p>
          <p className="text-sm text-muted-foreground">Sign in to your restaurant management dashboard</p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-7 shadow-xl shadow-black/5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Staff Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. karan@craviobistro.com"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-bold shadow-md shadow-primary/20" isLoading={isLoading}>
              Sign In to Dashboard
            </Button>
          </form>

          {/* Quick 1-Click Role Logins */}
          <div className="border-t border-border/50 pt-4 space-y-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
              Quick 1-Click Demo Logins
            </span>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setEmail(p.email);
                      setPassword(p.pass);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl border border-border/60 hover:bg-muted/50 text-left text-xs transition-all text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate font-medium">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Customer Demo Link */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate('/menu/crv_tok_table_01_window')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Looking for Customer Table Portal? Test Table 1 Scan →
          </button>
        </div>
      </div>
    </div>
  );
};
