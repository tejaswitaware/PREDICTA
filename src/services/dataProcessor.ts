import _ from 'lodash';
import { Dataset, ColumnMetadata, DataType, ChartConfig } from '../types';

const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2', '#4f46e5', '#be123c'];

export function detectType(values: any[]): DataType {
  const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNullValues.length === 0) return 'text';

  // Check for Date
  const dateAttempts = nonNullValues.slice(0, 100).map(v => !isNaN(Date.parse(v)));
  if (dateAttempts.every(v => v) && nonNullValues.slice(0, 100).some(v => typeof v === 'string' && (v.includes('-') || v.includes('/')))) {
    return 'datetime';
  }

  // Check for Numeric
  const numericAttempts = nonNullValues.slice(0, 100).map(v => !isNaN(Number(v)) && v !== '');
  if (numericAttempts.every(v => v)) {
    return 'numeric';
  }

  // Categories vs Text
  const uniqueCount = new Set(nonNullValues).size;
  if (uniqueCount < nonNullValues.length * 0.1 || uniqueCount < 20) {
    return 'categorical';
  }

  return 'text';
}

export function cleanData(data: any[], options: { removeDuplicates?: boolean; trim?: boolean } = { removeDuplicates: true, trim: true }): any[] {
  if (!data || data.length === 0) return [];
  
  const datasetSize = data.length;
  // Dedupe only if necessary and dataset is manageable
  const shouldDedupe = options.removeDuplicates && datasetSize < 20000;

  const cleaned = [];
  const seen = shouldDedupe ? new Set<string>() : null;

  for (let i = 0; i < datasetSize; i++) {
    const row = data[i];
    if (!row) continue;
    
    const newRow: any = {};
    let rowHash = "";

    for (const key in row) {
      let val = row[key];
      if (typeof val === 'string') {
        if (options.trim) val = val.trim();
        const l = val.toLowerCase();
        if (val === '' || l === 'nan' || l === 'null') val = null;
      } else if (val === undefined) {
        val = null;
      }
      
      newRow[key] = val;
      if (shouldDedupe) rowHash += `${val}|`;
    }

    if (shouldDedupe && seen) {
      if (seen.has(rowHash)) continue;
      seen.add(rowHash);
    }
    
    cleaned.push(newRow);
    // Hard limit on processed data for ultra-speed
    if (cleaned.length >= 100000) break;
  }

  return cleaned;
}

export function suggestAutoCharts(dataset: Dataset): ChartConfig[] {
  const charts: ChartConfig[] = [];
  const numericCols = dataset.columns.filter(c => c.type === 'numeric');
  const categoricalCols = dataset.columns.filter(c => c.type === 'categorical');

  if (categoricalCols.length > 0) {
    charts.push({
      id: 'auto-1',
      title: `Distribution of ${categoricalCols[0].name}`,
      type: 'pie',
      xAxis: categoricalCols[0].name,
      color: COLORS[0]
    });
  }

  if (numericCols.length > 0 && categoricalCols.length > 0) {
    charts.push({
      id: 'auto-2',
      title: `${numericCols[0].name} by ${categoricalCols[0].name}`,
      type: 'bar',
      xAxis: categoricalCols[0].name,
      yAxis: numericCols[0].name,
      color: COLORS[1]
    });
  }

  if (numericCols.length > 1) {
    charts.push({
      id: 'auto-3',
      title: `${numericCols[0].name} Trend`,
      type: 'line',
      xAxis: dataset.columns[0].name,
      yAxis: numericCols[0].name,
      color: COLORS[2]
    });

    charts.push({
      id: 'auto-4',
      title: `${numericCols[0].name} vs ${numericCols[1].name}`,
      type: 'scatter',
      xAxis: numericCols[0].name,
      yAxis: numericCols[1].name,
      color: COLORS[3]
    });
  }

  return charts;
}

