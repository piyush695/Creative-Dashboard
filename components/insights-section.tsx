import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Lightbulb, CheckCircle2, XCircle, PlusCircle, Sparkles } from "lucide-react"
import { AdData } from "@/lib/types"

interface InsightsSectionProps {
  adData: AdData | null
}

export default function InsightsSection({ adData }: InsightsSectionProps) {
  if (!adData) return null

  const safeString = (val: any) => typeof val === 'string' ? val : "";
  const safeArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') return val.split("|").map(s => s.trim()).filter(Boolean);
    return [];
  };

  const formatRecommendationText = (text: string) => {
    if (!text) return null;

    const hasNumbering = /\d+\.\s/.test(text);

    if (!hasNumbering) {
      return <p className="text-sm text-foreground/80 dark:text-zinc-200 leading-relaxed font-bold">{text}</p>;
    }

    const parts = text.split(/(?=(?:^|\s)\d+\.\s)/).filter(p => p.trim());

    if (parts.length <= 1) {
      return <p className="text-sm text-foreground/80 dark:text-zinc-200 leading-relaxed font-bold">{text}</p>;
    }

    return (
      <div className="space-y-2 mt-2">
        {parts.map((part, i) => (
          <div key={i} className="text-sm text-foreground/80 dark:text-zinc-200 leading-relaxed font-bold">
            {part.trim()}
          </div>
        ))}
      </div>
    );
  };

  // Prioritize new fields from DB
  const insight = adData.keyInsight || adData.topInsight;
  const strengths = adData.whatWorks ? [adData.whatWorks] : safeArray(adData.keyStrengths);
  const weaknesses = adData.whatDoesntWork ? [adData.whatDoesntWork] : safeArray(adData.keyWeaknesses);

  const recommendations = [
    { text: safeString(adData.recommendation1), impact: safeString(adData.recommendation1Impact), effort: safeString(adData.recommendation1Effort) },
    { text: safeString(adData.recommendation2), impact: safeString(adData.recommendation2Impact), effort: safeString(adData.recommendation2Effort) },
    { text: safeString(adData.recommendation3), impact: safeString(adData.recommendation3Impact), effort: safeString(adData.recommendation3Effort) },
  ].filter(r => r.text)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="text-xl font-black text-foreground tracking-tightest uppercase opacity-80">Intelligence Analysis</h3>
      </div>

      {/* Primary Key Insight */}
      <Card className="relative overflow-hidden border border-border/40 premium-shadow glass transition-all group rounded-[2.5rem]">
        <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
        <CardHeader className="pb-2 px-8 pt-8">
          <div className="flex gap-4 items-center">
            <div className="p-3 rounded-2xl bg-primary/10 shadow-inner">
              <Lightbulb className="h-6 w-6 text-primary transition-transform group-hover:rotate-12 duration-500" />
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-widest text-foreground">Strategic Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <p className="text-base md:text-lg text-foreground/80 leading-relaxed font-black tracking-tight">
            {typeof insight === 'object' ? JSON.stringify(insight) : insight}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Performance Highs - What Works */}
        <Card className="border-none shadow-lg bg-emerald-50/30 dark:bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex gap-3 items-center">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-base font-black uppercase tracking-wider text-foreground dark:text-zinc-100">What's Working</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ul className="space-y-3">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex gap-3 text-sm font-bold text-foreground/80 dark:text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Action Gap - What Doesn't Work */}
        <Card className="border-none shadow-lg bg-amber-50/30 dark:bg-amber-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex gap-3 items-center">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-base font-black uppercase tracking-wider text-foreground dark:text-zinc-100">Areas to Improve</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ul className="space-y-3">
              {weaknesses.map((weak, idx) => (
                <li key={idx} className="flex gap-3 text-sm font-bold text-foreground/80 dark:text-zinc-300">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{weak}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Elements Action Plan - Refined Tech Aesthetic */}
      {(adData.keepElements || adData.changeElements || adData.addElements) && (
        <Card className="border border-border shadow-2xl bg-white dark:bg-zinc-900 relative overflow-hidden group rounded-[2.5rem] shine-effect">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-primary opacity-[0.05] dark:opacity-[0.1] blur-[100px] pointer-events-none transition-all duration-1000" />
          <CardHeader className="px-8 pt-10 pb-6">
            <CardTitle className="text-xl font-black uppercase tracking-[0.3em] text-primary">Creative Blueprint</CardTitle>
            <CardDescription className="text-muted-foreground/60 font-black uppercase tracking-[0.2em] text-[10px]">Iterative Optimization Framework</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-white/5 border border-border dark:border-white/10 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:border-emerald-500/30 duration-500">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-80">Retain</span>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-foreground/80 dark:text-zinc-300">{adData.keepElements}</p>
              </div>
              <div className="space-y-4 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-white/5 border border-border dark:border-white/10 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:border-amber-500/30 duration-500">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <XCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 opacity-80">Refine</span>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-foreground/80 dark:text-zinc-300">{adData.changeElements}</p>
              </div>
              <div className="space-y-4 p-8 rounded-[2.5rem] bg-zinc-50 dark:bg-white/5 border border-border dark:border-white/10 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl hover:border-primary/30 duration-500">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <PlusCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-primary opacity-80">Introduce</span>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-foreground/80 dark:text-zinc-300">{adData.addElements}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actionable Recommendations */}
      <div className="space-y-4 pt-4">
        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-400 inline-flex items-center gap-2">
          Recommended Optimization Steps <TrendingUp className="h-3.5 w-3.5" />
        </h4>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="flex flex-col gap-4 p-8 rounded-[3rem] bg-white dark:bg-zinc-900 border border-border premium-shadow premium-shadow-hover transition-all group/rec">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center w-12 h-12 rounded-[1.5rem] bg-primary text-white text-lg font-black shadow-xl shadow-primary/30 group-hover/rec:scale-110 transition-all duration-500">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-6">
                  {formatRecommendationText(rec.text)}

                  <div className="flex flex-wrap gap-3 items-stretch">
                    {rec.impact && (
                      <div className="flex flex-col gap-1 min-w-[200px] flex-1 px-4 py-3 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">Expected Performance Impact</span>
                        <span className="text-xs font-bold text-foreground/80 dark:text-zinc-200 leading-tight">{rec.impact}</span>
                      </div>
                    )}
                    {rec.effort && (
                      <div className="flex flex-col gap-1 px-4 py-3 bg-secondary dark:bg-zinc-800 rounded-2xl border border-border dark:border-zinc-700 shrink-0 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Implementation Effort</span>
                        <span className="text-xs font-black text-foreground dark:text-zinc-100">{rec.effort}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
