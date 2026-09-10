export type ProfitMode = 'random' | 'fixed' | 'average';
export type Language = 'en' | 'km';

export interface SimulationParams {
  initialCapital: number;
  days: number;
  profitMin: number;
  profitMax: number;
  profitMode: ProfitMode;
  withdrawPct: number;
  reinvestPct: number;
  withdrawFee: number;
  requireProfit: boolean;
  startDate: string;
  projectName: string;
  baseEquity: number;
  baseLotSize: number;
  lotIncrement: number;
  excludeWeekends: boolean;
}

export interface SimulationRow {
  day: number;
  date: string;
  dayOfWeek?: string;
  startEquity: number;
  lotSize: number;
  profitPct: number;
  profit: number;
  afterProfit: number;
  withdraw: number;
  reinvest: number;
  endEquity: number;
}

export interface SimulationSummary {
  projectName: string;
  initialCapital: number;
  finalCapital: number;
  totalProfit: number;
  totalWithdrawn: number;
  totalFee: number;
  netProfit: number;
  growthPct: number;
  days: number;
  tradingDays: number;
  calendarDays: number;
  excludeWeekends: boolean;
  startDate: string;
  endDate: string;
  finalLot: number;
  scalingEvents: number;
  finalTier: number;
}

export interface SimulationChartData {
  labels: string[];
  balanceSeries: number[];
  cumWithdrawSeries: number[];
  profitSeries: number[];
  profitMinSeries: number[];
  profitMaxSeries: number[];
}

export interface SimulationResult {
  id: string;
  created_date: string;
  investor_name?: string;
  summary: SimulationSummary;
  rows: SimulationRow[];
  scalingLog: string[];
  chart: SimulationChartData;
}

export type AccentColor = 'cyan' | 'emerald' | 'amber' | 'purple' | 'rose' | 'blue';

export interface BrandingConfig {
  brandName: string;
  brandSubtitle: string;
  logoType: 'preset' | 'text' | 'image';
  logoPreset: string;
  logoText: string;
  logoImage: string;
  accentColor: AccentColor;
  companyFooter: string;
  contactEmail: string;
  contactPhone: string;
  telegram: string;
  disclaimer: string;
}

export interface SimulatorSessionMemory {
  id: string;
  timestamp: string;
  projectName: string;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  growthPct: number;
  days: number;
  tradingDays: number;
  params: SimulationParams;
  investorName?: string;
}

export type AccountCurrency = 'USD' | 'USC';

export interface Investor {
  id: string;
  name: string;
  email: string;
  phone: string;
  currency?: AccountCurrency;
  initial_capital: number;
  profit_min: number;
  profit_max: number;
  withdraw_pct: number;
  reinvest_pct: number;
  withdraw_fee: number;
  base_equity: number;
  base_lot_size: number;
  lot_increment: number;
  notes: string;
  created_at: string;
}

export interface Trade {
  id: string;
  investor_name: string;
  currency?: AccountCurrency;
  trade_date: string;
  start_equity: number;
  lot_size: number;
  profit_pct: number;
  profit_amount: number;
  withdraw: number;
  reinvest: number;
  end_equity: number;
  notes: string;
  created_at: string;
}

// ----------------------------------------------------
// Gold (XAUUSD) & Trading Calculation System Types
// ----------------------------------------------------
export type TradeDirection = 'BUY' | 'SELL';
export type RiskMode = 'percent' | 'fixed';
export type StopLossMode = 'price' | 'pips' | 'amount';
export type DCAScalingType = 'linear' | 'multiplier' | 'martingale' | 'custom';

export interface TradingCalculationInputs {
  symbol: string;
  balance: number;
  riskPercent: number;
  riskAmount: number;
  riskMode: RiskMode;
  leverage: number;
  contractSize: number;
  spreadPips: number;
  direction: TradeDirection;
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  takeProfitPrice2?: number;
  takeProfitPrice3?: number;
  customLotSize?: number;
  useCustomLot: boolean;
  
  // DCA Grid parameters
  dcaLayers: number;
  dcaStepPips: number;
  dcaScalingType: DCAScalingType;
  dcaLotMultiplier: number;
  dcaLinearStep: number;
  dcaTakeProfitPips: number;
}

export interface PositionLadderRow {
  layer: number;
  entryPrice: number;
  lotSize: number;
  cumulativeLots: number;
  marginRequired: number;
  avgEntryPrice: number;
  drawdownAtCurrent: number;
  targetTpPrice: number;
  profitAtTp: number;
  pipsFromFirst: number;
}

export interface TradingCalculationOutputs {
  recommendedLot: number;
  actualLot: number;
  pipValue: number;
  pointValue: number;
  slDistancePips: number;
  slDistancePrice: number;
  tpDistancePips: number;
  tpDistancePrice: number;
  riskRewardRatio: number;
  moneyAtRisk: number;
  riskPercentActual: number;
  potentialProfitTP1: number;
  potentialRoiTP1: number;
  potentialProfitTP2: number;
  potentialProfitTP3: number;
  marginRequired: number;
  freeMargin: number;
  marginLevel: number;
  breakevenPrice: number;
  reverseTargetRecoveryLot: number;
  ladderRows: PositionLadderRow[];
  totalDcaLots: number;
  totalDcaMargin: number;
  dcaAveragePrice: number;
  dcaMaxDrawdown: number;
  dcaTotalProfitAtTp: number;
  liquidationPriceEstimate: number;
}

