import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Responsive, ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import { 
  Upload, 
  FileText, 
  Trash2, 
  BarChart3, 
  Download, 
  Search, 
  Lightbulb, 
  LayoutDashboard,
  Table as TableIcon,
  ChevronRight,
  PieChart as PieIcon,
  Activity,
  AlertCircle,
  Filter,
  ArrowLeft,
  TrendingUp,
  Rows,
  BoxSelect as BoxIcon,
  Layers,
  Zap,
  Target,
  CandlestickChart,
  Lock,
  Unlock,
  Move,
  Plus,
  Edit2,
  Save,
  MessageSquareQuote,
  X as CloseIcon,
  Moon,
  Sun,
  Home,
  ShieldCheck,
  LifeBuoy,
  Briefcase,
  Menu,
  Sparkles,
  Stethoscope,
  Binary,
  Presentation
} from 'lucide-react';

// Use useContainerWidth hook from RGL to mimic WidthProvider functionality
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ZAxis,
  Treemap, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Funnel, FunnelChart,
  LabelList, ComposedChart, Brush, ReferenceArea
} from 'recharts';
import _ from 'lodash';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { Dataset, ChartConfig, Dashboard, ChartTheme } from './types';
import { 
  processDataset, 
  suggestAutoCharts, 
  getRecommendations, 
  calculateDataQualityScore, 
  generateForecast 
} from './services/dataProcessor';
import { 
  generateAIInsights, 
  generateDataStory, 
  queryDataAssistant 
} from './services/aiService';
import { cn } from '@/lib/utils';
import { THEMES } from './constants';