export function getRecommendations(dataset: Dataset): { label: string; reason: string; config: ChartConfig }[] {
  const recommendations: { label: string; reason: string; config: ChartConfig }[] = [];
  const numericCols = dataset.columns.filter(c => c.type === 'numeric');
  const categoricalCols = dataset.columns.filter(c => c.type === 'categorical');
  const datetimeCols = dataset.columns.filter(c => c.type === 'datetime');

  // 1. Time Series - Highest priority
  if (datetimeCols.length > 0 && numericCols.length > 0) {
    const mainMetric = numericCols.find(c => (c.name.toLowerCase().includes('price') || c.name.toLowerCase().includes('amount') || c.name.toLowerCase().includes('value'))) || numericCols[0];
    recommendations.push({
      label: `Time Series: ${mainMetric.name}`,
      reason: `Detected temporal patterns in ${datetimeCols[0].name}. Useful for spotting trends and seasonality.`,
      config: {
        id: crypto.randomUUID(),
        title: `Trend of ${mainMetric.name} over Time`,
        type: 'line',
        xAxis: datetimeCols[0].name,
        yAxis: mainMetric.name,
        color: COLORS[0]
      }
    });
  }

  // 2. Significant Categories
  if (categoricalCols.length > 0) {
    const bestCat = categoricalCols.find(c => c.uniqueValues > 1 && c.uniqueValues <= 10) || categoricalCols[0];
    
    // Distribution
    recommendations.push({
      label: `${bestCat.name} Share`,
      reason: `The "${bestCat.name}" column has a small number of unique values, making it ideal for a composition breakdown.`,
      config: {
        id: crypto.randomUUID(),
        title: `Distribution of ${bestCat.name}`,
        type: 'pie',
        xAxis: bestCat.name,
        color: COLORS[1 % COLORS.length]
      }
    });

    // Comparison if numeric exists
    if (numericCols.length > 0) {
      const bestMetric = numericCols.find(c => c.outliersCount && c.outliersCount > 0) || numericCols[0];
      recommendations.push({
        label: `${bestMetric.name} by ${bestCat.name}`,
        reason: `Compares numerical performance across key groups to identify high-performing segments.`,
        config: {
          id: crypto.randomUUID(),
          title: `Performance: ${bestMetric.name} vs ${bestCat.name}`,
          type: 'bar',
          xAxis: bestCat.name,
          yAxis: bestMetric.name,
          color: COLORS[2 % COLORS.length]
        }
      });
    }
  }

  // 3. Numeric Correlations
  if (numericCols.length >= 2) {
    recommendations.push({
      label: `Correlation: ${numericCols[0].name} vs ${numericCols[1].name}`,
      reason: `Identifies if a change in ${numericCols[0].name} correlates with changes in ${numericCols[1].name}.`,
      config: {
        id: crypto.randomUUID(),
        title: `Correlation Analysis`,
        type: 'scatter',
        xAxis: numericCols[0].name,
        yAxis: numericCols[1].name,
        color: COLORS[3 % COLORS.length]
      }
    });
  }

  // 4. Advanced Insights
  if (numericCols.length > 0) {
    recommendations.push({
      label: `Distribution of ${numericCols[0].name}`,
      reason: `Histogram reveals the spread and skewness of your numeric data.`,
      config: {
        id: crypto.randomUUID(),
        title: `${numericCols[0].name} Distribution`,
        type: 'histogram',
        xAxis: numericCols[0].name,
        color: COLORS[4 % COLORS.length]
      }
    });
  }

  if (categoricalCols.length > 0 && categoricalCols[0].uniqueValues > 5) {
     recommendations.push({
      label: `Hierarchical: ${categoricalCols[0].name}`,
      reason: `Treemap effectively visualizes parts-of-a-whole when there are many categories.`,
      config: {
        id: crypto.randomUUID(),
        title: `${categoricalCols[0].name} Breakdown`,
        type: 'treemap',
        xAxis: categoricalCols[0].name,
        color: COLORS[5 % COLORS.length]
      }
    });
  }

  // 5. Financial / OHLC Data
  const openCol = dataset.columns.find(c => c.name.toLowerCase().includes('open'));
  const closeCol = dataset.columns.find(c => c.name.toLowerCase().includes('close'));
  const highCol = dataset.columns.find(c => c.name.toLowerCase().includes('high'));
  const lowCol = dataset.columns.find(c => c.name.toLowerCase().includes('low'));
  const dateCol = dataset.columns.find(c => c.type === 'datetime');

  if (openCol && closeCol && dateCol) {
    recommendations.push({
      label: `Candlestick Analysis`,
      reason: `Detected OHLC (Open, High, Low, Close) columns. Perfect for financial price movement visualization.`,
      config: {
        id: crypto.randomUUID(),
        title: `Price Movement: ${openCol.name} - ${closeCol.name}`,
        type: 'candlestick',
        xAxis: dateCol.name,
        openCol: openCol.name,
        closeCol: closeCol.name,
        highCol: highCol?.name || openCol.name,
        lowCol: lowCol?.name || openCol.name,
        color: COLORS[6 % COLORS.length]
      }
    });
  }

  return recommendations;
}

