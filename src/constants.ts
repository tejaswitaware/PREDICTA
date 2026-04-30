import { ChartTheme } from './types';

export const THEMES: ChartTheme[] = [
  {
    id: 'light',
    name: 'Light',
    background: '#ffffff',
    colors: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'],
    gridColor: '#e5e7eb',
    textColor: '#374151',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e5e7eb'
  },
  {
    id: 'dark',
    name: 'Dark',
    background: '#09090b',
    colors: ['#3b82f6', '#10b981', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#818cf8'],
    gridColor: '#27272a',
    textColor: '#a1a1aa',
    tooltipBg: '#18181b',
    tooltipBorder: '#27272a'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    background: '#fcfcfc',
    colors: ['#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#1f2937', '#e5e7eb', '#374151'],
    gridColor: '#f3f4f6',
    textColor: '#4b5563',
    tooltipBg: '#ffffff',
    tooltipBorder: '#f3f4f6'
  },
  {
    id: 'corporate',
    name: 'Corporate',
    background: '#f8fafc',
    colors: ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'],
    gridColor: '#cbd5e1',
    textColor: '#1e293b',
    tooltipBg: '#ffffff',
    tooltipBorder: '#cbd5e1'
  },
  {
    id: 'neon',
    name: 'Neon',
    background: '#000000',
    colors: ['#00ff00', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#0000ff', '#ffffff'],
    gridColor: '#1a1a1a',
    textColor: '#00ff00',
    tooltipBg: '#0a0a0a',
    tooltipBorder: '#00ff00'
  },
  {
    id: 'pastel',
    name: 'Pastel',
    background: '#fffaff',
    colors: ['#ffb7b2', '#ffdac1', '#e2f0cb', '#b5ead7', '#c7ceea', '#fabfb7', '#d4e157'],
    gridColor: '#fff5f5',
    textColor: '#6d6875',
    tooltipBg: '#ffffff',
    tooltipBorder: '#ffdac1'
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    background: '#ffffff',
    colors: ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#eeeeee', '#000000'],
    gridColor: '#eeeeee',
    textColor: '#000000',
    tooltipBg: '#ffffff',
    tooltipBorder: '#000000'
  }
];
