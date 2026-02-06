"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Text,
    ReferenceLine,
    Sector,
    Legend
} from "recharts"
import { AdData } from "@/lib/types"
import { Info, CheckCircle2, AlertCircle, XCircle, Sparkles, ChevronDown, BarChart3, PieChart as PieChartIcon, Activity, Radar as RadarIcon, Hexagon, ArrowRight, TrendingUp, Eye, GitCompare } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface ScoreRadarChartProps {
    adData: AdData | null
    benchmark?: {
        scoreComposition: number
        scoreColorUsage: number
        scoreTypography: number
        scoreVisualDesign: number
        scoreTrustSignals: number
        scoreCTA: number
    } | null
}

type ChartType = "Radar" | "Bar" | "Line" | "Area" | "Pie"

export default function ScoreRadarChart({ adData, benchmark }: ScoreRadarChartProps) {
    const [hoveredSubject, setHoveredSubject] = useState<string | null>(null)
    const [chartType, setChartType] = useState<ChartType>("Radar")
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const [showBenchmark, setShowBenchmark] = useState(true)
    const [detailsOpen, setDetailsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!adData) return null

    // Map AdData to Chart Data
    const data = [
        {
            subject: "Hierarchy",
            score: adData.scoreComposition || 0,
            benchmark: benchmark?.scoreComposition || 0,
            fullMark: 10,
            justification: adData.compositionJustification || "No analysis available.",
            label: "Visual Hierarchy",
            history: [] // History not yet available in AdData
        },
        {
            subject: "Color",
            score: adData.scoreColorUsage || 0,
            benchmark: benchmark?.scoreColorUsage || 0,
            fullMark: 10,
            justification: adData.colorUsageJustification || "No analysis available.",
            label: "Color Psychology",
            history: []
        },
        {
            subject: "Typo",
            score: adData.scoreTypography || 0,
            benchmark: benchmark?.scoreTypography || 0,
            fullMark: 10,
            justification: adData.typographyJustification || "No analysis available.",
            label: "Typography",
            history: []
        },
        {
            subject: "Hook",
            score: adData.scoreVisualDesign || 0, // Mapping Visual Design to Hook/First Impression
            benchmark: benchmark?.scoreVisualDesign || 0,
            fullMark: 10,
            justification: adData.visualDesignJustification || "No analysis available.",
            label: "Hook Effectiveness",
            history: []
        },
        {
            subject: "Prop",
            score: adData.scoreTrustSignals || 0, // Mapping Trust to Value Prop for now
            benchmark: benchmark?.scoreTrustSignals || 0,
            fullMark: 10,
            justification: adData.trustSignalsJustification || "No analysis available.",
            label: "Value Proposition",
            history: []
        },
        {
            subject: "CTA",
            score: adData.scoreCTA || 0,
            benchmark: benchmark?.scoreCTA || 0,
            fullMark: 10,
            justification: adData.ctaJustification || "No analysis available.",
            label: "CTA Strength",
            history: []
        },
    ]

    const activeData = data.find(d => d.subject === hoveredSubject)

    // Theme-aware adjustments
    const isDark = mounted && (theme === 'dark' || theme === 'system')
    const gridColor = isDark ? "#3f3f46" : "#e4e4e7"
    const axisTextColor = isDark ? "#a1a1aa" : "#71717a"
    const activeTextColor = "#ea580c"
    const tooltipBg = isDark ? "#27272a" : "#ffffff"
    const tooltipBorder = isDark ? "#52525b" : "#e4e4e7"

    // Helper for Status Badge
    const getStatus = (score: number) => {
        if (score >= 8) return { label: 'Excellent', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100/50 dark:bg-emerald-900/20', icon: CheckCircle2 }
        if (score >= 5) return { label: 'Average', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100/50 dark:bg-amber-900/20', icon: AlertCircle }
        return { label: 'Needs Improvement', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100/50 dark:bg-red-900/20', icon: XCircle }
    }

    // Custom Tick Component to handle hover events (Radar Only)
    const CustomRadarTick = ({ payload, x, y, textAnchor, stroke, radius }: any) => {
        const isHovered = hoveredSubject === payload.value
        return (
            <g
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredSubject(payload.value)}
                onMouseLeave={() => setHoveredSubject(null)}
                onClick={() => setDetailsOpen(true)}
            >
                <circle cx={x} cy={y - 4} r={isHovered ? 16 : 0} fill={isDark ? "#ea580c" : "#ea580c"} opacity={isHovered ? 0.1 : 0} className="transition-all duration-300" />
                <Text
                    x={x}
                    y={y}
                    textAnchor={textAnchor}
                    fill={isHovered ? activeTextColor : axisTextColor}
                    fontSize={11}
                    fontWeight={isHovered ? 700 : 500}
                    className="transition-colors duration-200 select-none uppercase tracking-wider"
                >
                    {payload.value}
                </Text>
            </g>
        )
    }

    const commonTooltipProps = {
        contentStyle: {
            backgroundColor: tooltipBg,
            borderColor: tooltipBorder,
            color: isDark ? "#fff" : "#000",
            fontSize: "12px",
            borderRadius: "12px",
            padding: "8px 12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        },
        itemStyle: { color: "#ea580c", fontWeight: "bold", fontSize: "11px", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
        cursor: { stroke: '#ea580c', strokeWidth: 1, strokeDasharray: "4 4", fill: isDark ? "rgba(234, 88, 12, 0.1)" : "rgba(234, 88, 12, 0.1)" }
    }

    const handleMouseMove = (state: any) => {
        if (state?.isTooltipActive && state?.activeLabel) {
            if (hoveredSubject !== state.activeLabel) {
                setHoveredSubject(state.activeLabel)
            }
        } else if (state?.isTooltipActive && state?.activePayload?.[0]?.payload?.subject) {
            // Fallback for Pie chart which might structure data differently
            const subj = state.activePayload[0].payload.subject
            if (hoveredSubject !== subj) {
                setHoveredSubject(subj)
            }
        }
    }

    const handleDownload = () => {
        // Functionality removed
    }

    const renderChart = () => {
        const commonProps = {
            margin: { top: 60, right: 10, left: 10, bottom: 0 },
            onMouseMove: handleMouseMove,
            onClick: (data: any) => {
                handleMouseMove(data);
                if (data && (data.activeLabel || (data.activePayload && data.activePayload[0]))) {
                    setDetailsOpen(true);
                }
            },
        }

        const getScoreColorHex = (score: number) => {
            if (score >= 8) return '#10b981' // Emerald-500
            if (score >= 5) return '#f59e0b' // Amber-500
            return '#ef4444' // Red-500
        }

        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
            const RADIAN = Math.PI / 180
            // Fix the radius to ensure label doesn't move when sector pops out
            const fixedInner = 50
            const fixedOuter = 80
            const radius = fixedInner + (fixedOuter - fixedInner) * 0.5
            const x = cx + radius * Math.cos(-midAngle * RADIAN)
            const y = cy + radius * Math.sin(-midAngle * RADIAN)

            return (
                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                    {`${(percent * 100).toFixed(0)}%`}
                </text>
            )
        }

        const renderActiveShape = (props: any) => {
            const RADIAN = Math.PI / 180
            const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill } = props
            const sin = Math.sin(-RADIAN * midAngle)
            const cos = Math.cos(-RADIAN * midAngle)

            // Pop out effect: shift the center
            const shiftDistance = 8
            const shiftX = shiftDistance * cos
            const shiftY = shiftDistance * sin

            return (
                <g>
                    <Sector
                        cx={cx + shiftX}
                        cy={cy + shiftY}
                        innerRadius={innerRadius}
                        outerRadius={outerRadius}
                        startAngle={startAngle}
                        endAngle={endAngle}
                        fill={fill}
                    />
                    <text x={cx + (innerRadius + (outerRadius - innerRadius) * 0.5) * cos} y={cy + (innerRadius + (outerRadius - innerRadius) * 0.5) * sin} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight="bold">
                        {`${(props.percent * 100).toFixed(0)}%`}
                    </text>
                </g>
            )
        }

        switch (chartType) {
            case "Bar":
                return (
                    <BarChart data={data} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.2} />
                        <XAxis dataKey="subject" tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis hide />
                        <Tooltip {...commonTooltipProps} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]} name="Current Score">
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getScoreColorHex(entry.score)} fillOpacity={hoveredSubject === entry.subject ? 1 : 0.8} />
                            ))}
                        </Bar>
                        {showBenchmark && (
                            <Bar dataKey="benchmark" radius={[4, 4, 0, 0]} name="Industry Avg" fill="#71717a" fillOpacity={0.3} />
                        )}
                    </BarChart>
                )
            case "Line":
                return (
                    <LineChart data={data} {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.2} />
                        <XAxis dataKey="subject" tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis hide />
                        <Tooltip {...commonTooltipProps} />
                        <Line type="monotone" dataKey="score" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: "#ea580c" }} activeDot={{ r: 6 }} name="Current Score" />
                        {showBenchmark && (
                            <Line type="monotone" dataKey="benchmark" stroke="#71717a" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3, fill: "#71717a" }} name="Industry Avg" />
                        )}
                    </LineChart>
                )
            case "Area":
                return (
                    <AreaChart data={data} {...commonProps}>
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#71717a" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.2} />
                        <XAxis dataKey="subject" tick={{ fill: axisTextColor, fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                        <YAxis hide />
                        <Tooltip {...commonTooltipProps} />
                        <Area type="monotone" dataKey="score" stroke="#ea580c" fillOpacity={1} fill="url(#colorScore)" name="Current Score" />
                        {showBenchmark && (
                            <Area type="monotone" dataKey="benchmark" stroke="#71717a" fillOpacity={1} fill="url(#colorBenchmark)" name="Industry Avg" />
                        )}
                    </AreaChart>
                )
            case "Pie":
                return (
                    <PieChart onMouseEnter={handleMouseMove} onClick={handleMouseMove}>
                        {showBenchmark && (
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="benchmark"
                                nameKey="subject"
                                stroke="none"
                                fill="#71717a"
                                fillOpacity={0.3}
                                activeIndex={data.findIndex(d => d.subject === hoveredSubject)}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-bench-${index}`} fill="#71717a" fillOpacity={data[index].subject === hoveredSubject ? 0.5 : 0.2} />
                                ))}
                            </Pie>
                        )}
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="score"
                            nameKey="subject"
                            label={renderCustomizedLabel}
                            labelLine={false}
                            activeIndex={data.findIndex(d => d.subject === hoveredSubject)}
                            activeShape={renderActiveShape}
                            onMouseEnter={(_, index) => setHoveredSubject(data[index].subject)}
                            onClick={(_, index) => setHoveredSubject(data[index].subject)}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getScoreColorHex(entry.score)} stroke="rgba(0,0,0,0.1)" opacity={data[index].subject === hoveredSubject ? 1 : 0.9} />
                            ))}
                        </Pie>
                        <Tooltip {...commonTooltipProps} />
                    </PieChart>
                )
            case "Radar":
            default:
                return (
                    <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="55%"
                        data={data}
                        onMouseMove={handleMouseMove}
                        onClick={handleMouseMove}
                    >
                        <PolarGrid stroke={gridColor} strokeOpacity={isDark ? 0.3 : 0.6} strokeDasharray={isDark ? "3 3" : "0 0"} />
                        <PolarAngleAxis dataKey="subject" tick={<CustomRadarTick />} />
                        <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                        <Tooltip {...commonTooltipProps} />
                        <Radar
                            name="Current Score"
                            dataKey="score"
                            stroke="#ea580c"
                            strokeWidth={2}
                            fill="#ea580c"
                            fillOpacity={showBenchmark ? 0.2 : 0.4}
                            activeDot={{ r: 4, fill: "#ea580c", strokeWidth: 0 }}
                        />
                        {showBenchmark && (
                            <Radar
                                name="Industry Avg"
                                dataKey="benchmark"
                                stroke="#71717a"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                fill="#71717a"
                                fillOpacity={0.1}
                            />
                        )}

                        {/* Legend removed to prevent overlap, moved to custom HTML below */}
                    </RadarChart>
                )
        }
    }


    if (!mounted) return null

    const status = activeData ? getStatus(activeData.score) : null
    const StatusIcon = status ? status.icon : null

    return (
        <div className="w-full h-auto min-h-[350px] flex flex-col md:flex-row bg-white dark:bg-[#18181b] rounded-xl border border-zinc-200 dark:border-zinc-800 p-1 relative overflow-hidden shadow-sm transition-colors duration-300 group/container">

            {/* Subtle Background Gradeint */}
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-50/0 via-zinc-50/0 to-zinc-50/0 dark:from-white/0 dark:via-white/0 dark:to-white/[0.02] pointer-events-none" />

            {/* Mobile Title & Dropdown (< md) */}
            {/* Mobile Title (Left) */}
            <div className="absolute top-4 left-4 z-20 flex md:hidden items-center gap-2">
                <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    <Sparkles className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                </div>
                <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Creative Attributes</h4>
            </div>

            {/* Mobile Controls (Right) */}
            <div className="absolute top-4 right-2 z-20 flex md:hidden items-center gap-1.5">
                <div
                    className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full border cursor-pointer transition-all", showBenchmark ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900")}
                    onClick={() => setShowBenchmark(!showBenchmark)}
                >
                    <GitCompare className={cn("h-3 w-3", showBenchmark ? "text-orange-500" : "text-zinc-400")} />
                </div>

                <div className="h-3 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 outline-none group opacity-80 active:opacity-100 transition-opacity">
                        <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest cursor-pointer">
                            {chartType}
                        </h4>
                        <ChevronDown className="h-3 w-3 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" alignOffset={-4} className="w-40 z-50">
                        <DropdownMenuItem onClick={() => setChartType("Radar")} className="text-xs font-medium cursor-pointer">
                            <Hexagon className="mr-2 h-3.5 w-3.5 text-orange-500" /> Radar Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartType("Bar")} className="text-xs font-medium cursor-pointer">
                            <BarChart3 className="mr-2 h-3.5 w-3.5 text-blue-500" /> Bar Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartType("Line")} className="text-xs font-medium cursor-pointer">
                            <Activity className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Line Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartType("Area")} className="text-xs font-medium cursor-pointer">
                            <Activity className="mr-2 h-3.5 w-3.5 text-indigo-500 fill-current" /> Area Chart
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setChartType("Pie")} className="text-xs font-medium cursor-pointer">
                            <PieChartIcon className="mr-2 h-3.5 w-3.5 text-purple-500" /> Pie Chart
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Left Side: Chart */}
            <div className="w-full md:w-5/12 min-h-[350px] flex flex-col relative">
                {/* Desktop Title & Dropdown (>= md) */}
                <div className="absolute top-4 left-4 z-20 hidden md:flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <Sparkles className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                        </div>
                        <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest hidden lg:block">Creative Attributes</h4>
                    </div>

                    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1.5 outline-none group opacity-60 hover:opacity-100 transition-opacity">
                            {chartType === 'Radar' && <Hexagon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />}
                            {chartType === 'Bar' && <BarChart3 className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />}
                            {chartType === 'Line' && <Activity className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />}
                            {chartType === 'Area' && <Activity className="h-3 w-3 text-zinc-500 dark:text-zinc-400 fill-current" />}
                            {chartType === 'Pie' && <PieChartIcon className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />}

                            <h4 className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest cursor-pointer">
                                {chartType}
                            </h4>
                            <ChevronDown className="h-3 w-3 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40 z-50">
                            <DropdownMenuItem onClick={() => setChartType("Radar")} className="text-xs font-medium cursor-pointer">
                                <Hexagon className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Radar Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartType("Bar")} className="text-xs font-medium cursor-pointer">
                                <BarChart3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Bar Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartType("Line")} className="text-xs font-medium cursor-pointer">
                                <Activity className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Line Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartType("Area")} className="text-xs font-medium cursor-pointer">
                                <Activity className="mr-2 h-3.5 w-3.5 text-muted-foreground fill-current" /> Area Chart
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setChartType("Pie")} className="text-xs font-medium cursor-pointer">
                                <PieChartIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> Pie Chart
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Benchmark Toggle */}
                    <div className="flex items-center gap-2 ml-2">
                        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
                        <div
                            className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full border cursor-pointer transition-all", showBenchmark ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-900")}
                            onClick={() => setShowBenchmark(!showBenchmark)}
                        >
                            <GitCompare className={cn("h-3 w-3", showBenchmark ? "text-orange-500" : "text-zinc-400")} />
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider hidden 2xl:inline-block", showBenchmark ? "text-orange-500" : "text-zinc-400")}>
                                Benchmark
                            </span>
                        </div>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height="100%" className={cn("flex-1 min-h-0", showBenchmark ? "opacity-100" : "")}>
                    {renderChart()}
                </ResponsiveContainer>

                {/* Custom Legend for clearer visibility */}
                <div className="flex items-center justify-center gap-4 pb-4 pt-2">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm bg-[#ea580c]" />
                        <span className="text-[10px] font-bold uppercase text-zinc-500">Current Score</span>
                    </div>
                    {showBenchmark && (
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-sm bg-[#71717a] opacity-50" />
                            <span className="text-[10px] font-bold uppercase text-zinc-500">Industry Avg</span>
                        </div>
                    )}
                </div>


            </div>

            {/* Right Side: Content Panel */}
            <div className="w-full md:w-7/12 flex items-center p-2 md:p-6 md:pl-2">
                <div className="w-full h-full rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 relative overflow-hidden flex flex-col justify-center px-6 py-6 transition-all duration-500">

                    {/* Decorative background element for right panel */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                    {activeData && status && StatusIcon ? (
                        <div className="relative z-10 space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Header Section */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h5 className="text-[#ea580c] font-bold uppercase tracking-widest text-[9px] mb-1.5 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse" />
                                        Attribute Focus
                                    </h5>
                                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">{activeData.label}</h3>
                                </div>

                                {/* Status Badge */}
                                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-transparent shadow-sm", status.bg)}>
                                    <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wide", status.color)}>{status.label}</span>
                                </div>
                            </div>

                            {/* Justification Box */}
                            <div className="relative pl-4">
                                <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-zinc-200 dark:bg-zinc-700" />
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed font-medium italic">
                                    "{activeData.justification}"
                                </p>
                            </div>

                            {/* Score Meter */}
                            <div className="flex items-center gap-4 pt-2">
                                <div className="flex-1">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400 mb-1.5">
                                        <span>Metric Score</span>
                                        <span className="text-zinc-900 dark:text-white">{activeData.score}/10</span>
                                    </div>
                                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${(activeData.score / 10) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions Row */}
                            <div className="flex gap-2 pt-2">
                                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 tracking-wider uppercase font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setDetailsOpen(true)}>
                                    <Eye className="h-3 w-3" />
                                    Details
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1.5 tracking-wider uppercase font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setShowBenchmark(!showBenchmark)}>
                                    <GitCompare className="h-3 w-3" />
                                    {showBenchmark ? "Hide Avg" : "Compare"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center h-full space-y-3 opacity-60 dark:opacity-40">
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                                <div className="h-14 w-14 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center relative z-10 rotate-3 transition-transform group-hover/container:rotate-6 duration-700">
                                    <Info className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-300">Detailed AI Analysis</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Hover over chart elements to explore</p>
                            </div>

                        </div>
                    )}
                </div>
            </div>

            {/* Drill Down Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {activeData?.label}
                            {activeData && (
                                <Badge variant={activeData.score >= 8 ? 'default' : activeData.score >= 5 ? 'secondary' : 'destructive'} className="ml-2 text-[10px] uppercase">
                                    Score: {activeData.score}/10
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500 dark:text-zinc-400">
                            Detailed breakdown of the {activeData?.label.toLowerCase()} analysis.
                        </DialogDescription>
                    </DialogHeader>
                    {activeData && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest mb-1">Analysis</h4>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{activeData.justification}</p>
                            </div>

                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
