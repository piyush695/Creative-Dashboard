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
    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-500"><Sparkles className="h-3.5 w-3.5" /></div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">AI insights</h2>
          <p className="text-xs text-muted-foreground">Key takeaways, strengths, gaps and recommended next steps.</p>
        </div>
      </div>

      {/* Primary Key Insight */}
      <Card className="relative overflow-hidden border border-border bg-card transition-colors group rounded-xl">
        <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
        <CardHeader className="pb-2 px-5 pt-5">
          <div className="flex gap-3 items-center">
            <div className="p-1.5 rounded-md bg-sky-500/10">
              <Lightbulb className="h-4 w-4 text-sky-500" />
            </div>
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Strategic intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="text-[13px] md:text-sm text-muted-foreground leading-relaxed">
            {typeof insight === 'object' ? JSON.stringify(insight) : insight}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Performance Highs - What Works */}
        <Card className="border border-emerald-200/60 dark:border-emerald-500/20 shadow-sm bg-emerald-50/30 dark:bg-emerald-500/5 relative overflow-hidden group rounded-lg transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/40">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex gap-3 items-center">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-[13px] font-semibold tracking-tight text-foreground">What's working</CardTitle>
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
        <Card className="border border-amber-200/60 dark:border-amber-500/20 shadow-sm bg-amber-50/30 dark:bg-amber-500/5 relative overflow-hidden group rounded-lg transition-colors hover:border-amber-300 dark:hover:border-amber-500/40">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertCircle className="h-16 w-16 text-amber-600" />
          </div>
          <CardHeader className="pb-3 px-6 pt-6">
            <div className="flex gap-3 items-center">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <CardTitle className="text-[13px] font-semibold tracking-tight text-foreground">Areas to improve</CardTitle>
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
        <Card className="border border-border bg-card relative overflow-hidden group rounded-lg">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-primary opacity-[0.05] dark:opacity-[0.1] blur-[100px] pointer-events-none transition-all duration-1000" />
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">Creative blueprint</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Iterative optimization framework</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-3 p-5 rounded-lg bg-zinc-50 dark:bg-white/5 border border-border dark:border-border transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:border-emerald-500/30 duration-500">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-xl bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-80">Retain</span>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-foreground/80 dark:text-zinc-300">{adData.keepElements}</p>
              </div>
              <div className="space-y-3 p-5 rounded-lg bg-zinc-50 dark:bg-white/5 border border-border dark:border-border transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:border-amber-500/30 duration-500">
                <div className="flex items-center gap-3 mb-1">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <XCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 opacity-80">Refine</span>
                </div>
                <p className="text-sm font-semibold leading-relaxed text-foreground/80 dark:text-zinc-300">{adData.changeElements}</p>
              </div>
              <div className="space-y-3 p-5 rounded-lg bg-zinc-50 dark:bg-white/5 border border-border dark:border-border transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-sm hover:border-primary/30 duration-500">
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
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
          Recommended optimization steps <TrendingUp className="h-3.5 w-3.5" />
        </h3>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="flex flex-col gap-4 p-5 rounded-lg bg-card border border-border hover:bg-accent transition-colors group/rec">
              <div className="flex flex-col md:flex-row gap-5">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-white text-lg font-black shadow-sm shadow-primary/30 group-hover/rec:scale-110 transition-all duration-500">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  {formatRecommendationText(rec.text)}

                  <div className="flex flex-wrap gap-3 items-stretch">
                    {rec.impact && (
                      <div className="flex flex-col gap-1 min-w-[200px] flex-1 px-4 py-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/10 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-primary/80">Expected Performance Impact</span>
                        <span className="text-xs font-bold text-foreground/80 dark:text-zinc-200 leading-tight">{rec.impact}</span>
                      </div>
                    )}
                    {rec.effort && (
                      <div className="flex flex-col gap-1 px-4 py-3 bg-secondary dark:bg-zinc-800 rounded-lg border border-border dark:border-zinc-700 shrink-0 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Implementation Effort</span>
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