const COLORS = THEMES[0].colors;

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('predicta-darkmode');
      return saved ? JSON.parse(saved) : false;
    } catch (e) {
      console.warn("localStorage not available", e);
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing...');
  const [searchTerm, setSearchTerm] = useState('');
  const [globalFilter, setGlobalFilter] = useState({ column: '', value: '' });
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [tabHistory, setTabHistory] = useState<string[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>(() => {
    try {
      const saved = localStorage.getItem('predicta-dashboards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("localStorage not available", e);
      return [];
    }
  });
  const [currentDashboardName, setCurrentDashboardName] = useState(() => {
    try {
      const saved = localStorage.getItem('predicta-current-dashboard');
      return saved || 'My Analysis Dashboard';
    } catch (e) {
      return 'My Analysis Dashboard';
    }
  });
  const [selectedTheme, setSelectedTheme] = useState<ChartTheme>(() => {
    try {
      const saved = localStorage.getItem('predicta-theme');
      if (saved) {
        const themeName = saved;
        return THEMES.find(t => t.name === themeName) || THEMES[0];
      }
    } catch (e) {}
    return THEMES[0];
  });
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState('');
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const { width: containerWidth, containerRef: dashboardRef } = useContainerWidth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // New features state
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantResult, setAssistantResult] = useState<{ chart: any; explanation: string } | null>(null);
  const [dataStory, setDataStory] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastConfig, setForecastConfig] = useState({ xAxis: '', yAxis: '', periods: 30 });

  const updateChartTitle = (chartId: string, title: string) => {
    setDashboards(prev => prev.map(d => 
      d.name === currentDashboardName 
        ? { ...d, charts: d.charts.map(c => c.id === chartId ? { ...c, title } : c) } 
        : d
    ));
    setEditingTitle(null);
  };

  // Persistence Effects
  React.useEffect(() => {
    try {
      localStorage.setItem('predicta-dashboards', JSON.stringify(dashboards));
    } catch (e) {}
  }, [dashboards]);

  React.useEffect(() => {
    try {
      localStorage.setItem('predicta-current-dashboard', currentDashboardName);
    } catch (e) {}
  }, [currentDashboardName]);

  React.useEffect(() => {
    try {
      localStorage.setItem('predicta-theme', selectedTheme.name);
    } catch (e) {}
  }, [selectedTheme]);

  React.useEffect(() => {
    try {
      localStorage.setItem('predicta-darkmode', JSON.stringify(isDarkMode));
    } catch (e) {}
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Visualization state
  const [selectedColX, setSelectedColX] = useState<string>('');
  const [selectedColY, setSelectedColY] = useState<string>('');
  const [candlestickCols, setCandlestickCols] = useState({ open: '', high: '', low: '', close: '' });
  const [chartType, setChartType] = useState<string>('bar');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-suggest chart type based on column selection
  React.useEffect(() => {
    if (!dataset || !selectedColX || !selectedColY) return;
    
    const colX = dataset.columns.find(c => c.name === selectedColX);
    const colY = dataset.columns.find(c => c.name === selectedColY);
    
    if (colX?.type === 'numeric' && colY?.type === 'numeric' && selectedColX !== selectedColY) {
      if (chartType !== 'scatter') {
        setChartType('scatter');
        toast.info(`Scatter plot suggested for ${selectedColX} vs ${selectedColY}`, { 
          description: "Numerical relationship detected.",
          duration: 3000 
        });
      }
    } else if (colX?.type === 'categorical' && (colY?.type === 'numeric' || selectedColY === 'rowCount')) {
      if (chartType === 'scatter') setChartType('bar');
    }
  }, [selectedColX, selectedColY, dataset, chartType]);

  const downloadDashboardAsPDF = async () => {
    if (!dashboardRef.current) return;
    
    setIsLoading(true);
    const toastId = toast.loading("Generating PDF...", { description: "Capturing dashboard visuals" });
    
    try {
      const element = dashboardRef.current;
      if (!element) return;
      
      // Calculate optimized scale based on element size
      // 16M pixels is a safe threshold for most browsers (e.g. 4000x4000)
      const totalArea = element.scrollWidth * element.scrollHeight;
      let optimizedScale = 1.5;
      if (totalArea > 8000000) optimizedScale = 1;
      if (totalArea > 16000000) optimizedScale = 0.75;

      const canvas = await html2canvas(element, {
        scale: optimizedScale,
        useCORS: true,
        logging: false,
        backgroundColor: isDarkMode ? "#09090b" : "#fafafa",
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.querySelector(".layout") as HTMLElement;
          if (el) {
            el.style.paddingBottom = "60px";
          }
        },
        ignoreElements: (el) => {
          // Ignore heavy UI elements that shouldn't be in PDF
          return el.classList.contains("no-pdf");
        }
      });
      
      const imgData = canvas.toDataURL("image/jpeg", optimizedScale < 1 ? 0.7 : 0.9);
      
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "l" : "p",
        unit: "px",
        format: [canvas.width, canvas.height],
        hotfixes: ["px_scaling"]
      });
      
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height, undefined, "MEDIUM");
      pdf.save(`${currentDashboardName.replace(/\s+/g, "_")}_${new Date().getTime()}.pdf`);
      
      toast.success("PDF Generated Successfuly!", { id: toastId });
    } catch (error) {
      console.error("PDF generation error:", error);
      // If it failed, try one more time with super low settings if area is huge
      toast.error("Dashboard size limit reached. Try reducing the number of pinned charts or zoom out.", { 
        id: toastId,
        description: "Operation timed out or memory limit exceeded." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if (e.type === 'drop') {
       const dragEvent = e as React.DragEvent;
       dragEvent.preventDefault();
       setIsDragging(false);
       file = dragEvent.dataTransfer?.files?.[0];
    } else if (e.type === 'change') {
       const changeEvent = e as React.ChangeEvent<HTMLInputElement>;
       file = changeEvent.target.files?.[0];
    }

    if (!file) return;

    // Reset input value so the same file can be selected next time
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setIsLoading(true);
    setLoadingMessage("Reading file...");
    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    const isCsv = lowerName.endsWith('.csv') || lowerName.endsWith('.txt') || lowerName.endsWith('.tsv');
    const isExcel = /\.(xlsx|xls|xlsm|xlsb)$/i.test(fileName);

    if (!isCsv && !isExcel) {
      toast.error("Unsupported file type. Please use CSV, Excel, TSV or TXT.");
      setIsLoading(false);
      return;
    }

    const handleComplete = (data: any[]) => {
      if (!data || data.length === 0) {
        toast.error("File appears to be empty or has no recognizable data rows.");
        setIsLoading(false);
        return;
      }

      setLoadingMessage("Analyzing data patterns...");
      
      const worker = new Worker(new URL('./workers/dataWorker.ts', import.meta.url), { type: 'module' });
      
      worker.onmessage = (e) => {
        if (e.data.type === 'SUCCESS') {
          const ds = e.data.result;
          setDataset(ds);
          
          const autoCharts = suggestAutoCharts(ds);
          setDashboards([{ id: crypto.randomUUID(), name: 'Auto Analysis', charts: autoCharts }]);
          setCurrentDashboardName('Auto Analysis');

          setIsLoading(false);
          setLoadingMessage("Processing...");
          toast.success("Intelligence engine finished cleaning and analyzing!");
          handleTabChange('preview');
        } else {
          toast.error("Data analysis failed: " + e.data.error);
          setIsLoading(false);
        }
        worker.terminate();
      };

      worker.onerror = (err) => {
        console.error("Worker error:", err);
        toast.error("Data analysis failed. Falling back to main thread...");
        
        // Fallback to main thread if worker fails
        try {
          const ds = processDataset(fileName, data);
          setDataset(ds);
          const autoCharts = suggestAutoCharts(ds);
          setDashboards([{ id: crypto.randomUUID(), name: 'Auto Analysis', charts: autoCharts }]);
          setIsLoading(false);
          handleTabChange('preview');
        } catch (e) {
          setIsLoading(false);
        }
        worker.terminate();
      };

      worker.postMessage({ name: fileName, rawData: data });
    };

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: 'greedy',
        encoding: "UTF-8",
        worker: true,
        complete: (results: any) => {
          if (results.errors && results.errors.length > 0 && results.data.length === 0) {
            console.error("PapaParse errors:", results.errors);
            toast.error("Failed to parse CSV: " + results.errors[0].message);
            setIsLoading(false);
            return;
          }
          handleComplete(results.data);
        },
        error: (err: any) => {
          console.error("PapaParse error:", err);
          toast.error("Failed to parse CSV: " + err.message);
          setIsLoading(false);
        }
      });
    } else if (isExcel) {
      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          toast.error("Excel file has no visible sheets.");
          setIsLoading(false);
          return;
        }

        // Find the sheet with the most rows of data
        let bestSheetName = workbook.SheetNames[0];
        let maxRows = 0;

        workbook.SheetNames.forEach(name => {
          const sheet = workbook.Sheets[name];
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const rowCount = range.e.r - range.s.r + 1;
          if (rowCount > maxRows) {
            maxRows = rowCount;
            bestSheetName = name;
          }
        });

        const worksheet = workbook.Sheets[bestSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          defval: null,
          blankrows: false,
          header: 0
        });

        if (!Array.isArray(jsonData) || jsonData.length === 0) {
          toast.error("The selected sheet appeared to be empty.");
          setIsLoading(false);
          return;
        }

        handleComplete(jsonData);
      } catch (err) {
        console.error("Excel parse error detailed:", err);
        toast.error("Failed to parse Excel file. It might be corrupted, protected, or in an unsupported format.");
        setIsLoading(false);
      }
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleTabChange = (newTab: string) => {
    if (newTab !== activeTab) {
      setTabHistory(prev => [...prev, activeTab]);
      setActiveTab(newTab);
    }
  };

  const goBack = () => {
    if (tabHistory.length > 0) {
      const prev = [...tabHistory];
      const lastTab = prev.pop();
      setTabHistory(prev);
      if (lastTab) setActiveTab(lastTab);
    }
  };

  const handleLayoutChange = (allLayouts: any) => {
    setDashboards(prev => prev.map(d => 
      d.name === currentDashboardName ? { ...d, layouts: allLayouts } : d
    ));
  };

  const generateDefaultLayout = (charts: ChartConfig[]) => {
    return charts.map((chart, i) => ({
      i: chart.id,
      x: (i % 2) * 6,
      y: Math.floor(i / 2) * 4,
      w: 6,
      h: 4,
      minW: 3,
      minH: 2
    }));
  };

  const currentDashboard = useMemo(() => 
    dashboards.find(d => d.name === currentDashboardName),
  [dashboards, currentDashboardName]);

  const getInsights = async () => {
    if (!dataset) return;
    setIsLoading(true);
    setLoadingMessage("AI Brain is pondering your data...");
    const insights = await generateAIInsights(dataset);
    setAiInsights(insights);
    setIsLoading(false);
    setLoadingMessage("Processing...");
    toast.info("AI Insights generated");
  };

  const handleAssistantQuery = async () => {
    if (!dataset || !assistantQuery.trim()) return;
    setIsLoading(true);
    setLoadingMessage("Searching for patterns...");
    const result = await queryDataAssistant(dataset, assistantQuery);
    if (result) {
      setAssistantResult(result);
      toast.success("Chart generated by AI!");
    } else {
      toast.error("Assistant couldn't understand that query. Try being more specific about columns.");
    }
    setIsLoading(false);
  };

  const handleGenerateStory = async () => {
    if (!dataset) return;
    setIsLoading(true);
    setLoadingMessage("Drafting your data narrative...");
    const story = await generateDataStory(dataset);
    setDataStory(story);
    setIsLoading(false);
    toast.success("Data Story generated!");
  };

  const handleQualityCheck = () => {
    if (!dataset) return;
    const score = calculateDataQualityScore(dataset);
    setQualityScore(score);
    handleTabChange('quality');
  };

  const handleForecast = () => {
    if (!dataset || !forecastConfig.xAxis || !forecastConfig.yAxis) return;
    const data = generateForecast(dataset, forecastConfig.xAxis, forecastConfig.yAxis, forecastConfig.periods);
    setForecastData(data);
    toast.success(`Generated ${forecastConfig.periods} point forecast`);
  };

  const applyTemplate = (type: string) => {
    if (!dataset) return;
    const numeric = dataset.columns.filter(c => c.type === 'numeric').map(c => c.name);
    const categorical = dataset.columns.filter(c => c.type === 'categorical').map(c => c.name);
    const datetime = dataset.columns.filter(c => c.type === 'datetime').map(c => c.name);

    let charts: ChartConfig[] = [];
    const templateName = `${type.charAt(0).toUpperCase() + type.slice(1)} Template`;

    if (type === 'sales') {
      if (datetime[0] && numeric[0]) charts.push({ id: crypto.randomUUID(), title: 'Sales Trend', type: 'line', xAxis: datetime[0], yAxis: numeric[0], color: COLORS[0] });
      if (categorical[0] && numeric[0]) charts.push({ id: crypto.randomUUID(), title: 'Revenue by Category', type: 'bar', xAxis: categorical[0], yAxis: numeric[0], color: COLORS[1] });
      if (categorical[1] && numeric[0]) charts.push({ id: crypto.randomUUID(), title: 'Performance by Region', type: 'pie', xAxis: categorical[1], yAxis: numeric[0], color: COLORS[2] });
    } else if (type === 'finance') {
      const profitCol = numeric.find(c => c.toLowerCase().includes('profit')) || numeric[1];
      if (datetime[0] && numeric[0]) charts.push({ id: crypto.randomUUID(), title: 'Monthly Revenue', type: 'area', xAxis: datetime[0], yAxis: numeric[0], color: COLORS[3] });
      if (datetime[0] && profitCol) charts.push({ id: crypto.randomUUID(), title: 'Profit Margin', type: 'line', xAxis: datetime[0], yAxis: profitCol, color: COLORS[4] });
    } else {
      // General template
      if (categorical[0]) charts.push({ id: crypto.randomUUID(), title: 'Group Distribution', type: 'pie', xAxis: categorical[0], color: COLORS[5] });
      if (numeric[0] && categorical[0]) charts.push({ id: crypto.randomUUID(), title: 'Metric Comparison', type: 'bar', xAxis: categorical[0], yAxis: numeric[0], color: COLORS[6] });
    }

    if (charts.length > 0) {
      const newDb: Dashboard = { id: crypto.randomUUID(), name: templateName, charts };
      setDashboards(prev => [...prev, newDb]);
      setCurrentDashboardName(templateName);
      handleTabChange('dashboard');
      toast.success(`${templateName} applied!`);
    } else {
      toast.error("Dataset doesn't have enough compatible columns for this template.");
    }
  };

  const filteredData = useMemo(() => {
    if (!dataset || !searchTerm) return dataset?.data || [];
    return dataset.data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [dataset, searchTerm]);

  const addToDashboard = () => {
    if (!selectedColX) return;
    const newChart: ChartConfig = {
      id: crypto.randomUUID(),
      title: `${chartType.toUpperCase()}: ${selectedColX} ${selectedColY ? 'vs ' + selectedColY : ''}`,
      type: chartType as any,
      xAxis: selectedColX,
      yAxis: chartType === 'candlestick' ? undefined : selectedColY,
      openCol: chartType === 'candlestick' ? candlestickCols.open : undefined,
      highCol: chartType === 'candlestick' ? candlestickCols.high : undefined,
      lowCol: chartType === 'candlestick' ? candlestickCols.low : undefined,
      closeCol: chartType === 'candlestick' ? candlestickCols.close : undefined,
      color: selectedTheme.colors[Math.floor(Math.random() * selectedTheme.colors.length)]
    };
    
    setDashboards(prev => {
      const existing = prev.find(d => d.name === currentDashboardName);
      if (existing) {
        return prev.map(d => d.name === currentDashboardName ? { ...d, charts: [...d.charts, newChart] } : d);
      } else {
        return [...prev, { id: crypto.randomUUID(), name: currentDashboardName, charts: [newChart] }];
      }
    });
    setChartType('bar'); // Reset to default
    toast.success("Added to dashboard");
  };

  const downloadCleaned = () => {
    if (!dataset) return;
    const ws = XLSX.utils.json_to_sheet(dataset.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CleanedData");
    XLSX.writeFile(wb, `${dataset.name}_cleaned.csv`);
  };

  const createNewDashboard = () => {
    const name = `Dashboard ${dashboards.length + 1}`;
    const newDb: Dashboard = { id: crypto.randomUUID(), name, charts: [] };
    setDashboards(prev => [...prev, newDb]);
    setCurrentDashboardName(name);
    toast.success(`Created dashboard: ${name}`);
  };

  const deleteDashboard = (name: string) => {
    if (dashboards.length <= 1) {
      toast.error("At least one dashboard must exist.");
      return;
    }
    setDashboards(prev => prev.filter(d => d.name !== name));
    if (currentDashboardName === name) {
      setCurrentDashboardName(dashboards.find(d => d.name !== name)?.name || '');
    }
    toast.info("Dashboard deleted");
  };

  const updateChartNotes = (chartId: string, notes: string) => {
    setDashboards(prev => prev.map(d => 
      d.name === currentDashboardName 
        ? { ...d, charts: d.charts.map(c => c.id === chartId ? { ...c, notes } : c) } 
        : d
    ));
    setEditingNotes(null);
  };

  const visualizationData = useMemo(() => {
    if (!dataset) return [];
    
    let baseData = dataset.data;
    
    // Apply Global Filter
    if (globalFilter.column && globalFilter.value) {
      baseData = baseData.filter(row => 
        String(row[globalFilter.column]).toLowerCase().includes(globalFilter.value.toLowerCase())
      );
    }
    
    // Sample for visual performance
    return baseData.length > 5000 ? _.sampleSize(baseData, 5000) : baseData;
  }, [dataset, globalFilter]);

  const CandlestickBar = (props: any) => {
    const { x, width, y, height, payload, openCol, closeCol, lowCol, highCol } = props;
    if (x === undefined || y === undefined) return null;

    const open = Number(payload[openCol]);
    const close = Number(payload[closeCol]);
    const low = Number(payload[lowCol]);
    const high = Number(payload[highCol]);
    
    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#ef4444';
    
    const valueRange = Math.abs(close - open) || 0.0001; 
    const pxPerUnit = Number(height) / valueRange;
    
    const wickTop = y - (high - Math.max(open, close)) * pxPerUnit;
    const wickBottom = y + (Number(height) || 0) + (Math.min(open, close) - low) * pxPerUnit;
    const centerX = x + width / 2;
    
    return (
      <g>
        <line x1={centerX} y1={wickTop} x2={centerX} y2={wickBottom} stroke={color} strokeWidth={1} />
        <rect x={x} y={y} width={width} height={height} fill={color} />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label, theme }: any) => {
    if (active && payload && payload.length) {
      return (
        <div 
          className="p-3 rounded-lg shadow-xl border backdrop-blur-md"
          style={{ 
            backgroundColor: `${theme.tooltipBg}f2`, 
            borderColor: theme.tooltipBorder,
            color: theme.textColor,
            fontSize: '11px',
            minWidth: '140px'
          }}
        >
          <div className="font-bold mb-2 pb-1 border-b border-zinc-200/20 flex justify-between items-center">
            <span className="truncate max-w-[120px]">{label}</span>
          </div>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: entry.color || entry.fill }} />
                  <span className="opacity-80 capitalize">{entry.name}:</span>
                </div>
                <span className="font-mono font-bold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-1 border-t border-zinc-200/5 text-[9px] opacity-40 italic flex items-center gap-1">
             <Zap size={10} /> Detailed Insight
          </div>
        </div>
      );
    }
    return null;
  };

  const ZoomableChart = ({ type, data, config, theme, height }: { type: string, data: any[], config: ChartConfig, theme: ChartTheme, height: any }) => {
    const [zoomState, setZoomState] = useState({
      left: 'dataMin',
      right: 'dataMax',
      refAreaLeft: '',
      refAreaRight: '',
      top: 'dataMax',
      bottom: 'dataMin',
    });

    const zoom = () => {
      let { refAreaLeft, refAreaRight } = zoomState;

      if (refAreaLeft === refAreaRight || refAreaRight === '') {
        setZoomState(prev => ({ ...prev, refAreaLeft: '', refAreaRight: '' }));
        return;
      }

      if (refAreaLeft > refAreaRight) [refAreaLeft, refAreaRight] = [refAreaRight, refAreaLeft];

      setZoomState(prev => ({
        ...prev,
        refAreaLeft: '',
        refAreaRight: '',
        left: refAreaLeft,
        right: refAreaRight,
      }));
    };

    const zoomOut = () => {
      setZoomState({
        left: 'dataMin',
        right: 'dataMax',
        refAreaLeft: '',
        refAreaRight: '',
        top: 'dataMax',
        bottom: 'dataMin',
      });
    };

    const chartStyle = {
      background: theme.background,
      fontFamily: theme.fontFamily || 'inherit',
      fontSize: '11px'
    };

    const commonXAxisProps = {
      dataKey: config.xAxis,
      domain: [zoomState.left, zoomState.right],
      stroke: theme.textColor,
      fontSize: 10,
      tickLine: false,
      axisLine: false,
      allowDataOverflow: true
    };

    const commonYAxisProps = {
      domain: [zoomState.bottom, zoomState.top],
      stroke: theme.textColor,
      fontSize: 10,
      tickLine: false,
      axisLine: false,
      allowDataOverflow: true
    };

    return (
      <div className="relative w-full h-full group/chart select-none">
        {(zoomState.left !== 'dataMin' || zoomState.right !== 'dataMax') && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute top-2 right-2 z-20 h-7 text-[10px] rounded-full shadow-lg opacity-100 lg:opacity-0 lg:group-hover/chart:opacity-100 transition-opacity bg-white/90 dark:bg-zinc-800/90 text-primary hover:bg-primary hover:text-white border-zinc-200 dark:border-zinc-700"
            onClick={zoomOut}
          >
            Reset Zoom
          </Button>
        )}

        <ResponsiveContainer width="100%" height={height}>
          {(() => {
            const chartHandlers = {
              onMouseDown: (e: any) => {
                if (e && e.activeLabel) setZoomState(prev => ({ ...prev, refAreaLeft: e.activeLabel }));
                else if (e && e.activeCoordinate) setZoomState(prev => ({ ...prev, refAreaLeft: e.activeCoordinate.x }));
              },
              onMouseMove: (e: any) => {
                if (zoomState.refAreaLeft) {
                   if (e && e.activeLabel) setZoomState(prev => ({ ...prev, refAreaRight: e.activeLabel }));
                   else if (e && e.activeCoordinate) setZoomState(prev => ({ ...prev, refAreaRight: e.activeCoordinate.x }));
                }
              },
              onMouseUp: zoom,
            };

            if (type === 'line') {
              return (
                <LineChart data={data} style={chartStyle} margin={{ bottom: 10 }} {...chartHandlers}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                  <XAxis {...commonXAxisProps} />
                  <YAxis {...commonYAxisProps} />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Legend verticalAlign="top" iconType="circle" />
                  <Line 
                    type="monotone" 
                    name={config.yAxis || 'Value'}
                    dataKey={config.yAxis || 'value'} 
                    stroke={config.color || theme.colors[0]} 
                    strokeWidth={3} 
                    dot={data.length < 100 ? { r: 4, fill: config.color || theme.colors[0], strokeWidth: 2, stroke: theme.background } : false} 
                    activeDot={{ r: 6, stroke: theme.background, strokeWidth: 2 }} 
                    isAnimationActive={false}
                  />
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea x1={zoomState.refAreaLeft} x2={zoomState.refAreaRight} strokeOpacity={0.3} fill={theme.colors[0]} fillOpacity={0.1} />
                  ) : null}
                </LineChart>
              );
            }
            if (type === 'area') {
              return (
                <AreaChart data={data} style={chartStyle} margin={{ bottom: 10 }} {...chartHandlers}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
                  <XAxis {...commonXAxisProps} />
                  <YAxis {...commonYAxisProps} />
                  <Tooltip content={<CustomTooltip theme={theme} />} />
                  <Legend verticalAlign="top" iconType="circle" />
                  <Area 
                    type="monotone" 
                    name={config.yAxis || 'Value'}
                    dataKey={config.yAxis || 'value'} 
                    fill={config.color || theme.colors[0]} 
                    stroke={config.color || theme.colors[0]} 
                    fillOpacity={0.2} 
                    isAnimationActive={false}
                  />
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea x1={zoomState.refAreaLeft} x2={zoomState.refAreaRight} strokeOpacity={0.3} fill={theme.colors[0]} fillOpacity={0.1} />
                  ) : null}
                </AreaChart>
              );
            }
            if (type === 'scatter') {
              return (
                <ScatterChart data={data} style={chartStyle} margin={{ bottom: 10 }} {...chartHandlers}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
                  <XAxis {...commonXAxisProps} type="number" name={config.xAxis} />
                  <YAxis {...commonYAxisProps} type="number" name={config.yAxis} />
                  <Tooltip content={<CustomTooltip theme={theme} />} cursor={{ strokeDasharray: '3 3' }} />
                  <Legend verticalAlign="top" iconType="circle" />
                  <Scatter name={`${config.xAxis} vs ${config.yAxis}`} data={data} fill={config.color || theme.colors[0]} isAnimationActive={false} />
                  {zoomState.refAreaLeft && zoomState.refAreaRight ? (
                    <ReferenceArea x1={zoomState.refAreaLeft} x2={zoomState.refAreaRight} strokeOpacity={0.3} fill={theme.colors[0]} fillOpacity={0.1} />
                  ) : null}
                </ScatterChart>
              );
            }
            return null;
          })()}
        </ResponsiveContainer>
      </div>
    );
  };

  const renderChart = (chart: ChartConfig, height: any = 300) => {
    if (!dataset) return null;
    const chartData = visualizationData;
    const theme = selectedTheme;

    const chartStyle = {
      background: theme.background,
      fontFamily: theme.fontFamily || 'inherit',
      fontSize: '12px'
    };

    switch (chart.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} style={chartStyle}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
              <XAxis dataKey={chart.xAxis} stroke={theme.textColor} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke={theme.textColor} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} cursor={{ fill: theme.gridColor, opacity: 0.1 }} />
              <Legend verticalAlign="top" iconType="circle" />
              <Bar dataKey={chart.yAxis || 'rowCount'} name={chart.yAxis || 'Count'} fill={chart.color || theme.colors[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie':
      case 'donut':
        const counts = _.countBy(dataset.data, chart.xAxis);
        const pieData = Object.keys(counts).map(name => ({ name, value: counts[name] }));
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart style={chartStyle}>
              <Pie 
                data={pieData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={height * 0.3} 
                innerRadius={chart.type === 'donut' ? height * 0.22 : 0}
                label={{ fill: theme.textColor, fontSize: 10 }}
                paddingAngle={2}
              >
                {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} stroke={theme.background} strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'line':
        return <ZoomableChart type="line" data={chartData} config={chart} theme={theme} height={height} />;
      case 'area':
        return <ZoomableChart type="area" data={chartData} config={chart} theme={theme} height={height} />;
      case 'scatter':
      case 'bubble':
        return <ZoomableChart type="scatter" data={chartData} config={chart} theme={theme} height={height} />;
      case 'treemap':
        const treeCounts = _.countBy(dataset.data, chart.xAxis);
        const treeData = Object.keys(treeCounts).map(name => ({ name, size: treeCounts[name] }));
        return (
          <ResponsiveContainer width="100%" height={height}>
            <Treemap
              data={treeData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke={theme.background}
              fill={chart.color || theme.colors[0]}
              style={chartStyle}
            >
               <Tooltip content={<CustomTooltip theme={theme} />} />
            </Treemap>
          </ResponsiveContainer>
        );
      case 'radar':
        const radarCounts = _.countBy(dataset.data, chart.xAxis);
        const radarData = Object.keys(radarCounts).map(name => ({ name, value: radarCounts[name] }));
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData} style={chartStyle}>
              <PolarGrid stroke={theme.gridColor} />
              <PolarAngleAxis dataKey="name" stroke={theme.textColor} />
              <PolarRadiusAxis stroke={theme.gridColor} />
              <Radar name={chart.xAxis} dataKey="value" stroke={chart.color || theme.colors[0]} fill={chart.color || theme.colors[0]} fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
            </RadarChart>
          </ResponsiveContainer>
        );
      case 'funnel':
        const funnelCounts = _.countBy(dataset.data, chart.xAxis);
        const funnelData = Object.keys(funnelCounts)
          .map(name => ({ name, value: funnelCounts[name] }))
          .sort((a, b) => b.value - a.value);
        return (
          <ResponsiveContainer width="100%" height={height}>
            <FunnelChart style={chartStyle}>
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Funnel dataKey="value" data={funnelData} isAnimationActive>
                <LabelList position="right" fill={theme.textColor} stroke="none" dataKey="name" />
                {funnelData.map((_entry, index) => <Cell key={`cell-${index}`} fill={theme.colors[index % theme.colors.length]} />)}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
      case 'box':
        if (!chart.xAxis) return null;
        const colMeta = dataset.columns.find(c => c.name === chart.xAxis);
        if (!colMeta || colMeta.type !== 'numeric') return <div className="text-xs text-center p-4">Box plot requires a numeric column.</div>;
        const boxData = [
          {
            name: colMeta.name,
            min: colMeta.min,
            q1: colMeta.mean! - (colMeta.stdDev! * 0.67), // Approximate
            median: colMeta.median,
            q3: colMeta.mean! + (colMeta.stdDev! * 0.67),
            max: colMeta.max
          }
        ];
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={boxData} layout="vertical" style={chartStyle}>
              <XAxis type="number" stroke={theme.textColor} fontSize={10} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" stroke={theme.textColor} fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Bar dataKey="q3" fill={chart.color || theme.colors[0]} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'waterfall':
        const wCounts = _.countBy(dataset.data, chart.xAxis);
        let cumulative = 0;
        const waterfallData = Object.keys(wCounts).map(name => {
          const val = wCounts[name];
          const start = cumulative;
          cumulative += val;
          return { name, start, val, end: cumulative };
        });
        return (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={waterfallData} style={chartStyle}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
              <XAxis dataKey="name" stroke={theme.textColor} fontSize={10} axisLine={false} tickLine={false} />
              <YAxis stroke={theme.textColor} fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Bar dataKey="val" fill={chart.color || theme.colors[0]} />
            </ComposedChart>
          </ResponsiveContainer>
        );
      case 'gauge':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart style={chartStyle}>
              <Pie
                data={[{ value: 75 }, { value: 25 }]}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
              >
                <Cell fill={chart.color || theme.colors[0]} />
                <Cell fill={theme.gridColor} />
              </Pie>
              <Tooltip content={<CustomTooltip theme={theme} />} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'candlestick':
        if (!chart.openCol || !chart.closeCol) return <div className="text-xs text-center p-4">Candlestick requires open/close columns.</div>;
        const candleData = chartData.map(d => ({
          ...d,
          candleRange: [Number(d[chart.openCol!]), Number(d[chart.closeCol!])]
        }));
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={candleData} style={chartStyle} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
              <XAxis dataKey={chart.xAxis} stroke={theme.textColor} fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={['auto', 'auto']} stroke={theme.textColor} fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Bar 
                dataKey="candleRange" 
                shape={
                  <CandlestickBar 
                    openCol={chart.openCol} 
                    closeCol={chart.closeCol} 
                    lowCol={chart.lowCol || chart.openCol} 
                    highCol={chart.highCol || chart.openCol} 
                    height={height}
                  />
                } 
              />
              <Brush dataKey={chart.xAxis} height={30} stroke={theme.colors[0]} fill={theme.background} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'histogram':
        if (!chart.xAxis) return null;
        const values = dataset.data.map(d => Number(d[chart.xAxis])).filter(v => !isNaN(v));
        const min = (_.min(values) as number) ?? 0;
        const max = (_.max(values) as number) ?? 100;
        const binCount = 10;
        const binWidth = (max - min) / binCount;
        const bins = new Array(binCount).fill(0).map((_, i) => ({
          name: `${(min + i * binWidth).toFixed(1)} - ${(min + (i + 1) * binWidth).toFixed(1)}`,
          count: 0
        }));
        values.forEach(v => {
          const binIdx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
          if (binIdx >= 0) bins[binIdx].count++;
        });
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={bins} style={chartStyle}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.gridColor} />
              <XAxis dataKey="name" fontSize={10} stroke={theme.textColor} axisLine={false} tickLine={false} />
              <YAxis stroke={theme.textColor} fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Bar dataKey="count" fill={chart.color || theme.colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'heatmap':
        // Simplified heatmap using a block grid if both are categorical
        return (
           <div className="h-full flex items-center justify-center text-zinc-400 rounded-xl border border-dashed" style={{ backgroundColor: theme.background, color: theme.textColor }}>
             Heatmap requires specialized rendering (D3 planned).
           </div>
        );
      default:
        return <div className="h-full flex items-center justify-center text-muted-foreground italic">Chart type {chart.type} experimental.</div>;
    }
  };

  return (
    <div className={cn("min-h-screen flex transition-colors duration-300", isDarkMode ? "dark bg-zinc-950 text-zinc-50" : "bg-zinc-50 text-zinc-950")}>
      <Toaster position="top-center" richColors />
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-64 border-r border-zinc-200 dark:border-zinc-800 flex-col p-6 space-y-8 bg-white dark:bg-zinc-900 sticky top-0 h-screen overflow-y-auto z-40">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg">
            <Activity size={24} />
          </div>
          <h1 className="font-bold text-2xl leading-tight tracking-tighter">PREDICTA</h1>
        </div>

        <nav className="flex flex-col space-y-1">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'services', icon: Briefcase, label: 'Services' },
            { id: 'upload', icon: Upload, label: 'Upload Data' },
            { id: 'preview', icon: TableIcon, label: 'Cleaned Data' },
            { id: 'analysis', icon: BarChart3, label: 'Auto Insights' },
            { id: 'visualization', icon: PieIcon, label: 'Visualizer' },
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboards' },
            { id: 'privacy', icon: ShieldCheck, label: 'Privacy & Security' },
            { id: 'help', icon: LifeBuoy, label: 'Help Center' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-foreground"
              )}
            >
              <item.icon size={18} className={cn("transition-transform group-hover:scale-110", activeTab === item.id ? "" : "text-zinc-400")} />
              {item.label}
            </button>
          ))}
        </nav>

        <Separator className="bg-zinc-200 dark:bg-zinc-800" />

        <div className="space-y-6">
          <div className="space-y-3">
             <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1">Visual Theme</Label>
             <div className="grid grid-cols-4 gap-2">
               {THEMES.map((theme) => (
                 <button
                   key={theme.id}
                   onClick={() => {
                     setSelectedTheme(theme);
                     if (theme.id === 'dark' || theme.id === 'neon') setIsDarkMode(true);
                     if (theme.id === 'light' || theme.id === 'pastel') setIsDarkMode(false);
                     toast.info(`Applied ${theme.name} Theme`);
                   }}
                   className={cn(
                     "w-full aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 group relative overflow-hidden",
                     selectedTheme.id === theme.id ? "border-primary ring-2 ring-primary/20 scale-105" : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                   )}
                   title={theme.name}
                 >
                   <div 
                     className="w-5 h-5 rounded-full shadow-inner border border-zinc-200/20" 
                     style={{ background: theme.colors[0] }} 
                   />
                   <span className="text-[8px] font-bold uppercase truncate w-full text-center px-1">{theme.name}</span>
                 </button>
               ))}
             </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode" className="text-xs font-semibold uppercase tracking-wider text-zinc-400 pl-1">Dark Mode</Label>
            <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={setIsDarkMode} />
          </div>
          <Button variant="outline" className="w-full justify-start gap-2 text-zinc-500 border-zinc-200 dark:border-zinc-800" onClick={downloadCleaned} disabled={!dataset}>
            <Download size={16} />
            Export Data
          </Button>
        </div>
        
        <div className="mt-auto space-y-4 pt-6">
          {dataset && (
            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Active Intelligence</p>
              <p className="text-sm font-semibold truncate leading-none mb-1">{dataset.name}</p>
              <p className="text-[10px] text-muted-foreground">{dataset.rowCount.toLocaleString()} records · {dataset.colCount} dimensions</p>
            </div>
          )}
          <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl space-y-3">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">System: Active</span>
             </div>
             <p className="text-[10px] text-zinc-500 leading-tight">
               Local persistence active. {dashboards.length} workspace{dashboards.length !== 1 ? 's' : ''} synced.
             </p>
          </div>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-zinc-950 z-[101] lg:hidden p-6 shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg">
                    <Activity size={20} />
                  </div>
                  <h1 className="font-bold text-xl tracking-tighter">PREDICTA</h1>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                  <CloseIcon size={20} />
                </Button>
              </div>

              <nav className="flex flex-col space-y-2 overflow-y-auto pr-2">
                {[
                  { id: 'home', icon: Home, label: 'Home' },
                  { id: 'services', icon: Briefcase, label: 'Services' },
                  { id: 'upload', icon: Upload, label: 'Upload Data' },
                  { id: 'preview', icon: TableIcon, label: 'Cleaned Data' },
                  { id: 'assistant', icon: Sparkles, label: 'AI Assistant' },
                  { id: 'story', icon: Presentation, label: 'Story Mode' },
                  { id: 'quality', icon: Stethoscope, label: 'Health Score' },
                  { id: 'forecast', icon: Binary, label: 'Forecasting' },
                  { id: 'analysis', icon: BarChart3, label: 'Auto Insights' },
                  { id: 'visualization', icon: PieIcon, label: 'Visualizer' },
                  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboards' },
                  { id: 'privacy', icon: ShieldCheck, label: 'Privacy & Security' },
                  { id: 'help', icon: LifeBuoy, label: 'Help Center' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all w-full text-left",
                      activeTab === item.id 
                        ? "bg-primary text-primary-foreground shadow-lg" 
                        : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="mt-auto pt-6 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Dark Mode</span>
                  <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                </div>
                {dataset && (
                  <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-4">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Dataset</p>
                    <p className="text-sm font-bold truncate">{dataset.name}</p>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-wrap gap-4 justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="lg:hidden shrink-0" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={20} />
            </Button>
            <div className="flex items-center gap-4">
              {tabHistory.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-full gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 shadow-sm"
                  onClick={goBack}
                >
                  <ArrowLeft size={16} />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              )}
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-1 capitalize">
                  {activeTab.replace('-', ' ')}
                </h2>
                <p className="text-muted-foreground">
                  {dataset ? `Analyzing ${dataset.name}` : "Upload a file to get started."}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <Input 
                placeholder="Search values..." 
                className="pl-10 w-64 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Home Section */}
            {activeTab === 'home' && (
              <div className="space-y-12 py-6">
                <section className="text-center space-y-4 md:space-y-6 max-w-4xl mx-auto px-4">
                  <Badge variant="outline" className="px-4 py-1 text-primary border-primary/20 bg-primary/5 rounded-full text-[10px] md:text-xs">New Dashboard Experience v2.0</Badge>
                  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1]">
                    Transform Raw Data into <span className="text-primary italic">Intelligence</span>
                  </h1>
                  <p className="text-base md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                    PREDICTA is your all-in-one data science workspace. Clean, analyze, and visualize your datasets with AI-powered suggestions.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 px-6 md:px-0">
                    <Button size="lg" className="w-full sm:w-auto rounded-full px-8 h-14 text-base font-bold shadow-xl shadow-primary/20" onClick={() => handleTabChange('upload')}>
                      Get Started <ChevronRight className="ml-2" size={18} />
                    </Button>
                    <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 h-14 text-base font-bold" onClick={() => handleTabChange('services')}>
                      Explore Services
                    </Button>
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="relative">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 mb-2 group-hover:scale-110 transition-transform">
                        <Zap size={24} />
                      </div>
                      <CardTitle className="text-xl">Fast Processing</CardTitle>
                      <CardDescription>Handle thousands of records in seconds with our optimized engine.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="relative">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-2 group-hover:scale-110 transition-transform">
                        <Lightbulb size={24} />
                      </div>
                      <CardTitle className="text-xl">AI Insights</CardTitle>
                      <CardDescription>Leverage Gemini to discover hidden patterns and trends in your data.</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="relative">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-2 group-hover:scale-110 transition-transform">
                        <LayoutDashboard size={24} />
                      </div>
                      <CardTitle className="text-xl">Dynamic Reports</CardTitle>
                      <CardDescription>Create stunning PDF reports and shareable dashboards instantly.</CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <Card className="bg-zinc-900 text-white overflow-hidden border-none shadow-2xl relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10 hidden md:block">
                    <Activity size={200} />
                  </div>
                  <CardContent className="p-8 md:p-12 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    <div className="space-y-6 max-w-xl text-center lg:text-left">
                      <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to see the future?</h2>
                      <p className="text-zinc-400 text-base md:text-lg">Join thousands of analysts who use PREDICTA to make faster, data-driven decisions.</p>
                      <Button className="bg-white text-zinc-900 hover:bg-zinc-200 rounded-full px-10 py-6 text-lg font-bold w-full sm:w-auto" onClick={() => handleTabChange('upload')}>
                        Upload First Dataset
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-4 w-full lg:w-auto">
                      <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 backdrop-blur-sm">
                        <p className="text-3xl font-bold uppercase tracking-tighter">99.9%</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Uptime</p>
                      </div>
                      <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 backdrop-blur-sm">
                        <p className="text-3xl font-bold uppercase tracking-tighter">5k+</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Daily Users</p>
                      </div>
                      <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 backdrop-blur-sm">
                        <p className="text-3xl font-bold uppercase tracking-tighter">0ms</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Latentcy</p>
                      </div>
                      <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 backdrop-blur-sm">
                        <p className="text-3xl font-bold uppercase tracking-tighter">256-bit</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Encryption</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Services Section */}
            {activeTab === 'services' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 px-2 md:px-0">
                <header className="max-w-2xl text-center md:text-left mx-auto md:mx-0">
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Enterprise Services</h1>
                  <p className="text-zinc-500 dark:text-zinc-400">Tailored data solutions for every stage of your business growth. From basic cleaning to advanced predictive modeling.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { title: "Data Cleaning", desc: "Automated outlier detection, missing value imputation, and formatting normalization.", icon: Target, price: "Free" },
                    { title: "Predictive Analytics", desc: "Machine learning models to forecast future trends based on historical data.", icon: TrendingUp, price: "Custom" },
                    { title: "Team Collaboration", desc: "Shared workspaces, version control for dashboards, and multi-user access.", icon: Layers, price: "$29/mo" },
                    { title: "Custom API Access", desc: "Integrate PREDICTA intelligence directly into your own applications.", icon: Zap, price: "$99/mo" },
                    { title: "Expert Support", desc: "Access to dedicated data scientists to help you interpret complex results.", icon: MessageSquareQuote, price: "$150/hr" },
                    { title: "Compliance Audits", desc: "Regulatory reporting and automated checks for data handling compliance.", icon: ShieldCheck, price: "$499/ev" }
                  ].map((service, i) => (
                    <Card key={i} className="hover:border-primary/50 transition-all cursor-pointer group">
                      <CardHeader>
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-2 group-hover:scale-110 transition-transform">
                          <service.icon size={20} />
                        </div>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                          <Badge variant="secondary">{service.price}</Badge>
                        </div>
                        <CardDescription className="text-sm mt-2">{service.desc}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button variant="ghost" className="w-full text-xs font-bold uppercase tracking-widest hover:text-primary p-0 h-auto justify-start">
                          Learn More <ChevronRight size={14} className="ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="bg-zinc-100 dark:bg-zinc-900 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold">Need a custom solution?</h3>
                    <p className="text-sm text-zinc-500">Contact our enterprise sales team for a demo tailored to your data needs.</p>
                  </div>
                  <Button size="lg" className="rounded-full px-10">Contact Sales</Button>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeTab === 'privacy' && (
              <div className="max-w-4xl space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <section className="space-y-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mb-6">
                    <ShieldCheck size={32} />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Privacy & Security</h1>
                  <p className="text-zinc-500 text-lg leading-relaxed">Your data is yours. Period. We implement industry-leading security protocols to ensure your information remains private and secure at all times.</p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Lock size={18} className="text-zinc-400" />
                      Client-Side Encryption
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      All data processing is performed locally in your browser whenever possible. We use advanced AES-256 encryption for any sensitive metadata stored in our systems.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Search size={18} className="text-zinc-400" />
                      Transparent Processing
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      We never sell your data to third parties. Our AI insights engine uses anonymized tokens, ensuring your specific business records are never exposed to external models.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Zap size={18} className="text-zinc-400" />
                      SOC2 Compliant
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      Our infrastructure is hosted on world-class facilities with SOC2 Type II compliance, ensuring rigorous controls for security, availability, and confidentiality.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <LifeBuoy size={18} className="text-zinc-400" />
                      Right to be Forgotten
                    </h3>
                    <p className="text-zinc-500 text-sm leading-relaxed">
                      You can delete your workspaces and data at any time. When you hit delete, our scrubbers ensure no traces of your dataset remain on our servers.
                    </p>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-900 border p-8 rounded-3xl space-y-6">
                  <h3 className="text-xl font-bold">Data Management Checklist</h3>
                  <div className="space-y-4">
                    {[
                      { l: "Secure Cloud Storage", v: "Active" },
                      { l: "End-to-End Encryption", v: "Enabled" },
                      { l: "Auto-Scrubbing Policy", v: "30 Days" },
                      { l: "Multi-Factor Authentication", v: "Available" }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <span className="text-sm font-medium text-zinc-500">{item.l}</span>
                        <Badge variant="secondary" className="font-mono text-xs">{item.v}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            {activeTab === 'help' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <header className="text-center space-y-4 max-w-2xl mx-auto">
                  <h1 className="text-4xl font-bold tracking-tight">How can we help?</h1>
                  <div className="relative mt-8">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                    <Input className="h-16 pl-12 rounded-2xl text-lg shadow-xl shadow-zinc-200/50 dark:shadow-none border-zinc-200 dark:border-zinc-800" placeholder="Search for guides, tips, or tutorials..." />
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-32 flex flex-col gap-2 rounded-2xl border-zinc-200 bg-white dark:bg-zinc-900">
                    <Upload size={24} className="text-blue-500" />
                    <span className="font-bold">Uploading Data</span>
                  </Button>
                  <Button variant="outline" className="h-32 flex flex-col gap-2 rounded-2xl border-zinc-200 bg-white dark:bg-zinc-900">
                    <BarChart3 size={24} className="text-emerald-500" />
                    <span className="font-bold">Creating Charts</span>
                  </Button>
                  <Button variant="outline" className="h-32 flex flex-col gap-2 rounded-2xl border-zinc-200 bg-white dark:bg-zinc-900">
                    <Zap size={24} className="text-amber-500" />
                    <span className="font-bold">AI Features</span>
                  </Button>
                  <Button variant="outline" className="h-32 flex flex-col gap-2 rounded-2xl border-zinc-200 bg-white dark:bg-zinc-900">
                    <Download size={24} className="text-purple-500" />
                    <span className="font-bold">Exporting Reports</span>
                  </Button>
                </div>

                <div className="space-y-6 max-w-3xl">
                  <h3 className="text-2xl font-bold">Frequently Asked Questions</h3>
                  <div className="space-y-4">
                    {[
                      { q: "What file formats does PREDICTA support?", a: "We currently support CSV, TSV, TXT, and most Excel formats (XLSX/XLS)." },
                      { q: "Is there a row limit for visualization?", a: "The visualizer handles up to 5,000 rows smoothly for live previews. Global filters apply to larger datasets before rendering." },
                      { q: "How accurate are the AI insights?", a: "Insights are based on statistical analysis and processed via Gemini 1.5. They are meant to guide your analysis, not replace expert interpretation." },
                      { q: "Can I share my live dashboard?", a: "Live sharing is available in our Enterprise tier. All users can export dashboards as high-resolution PDFs." }
                    ].map((faq, i) => (
                      <div key={i} className="p-6 bg-white dark:bg-zinc-900 border rounded-2xl space-y-2">
                        <h4 className="font-black text-sm uppercase tracking-wider">{faq.q}</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/10 p-10 rounded-[3rem] text-center space-y-6">
                  <h2 className="text-3xl font-bold">Still have questions?</h2>
                  <p className="text-zinc-500 max-w-lg mx-auto">Our support team is online Monday-Friday, 9am-6pm EST to assist you with any technical needs.</p>
                  <div className="flex gap-4 justify-center">
                    <Button className="rounded-full px-10 h-14 font-bold">Live Chat</Button>
                    <Button variant="outline" className="rounded-full px-10 h-14 font-bold">Submit Ticket</Button>
                  </div>
                </div>
              </div>
            )}

            {/* Upload Section (moved to keep logic clean) */}
            {activeTab === 'upload' && (
              <div className="max-w-2xl mx-auto mt-12 text-center">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileUpload}
                  className={cn(
                    "bg-white dark:bg-zinc-900 border-2 border-dashed rounded-3xl p-16 flex flex-col items-center gap-6 shadow-sm transition-all group relative overflow-hidden",
                    isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-zinc-300 dark:border-zinc-800 hover:border-primary hover:shadow-xl"
                  )}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {isLoading ? <Activity className="animate-pulse" size={40} /> : <Upload size={40} />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold">{isLoading ? loadingMessage : "Drop your data here"}</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto">Upload a CSV or Excel file and let our AI engine handle the cleaning and analysis.</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                    <FileText size={16} /> .CSV / .TSV / .TXT
                    <Separator orientation="vertical" className="h-4" />
                    <FileText size={16} /> .XLSX / .XLS
                  </div>
                  
                  <Input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".csv,.xlsx,.xls,.tsv,.txt" 
                    onChange={handleFileUpload} 
                  />
                  
                  <Button 
                    onClick={triggerUpload} 
                    disabled={isLoading}
                    className="rounded-full px-8 py-6 text-sm font-semibold shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                  >
                    {isLoading ? loadingMessage : "Browse Files"}
                  </Button>
                </div>

                <div className="mt-12 grid grid-cols-3 gap-6 text-center">
                  {[
                    { icon: Activity, title: "Auto Cleaning", desc: "Missing values & outliers handled" },
                    { icon: Lightbulb, title: "Smart Trends", desc: "Automatic pattern detection" },
                    { icon: LayoutDashboard, title: "Dashboards", desc: "Instant visualizations" }
                  ].map((feature, i) => (
                    <div key={i} className="p-4 text-center flex flex-col items-center">
                      <feature.icon className="text-primary mb-3" size={24} />
                      <h4 className="font-semibold text-sm mb-1">{feature.title}</h4>
                      <p className="text-xs text-zinc-500">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview Section */}
            {activeTab === 'preview' && dataset && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Rows" value={dataset.rowCount.toLocaleString()} icon={TableIcon} />
                  <StatCard title="Total Columns" value={dataset.colCount} icon={ChevronRight} />
                  <StatCard title="Missing Cells" value={dataset.columns.reduce((a, b) => a + b.missingValues, 0)} icon={AlertCircle} color="text-amber-500" />
                  <StatCard title="Correlation High" value={dataset.columns.filter(c => c.uniqueValues === dataset.rowCount).length} icon={Filter} color="text-green-500" />
                </div>

                <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Cleaned Dataset Preview</CardTitle>
                      <CardDescription>Showing first 100 rows of your processed data.</CardDescription>
                    </div>
                    <Badge variant="secondary">Auto-cleaned</Badge>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px] w-full">
                      <Table>
                        <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0 z-10">
                          <TableRow>
                            {dataset.columns.map(col => (
                              <TableHead key={col.name} className="whitespace-nowrap px-4 py-3">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-foreground">{col.name}</span>
                                  <Badge variant="outline" className="text-[10px] w-fit font-mono px-1 py-0">{col.type}</Badge>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredData.slice(0, 100).map((row, i) => (
                            <TableRow key={i}>
                              {dataset.columns.map(col => (
                                <TableCell key={col.name} className={cn("whitespace-nowrap font-mono text-xs px-4 py-3", col.type === 'numeric' ? "text-right" : "")}>
                                  {row[col.name]?.toString() || <span className="text-muted-foreground italic opacity-50">null</span>}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Analysis Section */}
            {activeTab === 'analysis' && dataset && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-zinc-500">
                          <Lightbulb className="text-amber-500" size={16} />
                          AI Insights Engine
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {aiInsights ? (
                          <div className="prose dark:prose-invert text-sm leading-relaxed space-y-4">
                            {aiInsights.split('\n').map((line, i) => (
                              <p key={i} className="flex gap-2">
                                <ChevronRight className="text-primary shrink-0" size={14} />
                                <span>{line.replace(/^[\s*-]+/, '')}</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 dark:bg-zinc-800/20 rounded-xl border border-dashed">
                            <p className="text-sm text-zinc-500 mb-6 max-w-[200px]">Unlock deeper patterns using our Gemini-powered analysis engine.</p>
                            <Button onClick={getInsights} disabled={isLoading} className="rounded-full px-8">
                              {isLoading ? loadingMessage : "Generate AI Insights"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-zinc-500">
                          <Activity className="text-blue-500" size={16} />
                          Cleaning Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500 font-medium">Missing Values Handling</span>
                          <Badge variant="outline" className="bg-amber-50/50 text-amber-600 border-amber-200">Auto-Imputed</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500 font-medium">Outlier Sensitivity</span>
                          <span className="font-bold text-zinc-400">1.5x IQR</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-zinc-500 font-medium">Text Normalization</span>
                          <Badge variant="outline" className="bg-emerald-50/50 text-emerald-600 border-emerald-200">Enabled</Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center pt-2">
                          <div className="space-y-1">
                            <p className="text-2xl font-bold">{dataset.columns.reduce((a, b) => a + b.missingValues, 0)}</p>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Fields Repaired</p>
                          </div>
                          <div className="space-y-1 text-right">
                            <p className="text-2xl font-bold">{dataset.columns.reduce((a, b) => a + (b.outliersCount || 0), 0)}</p>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-tighter">Anomalies Found</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Intelligent Column Explorer</CardTitle>
                      <CardDescription>Deep statistical analysis per attribute</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dataset.columns.map(col => (
                          <div key={col.name} className="flex items-center gap-6 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:border-primary/20 hover:bg-zinc-50 dark:hover:bg-primary/5 transition-all group">
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-bold text-xs uppercase group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {col.type.slice(0, 3)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-base">{col.name}</h4>
                              <div className="flex gap-4 mt-1">
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Unique: {col.uniqueValues}</span>
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Missing: {col.missingValues}</span>
                                {col.outliersCount ? <span className="text-[10px] uppercase font-bold text-destructive">Outliers: {col.outliersCount}</span> : null}
                              </div>
                            </div>
                            {col.type === 'numeric' ? (
                              <div className="flex gap-8 text-right pr-4">
                                <div>
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Avg</p>
                                  <p className="font-mono text-sm font-semibold">{col.mean?.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase">Max</p>
                                  <p className="font-mono text-sm font-semibold">{col.max?.toFixed(2)}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right pr-4">
                                <p className="text-[10px] text-zinc-400 font-bold uppercase">Most Common</p>
                                <p className="text-sm font-semibold truncate max-w-[120px]">{col.mostFrequent || '-'}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="col-span-12 lg:col-span-4">
                  <header className="mb-6">
                    <h3 className="text-lg font-bold">Transformation Controls</h3>
                    <p className="text-xs text-muted-foreground">Adjust cleaning parameters</p>
                  </header>
                  <div className="space-y-6">
                    <Card className="bg-zinc-900 text-white border-none shadow-2xl">
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-3">
                          <Label className="text-xs text-zinc-400 font-bold uppercase">Missing Value Handling</Label>
                          <Select defaultValue="auto">
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto (Smart Imputation)</SelectItem>
                              <SelectItem value="mean">Mean (Numeric) / Mode (Cat)</SelectItem>
                              <SelectItem value="median">Median (Numeric) / Mode (Cat)</SelectItem>
                              <SelectItem value="mode">Global Mode Imputation</SelectItem>
                              <SelectItem value="drop">Drop Rows with Nulls</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-xs text-zinc-400 font-bold uppercase">Outlier Detection Method</Label>
                          <Select defaultValue="iqr">
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="iqr">IQR (Interquartile Range)</SelectItem>
                              <SelectItem value="zscore">Z-Score (Standard Multiples)</SelectItem>
                              <SelectItem value="none">None (Keep All Data)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <Label className="text-xs text-zinc-400 font-bold uppercase">Detection Sensitivity</Label>
                            <span className="text-xs font-mono">High (1.5x / 3σ)</span>
                          </div>
                          <Separator className="bg-zinc-800" />
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Trim White Spaces</span>
                            <Switch checked={true} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs">Normalize Data</span>
                            <Switch checked={false} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Button variant="outline" className="w-full border-primary/20 text-primary hover:bg-primary/10 py-6 text-sm font-bold" disabled={!dataset}>
                      <Activity size={18} className="mr-2" />
                      Run Full Pipeline
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Visualizer Section */}
            {activeTab === 'visualization' && dataset && (
              <div className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3 space-y-8">
                  <div className="bg-white dark:bg-zinc-900 border p-6 rounded-2xl shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-zinc-500">X-Axis (Dimension)</Label>
                        <Select value={selectedColX} onValueChange={setSelectedColX}>
                          <SelectTrigger className="rounded-lg py-6">
                            <SelectValue placeholder="Categorical column" />
                          </SelectTrigger>
                          <SelectContent>
                            {dataset.columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-zinc-500">Y-Axis (Metric)</Label>
                        <Select value={selectedColY} onValueChange={setSelectedColY}>
                          <SelectTrigger className="rounded-lg py-6">
                            <SelectValue placeholder="Numerical column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rowCount">Count of Items</SelectItem>
                            {dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {chartType === 'candlestick' && (
                        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-500">Open</Label>
                            <Select value={candlestickCols.open} onValueChange={(v) => setCandlestickCols(p => ({ ...p, open: v }))}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Open" /></SelectTrigger>
                              <SelectContent>{dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-500">Close</Label>
                            <Select value={candlestickCols.close} onValueChange={(v) => setCandlestickCols(p => ({ ...p, close: v }))}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Close" /></SelectTrigger>
                              <SelectContent>{dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-500">High</Label>
                            <Select value={candlestickCols.high} onValueChange={(v) => setCandlestickCols(p => ({ ...p, high: v }))}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="High" /></SelectTrigger>
                              <SelectContent>{dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-zinc-500">Low</Label>
                            <Select value={candlestickCols.low} onValueChange={(v) => setCandlestickCols(p => ({ ...p, low: v }))}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Low" /></SelectTrigger>
                              <SelectContent>{dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <Separator className="my-4" />

                      <div className="space-y-3">
                        <Label className="text-xs uppercase font-bold text-zinc-500">Visualization Type</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'bar', icon: BarChart3, label: 'Bar' },
                            { id: 'pie', icon: PieIcon, label: 'Pie' },
                            { id: 'donut', icon: PieIcon, label: 'Donut' },
                            { id: 'line', icon: TrendingUp, label: 'Line' },
                            { id: 'area', icon: Layers, label: 'Area' },
                            { id: 'scatter', icon: Rows, label: 'Scatter' },
                            { id: 'bubble', icon: Rows, label: 'Bubble' },
                            { id: 'treemap', icon: Filter, label: 'Treemap' },
                            { id: 'radar', icon: Target, label: 'Radar' },
                            { id: 'funnel', icon: Filter, label: 'Funnel' },
                            { id: 'histogram', icon: BarChart3, label: 'Histogram' },
                            { id: 'box', icon: BoxIcon, label: 'Box Plot' },
                            { id: 'waterfall', icon: Rows, label: 'Waterfall' },
                            { id: 'gauge', icon: Zap, label: 'Gauge' },
                            { id: 'candlestick', icon: CandlestickChart, label: 'Candlestick' },
                          ].map((type) => (
                            <button
                              key={type.id}
                              onClick={() => setChartType(type.id)}
                              className={cn(
                                "p-3 rounded-xl flex items-center justify-center transition-all border group",
                                chartType === type.id 
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                                  : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-primary/50 text-zinc-400 hover:text-primary"
                              )}
                              title={type.label}
                            >
                              <type.icon size={20} className="transition-transform group-hover:scale-110" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button className="w-full py-6 rounded-xl font-bold shadow-xl shadow-primary/20" onClick={addToDashboard} disabled={!selectedColX}>
                      <LayoutDashboard size={18} className="mr-2" />
                      Add to Dashboard
                    </Button>

                    <Separator className="my-2" />

                    <div className="space-y-3">
                      <Label className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                        <Lightbulb size={14} className="text-amber-500" />
                        Smart Recommendations
                      </Label>
                      <div className="space-y-2">
                        {getRecommendations(dataset).slice(0, 3).map((rec, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedColX(rec.config.xAxis);
                              setSelectedColY(rec.config.yAxis || 'rowCount');
                              setChartType(rec.config.type);
                              toast.success("Applied recommendation", { description: rec.label });
                            }}
                            className="w-full text-left p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-primary/5 border border-zinc-100 dark:border-zinc-800 text-xs font-medium transition-all hover:border-primary/20 flex flex-col gap-1 group"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronRight size={14} className="text-zinc-400 group-hover:text-primary transition-colors shrink-0" />
                              <span className="group-hover:text-foreground transition-colors font-bold">{rec.label}</span>
                            </div>
                            <p className="pl-5 text-[10px] text-zinc-400 font-normal leading-relaxed">{rec.reason}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>

                <div className="col-span-12 lg:col-span-9">
                  <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[550px] shadow-sm flex flex-col items-center justify-center relative">
                    {!selectedColX ? (
                      <div className="text-center p-12 max-w-sm">
                        <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 text-zinc-300">
                          <BarChart3 size={40} />
                        </div>
                        <h4 className="text-lg font-bold mb-2">Engine Ready</h4>
                        <p className="text-sm text-zinc-500">Pick dimensions from the sidebar to generate a specific visual slice of your dataset.</p>
                      </div>
                    ) : (
                      <div className="w-full h-full p-4 md:p-8 flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 md:mb-12">
                          <div>
                            <h3 className="text-xl md:text-2xl font-black tracking-tight">{selectedColX} Breakdown</h3>
                            <p className="text-xs md:text-sm text-muted-foreground font-mono uppercase tracking-widest mt-1">
                              {selectedColY === 'rowCount' ? 'Record Count' : selectedColY} over {selectedColX}
                            </p>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 uppercase tracking-tighter text-[10px]">Optimal Chart Suggested</Badge>
                        </div>
                        <div className="flex-1 w-full min-h-[350px] md:min-h-[400px]">
                          {renderChart({ id: 'preview', title: 'Preview', type: chartType as any, xAxis: selectedColX, yAxis: selectedColY }, 400)}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {/* Dashboard Section */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 md:space-y-8">
                {/* ... existing dashboard code ... */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-white dark:bg-zinc-900 p-6 rounded-2xl border shadow-sm">
                  {dataStory && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full mb-6"
                    >
                      <Card className="bg-primary/5 border-primary/20 p-6 rounded-2xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-3">
                          <Presentation size={18} className="text-primary" />
                          <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Executive Summary</h4>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                          {dataStory}
                        </p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto mt-2 text-primary font-bold"
                          onClick={() => handleTabChange('story')}
                        >
                          Read full story →
                        </Button>
                      </Card>
                    </motion.div>
                  )}
                  <div className="flex flex-col gap-1 w-full lg:w-auto">
                    <div className="flex items-center gap-2">
                      <Select value={currentDashboardName} onValueChange={setCurrentDashboardName}>
                        <SelectTrigger className="w-full sm:w-[240px] h-9 border-none bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-xl md:text-2xl p-0 shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dashboards.map(d => (
                            <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" onClick={createNewDashboard} className="h-8 w-8 text-zinc-400 hover:text-primary">
                        <Plus size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDashboard(currentDashboardName)} className="h-8 w-8 text-zinc-400 hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-400 font-medium">Auto-generated analytical summary · Interactive Mode</p>
                  </div>
                  <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-full border border-zinc-200 dark:border-zinc-800 w-full sm:w-auto overflow-hidden">
                      <div className="pl-3 text-zinc-400 shrink-0">
                        <Filter size={14} />
                      </div>
                      <Select 
                        value={globalFilter.column} 
                        onValueChange={(v) => setGlobalFilter(prev => ({ ...prev, column: v }))}
                      >
                        <SelectTrigger className="h-8 w-[100px] sm:w-[140px] border-none bg-transparent text-xs focus:ring-0">
                          <SelectValue placeholder="Columns" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Columns</SelectItem>
                          {dataset?.columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 shrink-0" />
                      <Input 
                        placeholder="Filter..." 
                        className="h-8 flex-1 sm:w-[150px] border-none bg-transparent text-xs focus-visible:ring-0"
                        value={globalFilter.value}
                        onChange={(e) => setGlobalFilter(prev => ({ ...prev, value: e.target.value }))}
                      />
                      {globalFilter.value && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 rounded-full text-zinc-400"
                          onClick={() => setGlobalFilter({ column: '', value: '' })}
                        >
                          <CloseIcon size={12} />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className={cn("rounded-full border-zinc-200 h-9 w-9 shrink-0", isLayoutLocked ? "text-primary border-primary/20 bg-primary/5" : "text-zinc-400")}
                        onClick={() => setIsLayoutLocked(!isLayoutLocked)}
                        title={isLayoutLocked ? "Unlock Layout" : "Lock Layout"}
                      >
                        {isLayoutLocked ? <Lock size={16} /> : <Unlock size={16} />}
                      </Button>
                      <Button variant="outline" className="flex-1 sm:flex-none gap-2 h-9 rounded-full px-5 border-zinc-200 text-xs font-bold uppercase tracking-tight" onClick={downloadDashboardAsPDF} disabled={isLoading}>
                        <Download size={14} /> PDF 
                      </Button>
                    </div>
                  </div>
                </div>

                {currentDashboard?.charts.length === 0 ? (
                  <div className="text-center py-32 bg-zinc-50 dark:bg-zinc-900/40 rounded-[2.5rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <LayoutDashboard size={64} className="mx-auto mb-6 text-zinc-200" />
                    <h3 className="text-2xl font-bold mb-4">No Visuals Pinned</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mb-8">Build your custom dashboard by pinning charts from the Visualizer engine.</p>
                    <Button className="rounded-full px-10 py-6" onClick={() => handleTabChange('visualization')}>Launch Visualizer</Button>
                  </div>
                ) : (
                  <div ref={dashboardRef as any} className="pb-24 p-4 min-h-[500px]">
                    <ResponsiveGridLayout
                      className="layout"
                      width={containerWidth}
                      layouts={currentDashboard?.layouts || { lg: generateDefaultLayout(currentDashboard?.charts || []) }}
                      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xss: 0 }}
                      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xss: 1 }}
                      rowHeight={100}
                      onLayoutChange={(currentLayout, allLayouts) => handleLayoutChange(allLayouts)}
                      {...({
                        draggableHandle: ".drag-handle",
                        isDraggable: !isLayoutLocked,
                        isResizable: !isLayoutLocked,
                      } as any)}
                      margin={[24, 24]}
                    >
                      {currentDashboard?.charts.map((chart) => (
                        <div key={chart.id}>
                          <Card className="h-full overflow-hidden border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-zinc-950 group flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-zinc-50/50 dark:bg-zinc-900/50 py-3 px-4 shrink-0">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {!isLayoutLocked && <Move size={14} className="drag-handle cursor-move text-zinc-400 hover:text-primary transition-colors shrink-0 no-pdf" />}
                                {editingTitle === chart.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                      value={editingTitleValue}
                                      onChange={(e) => setEditingTitleValue(e.target.value)}
                                      className="h-7 text-[10px] font-black uppercase tracking-widest py-0 focus-visible:ring-1"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') updateChartTitle(chart.id, editingTitleValue);
                                        if (e.key === 'Escape') setEditingTitle(null);
                                      }}
                                    />
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-emerald-500"
                                      onClick={() => updateChartTitle(chart.id, editingTitleValue)}
                                    >
                                      <Save size={12} />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 flex-1 min-w-0 group/title">
                                    <CardTitle 
                                      className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate cursor-pointer hover:text-primary transition-colors"
                                      onClick={() => {
                                        setEditingTitle(chart.id);
                                        setEditingTitleValue(chart.title);
                                      }}
                                    >
                                      {chart.title}
                                    </CardTitle>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-5 w-5 text-zinc-300 opacity-0 group-hover/title:opacity-100 transition-opacity"
                                      onClick={() => {
                                        setEditingTitle(chart.id);
                                        setEditingTitleValue(chart.title);
                                      }}
                                    >
                                      <Edit2 size={10} />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 no-pdf">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setEditingNotes(chart.id);
                                    setEditingNotesValue(chart.notes || '');
                                  }}
                                  className={cn("h-7 w-7 text-zinc-400 transition-colors", chart.notes ? "text-primary bg-primary/5" : "")}
                                >
                                  <Edit2 size={12} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => {
                                    setDashboards(prev => prev.map(d => d.name === currentDashboardName 
                                      ? { ...d, charts: d.charts.filter(c => c.id !== chart.id) } 
                                      : d
                                    ));
                                  }}
                                  className="h-7 w-7 text-zinc-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 flex-1 flex flex-col min-h-0">
                              <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                                {renderChart(chart, '100%')}
                              </div>
                              {chart.notes && (
                                <div className="mt-3 p-2 bg-zinc-50 dark:bg-zinc-900/80 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 italic line-clamp-2">
                                  "{chart.notes}"
                                </div>
                              )}
                              {editingNotes === chart.id && (
                                <div className="absolute inset-0 z-50 bg-white/95 dark:bg-zinc-950/95 p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Annotate Insight</h4>
                                    <Button variant="ghost" size="icon" onClick={() => setEditingNotes(null)} className="h-6 w-6">
                                      <CloseIcon size={12} />
                                    </Button>
                                  </div>
                                  <textarea 
                                    className="flex-1 bg-transparent border rounded-xl p-4 text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                                    placeholder="Add notes to this chart..."
                                    value={editingNotesValue}
                                    onChange={(e) => setEditingNotesValue(e.target.value)}
                                  />
                                  <div className="flex justify-between gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="text-destructive hover:bg-destructive/10"
                                      onClick={() => updateChartNotes(chart.id, '')}
                                    >
                                      Clear Note
                                    </Button>
                                    <div className="flex gap-2">
                                      <Button variant="outline" size="sm" onClick={() => setEditingNotes(null)}>Cancel</Button>
                                      <Button size="sm" onClick={() => updateChartNotes(chart.id, editingNotesValue)}>Save Notes</Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                    </ResponsiveGridLayout>
                  </div>
                )}
              </div>
            )}

            {/* AI Assistant Section */}
            {activeTab === 'assistant' && dataset && (
              <div className="max-w-4xl mx-auto space-y-8">
                <Card className="border-none shadow-xl bg-gradient-to-br from-primary/5 via-white to-background dark:from-primary/10 dark:via-zinc-900 dark:to-zinc-950 p-8 overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-12 opacity-5 hidden md:block">
                     <Sparkles size={120} className="text-primary animate-pulse" />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black tracking-tight">AI Data Assistant</h3>
                      <p className="text-zinc-500 font-medium">Type your query in natural language and PREDICTA will generate the best visualization instantly.</p>
                    </div>
                    <div className="flex gap-3">
                      <Input 
                        placeholder='e.g., "Show monthly sales trend" or "Region-wise profit comparison"'
                        className="h-14 rounded-2xl bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm border-zinc-200 dark:border-zinc-700 text-lg px-6 shadow-inner focus:ring-primary"
                        value={assistantQuery}
                        onChange={(e) => setAssistantQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAssistantQuery()}
                      />
                      <Button className="h-14 w-14 rounded-2xl shadow-lg shrink-0" onClick={handleAssistantQuery} disabled={isLoading || !assistantQuery.trim()}>
                        <Sparkles size={24} />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest py-1.5 px-2">Suggestions:</span>
                      {["Top items by count", "Trend over time", "Compare categories"].map((tag) => (
                        <Badge 
                          key={tag} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary hover:text-white transition-colors"
                          onClick={() => {
                            setAssistantQuery(tag);
                            // Auto trigger after a tiny delay for better UX
                            setTimeout(handleAssistantQuery, 100);
                          }}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>

                {assistantResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-start gap-4 bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <div className="bg-emerald-500 text-white p-2 rounded-xl shrink-0">
                        <Zap size={18} />
                      </div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed italic">
                        "{assistantResult.explanation}"
                      </p>
                    </div>

                    <Card className="p-6 md:p-8 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm relative group overflow-hidden">
                       <div className="flex justify-between items-center mb-10">
                          <div>
                            <h4 className="text-xl font-bold tracking-tight">{assistantResult.chart.title}</h4>
                            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">Generated Insight · AI Assisted</p>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="rounded-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                               const newChart = { ...assistantResult.chart, id: crypto.randomUUID() };
                               setDashboards(prev => prev.map(d => d.name === currentDashboardName ? { ...d, charts: [...d.charts, newChart] } : d));
                               toast.success("Pinned to dashboard!");
                            }}
                          >
                             <Plus size={14} /> Pin to Dashboard
                          </Button>
                       </div>
                       <div className="h-[400px] w-full">
                          {renderChart(assistantResult.chart, 400)}
                       </div>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}

            {/* Story Mode Section */}
            {activeTab === 'story' && dataset && (
              <div className="max-w-4xl mx-auto space-y-8">
                <section className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                    <Presentation size={40} />
                  </div>
                  <h3 className="text-5xl font-black tracking-tighter">Story Mode</h3>
                  <p className="text-zinc-500 max-w-2xl mx-auto text-lg">
                    Transform your data points into a compelling executive narrative. Ideal for presentations and decision makers.
                  </p>
                  <Button size="lg" className="rounded-full px-12 h-14 text-lg font-bold shadow-xl shadow-primary/20" onClick={handleGenerateStory} disabled={isLoading}>
                    {isLoading ? "Writing Story..." : "Generate Data Story"}
                  </Button>
                </section>

                {dataStory && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <Card className="border-none shadow-2xl p-8 md:p-12 relative overflow-hidden bg-white dark:bg-zinc-950 font-sans leading-relaxed text-lg italic text-zinc-700 dark:text-zinc-300">
                      <div className="absolute top-0 left-0 w-2 h-full bg-primary opacity-50" />
                      <MessageSquareQuote size={48} className="text-primary/10 absolute top-8 right-8" />
                      <div className="prose prose-zinc dark:prose-invert max-w-none space-y-4 whitespace-pre-wrap">
                        {dataStory}
                      </div>
                      <div className="mt-12 pt-8 border-t flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-primary font-bold">P</div>
                            <div>
                               <p className="text-sm font-bold leading-none">PREDICTA Intelligence Engine</p>
                               <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest mt-0.5">Automated Analyst</p>
                            </div>
                         </div>
                         <Button variant="ghost" size="sm" className="gap-2 text-zinc-400 hover:text-primary" onClick={() => {
                            const blob = new Blob([dataStory!], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${dataset.name}_Story.txt`;
                            a.click();
                         }}>
                            <Download size={16} /> Save Transcript
                         </Button>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </div>
            )}

            {/* Quality Score Section */}
            {activeTab === 'quality' && dataset && (
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-6">
                    <h3 className="text-4xl font-black tracking-tight leading-none">Dataset Health Center</h3>
                    <p className="text-zinc-500 text-lg font-medium leading-relaxed">
                      We've scanned every row and column of your data to detect inconsistencies and potential points of failure in your analysis.
                    </p>
                    {!qualityScore && (
                      <Button size="lg" className="rounded-full h-14 px-8 font-bold" onClick={handleQualityCheck}>
                        Run Health Check <Stethoscope size={20} className="ml-2" />
                      </Button>
                    )}
                  </div>

                  {qualityScore && (
                    <div className="relative">
                       <svg className="w-full h-64" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-100 dark:text-zinc-800" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="45" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="10" 
                            strokeDasharray="282.7" 
                            strokeDashoffset={282.7 - (282.7 * qualityScore.score) / 100}
                            className={cn(
                              "transition-all duration-1000",
                              qualityScore.score > 80 ? "text-emerald-500" : qualityScore.score > 50 ? "text-amber-500" : "text-rose-500"
                            )}
                            transform="rotate(-90 50 50)"
                          />
                          <text x="50" y="55" textAnchor="middle" className="text-3xl font-black fill-current" style={{ fontSize: '20px' }}>{qualityScore.score}</text>
                          <text x="50" y="70" textAnchor="middle" className="text-[6px] uppercase font-bold tracking-widest fill-zinc-400">Health Index</text>
                       </svg>
                    </div>
                  )}
                </div>

                {qualityScore && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    <Card className="col-span-full md:col-span-2 p-6 rounded-3xl border-zinc-200 dark:border-zinc-800 space-y-6 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
                      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Issue Breakdown</h4>
                      <div className="space-y-4">
                        {qualityScore.issues.length === 0 ? (
                          <div className="bg-emerald-50 dark:bg-emerald-500/10 p-8 rounded-2xl text-center">
                            <Sparkles className="mx-auto mb-4 text-emerald-500" size={32} />
                            <p className="font-bold text-emerald-800 dark:text-emerald-400">Pure Dataset!</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">No major issues detected during initial scan.</p>
                          </div>
                        ) : (
                          qualityScore.issues.map((issue: any, i: number) => (
                            <div key={i} className="flex gap-4 items-start p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border group hover:border-primary/20 transition-all">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                issue.score_impact > 10 ? "bg-rose-100 text-rose-500" : "bg-amber-100 text-amber-500"
                              )}>
                                <AlertCircle size={20} />
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                  <h5 className="font-bold text-sm">{issue.type}</h5>
                                  <Badge variant="outline" className="text-[10px]">Impact: -{issue.score_impact}</Badge>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed">{issue.description}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </Card>

                    <div className="space-y-6">
                      <Card className="p-6 rounded-3xl bg-primary text-white border-none shadow-xl">
                        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">Expert Resolution</h4>
                        <div className="space-y-4">
                           <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
                             <p className="text-xs font-bold mb-1">Auto-Clean Protocol</p>
                             <p className="text-[10px] opacity-80 leading-relaxed">System has already imputed missing values and neutralized whitespace.</p>
                           </div>
                           <Button variant="secondary" className="w-full rounded-full gap-2 font-bold" onClick={downloadCleaned}>
                             Download Cleaned File <Download size={16} />
                           </Button>
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Forecast Section */}
            {activeTab === 'forecast' && dataset && (
              <div className="max-w-6xl mx-auto space-y-8">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <aside className="lg:col-span-4 space-y-6">
                       <Card className="p-6 rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 space-y-6">
                          <div className="space-y-2">
                             <h4 className="text-2xl font-black tracking-tight">Predictive Engine</h4>
                             <p className="text-xs text-zinc-500 font-medium">Model future performance using advanced regression and moving averages.</p>
                          </div>
                          
                          <div className="space-y-4 pt-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-zinc-400">Time Hierarchy (X)</Label>
                              <Select value={forecastConfig.xAxis} onValueChange={(v) => setForecastConfig(p => ({ ...p, xAxis: v }))}>
                                <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder="Select period column" /></SelectTrigger>
                                <SelectContent>{dataset.columns.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-zinc-400">Target Metric (Y)</Label>
                              <Select value={forecastConfig.yAxis} onValueChange={(v) => setForecastConfig(p => ({ ...p, yAxis: v }))}>
                                <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue placeholder="Select target metric" /></SelectTrigger>
                                <SelectContent>{dataset.columns.filter(c => c.type === 'numeric').map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase font-bold text-zinc-400">Forecast Horizon</Label>
                              <Select value={String(forecastConfig.periods)} onValueChange={(v) => setForecastConfig(p => ({ ...p, periods: Number(v) }))}>
                                <SelectTrigger className="h-12 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">Next 7 Periods</SelectItem>
                                  <SelectItem value="30">Next 30 Periods</SelectItem>
                                  <SelectItem value="90">Next 90 Periods</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <Button className="w-full h-14 rounded-2xl font-bold gap-2 shadow-xl shadow-primary/20" onClick={handleForecast} disabled={!forecastConfig.xAxis || !forecastConfig.yAxis}>
                            <Binary size={18} /> Generate Prediction
                          </Button>
                       </Card>
                       
                       <div className="p-6 bg-amber-50 dark:bg-amber-500/10 rounded-3xl border border-amber-100 dark:border-amber-500/20">
                          <div className="flex gap-3 mb-3">
                             <AlertCircle className="text-amber-500 shrink-0" size={18} />
                             <p className="text-xs font-bold text-amber-800 dark:text-amber-400">Methodology Note</p>
                          </div>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-500/80 leading-relaxed font-medium">
                             Analysis uses Ordinary Least Squares (OLS) regression. Forecasts are statistical estimates and should not be used as guaranteed financial advice.
                          </p>
                       </div>
                    </aside>

                    <div className="lg:col-span-8">
                       <Card className="h-full min-h-[500px] p-6 md:p-10 rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
                          {forecastData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                               <Binary size={48} className="text-zinc-200 mb-6" />
                               <h5 className="text-xl font-bold mb-2">Predictive Visualization</h5>
                               <p className="text-zinc-500 text-sm max-w-sm">Configure your time series parameters to view the projected outcome.</p>
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col">
                               <div className="flex justify-between items-start mb-10">
                                  <div>
                                     <h3 className="text-2xl font-black tracking-tighter">Forecast Insight</h3>
                                     <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest mt-1">
                                        Projected Trend: {forecastConfig.yAxis} over {forecastConfig.xAxis}
                                     </p>
                                  </div>
                                  <Badge className="bg-primary text-white uppercase tracking-tighter shadow-lg shadow-primary/20">AI Confidence: High</Badge>
                               </div>
                               <div className="flex-1 w-full min-h-[350px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <ComposedChart data={forecastData} margin={{ bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={selectedTheme.gridColor} />
                                        <XAxis dataKey={forecastConfig.xAxis} stroke={selectedTheme.textColor} fontSize={10} tickLine={false} axisLine={false} />
                                        <YAxis stroke={selectedTheme.textColor} fontSize={10} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                           content={({ active, payload, label }) => {
                                              if (active && payload && payload.length) {
                                                const isForecast = payload[0].payload.isForecast;
                                                return (
                                                  <div className={cn(
                                                    "p-3 rounded-lg shadow-xl border backdrop-blur-md text-xs font-bold",
                                                    isForecast ? "bg-primary text-white border-primary" : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
                                                  )}>
                                                    <p className="mb-1">{label} {isForecast && "(PROJECTION)"}</p>
                                                    <p className="text-lg">Value: {payload[0].value}</p>
                                                  </div>
                                                );
                                              }
                                              return null;
                                           }}
                                        />
                                        <Line 
                                           type="monotone" 
                                           dataKey={forecastConfig.yAxis} 
                                           stroke={selectedTheme.colors[0]} 
                                           strokeWidth={4}
                                           dot={(props: any) => {
                                              const { cx, cy, payload } = props;
                                              if (payload.isForecast) return <circle cx={cx} cy={cy} r={3} fill="#fff" stroke={selectedTheme.colors[0]} strokeWidth={2} />;
                                              return <circle cx={cx} cy={cy} r={4} fill={selectedTheme.colors[0]} stroke="#fff" strokeWidth={2} />;
                                           }}
                                        />
                                        {/* Reference Line for now */}
                                        <ReferenceArea 
                                          x1={forecastData.find(d => d.isForecast)?.[forecastConfig.xAxis]} 
                                          x2={forecastData[forecastData.length - 1][forecastConfig.xAxis]} 
                                          fill={selectedTheme.colors[0]} 
                                          fillOpacity={0.05} 
                                        />
                                     </ComposedChart>
                                  </ResponsiveContainer>
                               </div>
                            </div>
                          )}
                       </Card>
                    </div>
                 </div>
              </div>
            )}

            {/* Services (Ready-made Templates) Section */}
            {activeTab === 'services' && (
              <div className="space-y-12 py-6">
                <section className="text-center space-y-4">
                  <h3 className="text-4xl md:text-5xl font-black tracking-tighter">Choose a Template</h3>
                  <p className="text-zinc-500 max-w-2xl mx-auto text-lg font-medium">
                    Kickstart your analysis with pre-configured dashboard layouts tailored for your industry.
                  </p>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[
                    { id: 'sales', title: "Sales Performance", icon: BarChart3, desc: "Revenue trends, product performance, and regional sales breakdowns.", color: "bg-blue-500" },
                    { id: 'finance', title: "Financial Health", icon: TrendingUp, desc: "Profit margins, expenditure analysis, and cash flow forecasting.", color: "bg-emerald-500" },
                    { id: 'marketing', title: "Marketing ROI", icon: Target, desc: "Campaign conversions, lead source distribution, and engagement metrics.", color: "bg-amber-500" },
                    { id: 'hr', title: "HR Analytics", icon: Rows, icon2: Briefcase, desc: "Employee distribution, turnover rates, and performance tracking.", color: "bg-rose-500" },
                    { id: 'customer', title: "Customer Success", icon: Activity, desc: "Churn analysis, NPS trends, and customer lifecycle segments.", color: "bg-violet-500" },
                  ].map((tpl) => (
                    <Card key={tpl.id} className="group overflow-hidden border-none shadow-sm hover:shadow-2xl transition-all cursor-pointer bg-white dark:bg-zinc-900" onClick={() => applyTemplate(tpl.id)}>
                      <div className={cn("h-2 w-full", tpl.color)} />
                      <CardHeader className="pt-8 px-8">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 transition-transform", tpl.color)}>
                          <tpl.icon size={28} />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">{tpl.title}</CardTitle>
                        <CardDescription className="text-zinc-500 leading-relaxed pt-2">{tpl.desc}</CardDescription>
                      </CardHeader>
                      <CardContent className="px-8 pb-8 flex justify-between items-center">
                         <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-primary transition-colors">Apply Config</span>
                         <ArrowLeft className="rotate-180 text-zinc-200 group-hover:text-primary transition-all group-hover:translate-x-1" size={20} />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Separator className="my-12" />

                <div className="space-y-8">
                  <h3 className="text-2xl font-bold tracking-tight text-center">Standard Premium Services</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                    {[
                      { title: "Smart Imputation", desc: "AI-driven correction of missing values based on surrounding context.", icon: Target, price: "Included" },
                      { title: "Anomaly Guard", desc: "Real-time outlier detection that protects your analysis from noise.", icon: ShieldCheck, price: "Included" },
                      { title: "Team Connect", desc: "Shared workspaces and collaboration for large data teams.", icon: Layers, price: "Upgrade" },
                      { title: "Custom API", desc: "Direct endpoint access to PREDICTA processing engine.", icon: Zap, price: "Upgrade" }
                    ].map((s, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-3">
                         <div className="flex justify-between items-start">
                            <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-sm"><s.icon size={18} className="text-primary" /></div>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">{s.price}</Badge>
                         </div>
                         <h5 className="font-bold text-sm">{s.title}</h5>
                         <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Section */}
            {activeTab === 'privacy' && (
              <div className="max-w-2xl mx-auto space-y-8 py-12">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                    <ShieldCheck size={40} />
                  </div>
                  <h3 className="text-4xl font-black tracking-tight">Privacy & Security</h3>
                  <p className="text-zinc-500 text-lg">Your data is processed locally and via secure, ephemeral AI sessions. We prioritize your privacy at every step.</p>
                </div>
                
                <div className="grid gap-4">
                  {[
                    { title: "Local Processing", desc: "Most data operations happen directly in your browser's Web Worker, never leaving your device.", icon: Zap },
                    { title: "Ephemeral AI", desc: "AI analysis sessions are stateless. Data transmitted for insights is not used for model training.", icon: Sparkles },
                    { title: "Zero Data Retention", desc: "PREDICTA does not store your uploaded files. Once you refresh, the data is purged from memory.", icon: Trash2 },
                  ].map((item, i) => (
                    <Card key={i} className="p-6 flex gap-4 items-start bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                      <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-primary shrink-0">
                        <item.icon size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                        <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="p-8 bg-zinc-900 text-white rounded-[2.5rem] space-y-6 text-center">
                   <p className="text-zinc-400 text-sm font-medium">Have questions about our data handling policies?</p>
                   <Button variant="outline" className="rounded-full border-white/20 hover:bg-white/10 text-white">View Full Security Policy</Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "text-primary" }: any) {
  return (
    <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
      <CardContent className="pt-6 pb-6 px-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{title}</p>
          <div className={cn("p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 flex items-center justify-center", color)}>
            <Icon size={14} />
          </div>
        </div>
        <p className="text-3xl font-black tracking-tight font-mono">{value}</p>
      </CardContent>
    </Card>
  );
}
