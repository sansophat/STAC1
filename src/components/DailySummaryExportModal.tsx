import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Trade, Investor, BrandingConfig, Translations } from '../types';
import {
  X,
  FileText,
  FileImage,
  Copy,
  Check,
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Share2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  MessageSquare,
  ShieldCheck,
  Award,
  Layers,
} from 'lucide-react';
import { toJpeg, toBlob } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { BrandedLogo } from './BrandedLogo';

interface DailySummaryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  investors: Investor[];
  initialDate?: string;
  initialAccount?: string;
  branding?: BrandingConfig;
  t: Translations;
}

const getTodayDateStr = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const DailySummaryExportModal: React.FC<DailySummaryExportModalProps> = ({
  isOpen,
  onClose,
  trades,
  investors,
  initialDate,
  initialAccount = 'all',
  branding,
  t,
}) => {
  const isKm = t.langToggle === 'English';
  const reportRef = useRef<HTMLDivElement>(null);

  // Distinct dates in trades list, sorted newest first
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((tr) => {
      if (tr.trade_date) set.add(tr.trade_date);
    });
    const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
    if (arr.length === 0) arr.push(getTodayDateStr());
    return arr;
  }, [trades]);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return initialDate || availableDates[0] || getTodayDateStr();
  });

  const [selectedAccount, setSelectedAccount] = useState<string>(initialAccount || 'all');
  const [includeTradesList, setIncludeTradesList] = useState<boolean>(true);
  const [includeTeamNote, setIncludeTeamNote] = useState<boolean>(true);
  const [teamNote, setTeamNote] = useState<string>(
    isKm
      ? 'សម្រេចបានគោលដៅហានិភ័យប្រចាំថ្ងៃ។ រាល់ទីតាំងបញ្ជាទិញត្រូវបានបិទដោយសុវត្ថិភាពជាមួយ Stop-Loss យ៉ាងម៉ត់ចត់។'
      : 'Daily risk target achieved. All positions closed with strict stop-loss adherence.'
  );
  const [reportTitle, setReportTitle] = useState<string>(
    isKm ? 'របាយការណ៍លទ្ធផលជួញដូរប្រចាំថ្ងៃ' : 'DAILY TRADING PERFORMANCE REPORT'
  );

  // Update default note and title if language switches
  useEffect(() => {
    if (isKm) {
      if (teamNote === 'Daily risk target achieved. All positions closed with strict stop-loss adherence.') {
        setTeamNote('សម្រេចបានគោលដៅហានិភ័យប្រចាំថ្ងៃ។ រាល់ទីតាំងបញ្ជាទិញត្រូវបានបិទដោយសុវត្ថិភាពជាមួយ Stop-Loss យ៉ាងម៉ត់ចត់។');
      }
      if (reportTitle === 'DAILY TRADING PERFORMANCE REPORT') {
        setReportTitle('របាយការណ៍លទ្ធផលជួញដូរប្រចាំថ្ងៃ');
      }
    } else {
      if (teamNote === 'សម្រេចបានគោលដៅហានិភ័យប្រចាំថ្ងៃ។ រាល់ទីតាំងបញ្ជាទិញត្រូវបានបិទដោយសុវត្ថិភាពជាមួយ Stop-Loss យ៉ាងម៉ត់ចត់។') {
        setTeamNote('Daily risk target achieved. All positions closed with strict stop-loss adherence.');
      }
      if (reportTitle === 'របាយការណ៍លទ្ធផលជួញដូរប្រចាំថ្ងៃ') {
        setReportTitle('DAILY TRADING PERFORMANCE REPORT');
      }
    }
  }, [isKm]);

  // Loading & Toast States
  const [isExportingJPG, setIsExportingJPG] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isCopying, setIsCopying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Switch to previous / next date
  const handlePrevDate = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx < availableDates.length - 1) {
      setSelectedDate(availableDates[idx + 1]);
    }
  };

  const handleNextDate = () => {
    const idx = availableDates.indexOf(selectedDate);
    if (idx > 0) {
      setSelectedDate(availableDates[idx - 1]);
    }
  };

  // Compute daily metrics for selectedDate & selectedAccount
  const dailyMetrics = useMemo(() => {
    const filteredTrades = trades.filter((tr) => {
      const matchDate = tr.trade_date === selectedDate;
      const matchAcc = selectedAccount === 'all' || tr.investor_name === selectedAccount;
      return matchDate && matchAcc;
    });

    // Chronological order for intra-day progression
    const sorted = [...filteredTrades].sort((a, b) => {
      return (new Date(a.created_at || '').getTime() || 0) - (new Date(b.created_at || '').getTime() || 0);
    });

    let totalProfitNative = 0;
    let totalProfitUSD = 0;
    let totalLots = 0;
    let totalWithdrawnNative = 0;
    let totalWithdrawnUSD = 0;
    let totalReinvestNative = 0;
    let totalReinvestUSD = 0;

    let startEquity = 0;
    let endEquity = 0;
    let startEquityUSD = 0;
    let endEquityUSD = 0;

    const isCentAccount = selectedAccount !== 'all' && investors.find(i => i.name === selectedAccount)?.currency === 'USC';

    sorted.forEach((tr, index) => {
      const isCent = tr.currency === 'USC';
      const pAmt = tr.profit_amount || 0;
      const wAmt = tr.withdraw || 0;
      const rAmt = tr.reinvest || 0;

      totalProfitNative += pAmt;
      totalProfitUSD += isCent ? pAmt / 100 : pAmt;

      totalWithdrawnNative += wAmt;
      totalWithdrawnUSD += isCent ? wAmt / 100 : wAmt;

      totalReinvestNative += rAmt;
      totalReinvestUSD += isCent ? rAmt / 100 : rAmt;

      totalLots += tr.lot_size || 0;

      if (index === 0) {
        startEquity = tr.start_equity;
        startEquityUSD = isCent ? tr.start_equity / 100 : tr.start_equity;
      }
      if (index === sorted.length - 1) {
        endEquity = tr.end_equity;
        endEquityUSD = isCent ? tr.end_equity / 100 : tr.end_equity;
      }
    });

    const gainPct = startEquity > 0 ? (totalProfitNative / startEquity) * 100 : 0;
    const isWin = totalProfitNative > 0;
    const isLoss = totalProfitNative < 0;

    // Date formatting (Khmer vs English)
    const KM_DAYS = ['ថ្ងៃអាទិត្យ', 'ថ្ងៃចន្ទ', 'ថ្ងៃអង្គារ', 'ថ្ងៃពុធ', 'ថ្ងៃព្រហស្បតិ៍', 'ថ្ងៃសុក្រ', 'ថ្ងៃសៅរ៍'];
    const parts = selectedDate.split('-');
    let dayOfWeekStr = '';
    let formattedDate = selectedDate;

    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        dayOfWeekStr = isKm ? KM_DAYS[d.getDay()] : d.toLocaleDateString('en-US', { weekday: 'long' });
        formattedDate = isKm
          ? `${parts[2]}/${parts[1]}/${parts[0]}`
          : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }

    return {
      trades: sorted,
      tradeCount: sorted.length,
      totalProfitNative,
      totalProfitUSD,
      totalLots,
      totalWithdrawnNative,
      totalWithdrawnUSD,
      totalReinvestNative,
      totalReinvestUSD,
      startEquity,
      endEquity,
      startEquityUSD,
      endEquityUSD,
      gainPct,
      isWin,
      isLoss,
      isCentAccount,
      dayOfWeekStr,
      formattedDate,
    };
  }, [trades, investors, selectedDate, selectedAccount, isKm]);

  // Export to JPG
  const handleDownloadJPG = async () => {
    if (!reportRef.current) return;
    setIsExportingJPG(true);
    try {
      const dataUrl = await toJpeg(reportRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        backgroundColor: '#080c14',
        cacheBust: true,
      });

      const sanitizedAcc = selectedAccount.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Daily_Summary_${selectedDate}_${sanitizedAcc}.jpg`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      showToast(t.toastJpgSuccess || 'JPG daily summary downloaded successfully!');
    } catch (err: any) {
      console.error('Error generating JPG summary:', err);
      showToast(isKm ? 'មិនអាចនាំចេញ JPG បានទេ។ សូមព្យាយាមម្តងទៀត។' : 'Failed to export JPG. Please try again.');
    } finally {
      setIsExportingJPG(false);
    }
  };

  // Export to PDF
  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExportingPDF(true);
    try {
      const dataUrl = await toJpeg(reportRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        backgroundColor: '#080c14',
        cacheBust: true,
      });

      const nodeWidth = reportRef.current.offsetWidth;
      const nodeHeight = reportRef.current.offsetHeight;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const printWidth = pageWidth - margin * 2;
      const printHeight = (nodeHeight * printWidth) / nodeWidth;

      pdf.setFillColor(8, 12, 20);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      if (printHeight <= pageHeight - margin * 2) {
        const yOffset = (pageHeight - printHeight) / 2;
        pdf.addImage(dataUrl, 'JPEG', margin, yOffset, printWidth, printHeight);
      } else {
        pdf.addImage(dataUrl, 'JPEG', margin, margin, printWidth, Math.min(printHeight, pageHeight - margin * 2));
      }

      const sanitizedAcc = selectedAccount.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Daily_Summary_${selectedDate}_${sanitizedAcc}.pdf`;
      pdf.save(filename);

      showToast(t.toastPdfSuccess || 'PDF daily report downloaded successfully!');
    } catch (err: any) {
      console.error('Error generating PDF summary:', err);
      showToast(isKm ? 'មិនអាចនាំចេញ PDF បានទេ។ សូមព្យាយាមម្តងទៀត។' : 'Failed to export PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Copy to Clipboard
  const handleCopyImage = async () => {
    if (!reportRef.current) return;
    setIsCopying(true);
    try {
      const blob = await toBlob(reportRef.current, {
        pixelRatio: 2,
        backgroundColor: '#080c14',
      });

      if (!blob) throw new Error('Could not create image blob');

      if (navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast(t.toastCopySuccess || 'Image copied to clipboard! Paste directly into Telegram or chat.');
      } else {
        const link = document.createElement('a');
        link.download = `Daily_Summary_${selectedDate}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showToast(isKm ? 'បានទាញយករូបភាពដោយសារកម្មវិធីរុករកមិនគាំទ្រ Clipboard' : 'Clipboard API restricted; image downloaded instead.');
      }
    } catch (err: any) {
      console.error('Clipboard copy error:', err);
      showToast(isKm ? 'មិនអាចចម្លងទៅ Clipboard បានទេ។ សូមចុចទាញយក JPG ជំនួសវិញ។' : 'Could not copy to clipboard. Use Download JPG instead.');
    } finally {
      setIsCopying(false);
    }
  };

  if (!isOpen) return null;

  const brandName = branding?.brandName || (isKm ? 'SNL AI DCA Future Trade' : 'SNL AI DCA Future Trade');
  const brandSub = branding?.brandSubtitle || (isKm ? 'សង្ខេបការជួញដូរប្រចាំថ្ងៃ & ម៉ាស៊ីនពង្រីកទុន' : 'Daily Trade Summary & Equity Scaling Engine');
  const isCent = dailyMetrics.isCentAccount;
  const unit = isCent ? (isKm ? '¢ សេន (USC)' : '¢ USC') : (isKm ? '$ ដុល្លារ (USD)' : '$ USD');
  const sym = isCent ? '¢' : '$';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#0b101c] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0e1526]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>{t.dailySummaryModalTitle || 'Daily Summary Export'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium">
                  {isKm ? 'គាំទ្រ JPG & PDF' : 'JPG & PDF Ready'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {t.dailySummaryModalSubtitle || 'Generate clean, high-resolution performance briefings to share with your trading team'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Controls & Card Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Controls Bar: Date, Investor, Note Customizer */}
          <div className="bg-[#0f172a]/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Date Selector with Previous/Next controls */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t.lblTradingDate || 'Trading Date'}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevDate}
                      disabled={availableDates.indexOf(selectedDate) >= availableDates.length - 1}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                      title={isKm ? 'កាលបរិច្ឆេទមុន' : 'Previous trading date'}
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextDate}
                      disabled={availableDates.indexOf(selectedDate) <= 0}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                      title={isKm ? 'កាលបរិច្ឆេទបន្ទាប់' : 'Next trading date'}
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#111a2e] border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {availableDates.map((dateStr) => {
                    const count = trades.filter((tr) => tr.trade_date === dateStr).length;
                    return (
                      <option key={dateStr} value={dateStr}>
                        {dateStr} ({count} {isKm ? 'ប្រតិបត្តិការ' : (count !== 1 ? 'trades' : 'trade')})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Investor / Account Filter */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.lblAccountFilter || 'Account Filter'}</span>
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full bg-[#111a2e] border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value="all">{t.allAccountsTeam || 'All Accounts (Consolidated Team)'}</option>
                  {investors.map((inv) => (
                    <option key={inv.id} value={inv.name}>
                      {inv.name} ({inv.currency || 'USD'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Report Title */}
              <div className="space-y-1">
                <label className="text-slate-400 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.lblReportTitle || 'Report Title'}</span>
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={isKm ? 'ចំណងជើងរបាយការណ៍...' : 'e.g. DAILY PERFORMANCE REPORT'}
                  className="w-full bg-[#111a2e] border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Display Options Checkboxes */}
              <div className="space-y-1.5 pt-4">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={includeTradesList}
                    onChange={(e) => setIncludeTradesList(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>{t.chkShowExecutions || 'Show Individual Executions'}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={includeTeamNote}
                    onChange={(e) => setIncludeTeamNote(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>{t.chkIncludeNote || 'Include Team Note Message'}</span>
                </label>
              </div>
            </div>

            {/* Custom Team Note input */}
            {includeTeamNote && (
              <div className="space-y-1 pt-1">
                <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.lblTeamMessage || 'Message for Team (Included on JPG & PDF)'}</span>
                </label>
                <input
                  type="text"
                  value={teamNote}
                  onChange={(e) => setTeamNote(e.target.value)}
                  placeholder={isKm ? 'បញ្ចូលសារកំណត់សម្គាល់ជូនក្រុម...' : 'e.g. Target reached smoothly today with 0% drawdown. All positions safely closed.'}
                  className="w-full bg-[#111a2e] border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          {/* Card Live Preview Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.livePreview || 'Live Preview (Exact Export Render)'}</span>
              </span>
              <span className="text-[11px] text-slate-500">
                {t.retinaResolution || 'Optimized 2.5x Retina Resolution for Telegram & WhatsApp'}
              </span>
            </div>

            {/* THE VISUAL REPORT CARD — CAPTURED BY html-to-image */}
            <div className="overflow-x-auto pb-2 flex justify-center">
              <div
                ref={reportRef}
                id="daily-summary-report-card"
                className="w-full max-w-[760px] bg-[#070b14] text-slate-100 rounded-3xl p-6 sm:p-8 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 relative overflow-hidden"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 100% 0%, rgba(6, 182, 212, 0.08) 0%, transparent 40%), radial-gradient(circle at 0% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 40%)',
                }}
              >
                {/* Header with Branding & Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
                  <div className="flex items-center gap-3">
                    {branding && <BrandedLogo branding={branding} size="md" />}
                    <div>
                      <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold font-mono flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{brandName}</span>
                      </div>
                      <h1 className="text-lg sm:text-xl font-bold font-heading text-slate-100 tracking-tight mt-0.5">
                        {reportTitle}
                      </h1>
                      <div className="text-xs text-slate-400 font-sans">{brandSub}</div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t.officialAudit || 'OFFICIAL AUDIT'}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-300 font-semibold mt-1">
                      {dailyMetrics.dayOfWeekStr}, {dailyMetrics.formattedDate}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {selectedAccount === 'all'
                        ? (isKm ? 'គណនីវិនិយោគិនទាំងអស់សរុប' : 'All Investors Consolidated')
                        : `${isKm ? 'គណនី' : 'Account'}: ${selectedAccount} (${isCent ? 'USC' : 'USD'})`}
                    </div>
                  </div>
                </div>

                {/* Hero Metric Banner */}
                <div className="my-6 p-5 rounded-2xl bg-[#0d1424] border border-slate-800 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      {t.netDayProfitLoss || 'Net Day Profit / Loss'}
                    </div>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span
                        className={`text-3xl sm:text-4xl font-mono font-extrabold tracking-tight ${
                          dailyMetrics.isWin
                            ? 'text-emerald-400'
                            : dailyMetrics.isLoss
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {dailyMetrics.totalProfitNative >= 0 ? '+' : ''}
                        {sym}
                        {dailyMetrics.totalProfitNative.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        <span className="text-sm font-sans font-medium text-slate-400">{unit}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                          dailyMetrics.gainPct >= 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {dailyMetrics.gainPct >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {dailyMetrics.gainPct >= 0 ? '+' : ''}
                          {dailyMetrics.gainPct.toFixed(2)}%
                        </span>
                      </span>
                    </div>

                    {isCent && (
                      <div className="text-xs text-slate-400 mt-1 font-mono">
                        ≈ {dailyMetrics.totalProfitUSD >= 0 ? '+' : ''}$
                        {dailyMetrics.totalProfitUSD.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        {isKm ? 'សមមូល USD' : 'USD equivalent'}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wide uppercase shadow-sm ${
                        dailyMetrics.isWin
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                          : dailyMetrics.isLoss
                          ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {dailyMetrics.isWin
                        ? (isKm
                            ? `ថ្ងៃចំណេញ (${dailyMetrics.tradeCount} ប្រតិបត្តិការ)`
                            : `WIN DAY (${dailyMetrics.tradeCount} Trades)`)
                        : dailyMetrics.isLoss
                        ? (isKm
                            ? `ថ្ងៃខាត (${dailyMetrics.tradeCount} ប្រតិបត្តិការ)`
                            : `LOSS DAY (${dailyMetrics.tradeCount} Trades)`)
                        : (isKm ? 'ស្មើដើម (BREAKEVEN)' : 'BREAKEVEN')}
                    </span>
                  </div>
                </div>

                {/* 6 Key Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.openingEquity || 'Opening Equity'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-200 mt-0.5">
                      {sym}{dailyMetrics.startEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {isCent && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        ≈ ${(dailyMetrics.startEquityUSD).toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.closingEquityCard || 'Closing Equity'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-cyan-300 mt-0.5">
                      {sym}{dailyMetrics.endEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    {isCent && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        ≈ ${(dailyMetrics.endEquityUSD).toFixed(2)} USD
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.totalExecutions || 'Total Executions'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-slate-200 mt-0.5">
                      {dailyMetrics.tradeCount} {isKm ? 'ប្រតិបត្តិការ' : (dailyMetrics.tradeCount !== 1 ? 'orders' : 'order')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {dailyMetrics.totalLots.toFixed(2)} {isKm ? 'Lot សរុប' : 'total lots'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.reinvestedIntoBalance || 'Reinvested Into Balance'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-emerald-400 mt-0.5">
                      {sym}{dailyMetrics.totalReinvestNative.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.withdrawnBanked || 'Withdrawn / Banked'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-cyan-400 mt-0.5">
                      {sym}{dailyMetrics.totalWithdrawnNative.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase font-medium">
                      {t.performanceGrade || 'Performance Grade'}
                    </div>
                    <div className="text-sm sm:text-base font-bold font-mono text-purple-300 mt-0.5 flex items-center gap-1">
                      <Award className="w-4 h-4 text-purple-400" />
                      <span>
                        {dailyMetrics.gainPct >= 1
                          ? (isKm ? 'A+ ល្អឥតខ្ចោះ' : 'A+ Elite')
                          : dailyMetrics.gainPct >= 0
                          ? (isKm ? 'A សម្រេចគោលដៅ' : 'A Target Met')
                          : (isKm ? 'គ្រប់គ្រងហានិភ័យ' : 'Protected')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Intra-day Trade Breakdown Table */}
                {includeTradesList && dailyMetrics.trades.length > 0 && (
                  <div className="my-5 border border-slate-800/90 rounded-2xl overflow-hidden bg-[#0c1322]">
                    <div className="px-4 py-2.5 bg-[#0e172a] border-b border-slate-800/90 flex items-center justify-between text-xs text-slate-300">
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t.intraDayLog || 'Intra-Day Executions Log'} ({dailyMetrics.trades.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {isKm ? 'យុទ្ធសាស្ត្រមាស XAUUSD & Futures' : 'XAUUSD / Gold Futures Strategy'}
                      </span>
                    </div>

                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800/70 text-[10px] uppercase text-slate-400 bg-[#0a0f1c]/80 font-semibold font-mono">
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">{t.colInvestor || 'Investor / Account'}</th>
                          <th className="py-2 px-3 text-center">{t.colLotSize || 'Lot Size'}</th>
                          <th className="py-2 px-3 text-right">{t.colStartEquity || 'Start Equity'}</th>
                          <th className="py-2 px-3 text-right">{t.colProfitLoss || 'Net Profit'}</th>
                          <th className="py-2 px-3 text-right">{t.colGainPct || 'Gain %'}</th>
                          <th className="py-2 px-3 text-right">{t.colEndEquity || 'End Equity'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40 text-[11px] font-mono">
                        {dailyMetrics.trades.map((tr, idx) => {
                          const isProfit = (tr.profit_amount || 0) >= 0;
                          return (
                            <tr key={tr.id || idx} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 text-slate-500 font-bold">#{idx + 1}</td>
                              <td className="py-2 px-3 font-sans font-medium text-slate-200">
                                {tr.investor_name || (isKm ? 'គណនីទូទៅ' : 'General')}
                              </td>
                              <td className="py-2 px-3 text-center text-cyan-400 font-semibold">
                                {tr.lot_size.toFixed(4)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-300">
                                {sym}{tr.start_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-bold ${
                                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isProfit ? '+' : ''}
                                {sym}{(tr.profit_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td
                                className={`py-2 px-3 text-right font-semibold ${
                                  isProfit ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isProfit ? '+' : ''}
                                {(tr.profit_pct || 0).toFixed(2)}%
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-slate-100">
                                {sym}{tr.end_equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Team Note Box */}
                {includeTeamNote && teamNote.trim() && (
                  <div className="my-5 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200">
                    <div className="font-semibold text-cyan-300 text-[11px] flex items-center gap-1.5 uppercase tracking-wider mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{t.noteToTeam || 'Note to Trading Team'}</span>
                    </div>
                    <p className="text-slate-300 font-sans leading-relaxed">{teamNote}</p>
                  </div>
                )}

                {/* Card Footer with Verified Stamp */}
                <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-sans">
                  <div>
                    {branding?.companyFooter || `© 2025 ${brandName} — All Rights Reserved`}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 font-mono">
                    <span>{isKm ? 'បង្កើតនៅម៉ោង' : 'Generated'} {new Date().toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="text-cyan-400">{t.verifiedAuditStamp || 'Verified System Audit'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="px-6 py-4 border-t border-slate-800/80 bg-[#0e1526]/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {toastMessage ? (
              <span className="text-emerald-400 font-medium animate-pulse flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>{toastMessage}</span>
              </span>
            ) : (
              <span>
                {isKm
                  ? `រួចរាល់ក្នុងការនាំចេញ ${dailyMetrics.tradeCount} ប្រតិបត្តិការ សម្រាប់ ${dailyMetrics.formattedDate}`
                  : `Ready to export ${dailyMetrics.tradeCount} trade${dailyMetrics.tradeCount !== 1 ? 's' : ''} for ${dailyMetrics.formattedDate}`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Copy Image Button */}
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isCopying || isExportingJPG || isExportingPDF}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111a2e] hover:bg-[#18233c] border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              title={isKm ? 'ចម្លងរូបភាពច្បាស់ទៅ Clipboard ដើម្បីបិទភ្ជាប់ក្នុង Telegram ឬ WhatsApp' : 'Copy high-res image directly to clipboard to paste into Telegram or WhatsApp'}
            >
              {isCopying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{t.btnCopyImage || 'Copy Image'}</span>
            </button>

            {/* Download JPG Button */}
            <button
              type="button"
              onClick={handleDownloadJPG}
              disabled={isCopying || isExportingJPG || isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isExportingJPG ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileImage className="w-4 h-4" />
              )}
              <span>{t.btnDownloadJPG || 'Download JPG'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isCopying || isExportingJPG || isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>{t.btnDownloadPDF || 'Download PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
