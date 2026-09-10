import React, { useState, useRef } from 'react';
import {
  Shield,
  Palette,
  Image as ImageIcon,
  Type,
  Sparkles,
  Save,
  RotateCcw,
  Download,
  Upload,
  Lock,
  CheckCircle2,
  X,
  Building,
  Mail,
  Phone,
  Send,
  Eye,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { BrandingConfig, Translations, AccentColor } from '../types';
import { BrandedLogo, PRESET_ICONS, ACCENT_GRADIENTS } from './BrandedLogo';
import {
  DEFAULT_BRANDING,
  ADMIN_CREDS_STORAGE_KEY,
  DEFAULT_ADMIN_CREDENTIALS,
} from '../utils/branding';
import { safeStorage } from '../utils/safeStorage';

interface AdminBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  branding: BrandingConfig;
  onSaveBranding: (updated: BrandingConfig) => void;
  onResetBranding: () => void;
  onLogout: () => void;
  onExportBackup: () => void;
  onImportBackup: (jsonString: string) => void;
  t: Translations;
}

export const AdminBrandingModal: React.FC<AdminBrandingModalProps> = ({
  isOpen,
  onClose,
  branding,
  onSaveBranding,
  onResetBranding,
  onLogout,
  onExportBackup,
  onImportBackup,
  t,
}) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'security' | 'backup'>('branding');
  const [formConfig, setFormConfig] = useState<BrandingConfig>(branding);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Security password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAccentChange = (accent: AccentColor) => {
    setFormConfig({ ...formConfig, accentColor: accent });
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image file must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormConfig({
        ...formConfig,
        logoType: 'image',
        logoImage: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSaveBranding(formConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setPasswordMsg({ text: 'Password must be at least 4 characters long.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Passwords do not match.', isError: true });
      return;
    }

    const ok = safeStorage.setJSON(ADMIN_CREDS_STORAGE_KEY, { username: 'admin', password: newPassword });
    if (ok) {
      setPasswordMsg({ text: 'Admin password updated successfully!', isError: false });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } else {
      setPasswordMsg({ text: 'Failed to save password.', isError: true });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onImportBackup(content);
    };
    reader.readAsText(file);
  };

  const accentOptions: { id: AccentColor; label: string; colorClass: string }[] = [
    { id: 'cyan', label: 'Cyan Teal', colorClass: 'bg-cyan-400 border-cyan-300' },
    { id: 'emerald', label: 'Emerald Green', colorClass: 'bg-emerald-400 border-emerald-300' },
    { id: 'amber', label: 'Gold Amber', colorClass: 'bg-amber-400 border-amber-300' },
    { id: 'purple', label: 'Cyber Purple', colorClass: 'bg-purple-400 border-purple-300' },
    { id: 'rose', label: 'Rose Pink', colorClass: 'bg-rose-400 border-rose-300' },
    { id: 'blue', label: 'Sapphire Blue', colorClass: 'bg-blue-400 border-blue-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0c111e] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-[#0e1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-bold text-base sm:text-lg text-slate-100">
                  {t.adminTitle}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Logged In (Admin)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Customize identity, logos, system accent colors, and global database backups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLogout}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-rose-300 hover:border-rose-500/40 transition-colors cursor-pointer"
            >
              {t.adminLogout}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#0a0f1c] px-4 sm:px-6">
          {[
            { id: 'branding' as const, label: t.adminBranding, icon: Palette },
            { id: 'security' as const, label: 'Password & Security', icon: Lock },
            { id: 'backup' as const, label: 'Backup & Database', icon: Download },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === id
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'branding' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-5">
                {/* Brand Titles */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">
                      {t.adminBrandName}
                    </label>
                    <input
                      type="text"
                      value={formConfig.brandName}
                      onChange={(e) => setFormConfig({ ...formConfig, brandName: e.target.value })}
                      className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                      placeholder="e.g. SNL AI DCA Future Trade"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">
                      {t.adminBrandSubtitle}
                    </label>
                    <input
                      type="text"
                      value={formConfig.brandSubtitle}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, brandSubtitle: e.target.value })
                      }
                      className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30"
                      placeholder="e.g. Equity Scaling & Gold Pro Formula v4.0"
                    />
                  </div>
                </div>

                {/* Logo Type Selector */}
                <div className="space-y-3 p-4 rounded-xl bg-[#101627] border border-slate-800">
                  <label className="text-xs text-slate-200 font-semibold flex items-center justify-between">
                    <span>{t.adminLogo}</span>
                    <span className="text-[11px] text-slate-400 font-normal">Choose Icon, Text, or Upload</span>
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'preset' as const, label: 'Preset Icon', icon: Sparkles },
                      { type: 'text' as const, label: 'Monogram Text', icon: Type },
                      { type: 'image' as const, label: 'Custom Image', icon: ImageIcon },
                    ].map(({ type, label, icon: Icon }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormConfig({ ...formConfig, logoType: type })}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          formConfig.logoType === type
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Preset Icons Selection */}
                  {formConfig.logoType === 'preset' && (
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-400 block mb-2">Select Icon Preset:</span>
                      <div className="grid grid-cols-5 gap-2">
                        {Object.keys(PRESET_ICONS).map((presetKey) => {
                          const IconComp = PRESET_ICONS[presetKey];
                          const isSelected = formConfig.logoPreset === presetKey;
                          return (
                            <button
                              key={presetKey}
                              type="button"
                              onClick={() =>
                                setFormConfig({ ...formConfig, logoPreset: presetKey })
                              }
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/10'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                              <span className="text-[9px] capitalize">{presetKey}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monogram Text */}
                  {formConfig.logoType === 'text' && (
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-400 block mb-1">
                        Short Logo Monogram (1-4 Characters):
                      </span>
                      <input
                        type="text"
                        maxLength={4}
                        value={formConfig.logoText}
                        onChange={(e) =>
                          setFormConfig({ ...formConfig, logoText: e.target.value.toUpperCase() })
                        }
                        className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold tracking-widest text-cyan-300 focus:outline-none focus:border-cyan-500"
                        placeholder="e.g. SNL"
                      />
                    </div>
                  )}

                  {/* Custom Image Upload & URL */}
                  {formConfig.logoType === 'image' && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 py-2 px-3.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition-all cursor-pointer shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Image File (PNG/JPG/SVG)</span>
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImageFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        {formConfig.logoImage && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormConfig({ ...formConfig, logoImage: '', logoType: 'preset' })
                            }
                            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                            title="Remove uploaded image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1">Or Direct Image URL:</span>
                        <input
                          type="url"
                          value={formConfig.logoImage}
                          onChange={(e) =>
                            setFormConfig({ ...formConfig, logoImage: e.target.value })
                          }
                          className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Accent Color Selection */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">
                    {t.adminAccentColor}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {accentOptions.map((opt) => {
                      const isSelected = formConfig.accentColor === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAccentChange(opt.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 border-cyan-400 text-slate-100 shadow-sm'
                              : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className={`w-3 h-3 rounded-full border ${opt.colorClass} flex-shrink-0`}
                          />
                          <span className="text-[11px] truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Organization Details & Footer */}
                <div className="space-y-3 p-4 rounded-xl bg-[#101627] border border-slate-800">
                  <span className="text-xs text-slate-200 font-semibold block">
                    Company Info & PDF Report Headers
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={formConfig.contactEmail}
                        onChange={(e) =>
                          setFormConfig({ ...formConfig, contactEmail: e.target.value })
                        }
                        className="w-full bg-[#111726] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Phone / WhatsApp</label>
                      <input
                        type="text"
                        value={formConfig.contactPhone}
                        onChange={(e) =>
                          setFormConfig({ ...formConfig, contactPhone: e.target.value })
                        }
                        className="w-full bg-[#111726] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Telegram / Bot Link</label>
                    <input
                      type="text"
                      value={formConfig.telegram}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, telegram: e.target.value })
                      }
                      className="w-full bg-[#111726] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">{t.adminCompanyFooter}</label>
                    <input
                      type="text"
                      value={formConfig.companyFooter}
                      onChange={(e) =>
                        setFormConfig({ ...formConfig, companyFooter: e.target.value })
                      }
                      className="w-full bg-[#111726] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Real-Time Preview Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-0 space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#11182c] to-[#0a0f1d] border border-slate-800 shadow-xl space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
                      <span className="flex items-center gap-1.5 font-medium text-slate-200">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        Live UI Preview
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300 uppercase">
                        Theme: {formConfig.accentColor}
                      </span>
                    </div>

                    {/* Simulated Header Banner */}
                    <div className="p-3 rounded-xl bg-[#0c111e] border border-slate-800 flex items-center gap-3">
                      <BrandedLogo branding={formConfig} size="md" />
                      <div className="overflow-hidden">
                        <div className="font-heading font-bold text-xs text-slate-100 truncate">
                          {formConfig.brandName || 'My Brand Name'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {formConfig.brandSubtitle || 'Trading Platform'}
                        </div>
                      </div>
                    </div>

                    {/* Simulated Report Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>PDF Report Watermark</span>
                        <span className="font-mono text-emerald-400">Verified</span>
                      </div>
                      <div className="font-semibold text-slate-200">
                        {formConfig.brandName}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {formConfig.disclaimer || DEFAULT_BRANDING.disclaimer}
                      </div>
                      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                        <span>{formConfig.contactPhone}</span>
                        <span>{formConfig.contactEmail}</span>
                      </div>
                    </div>

                    {/* Footer Preview */}
                    <div className="text-[10px] text-slate-500 text-center font-mono border-t border-slate-800/80 pt-2">
                      {formConfig.companyFooter}
                    </div>
                  </div>

                  {/* Actions Button */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savedSuccess ? 'Branding Saved & Applied!' : t.adminSave}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Reset branding back to system factory defaults?')) {
                          setFormConfig(DEFAULT_BRANDING);
                          onResetBranding();
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.adminReset}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-md mx-auto space-y-6 py-4">
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Admin Credentials Security</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Update the default password (<strong className="font-mono text-cyan-200">admin123</strong>) to protect your settings and investor archives.
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passwordMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      passwordMsg.isError
                        ? 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                        : 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passwordMsg.text}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-300 block mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="Enter new password (min 4 chars)"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-[#111726] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
                    placeholder="Repeat new password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Update Admin Password</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Backup Card */}
                <div className="p-5 rounded-2xl bg-[#101627] border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Download className="w-4 h-4" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-slate-100">
                      {t.adminBackup}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Download a complete JSON backup containing all Investors, Real Trade Logs, Simulation Archive, Simulator Memory, and Custom Branding settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Complete Backup (.json)</span>
                  </button>
                </div>

                {/* Import Backup Card */}
                <div className="p-5 rounded-2xl bg-[#101627] border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Upload className="w-4 h-4" />
                    </div>
                    <h3 className="font-heading font-semibold text-sm text-slate-100">
                      {t.adminRestore}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Restore application state from an existing JSON backup file. This will safely populate all saved profiles, trades, and simulator memories.
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={backupFileInputRef}
                      onChange={handleImportFile}
                      accept=".json,application/json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => backupFileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all cursor-pointer shadow-md shadow-purple-500/20"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Select JSON Backup to Restore</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
