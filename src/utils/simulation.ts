import { SimulationParams, SimulationResult, SimulationRow, SimulationSummary, SimulationChartData, BrandingConfig } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const DEFAULT_SIMULATION_PARAMS: SimulationParams = {
  initialCapital: 2000,
  days: 30,
  profitMin: 10,
  profitMax: 28,
  profitMode: 'random',
  withdrawPct: 30,
  reinvestPct: 70,
  withdrawFee: 1,
  requireProfit: true,
  startDate: new Date().toISOString().slice(0, 10),
  projectName: 'SNL AI DCA Future Trade',
  baseEquity: 2000,
  baseLotSize: 0.01,
  lotIncrement: 0.01,
  maxLotSize: 200,
  excludeWeekends: true,
};

export const MAX_ALLOWED_LOT_SIZE = 200;

export function calculateUncappedLotSize(
  equity: number,
  baseEquity: number,
  baseLotSize: number,
  lotIncrement: number
): number {
  const safeBaseLot = Math.max(0, baseLotSize);
  if (equity < baseEquity || baseEquity <= 0) return safeBaseLot;
  const tier = Math.floor(equity / baseEquity);
  const steps = Math.max(0, tier - 1);
  return safeBaseLot + steps * Math.max(0, lotIncrement);
}

export function calculateLotSize(
  equity: number,
  baseEquity: number,
  baseLotSize: number,
  lotIncrement: number,
  maxLotSize: number = MAX_ALLOWED_LOT_SIZE
): number {
  const effectiveMax =
    maxLotSize !== undefined && maxLotSize > 0
      ? Math.min(MAX_ALLOWED_LOT_SIZE, maxLotSize)
      : MAX_ALLOWED_LOT_SIZE;
  const uncapped = calculateUncappedLotSize(equity, baseEquity, baseLotSize, lotIncrement);
  return Math.min(uncapped, effectiveMax);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to parse date without timezone shift
function parseDateParts(dateStr: string): Date {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
  }
  return new Date(dateStr);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function runSimulation(params: SimulationParams): SimulationResult {
  const {
    initialCapital,
    days,
    profitMin,
    profitMax,
    profitMode,
    withdrawPct,
    reinvestPct,
    withdrawFee,
    requireProfit,
    startDate,
    baseEquity,
    baseLotSize,
    lotIncrement,
    maxLotSize = MAX_ALLOWED_LOT_SIZE,
    projectName,
    excludeWeekends = true,
  } = params;

  const effectiveMaxLot =
    maxLotSize !== undefined && maxLotSize > 0
      ? Math.min(MAX_ALLOWED_LOT_SIZE, maxLotSize)
      : MAX_ALLOWED_LOT_SIZE;

  let currentEquity = Number(initialCapital) || 0;
  
  // Starting date - if excludeWeekends is active and start falls on Sat or Sun, advance to Monday
  let currentDate = parseDateParts(startDate);
  if (excludeWeekends) {
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  const initialStartDateObj = new Date(currentDate);
  
  let currentLot = calculateLotSize(currentEquity, baseEquity, baseLotSize, lotIncrement, effectiveMaxLot);
  let maxLotReachedLogged = currentLot >= effectiveMaxLot;
  const scalingLog: string[] = [
    `Start: Equity ${currentEquity.toFixed(2)} USDT | Lot ${currentLot.toFixed(4)} (Max Allow: ${effectiveMaxLot.toFixed(2)})`
  ];

  let prevTier = baseEquity > 0 ? Math.floor(currentEquity / baseEquity) : 1;
  let scalingEvents = 0;
  const rows: SimulationRow[] = [];

  let totalProfit = 0;
  let totalWithdrawn = 0;
  let totalFee = 0;
  let cumWithdrawn = 0;

  const chartLabels: string[] = [];
  const balanceSeries: number[] = [];
  const cumWithdrawSeries: number[] = [];
  const profitSeries: number[] = [];
  const profitMinSeries: number[] = [];
  const profitMaxSeries: number[] = [];

  function getDailyRate(): number {
    if (profitMode === 'fixed') return profitMin;
    if (profitMode === 'average') return (profitMin + profitMax) / 2;
    return profitMin + Math.random() * (profitMax - profitMin);
  }

  for (let day = 1; day <= days; day++) {
    if (day > 1) {
      currentDate.setDate(currentDate.getDate() + 1);
      if (excludeWeekends) {
        while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }

    const dateStr = formatDateISO(currentDate);
    const dayOfWeek = DAY_NAMES[currentDate.getDay()];

    const startEq = currentEquity;
    const uncappedStartLot = calculateUncappedLotSize(startEq, baseEquity, baseLotSize, lotIncrement);
    const activeStartLot = calculateLotSize(startEq, baseEquity, baseLotSize, lotIncrement, effectiveMaxLot);
    const lotCapRatio =
      uncappedStartLot > activeStartLot && uncappedStartLot > 0
        ? activeStartLot / uncappedStartLot
        : 1;
    const effectiveTradingEq = startEq * lotCapRatio;

    const rate = parseFloat(getDailyRate().toFixed(6));
    const profit = parseFloat((effectiveTradingEq * (rate / 100)).toFixed(8));
    const effectiveProfitPct = startEq > 0 ? (profit / startEq) * 100 : rate;
    totalProfit += profit;

    const afterProfit = startEq + profit;
    const desiredWithdraw = profit * (withdrawPct / 100);

    let actualWithdraw = 0;
    let actualFee = 0;

    if (requireProfit) {
      if (profit >= desiredWithdraw + withdrawFee && desiredWithdraw > 0) {
        actualWithdraw = desiredWithdraw;
        actualFee = withdrawFee;
      }
    } else {
      if (desiredWithdraw > 0) {
        actualWithdraw = Math.min(desiredWithdraw, profit);
        actualFee = actualWithdraw > 0 ? withdrawFee : 0;
      }
    }

    const reinvest = profit * (reinvestPct / 100);
    let endEq = startEq + reinvest - actualFee;
    if (endEq < 0) endEq = 0;

    totalWithdrawn += actualWithdraw;
    totalFee += actualFee;
    cumWithdrawn += actualWithdraw;
    currentEquity = endEq;

    const curTier = baseEquity > 0 ? Math.floor(currentEquity / baseEquity) : 1;
    if (curTier > prevTier) {
      const newLot = calculateLotSize(currentEquity, baseEquity, baseLotSize, lotIncrement, effectiveMaxLot);
      if (newLot > currentLot) {
        const hitMax = newLot >= effectiveMaxLot;
        scalingLog.push(
          `🚀 Day ${day} (${dayOfWeek}, ${dateStr}): Equity ${currentEquity.toFixed(2)} USDT → Lot ${currentLot.toFixed(4)} → ${newLot.toFixed(4)} (Tier ${curTier}${hitMax ? ` • MAX LOT ${effectiveMaxLot} CAPPED` : ''})`
        );
        currentLot = newLot;
        scalingEvents++;
        if (hitMax) maxLotReachedLogged = true;
      } else if (newLot >= effectiveMaxLot && !maxLotReachedLogged) {
        scalingLog.push(
          `⚠️ Day ${day} (${dayOfWeek}, ${dateStr}): Max Lot Size Limit (${effectiveMaxLot.toFixed(2)} Lots) reached at Equity ${currentEquity.toFixed(2)} USDT`
        );
        maxLotReachedLogged = true;
      }
    }

    const checkLot = calculateLotSize(currentEquity, baseEquity, baseLotSize, lotIncrement, effectiveMaxLot);
    if (checkLot > currentLot) {
      const hitMax = checkLot >= effectiveMaxLot;
      scalingLog.push(
        `📈 Day ${day} (${dayOfWeek}, ${dateStr}): Equity ${currentEquity.toFixed(2)} → Lot upgrade ${currentLot.toFixed(4)} → ${checkLot.toFixed(4)}${hitMax ? ` (MAX LOT ${effectiveMaxLot} CAPPED)` : ''}`
      );
      currentLot = checkLot;
      scalingEvents++;
      if (hitMax) maxLotReachedLogged = true;
    }

    prevTier = curTier;

    chartLabels.push(`D${day}`);
    balanceSeries.push(parseFloat(currentEquity.toFixed(2)));
    cumWithdrawSeries.push(parseFloat(cumWithdrawn.toFixed(2)));
    profitSeries.push(parseFloat(profit.toFixed(2)));
    profitMinSeries.push(parseFloat((effectiveTradingEq * (profitMin / 100)).toFixed(2)));
    profitMaxSeries.push(parseFloat((effectiveTradingEq * (profitMax / 100)).toFixed(2)));

    rows.push({
      day,
      date: dateStr,
      dayOfWeek,
      startEquity: parseFloat(startEq.toFixed(2)),
      lotSize: parseFloat(currentLot.toFixed(4)),
      profitPct: parseFloat(effectiveProfitPct.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      afterProfit: parseFloat(afterProfit.toFixed(2)),
      withdraw: parseFloat(actualWithdraw.toFixed(2)),
      reinvest: parseFloat(reinvest.toFixed(2)),
      endEquity: parseFloat(currentEquity.toFixed(2)),
    });
  }

  const finalCapital = currentEquity;
  const growthPct = initialCapital > 0 ? ((finalCapital - initialCapital) / initialCapital) * 100 : 0;
  const netProfit = totalProfit - (totalWithdrawn + totalFee);

  const startDateFormatted = rows[0]?.date || formatDateISO(initialStartDateObj);
  const endDateFormatted = rows[rows.length - 1]?.date || formatDateISO(currentDate);

  const calDays = rows.length > 0
    ? Math.round((currentDate.getTime() - initialStartDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : Number(days);

  const finalLot = calculateLotSize(finalCapital, baseEquity, baseLotSize, lotIncrement, effectiveMaxLot);
  const finalTier = baseEquity > 0 ? Math.floor(finalCapital / baseEquity) : 1;

  const summary: SimulationSummary = {
    projectName,
    initialCapital: Number(initialCapital),
    finalCapital: parseFloat(finalCapital.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
    totalFee: parseFloat(totalFee.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
    growthPct: parseFloat(growthPct.toFixed(2)),
    days: Number(days),
    tradingDays: Number(days),
    calendarDays: calDays,
    excludeWeekends: Boolean(excludeWeekends),
    startDate: startDateFormatted,
    endDate: endDateFormatted,
    finalLot: parseFloat(finalLot.toFixed(4)),
    maxLotSize: effectiveMaxLot,
    scalingEvents,
    finalTier,
  };

  const chart: SimulationChartData = {
    labels: chartLabels,
    balanceSeries,
    cumWithdrawSeries,
    profitSeries,
    profitMinSeries,
    profitMaxSeries,
  };

  return {
    id: 'sim-' + Date.now(),
    created_date: new Date().toISOString(),
    summary,
    rows,
    scalingLog,
    chart,
  };
}

export function exportSimulationToCSV(
  result: SimulationResult,
  investorName?: string,
  branding?: BrandingConfig
) {
  const { summary, rows } = result;

  const headerLines = [
    `"Project Name","${summary.projectName}"`,
    investorName ? `"Investor Name","${investorName}"` : '',
    `"Initial Capital","${summary.initialCapital} USDT"`,
    `"Final Capital","${summary.finalCapital} USDT"`,
    `"Total Profit","${summary.totalProfit} USDT"`,
    `"Total Withdrawn","${summary.totalWithdrawn} USDT"`,
    `"Total Fee","${summary.totalFee} USDT"`,
    `"Net Profit","${summary.netProfit} USDT"`,
    `"Growth %","${summary.growthPct}%"`,
    `"Trading Days","${summary.tradingDays || summary.days}"`,
    `"Calendar Days Span","${summary.calendarDays || summary.days} days"`,
    `"Weekend Filtering","${summary.excludeWeekends ? 'Excluded (Mon-Fri Trading Only)' : 'All Calendar Days'}"`,
    `"Period","${summary.startDate} to ${summary.endDate}"`,
    `"Final Lot Size","${summary.finalLot}"`,
    `"Max Lot Size Limit","${summary.maxLotSize ?? MAX_ALLOWED_LOT_SIZE}"`,
    `"Scaling Milestones","${summary.scalingEvents}"`,
    '',
    '"Day","Date","Day of Week","Start Equity (USDT)","Lot Size","Profit %","Profit (USDT)","After Profit","Withdraw (USDT)","Reinvest (USDT)","End Equity (USDT)"'
  ].filter(Boolean);

  const dataLines = rows.map((r) =>
    [
      r.day,
      `"${r.date}"`,
      `"${r.dayOfWeek || ''}"`,
      r.startEquity.toFixed(2),
      r.lotSize.toFixed(4),
      `${r.profitPct.toFixed(2)}%`,
      r.profit.toFixed(2),
      r.afterProfit.toFixed(2),
      r.withdraw.toFixed(2),
      r.reinvest.toFixed(2),
      r.endEquity.toFixed(2),
    ].join(',')
  );

  const csv = [...headerLines, ...dataLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${summary.projectName.replace(/\s+/g, '_')}_simulation_${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportSimulationToPDF(
  result: SimulationResult,
  investorName?: string,
  branding?: BrandingConfig
) {
  const { summary, rows } = result;
  const doc = new jsPDF('p', 'mm', 'a4');

  const brandName = branding?.brandName || summary.projectName || 'SNL AI DCA Future Trade';
  const brandSub = branding?.brandSubtitle || 'Equity Scaling Simulator & Individual Performance Report';
  const footerText = branding?.companyFooter || 'Generated by InvestorFlow — SNL AI DCA Future Trade';

  // Header Banner
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, 210, 38, 'F');

  doc.setTextColor(112, 214, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(brandName, 14, 16);

  doc.setTextColor(200, 210, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(brandSub, 14, 24);

  if (investorName) {
    doc.setTextColor(152, 255, 179);
    doc.setFont('helvetica', 'bold');
    doc.text(`Investor: ${investorName}`, 14, 32);
  }

  doc.setTextColor(160, 175, 200);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Days: ${summary.tradingDays || summary.days} Trading Days (${summary.calendarDays || summary.days} Cal Days, ${summary.excludeWeekends ? 'Excl. Weekends' : 'All Days'}) | ${summary.startDate} to ${summary.endDate}`,
    14,
    32
  );

  // Summary Metrics Card
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(14, 44, 182, 34, 3, 3, 'F');
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(14, 44, 182, 34, 3, 3, 'S');

  doc.setTextColor(80, 90, 110);
  doc.setFontSize(8);
  doc.text('INITIAL CAPITAL', 20, 52);
  doc.text('FINAL CAPITAL', 65, 52);
  doc.text('NET PROFIT', 115, 52);
  doc.text('GROWTH %', 160, 52);

  doc.setTextColor(20, 30, 50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`$${summary.initialCapital.toLocaleString()}`, 20, 60);
  doc.text(`$${summary.finalCapital.toLocaleString()}`, 65, 60);

  doc.setTextColor(0, 160, 100);
  doc.text(`+$${summary.netProfit.toLocaleString()}`, 115, 60);
  doc.text(`+${summary.growthPct.toFixed(2)}%`, 160, 60);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 110, 130);
  doc.text(`Total Withdrawn: $${summary.totalWithdrawn.toLocaleString()} | Fee: $${summary.totalFee}`, 20, 71);
  doc.text(`Final Lot: ${summary.finalLot.toFixed(4)} (Max: ${summary.maxLotSize ?? MAX_ALLOWED_LOT_SIZE}) | Scaling Events: ${summary.scalingEvents}`, 110, 71);

  // Daily Data Table
  const tableData = rows.map((r) => [
    `D${r.day}`,
    `${r.date} (${r.dayOfWeek || ''})`,
    `$${r.startEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    r.lotSize.toFixed(4),
    `${r.profitPct.toFixed(2)}%`,
    `+$${r.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `$${r.withdraw.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `$${r.reinvest.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `$${r.endEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['Day', 'Date (Day)', 'Start Equity', 'Lot', 'Profit %', 'Profit ($)', 'Withdraw', 'Reinvest', 'End Equity']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [11, 15, 25],
      textColor: [112, 214, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 40, 60],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2,
    },
  });

  // Footer Note
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 170);
    doc.text(
      `${footerText} • Page ${i} of ${pageCount}`,
      14,
      290
    );
  }

  doc.save(`${summary.projectName.replace(/\s+/g, '_')}_Report_${Date.now()}.pdf`);
}
