import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, Globe, CheckCircle2, Zap, ArrowUpRight, BarChart3, TrendingUp, Target, ShieldCheck, Play, Search, Smartphone } from 'lucide-react';

const lineData = [
   { name: 'Week 1', roas: 4.2 },
   { name: 'Week 2', roas: 5.8 },
   { name: 'Week 3', roas: 5.1 },
   { name: 'Week 4', roas: 6.7 },
   { name: 'Week 5', roas: 7.9 },
   { name: 'Week 6', roas: 7.3 },
   { name: 'Week 7', roas: 8.6 },
];

const barData = [
   { name: 'Video', volume: 65 },
   { name: 'Static', volume: 45 },
   { name: 'UGC', volume: 85 },
   { name: 'Carousel', volume: 55 },
];

const pieData = [
   { name: 'High ROAS', value: 45 },
   { name: 'Testing', value: 35 },
   { name: 'Fatigue', value: 20 },
];

const PIE_COLORS = ['#00D4C8', '#6366f1', '#f43f5e'];

const CustomTooltip = ({ active, payload, label }: any) => {
   if (active && payload && payload.length) {
      return (
         <div className="bg-popover border border-border shadow-md rounded-md p-2 text-xs text-popover-foreground">
            {label && <p className="font-semibold mb-1 opacity-80">{label}</p>}
            {payload.map((entry: any, index: number) => (
               <p key={index} className="font-medium flex items-center gap-1.5" style={{ color: entry.color || '#00D4C8' }}>
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color || '#00D4C8' }} />
                  {entry.name}: {typeof entry.value === 'number' && entry.name === 'roas' ? `${entry.value}x` : entry.value}
               </p>
            ))}
         </div>
      );
   }
   return null;
};

