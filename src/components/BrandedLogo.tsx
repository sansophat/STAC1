import React from 'react';
import { BrandingConfig } from '../types';
import {
  Rocket,
  Shield,
  TrendingUp,
  Cpu,
  Coins,
  Gem,
  Zap,
  Crown,
  Activity,
} from 'lucide-react';

interface BrandedLogoProps {
  branding: BrandingConfig;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PRESET_ICONS: Record<string, React.FC<{ className?: string }>> = {
  rocket: Rocket,
  shield: Shield,
  trending: TrendingUp,
  cpu: Cpu,
  coins: Coins,
  gem: Gem,
  zap: Zap,
  crown: Crown,
  activity: Activity,
};

export const ACCENT_GRADIENTS: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  cyan: {
    bg: 'from-cyan-400 to-blue-600',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/25',
    border: 'border-cyan-500/40',
  },
  emerald: {
    bg: 'from-emerald-400 to-teal-600',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/25',
    border: 'border-emerald-500/40',
  },
  amber: {
    bg: 'from-amber-400 to-yellow-600',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/25',
    border: 'border-amber-500/40',
  },
  purple: {
    bg: 'from-purple-400 to-indigo-600',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/25',
    border: 'border-purple-500/40',
  },
  rose: {
    bg: 'from-rose-400 to-pink-600',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/25',
    border: 'border-rose-500/40',
  },
  blue: {
    bg: 'from-blue-400 to-cyan-600',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/25',
    border: 'border-blue-500/40',
  },
};

export const BrandedLogo: React.FC<BrandedLogoProps> = ({
  branding,
  className = '',
  size = 'md',
}) => {
  const accent = ACCENT_GRADIENTS[branding.accentColor] || ACCENT_GRADIENTS.cyan;

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-8 h-8 text-xs rounded-xl',
    lg: 'w-12 h-12 text-sm rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  }[size];

  if (branding.logoType === 'image' && branding.logoImage) {
    return (
      <div
        className={`${sizeClasses} overflow-hidden border ${accent.border} shadow-lg ${accent.glow} bg-slate-900 flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <img
          src={branding.logoImage}
          alt={branding.brandName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (branding.logoType === 'text') {
    return (
      <div
        className={`${sizeClasses} bg-gradient-to-br ${accent.bg} flex items-center justify-center text-slate-950 font-black tracking-tight shadow-lg ${accent.glow} flex-shrink-0 ${className}`}
      >
        {branding.logoText || 'SNL'}
      </div>
    );
  }

  const PresetComponent = PRESET_ICONS[branding.logoPreset] || Rocket;

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-br ${accent.bg} flex items-center justify-center text-slate-950 font-bold shadow-lg ${accent.glow} flex-shrink-0 ${className}`}
    >
      <PresetComponent className={iconSizes} />
    </div>
  );
};