export interface SavedPreset {
  id: string;
  name: string;
  symbol: string;
  description: string;
  inputs: Partial<TradingCalculationInputs>;
  created_at: string;
}

// ----------------------------------------------------
// Gold Formula Spreadsheet Calculation Types (Screenshot Model)
// ----------------------------------------------------
export interface GoldSpreadsheetInputs {
  balance: number;
  thresholdPct: number;
  maxPosition: number;
  targetPct: number;
  lotSize: number;
  reverseAmount?: number;
  autoReverseMatch: boolean;
  notes?: string;
}

export interface GoldSpreadsheetOutputs {
  balance: number;
  thresholdPct: number;
  thresholdAmount: number;
  maxPosition: number;
  targetPct: number;
  targetAmount: number;
  lotSize: number;
  reverseAmount: number;
  equity: number;
  // Advanced Analysis
  riskPerPosition: number;
  targetPerPosition: number;
  totalLotVolume: number;
  profitRatio: number; // target / threshold
  compoundingCycles: {
    cycle: number;
    startBalance: number;
    targetAmount: number;
    thresholdAmount: number;
    endEquity: number;
    gainPct: number;
  }[];
}

export type TranslationKey = 
  | 'appTitle'
  | 'appSubtitle'
  | 'navSimulator'
  | 'navSpreadsheet'
  | 'navInvestors'
  | 'navTradeLog'
  | 'navHistory'
  | 'navGoldCalc'
  | 'inputTitle'
  | 'lblCapital'
  | 'lblDays'
  | 'lblProfitMin'
  | 'lblProfitMax'
  | 'lblMode'
  | 'lblWithdrawPct'
  | 'lblReinvestPct'
  | 'lblFee'
  | 'lblRequire'
  | 'lblStartDate'
  | 'lblProjectName'
  | 'modeRandom'
  | 'modeFixed'
  | 'modeAverage'
  | 'yes'
  | 'no'
  | 'runBtn'
  | 'clearBtn'
  | 'exportCsv'
  | 'exportPdf'
  | 'saveResult'
  | 'equityScaling'
  | 'lblBaseEquity'
  | 'lblBaseLot'
  | 'lblLotIncrement'
  | 'scalingRule'
  | 'statsTitle'
  | 'labelTotalProfit'
  | 'labelTotalWithdraw'
  | 'labelTotalFee'
  | 'labelNetProfit'
  | 'labelFinalCapital'
  | 'labelGrowth'
  | 'scalingMilestones'
  | 'investorsTitle'
  | 'addInvestor'
  | 'editInvestor'
  | 'deleteInvestor'
  | 'simulateFor'
  | 'investorName'
  | 'investorEmail'
  | 'investorPhone'
  | 'investorNotes'
  | 'saveInvestor'
  | 'cancel'
  | 'historyTitle'
  | 'noHistory'
  | 'tradeLogTitle'
  | 'addTrade'
  | 'editTrade'
  | 'saveTrade'
  | 'noTrades'
  | 'lblTradeDate'
  | 'lblStartEquity'
  | 'lblLotSize'
  | 'lblProfitPct'
  | 'lblNotes'
  | 'totalRealProfit'
  | 'currentEquity'
  | 'avgProfitPct'
  | 'todayProfit'
  | 'todayTradesCount'
  | 'saveAndAddNext'
  | 'noInvestors'
  | 'day'
  | 'date'
  | 'equity'
  | 'lotSize'
  | 'profitPct'
  | 'profit'
  | 'afterProfit'
  | 'withdraw'
  | 'reinvest'
  | 'endEquity'
  | 'currentLot'
  | 'tier'
  | 'langToggle'
  | 'goldCalcTitle'
  | 'goldCalcSubtitle'
  | 'lblSymbol'
  | 'lblBalance'
  | 'lblRiskPct'
  | 'lblRiskAmount'
  | 'lblLeverage'
  | 'lblDirection'
  | 'lblEntryPrice'
  | 'lblStopLoss'
  | 'lblTakeProfit'
  | 'lblContractSize'
  | 'lblSpread'
  | 'recommendedLot'
  | 'riskReward'
  | 'marginReq'
  | 'potentialProfit'
  | 'pipValue'
  | 'dcaLadder'
  | 'layer'
  | 'avgPrice'
  | 'presetsTitle'
  | 'exportCalc'
  | 'lblExcludeWeekends'
  | 'tradingDaysLabel'
  | 'calendarDaysLabel'
  | 'adminTitle'
  | 'adminLogin'
  | 'adminLogout'
  | 'adminBranding'
  | 'adminLogo'
  | 'adminBrandName'
  | 'adminBrandSubtitle'
  | 'adminAccentColor'
  | 'adminCompanyFooter'
  | 'adminSave'
  | 'adminReset'
  | 'adminBackup'
  | 'adminRestore'
  | 'lastSessionMemory'
  | 'restoreLastSim'
  | 'recentSimulations';

export type Translations = Record<TranslationKey, string>;
