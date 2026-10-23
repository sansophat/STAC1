import {
  TradingCalculationInputs,
  TradingCalculationOutputs,
  PositionLadderRow,
  SavedPreset,
  GoldSpreadsheetInputs,
  GoldSpreadsheetOutputs,
} from '../types';

export const DEFAULT_GOLD_SPREADSHEET_INPUTS: GoldSpreadsheetInputs = {
  balance: 12022.0,
  thresholdPct: 30.0,
  maxPosition: 500,
  targetPct: 11.5,
  lotSize: 0.01,
  reverseAmount: 1382.53,
  autoReverseMatch: true,
  notes: 'SNL Gold Future formula trading model',
};

export function calculateGoldSpreadsheet(inputs: GoldSpreadsheetInputs): GoldSpreadsheetOutputs {
  const balance = Math.max(0, inputs.balance);
  const thresholdPct = inputs.thresholdPct;
  const thresholdAmount = Number(((balance * thresholdPct) / 100).toFixed(2));
  
  const maxPosition = Math.max(1, inputs.maxPosition);
  const targetPct = inputs.targetPct;
  const targetAmount = Number(((balance * targetPct) / 100).toFixed(2));
  
  const lotSize = Math.min(200, Math.max(0.01, inputs.lotSize));
  const reverseAmount = inputs.autoReverseMatch ? targetAmount : (inputs.reverseAmount ?? targetAmount);
  
  // Equity = Balance + Target
  const equity = Number((balance + targetAmount).toFixed(2));

  // Risk per position ($) = Threshold / Max Position
  const riskPerPosition = Number((thresholdAmount / maxPosition).toFixed(2));
  // Target profit per position ($) = Target / Max Position
  const targetPerPosition = Number((targetAmount / maxPosition).toFixed(2));
  // Total Lot volume
  const totalLotVolume = Number((maxPosition * lotSize).toFixed(2));
  // Profit / Risk Ratio
  const profitRatio = thresholdAmount > 0 ? Number((targetAmount / thresholdAmount).toFixed(4)) : 0;

  // 10-Cycle Compounding Projections using this exact formula
  const compoundingCycles = [];
  let runningBalance = balance;
  for (let c = 1; c <= 10; c++) {
    const cycleTarget = Number(((runningBalance * targetPct) / 100).toFixed(2));
    const cycleThreshold = Number(((runningBalance * thresholdPct) / 100).toFixed(2));
    const endEq = Number((runningBalance + cycleTarget).toFixed(2));
    const gainPct = runningBalance > 0 ? Number(((endEq - balance) / balance * 100).toFixed(2)) : 0;

    compoundingCycles.push({
      cycle: c,
      startBalance: Number(runningBalance.toFixed(2)),
      targetAmount: cycleTarget,
      thresholdAmount: cycleThreshold,
      endEquity: endEq,
      gainPct,
    });

    runningBalance = endEq;
  }

  return {
    balance,
    thresholdPct,
    thresholdAmount,
    maxPosition,
    targetPct,
    targetAmount,
    lotSize,
    reverseAmount,
    equity,
    riskPerPosition,
    targetPerPosition,
    totalLotVolume,
    profitRatio,
    compoundingCycles,
  };
}