export default function HomeOverviewView() {
   return (
      <div className="flex-1 w-full flex flex-col items-center bg-transparent min-h-full animate-in fade-in duration-300 pb-12">
         <div className="w-full max-w-[1600px] px-4 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">

            {/* Top Overview Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
               <div className="space-y-1">
                  <h1 className="text-xl md:text-3xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-600 dark:from-teal-400 dark:via-blue-400 dark:to-indigo-500">
                     HolaPrime Overview
                  </h1>
                  <p className="text-sm md:text-base text-muted-foreground max-w-3xl leading-relaxed mt-1 md:mt-2">
                     Your centralized operations hub. AI processes, scores, and optimizes multi-channel ad creatives in real-time, delivering actionable media strategies and maximizing your ROAS.
                  </p>
               </div>
               <div className="flex shrink-0 items-center justify-start lg:justify-end">
                  <div className="inline-flex items-center gap-2 bg-card px-3.5 py-1.5 rounded-lg border border-border shadow-sm text-foreground">
                     <span className="flex h-2 w-2 rounded-full bg-[#00D4C8] shadow-[0_0_8px_#00D4C8]"></span>
                     <span className="text-[12px] font-semibold">Systems Operational</span>
                  </div>
               </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
               {[
                  { title: "Active Assets", value: "24,892", change: "+12.5%", icon: Target },
                  { title: "Cross-Platform Spend", value: "$1.2M", change: "+8.2%", icon: Activity },
                  { title: "Revenue", value: "$1.6M", change: "+24.1%", icon: Zap },
                  { title: "ROAS", value: "8.6x", change: "Stable", icon: TrendingUp },
               ].map((metric, i) => (
                  <Card
                     key={i}
                     className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl hover:border-[#00D4C8]/50 dark:hover:border-[#00D4C8]/40 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-[#00D4C8]/5 transition-all duration-300 cursor-default overflow-hidden relative"
                  >
                     {/* Subtle glow overlay */}
                     <div className="absolute inset-0 bg-gradient-to-br from-[#00D4C8]/0 to-[#00D4C8]/0 group-hover:from-[#00D4C8]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none rounded-xl" />
                     <CardContent className="p-5 md:p-6 flex flex-col justify-between h-full relative z-10">
                        <div className="flex items-start justify-between">
                           <p className="text-[12px] md:text-sm font-medium text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">{metric.title}</p>
                           <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:bg-[#00D4C8]/10 group-hover:border-[#00D4C8]/30 transition-all duration-300">
                              <metric.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#00D4C8] group-hover:scale-110 transition-all duration-300" />
                           </div>
                        </div>
                        <div className="mt-4 flex items-baseline gap-2">
                           <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tight group-hover:scale-105 origin-left transition-transform duration-300">{metric.value}</h3>
                           <span className="text-[11px] font-semibold text-[#00D4C8] flex items-center gap-0.5 group-hover:opacity-100 opacity-80 transition-opacity duration-300">
                              <ArrowUpRight className="w-3 h-3 mr-px group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                              {metric.change}
                           </span>
                        </div>
                     </CardContent>
                  </Card>
               ))}
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Main Line Chart */}
               <Card className="lg:col-span-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl">
                  <CardHeader className="p-4 md:p-5 pb-0 border-b-0 space-y-1">
                     <CardTitle className="text-[15px] font-semibold text-foreground">ROAS Trends</CardTitle>
                     <CardDescription className="text-[12px] text-muted-foreground">ROAS performance across 7 weeks.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} style={{ outline: 'none' }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.3} />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dx={-10} domain={[0, 10]} tickFormatter={(v: number) => `${v}x`} />
                           <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                           <Line 
                              type="monotone" 
                              dataKey="roas" 
                              stroke="#00D4C8" 
                              strokeWidth={3} 
                              dot={false} 
                              activeDot={{ r: 6, fill: '#00D4C8', strokeWidth: 0, style: { outline: 'none' } }} 
                           />
                        </LineChart>
                     </ResponsiveContainer>
                  </CardContent>
               </Card>

               {/* Bar Chart & Pie Chart Column */}
               <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl flex-1">
                     <CardHeader className="p-4 pb-0 space-y-0.5">
                        <CardTitle className="text-[14px] font-semibold text-foreground">Format Breakdown</CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 h-[120px]">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                              <XAxis type="number" hide />
                              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={60} />
                              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                              <Bar dataKey="volume" fill="#00D4C8" radius={[0, 4, 4, 0]} barSize={12} />
                           </BarChart>
                        </ResponsiveContainer>
                     </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl flex-1">
                     <CardHeader className="p-4 pb-0 space-y-0.5">
                        <CardTitle className="text-[14px] font-semibold text-foreground">Creative Status</CardTitle>
                     </CardHeader>
                     <CardContent className="p-4 h-[120px] flex items-center justify-between">
                        <div className="w-[100px] h-[100px]">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart style={{ outline: 'none' }}>
                                 <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={30}
                                    outerRadius={45}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                    activeShape={false}
                                 >
                                    {pieData.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                 </Pie>
                                 <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col gap-2 justify-center pl-2">
                           {pieData.map((entry, i) => (
                              <div key={i} className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: PIE_COLORS[i] }} />
                                 <span className="text-[11px] font-medium text-muted-foreground leading-none">{entry.name}</span>
                              </div>
                           ))}
                        </div>
                     </CardContent>
                  </Card>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* All Platforms Section */}
               <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl flex flex-col">
                  <CardHeader className="p-4 md:p-5 border-b border-border/50">
                     <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-foreground">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        Connected Platforms
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 flex-1 grid grid-cols-2 gap-3">
                     {[
                        { name: "Meta Ads", icon: Smartphone, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
                        { name: "Google Ads", icon: Play, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10" },
                        { name: "X (Twitter)", icon: Globe, color: "text-slate-700 dark:text-white", bg: "bg-slate-100 dark:bg-white/10" },
                        { name: "Taboola", icon: Search, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
                     ].map((plat, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-colors cursor-default bg-slate-50 dark:bg-slate-900/50">
                           <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${plat.bg}`}>
                              <plat.icon className={`w-4 h-4 ${plat.color}`} />
                           </div>
                           <span className="text-[13px] font-semibold text-foreground">{plat.name}</span>
                        </div>
                     ))}
                  </CardContent>
               </Card>

               {/* What We Are Doing Section */}
               <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl flex flex-col">
                  <CardHeader className="p-4 md:p-5 border-b border-border/50">
                     <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-foreground">
                        <Activity className="w-4 h-4 text-muted-foreground" />
                        Live Activity
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-5 space-y-4">
                     {[
                        { step: "AIDA Extraction", desc: "Analyzing 124 video assets from Meta...", time: "2 min ago", status: "Active" },
                        { step: "Performance Sync", desc: "Aggregating Google Ads reporting data.", time: "15 min ago", status: "Done" },
                        { step: "Model Training", desc: "Refining visual hook predictors for Q3.", time: "1 hour ago", status: "Done" },
                     ].map((item, i) => (
                        <div key={i} className="flex items-start gap-4">
                           <div className="relative flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${item.status === 'Active' ? 'bg-[#00D4C8] shadow-[0_0_8px_#00D4C8]' : 'bg-muted-foreground/30'}`} />
                              {i !== 2 && <div className="w-px h-10 bg-border my-1" />}
                           </div>
                           <div className="flex-1 space-y-1 mt-0.5">
                              <div className="flex items-center justify-between leading-none">
                                 <p className="text-[13px] font-semibold text-foreground">{item.step}</p>
                                 <span className="text-[11px] text-muted-foreground font-medium">{item.time}</span>
                              </div>
                              <p className="text-[12px] text-muted-foreground leading-relaxed">{item.desc}</p>
                           </div>
                        </div>
                     ))}
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
   );
}
