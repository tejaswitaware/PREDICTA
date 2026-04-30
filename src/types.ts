/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DataType = 'numeric' | 'categorical' | 'datetime' | 'text';

export interface ColumnMetadata {
  name: string;
  type: DataType;
  missingValues: number;
  uniqueValues: number;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
  stdDev?: number;
  outliersCount?: number;
  mostFrequent?: any;
}

export interface Dataset {
  name: string;
  columns: ColumnMetadata[];
  data: any[];
  rowCount: number;
  colCount: number;
  correlationMatrix?: Record<string, Record<string, number>>;
}

export interface ChartTheme {
  name: string;
  id: string;
  background: string;
  colors: string[];
  gridColor: string;
  textColor: string;
  fontFamily?: string;
  tooltipBg?: string;
  tooltipBorder?: string;
}

export type ThemeId = 'light' | 'dark' | 'minimal' | 'corporate' | 'neon' | 'pastel' | 'monochrome';

export interface ChartConfig {
  id: string;
  title: string;
  type: 
    | 'bar' | 'pie' | 'line' | 'scatter' | 'area' | 'treemap' | 'box' | 'heatmap' 
    | 'waterfall' | 'bubble' | 'sunburst' | 'histogram' | 'density' | 'violin' 
    | 'donut' | 'funnel' | 'radar' | 'gauge' | 'sankey' | 'candlestick';
  xAxis: string;
  yAxis?: string;
  openCol?: string;
  highCol?: string;
  lowCol?: string;
  closeCol?: string;
  color?: string;
  notes?: string;
}

export interface Dashboard {
  id: string;
  name: string;
  charts: ChartConfig[];
  layouts?: any;
}