export function processDataset(name: string, rawData: any[]): Dataset {
  const INITIAL_COUNT = rawData.length;
  // ULTRA-FAST: Sample early if dataset is huge (> 100k rows)
  const LIMIT = 100000;
  const dataToProcess = INITIAL_COUNT > LIMIT ? _.sampleSize(rawData, LIMIT) : rawData;
  
  const cleaned = cleanData(dataToProcess);
  const rowCount = cleaned.length;
  if (rowCount === 0) return { name, columns: [], data: [], rowCount: 0, colCount: 0, correlationMatrix: {} };

  const keys = Object.keys(cleaned[0]);
  const colCount = keys.length;
  
  // Initialize accumulators for all columns
  const colStats = keys.map(key => ({
    name: key,
    type: 'text' as DataType,
    samples: [] as any[],
    missing: 0,
    uniques: new Set<any>(),
    numericValues: [] as number[],
    sum: 0,
    min: Infinity,
    max: -Infinity,
    counts: {} as Record<string, number>
  }));

  // Single pass to collect samples and basic counts
  const sampleLimit = Math.min(rowCount, 100);
  for (let i = 0; i < sampleLimit; i++) {
    for (let j = 0; j < colCount; j++) {
      const val = cleaned[i][colStats[j].name];
      if (val !== null && val !== undefined && val !== '') {
        colStats[j].samples.push(val);
      }
    }
  }

  // Detect types for all columns based on samples
  for (let j = 0; j < colCount; j++) {
    colStats[j].type = detectType(colStats[j].samples);
  }

  // Main pass: Single pass over data to collect all statistics
  for (let i = 0; i < rowCount; i++) {
    const row = cleaned[i];
    for (let j = 0; j < colCount; j++) {
      const stats = colStats[j];
      const val = row[stats.name];

      if (val === null || val === undefined || val === '') {
        stats.missing++;
      } else {
        stats.uniques.add(val);
        if (stats.type === 'numeric') {
          const n = Number(val);
          if (!isNaN(n)) {
            stats.numericValues.push(n);
            stats.sum += n;
            if (n < stats.min) stats.min = n;
            if (n > stats.max) stats.max = n;
          }
        } else {
          stats.counts[val] = (stats.counts[val] || 0) + 1;
        }
      }
    }
  }

  // Finalize metadata
  const columns: ColumnMetadata[] = colStats.map(stats => {
    const meta: ColumnMetadata = {
      name: stats.name,
      type: stats.type,
      missingValues: stats.missing,
      uniqueValues: stats.uniques.size,
    };

    if (stats.type === 'numeric' && stats.numericValues.length > 0) {
      const nTotal = stats.numericValues.length;
      const mean = stats.sum / nTotal;
      meta.mean = mean;
      meta.min = stats.min;
      meta.max = stats.max;

      // Stats sampling for heavy calculations
      const statsSample = nTotal > 5000 ? _.sampleSize(stats.numericValues, 5000) : stats.numericValues;
      const nSample = statsSample.length;
      
      let sqDiffSum = 0;
      for (let i = 0; i < nSample; i++) {
        sqDiffSum += Math.pow(statsSample[i] - mean, 2);
      }
      meta.stdDev = Math.sqrt(sqDiffSum / nSample);

      const sorted = [...statsSample].sort((a, b) => a - b);
      meta.median = sorted[Math.floor(nSample / 2)];
      
      const q1 = sorted[Math.floor(nSample * 0.25)];
      const q3 = sorted[Math.floor(nSample * 0.75)];
      const iqr = q3 - q1;
      meta.outliersCount = stats.numericValues.slice(0, 1000).filter(v => v < (q1 - 1.5 * iqr) || v > (q3 + 1.5 * iqr)).length * (nTotal / Math.min(nTotal, 1000));
    } else {
      let maxFreq = 0, mostFreq = null;
      for (const k in stats.counts) {
        if (stats.counts[k] > maxFreq) { maxFreq = stats.counts[k]; mostFreq = k; }
      }
      meta.mostFrequent = mostFreq;
    }

    return meta;
  });

  return {
    name,
    columns,
    data: cleaned,
    rowCount: INITIAL_COUNT,
    colCount,
    correlationMatrix: {} 
  };
}