export function exportGoldSpreadsheetToCSV(
  inputs: GoldSpreadsheetInputs,
  outputs: GoldSpreadsheetOutputs
) {
  let csv = 'PARAMETER,VALUE,NOTE\n';
  csv += `BALANCE,$${outputs.balance.toFixed(2)},Initial Trading Account Balance\n`;
  csv += `THRESHOLD,${outputs.thresholdPct}%,$${outputs.thresholdAmount.toFixed(2)} Max Allowable Risk\n`;
  csv += `MAX POSITION,${outputs.maxPosition},Total Position Capacity\n`;
  csv += `TARGET,${outputs.targetPct}%,$${outputs.targetAmount.toFixed(2)} Profit Goal\n`;
  csv += `LOTSIZE,${outputs.lotSize.toFixed(2)},Base Lot Size per position\n`;
  csv += `REVERSE,$${outputs.reverseAmount.toFixed(2)},Reverse / Recovery Target\n`;
  csv += `EQUITY,$${outputs.equity.toFixed(2)},Projected Account Equity\n\n`;

  csv += 'ADVANCED ANALYSIS\n';
  csv += `Risk per Position,$${outputs.riskPerPosition.toFixed(2)},USD\n`;
  csv += `Target per Position,$${outputs.targetPerPosition.toFixed(2)},USD\n`;
  csv += `Total Max Lot Volume,${outputs.totalLotVolume.toFixed(2)},Lots\n`;
  csv += `Profit to Risk Ratio,${(outputs.profitRatio * 100).toFixed(2)}%,-\n\n`;

  csv += 'COMPOUNDING PROJECTION SCHEDULE\n';
  csv += 'Cycle #,Start Balance ($),Target Profit ($),Threshold Risk ($),End Equity ($),Cumulative Growth (%)\n';
  outputs.compoundingCycles.forEach((row) => {
    csv += `Cycle ${row.cycle},$${row.startBalance.toFixed(2)},$${row.targetAmount.toFixed(2)},$${row.thresholdAmount.toFixed(2)},$${row.endEquity.toFixed(2)},+${row.gainPct}%\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Gold_Formula_Spreadsheet_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export const DEFAULT_GOLD_INPUTS: TradingCalculationInputs = {
  symbol: 'XAUUSD (Gold)',
  balance: 2000,
  riskPercent: 2,
  riskAmount: 40,
  riskMode: 'percent',
  leverage: 500,
  contractSize: 100, // 100 oz per standard lot in Gold
  spreadPips: 2.0, // 20 cents
  direction: 'BUY',
  entryPrice: 2900.0,
  stopLossPrice: 2890.0,
  takeProfitPrice: 2930.0,
  takeProfitPrice2: 2950.0,
  takeProfitPrice3: 2980.0,
  customLotSize: 0.04,
  useCustomLot: false,

  // DCA Settings
  dcaLayers: 5,
  dcaStepPips: 30, // 30 pips = $3.00 gold drop
  dcaScalingType: 'linear',
  dcaLotMultiplier: 1.5,
  dcaLinearStep: 0.01,
  dcaTakeProfitPips: 40, // $4.00 bounce from average
};

export const DEFAULT_GOLD_PRESETS: SavedPreset[] = [
  {
    id: 'preset-scalp',
    name: 'Gold Scalp (1:2 R:R, 15 Pips SL)',
    symbol: 'XAUUSD',
    description: 'High-frequency scalping setup with tight 15-pip stop loss and fast profit taking.',
    inputs: {
      balance: 1000,
      riskPercent: 1.5,
      riskMode: 'percent',
      leverage: 500,
      direction: 'BUY',
      entryPrice: 2900.0,
      stopLossPrice: 2898.5,
      takeProfitPrice: 2903.0,
      takeProfitPrice2: 2906.0,
      useCustomLot: false,
    },
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset-daytrade',
    name: 'Gold Day Trade (1:3 R:R, 40 Pips SL)',
    symbol: 'XAUUSD',
    description: 'Intraday swing setup with 40-pip stop loss targeting $12.00 price expansion.',
    inputs: {
      balance: 3000,
      riskPercent: 2.0,
      riskMode: 'percent',
      leverage: 500,
      direction: 'BUY',
      entryPrice: 2900.0,
      stopLossPrice: 2896.0,
      takeProfitPrice: 2912.0,
      takeProfitPrice2: 2924.0,
      takeProfitPrice3: 2940.0,
      useCustomLot: false,
    },
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset-dca-grid',
    name: 'Gold 5-Layer DCA Grid (Rebound Strategy)',
    symbol: 'XAUUSD',
    description: 'Averaging grid entering every $3.00 drop with linear lot scaling and $4 basket TP.',
    inputs: {
      balance: 5000,
      riskPercent: 3.0,
      riskMode: 'percent',
      leverage: 500,
      direction: 'BUY',
      entryPrice: 2900.0,
      stopLossPrice: 2880.0,
      takeProfitPrice: 2915.0,
      dcaLayers: 5,
      dcaStepPips: 30,
      dcaScalingType: 'linear',
      dcaLinearStep: 0.02,
      dcaTakeProfitPips: 40,
    },
    created_at: new Date().toISOString(),
  },
  {
    id: 'preset-conservative',
    name: 'Institutional Gold Swing (1% Risk, 100 Pips SL)',
    symbol: 'XAUUSD',
    description: 'Ultra-safe risk management with wide stop loss for macro trend following.',
    inputs: {
      balance: 10000,
      riskPercent: 1.0,
      riskMode: 'percent',
      leverage: 200,
      direction: 'BUY',
      entryPrice: 2900.0,
      stopLossPrice: 2880.0,
      takeProfitPrice: 2960.0,
      takeProfitPrice2: 3000.0,
      useCustomLot: false,
    },
    created_at: new Date().toISOString(),
  },
];

export function calculateGoldTrade(inputs: TradingCalculationInputs): TradingCalculationOutputs {
  const {
    balance,
    riskPercent,
    riskAmount,
    riskMode,
    leverage,
    contractSize,
    spreadPips,
    direction,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    takeProfitPrice2,
    takeProfitPrice3,
    customLotSize,
    useCustomLot,
    dcaLayers,
    dcaStepPips,
    dcaScalingType,
    dcaLotMultiplier,
    dcaLinearStep,
    dcaTakeProfitPips,
  } = inputs;

  // 1. Calculate Money at Risk
  const moneyAtRisk =
    riskMode === 'percent' ? (balance * Math.max(0.01, riskPercent)) / 100 : Math.max(1, riskAmount);

  // 2. Distances
  const slDistancePrice = Math.max(0.01, Math.abs(entryPrice - stopLossPrice));
  const slDistancePips = slDistancePrice * 10; // In Gold 1 USD = 10 Pips (100 points)

  const tpDistancePrice = Math.max(0.01, Math.abs(takeProfitPrice - entryPrice));
  const tpDistancePips = tpDistancePrice * 10;

  // 3. Recommended Lot Sizing
  // MoneyAtRisk = Lot * contractSize * slDistancePrice
  // => Lot = MoneyAtRisk / (contractSize * slDistancePrice)
  const rawRecommendedLot = moneyAtRisk / (contractSize * slDistancePrice);
  const recommendedLot = Math.min(200, Math.max(0.01, Number(rawRecommendedLot.toFixed(2))));

  const actualLot = Math.min(
    200,
    useCustomLot && customLotSize && customLotSize > 0 ? customLotSize : recommendedLot
  );

  // 4. Value metrics
  const pipValue = actualLot * contractSize * 0.1; // $ per pip (0.10 USD price change)
  const pointValue = actualLot * contractSize * 1.0; // $ per $1.00 move in gold

  const riskPercentActual = balance > 0 ? (moneyAtRisk / balance) * 100 : 0;
  const riskRewardRatio = slDistancePrice > 0 ? tpDistancePrice / slDistancePrice : 0;

  // 5. Margin and Leverage
  const marginRequired =
    leverage > 0 ? (actualLot * contractSize * entryPrice) / leverage : 0;
  const freeMargin = Math.max(0, balance - marginRequired);
  const marginLevel = marginRequired > 0 ? (balance / marginRequired) * 100 : 9999;

  // 6. Potential Profits
  const potentialProfitTP1 = actualLot * contractSize * tpDistancePrice;
  const potentialRoiTP1 = balance > 0 ? (potentialProfitTP1 / balance) * 100 : 0;

  const tp2Distance = takeProfitPrice2 ? Math.abs(takeProfitPrice2 - entryPrice) : tpDistancePrice * 1.5;
  const potentialProfitTP2 = actualLot * contractSize * tp2Distance;

  const tp3Distance = takeProfitPrice3 ? Math.abs(takeProfitPrice3 - entryPrice) : tpDistancePrice * 2.5;
  const potentialProfitTP3 = actualLot * contractSize * tp3Distance;

  // 7. Breakeven Price with spread
  const spreadPriceShift = spreadPips * 0.1;
  const breakevenPrice =
    direction === 'BUY' ? entryPrice + spreadPriceShift : entryPrice - spreadPriceShift;

  // 8. Reverse Target Recovery Lot
  // If trade hits SL (Loss = moneyAtRisk), recovery lot on same distance = moneyAtRisk / (slDistancePrice * contractSize)
  const reverseTargetRecoveryLot = Number(recommendedLot.toFixed(2));

  // 9. DCA Position Ladder Generation
  const ladderRows: PositionLadderRow[] = [];
  const baseLadderLot = actualLot;
  let cumLots = 0;
  let weightedPriceSum = 0;
  let totalDcaMargin = 0;

  const stepPrice = (dcaStepPips * 0.1);

  for (let i = 1; i <= Math.min(10, Math.max(1, dcaLayers)); i++) {
    // Determine layer lot
    let layerLot = baseLadderLot;
    if (i > 1) {
      if (dcaScalingType === 'linear') {
        layerLot = baseLadderLot + (i - 1) * dcaLinearStep;
      } else if (dcaScalingType === 'multiplier') {
        layerLot = baseLadderLot * Math.pow(dcaLotMultiplier, i - 1);
      } else if (dcaScalingType === 'martingale') {
        layerLot = baseLadderLot * Math.pow(2, i - 1);
      }
    }
    layerLot = Math.min(200, Math.max(0.01, Number(layerLot.toFixed(2))));

    // Determine entry price for this layer
    const layerEntryPrice =
      direction === 'BUY' ? entryPrice - (i - 1) * stepPrice : entryPrice + (i - 1) * stepPrice;

    cumLots += layerLot;
    weightedPriceSum += layerEntryPrice * layerLot;
    const avgEntryPrice = weightedPriceSum / cumLots;

    const layerMargin = leverage > 0 ? (layerLot * contractSize * layerEntryPrice) / leverage : 0;
    totalDcaMargin += layerMargin;

    // Drawdown of all opened positions if current market price is at this layer's price
    let drawdownAtCurrent = 0;
    for (let j = 1; j <= i; j++) {
      const prevPrice =
        direction === 'BUY' ? entryPrice - (j - 1) * stepPrice : entryPrice + (j - 1) * stepPrice;
      const prevLot = ladderRows[j - 1] ? ladderRows[j - 1].lotSize : baseLadderLot;
      const priceDiff = Math.abs(layerEntryPrice - prevPrice);
      drawdownAtCurrent += prevLot * contractSize * priceDiff;
    }

    const basketTpPrice =
      direction === 'BUY'
        ? avgEntryPrice + dcaTakeProfitPips * 0.1
        : avgEntryPrice - dcaTakeProfitPips * 0.1;

    const profitAtTp = cumLots * contractSize * (dcaTakeProfitPips * 0.1);

    ladderRows.push({
      layer: i,
      entryPrice: Number(layerEntryPrice.toFixed(2)),
      lotSize: layerLot,
      cumulativeLots: Number(cumLots.toFixed(2)),
      marginRequired: Number(layerMargin.toFixed(2)),
      avgEntryPrice: Number(avgEntryPrice.toFixed(2)),
      drawdownAtCurrent: Number(drawdownAtCurrent.toFixed(2)),
      targetTpPrice: Number(basketTpPrice.toFixed(2)),
      profitAtTp: Number(profitAtTp.toFixed(2)),
      pipsFromFirst: (i - 1) * dcaStepPips,
    });
  }

  const deepestLayer = ladderRows[ladderRows.length - 1];
  const dcaAveragePrice = deepestLayer ? deepestLayer.avgEntryPrice : entryPrice;
  const dcaMaxDrawdown = deepestLayer ? deepestLayer.drawdownAtCurrent : 0;
  const dcaTotalProfitAtTp = deepestLayer ? deepestLayer.profitAtTp : 0;

  // 10. Liquidation Price Estimate (when drawdown depletes free margin to 20% margin level)
  // Balance - Drawdown = TotalMargin * 0.20
  // Drawdown_max = Balance - TotalMargin * 0.20
  // priceMove = Drawdown_max / (cumLots * contractSize)
  const maxAllowableDrawdown = Math.max(0, balance - totalDcaMargin * 0.2);
  const maxPriceMoveAllowed = cumLots > 0 ? maxAllowableDrawdown / (cumLots * contractSize) : 0;
  const liquidationPriceEstimate =
    direction === 'BUY'
      ? Math.max(0, dcaAveragePrice - maxPriceMoveAllowed)
      : dcaAveragePrice + maxPriceMoveAllowed;

  return {
    recommendedLot,
    actualLot,
    pipValue: Number(pipValue.toFixed(2)),
    pointValue: Number(pointValue.toFixed(2)),
    slDistancePips: Number(slDistancePips.toFixed(1)),
    slDistancePrice: Number(slDistancePrice.toFixed(2)),
    tpDistancePips: Number(tpDistancePips.toFixed(1)),
    tpDistancePrice: Number(tpDistancePrice.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    moneyAtRisk: Number(moneyAtRisk.toFixed(2)),
    riskPercentActual: Number(riskPercentActual.toFixed(2)),
    potentialProfitTP1: Number(potentialProfitTP1.toFixed(2)),
    potentialRoiTP1: Number(potentialRoiTP1.toFixed(2)),
    potentialProfitTP2: Number(potentialProfitTP2.toFixed(2)),
    potentialProfitTP3: Number(potentialProfitTP3.toFixed(2)),
    marginRequired: Number(marginRequired.toFixed(2)),
    freeMargin: Number(freeMargin.toFixed(2)),
    marginLevel: Number(marginLevel.toFixed(1)),
    breakevenPrice: Number(breakevenPrice.toFixed(2)),
    reverseTargetRecoveryLot,
    ladderRows,
    totalDcaLots: Number(cumLots.toFixed(2)),
    totalDcaMargin: Number(totalDcaMargin.toFixed(2)),
    dcaAveragePrice: Number(dcaAveragePrice.toFixed(2)),
    dcaMaxDrawdown: Number(dcaMaxDrawdown.toFixed(2)),
    dcaTotalProfitAtTp: Number(dcaTotalProfitAtTp.toFixed(2)),
    liquidationPriceEstimate: Number(liquidationPriceEstimate.toFixed(2)),
  };
}

export function exportGoldCalculationToCSV(
  inputs: TradingCalculationInputs,
  outputs: TradingCalculationOutputs
) {
  let csv = 'PARAMETER,VALUE,UNIT\n';
  csv += `Symbol,${inputs.symbol},-\n`;
  csv += `Account Balance,$${inputs.balance.toFixed(2)},USD\n`;
  csv += `Direction,${inputs.direction},-\n`;
  csv += `Entry Price,$${inputs.entryPrice.toFixed(2)},USD\n`;
  csv += `Stop Loss,$${inputs.stopLossPrice.toFixed(2)},USD (${outputs.slDistancePips} pips)\n`;
  csv += `Take Profit,$${inputs.takeProfitPrice.toFixed(2)},USD (${outputs.tpDistancePips} pips)\n`;
  csv += `Leverage,1:${inputs.leverage},-\n`;
  csv += `Risk Amount,$${outputs.moneyAtRisk.toFixed(2)},USD (${outputs.riskPercentActual}%)\n`;
  csv += `Calculated Lot Size,${outputs.actualLot.toFixed(2)},Lots\n`;
  csv += `Pip Value,$${outputs.pipValue.toFixed(2)},USD/pip\n`;
  csv += `Margin Required,$${outputs.marginRequired.toFixed(2)},USD\n`;
  csv += `Risk:Reward Ratio,1:${outputs.riskRewardRatio.toFixed(2)},-\n`;
  csv += `Expected Profit TP1,$${outputs.potentialProfitTP1.toFixed(2)},USD (+${outputs.potentialRoiTP1}%)\n`;
  csv += `Breakeven Price,$${outputs.breakevenPrice.toFixed(2)},USD\n\n`;

  csv += 'DCA POSITION LADDER (GRID LAYERING)\n';
  csv += 'Layer,Entry Price,Lot Size,Cumulative Lots,Margin ($),Avg Price ($),Drawdown ($),Basket TP ($),Profit at TP ($)\n';

  outputs.ladderRows.forEach((row) => {
    csv += `${row.layer},$${row.entryPrice.toFixed(2)},${row.lotSize.toFixed(2)},${row.cumulativeLots.toFixed(2)},$${row.marginRequired.toFixed(2)},$${row.avgEntryPrice.toFixed(2)},$${row.drawdownAtCurrent.toFixed(2)},$${row.targetTpPrice.toFixed(2)},$${row.profitAtTp.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Gold_Trade_Calculation_${inputs.direction}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
