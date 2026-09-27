import React, { useState, useMemo } from 'react';
import { DayData } from '../types';
import { formatCurrency } from '../utils/formatters';
import { ChevronDown, TrendingUp, Calendar } from 'lucide-react';

interface RevenueExpenseChartProps {
  data7Days: DayData[];
  data30Days: DayData[];
  currency: string;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  data7Days,
  data30Days,
  currency,
}) => {
  const [timeframe, setTimeframe] = useState<'7' | '30'>('7');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const activeData = timeframe === '7' ? data7Days : data30Days;

  // Calculate SVG curve paths
  const chartMetrics = useMemo(() => {
    const maxVal = Math.max(
      ...activeData.map((d) => Math.max(d.revenue, d.expenses)),
      5000
    ) * 1.15;
    const minVal = 0;

    const width = 600;
    const height = 180;
    const padding = { top: 20, bottom: 20, left: 10, right: 10 };

    const usableWidth = width - padding.left - padding.right;
    const usableHeight = height - padding.top - padding.bottom;

    const pointsRev = activeData.map((d, i) => {
      const x = padding.left + (i / (activeData.length - 1)) * usableWidth;
      const y = height - padding.bottom - ((d.revenue - minVal) / (maxVal - minVal)) * usableHeight;
      return { x, y, data: d };
    });

    const pointsExp = activeData.map((d, i) => {
      const x = padding.left + (i / (activeData.length - 1)) * usableWidth;
      const y = height - padding.bottom - ((d.expenses - minVal) / (maxVal - minVal)) * usableHeight;
      return { x, y, data: d };
    });

    // Generate smooth bezier path
    const generatePath = (points: { x: number; y: number }[]) => {
      if (points.length === 0) return '';
      let path = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i != points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
      return path;
    };

    const revPath = generatePath(pointsRev);
    const expPath = generatePath(pointsExp);

    const revArea = pointsRev.length > 0
      ? `${revPath} L ${pointsRev[pointsRev.length - 1].x},${height} L ${pointsRev[0].x},${height} Z`
      : '';

    const expArea = pointsExp.length > 0
      ? `${expPath} L ${pointsExp[pointsExp.length - 1].x},${height} L ${pointsExp[0].x},${height} Z`
      : '';

    return { pointsRev, pointsExp, revPath, expPath, revArea, expArea, width, height, maxVal };
  }, [activeData]);

  const activePoint = hoveredIndex !== null ? chartMetrics.pointsRev[hoveredIndex] : null;
  const activeExpPoint = hoveredIndex !== null ? chartMetrics.pointsExp[hoveredIndex] : null;

  const totalRev = useMemo(() => activeData.reduce((acc, d) => acc + d.revenue, 0), [activeData]);
  const totalExp = useMemo(() => activeData.reduce((acc, d) => acc + d.expenses, 0), [activeData]);
  const netMargin = totalRev > 0 ? ((totalRev - totalExp) / totalRev) * 100 : 0;

  return (
    <section
      id="revenue-expense-section"
      className="bg-white border border-[#c4c5d5]/70 rounded-lg p-4 md:p-6 kpi-shadow relative"
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-sans text-lg md:text-xl font-bold text-[#191c1e] tracking-tight">
            Revenue vs Expenses
          </h2>
          <p className="text-xs text-[#475569] font-mono hidden md:block">
            Net Cash Margin: <span className="font-semibold text-[#006d30]">{netMargin >= 0 ? `+${netMargin.toFixed(1)}%` : `${netMargin.toFixed(1)}%`}</span> across this period
          </p>
        </div>

        <div className="relative">
          <button
            id="timeframe-toggle-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 font-mono text-xs text-[#475569] uppercase font-semibold tracking-wider hover:text-[#00288e] bg-slate-100/80 hover:bg-slate-200/70 px-2.5 py-1.5 rounded transition-colors"
          >
            <span>{timeframe === '7' ? 'Last 7 Days' : 'Last 30 Days'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-[#c4c5d5] rounded-md shadow-lg py-1 z-30 font-mono text-xs">
              <button
                onClick={() => {
                  setTimeframe('7');
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 uppercase tracking-wider transition-colors ${
                  timeframe === '7' ? 'text-[#00288e] font-bold bg-slate-50' : 'text-[#475569]'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  setTimeframe('30');
                  setShowDropdown(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-slate-100 uppercase tracking-wider transition-colors ${
                  timeframe === '30' ? 'text-[#00288e] font-bold bg-slate-50' : 'text-[#475569]'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        id="chart-viewport"
        className="relative w-full h-[180px] md:h-[220px] bg-[#f8fafc] rounded border border-[#e0e3e5] overflow-hidden select-none cursor-crosshair"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        {/* Subtle background gradient glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00288e]/5 to-transparent pointer-events-none" />

        {/* Grid lines */}
        <div className="absolute top-1/4 w-full border-t border-[#e0e3e5]/70 pointer-events-none" />
        <div className="absolute top-2/4 w-full border-t border-[#e0e3e5]/70 pointer-events-none" />
        <div className="absolute top-3/4 w-full border-t border-[#e0e3e5]/70 pointer-events-none" />

        {/* SVG Bezier Curves */}
        <svg
          className="absolute inset-0 w-full h-full p-2"
          viewBox={`0 0 ${chartMetrics.width} ${chartMetrics.height}`}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00288e" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#00288e" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ba1a1a" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ba1a1a" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fills */}
          <path d={chartMetrics.revArea} fill="url(#revGradient)" />
          <path d={chartMetrics.expArea} fill="url(#expGradient)" />

          {/* Expenses Line (Red / Error) */}
          <path
            d={chartMetrics.expPath}
            fill="none"
            stroke="#ba1a1a"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            className="transition-all duration-300"
          />

          {/* Revenue Line (Primary Blue) */}
          <path
            d={chartMetrics.revPath}
            fill="none"
            stroke="#00288e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            className="transition-all duration-300"
          />

          {/* Interactive Hover Point & Line */}
          {activePoint && activeExpPoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={chartMetrics.height}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              {/* Exp Dot */}
              <circle
                cx={activeExpPoint.x}
                cy={activeExpPoint.y}
                r="5"
                fill="#ba1a1a"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {/* Rev Dot */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill="#00288e"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Hover detection slices */}
        <div className="absolute inset-0 flex">
          {activeData.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-full cursor-pointer"
              onMouseEnter={() => setHoveredIndex(idx)}
            />
          ))}
        </div>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && activePoint && activeExpPoint && (
          <div
            className="absolute top-2 z-20 bg-[#0f172a] text-white rounded-md shadow-xl p-2 text-xs font-mono border border-slate-700 pointer-events-none transform -translate-x-1/2 transition-all duration-75"
            style={{
              left: `${Math.min(
                Math.max((hoveredIndex / (activeData.length - 1)) * 100, 20),
                80
              )}%`,
            }}
          >
            <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1 mb-1 flex items-center justify-between gap-3">
              <span>{activePoint.data.dayLabel} ({activePoint.data.date})</span>
              <span className="text-[#92f5a4]">
                {activePoint.data.revenue > 0
                  ? `${activePoint.data.revenue >= activePoint.data.expenses ? '+' : ''}${(((activePoint.data.revenue - activePoint.data.expenses) / activePoint.data.revenue) * 100).toFixed(0)}%`
                  : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-200">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Rev:
              </span>
              <span className="font-bold">{formatCurrency(activePoint.data.revenue, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-200 mt-0.5">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Exp:
              </span>
              <span className="font-bold">{formatCurrency(activePoint.data.expenses, currency)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-emerald-400 mt-1 pt-1 border-t border-slate-700 font-bold">
              <span>Profit:</span>
              <span>{formatCurrency(activePoint.data.revenue - activePoint.data.expenses, currency)}</span>
            </div>
          </div>
        )}

        {/* Legend in bottom left (Exact match to screenshot) */}
        <div className="absolute bottom-2 left-3 flex items-center gap-4 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded border border-[#e0e3e5]/70 shadow-2xs pointer-events-none">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00288e]" />
            <span className="font-mono text-xs text-[#475569] font-medium">Rev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ba1a1a]" />
            <span className="font-mono text-xs text-[#475569] font-medium">Exp</span>
          </div>
        </div>

        {/* Day labels at bottom right on desktop */}
        <div className="absolute bottom-2 right-3 hidden md:flex items-center gap-3 text-[11px] font-mono text-[#64748b]">
          {activeData.slice(-5).map((d, i) => (
            <span key={i}>{d.dayLabel}</span>
          ))}
        </div>
      </div>
    </section>
  );
};
