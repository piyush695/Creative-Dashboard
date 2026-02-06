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
      return <p className="text-sm text-zinc-700 leading-relaxed font-bold">{text}</p>;
    }

    const parts = text.split(/(?=(?:^|\s)\d+\.\s)/).filter(p => p.trim());

    if (parts.length <= 1) {
      return <p className="text-sm text-zinc-700 leading-relaxed font-bold">{text}</p>;
    }

    return (
      <div className="space-y-2 mt-2">
        {parts.map((part, i) => (
          <div key={i} className="text-sm text-zinc-700 leading-relaxed font-bold">
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
        <Sparkles className="h-5 w-5 text-[#007AFF]" />
        <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">AI Insights & Strategic Analysis</h3>
      </div>

      {/* Primary Key Insight */}
      <Card className="relative overflow-hidden border-none shadow-xl bg-white dark:bg-zinc-900/60 transition-all hover:shadow-2xl group">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#007AFF]" />
        <CardHeader className="pb-2">
          <div className="flex gap-3 items-center">
            <div className="p-2 rounded-lg bg-[#007AFF]/10">
              <Lightbulb className="h-5 w-5 text-[#007AFF]" />
            </div>
            <CardTitle className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50">Strategic Key Insight</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm md:text-base text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
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
              <CardTitle className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">What's Working</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ul className="space-y-3">
              {strengths.map((str, idx) => (
                <li key={idx} className="flex gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
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
              <CardTitle className="text-base font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-100">Areas to Improve</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <ul className="space-y-3">
              {weaknesses.map((weak, idx) => (
                <li key={idx} className="flex gap-3 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span>{weak}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Elements Action Plan */}
      {(adData.keepElements || adData.changeElements || adData.addElements) && (
        <Card className="border-none shadow-xl bg-zinc-900 text-white relative overflow-hidden group">
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-[#007AFF] opacity-[0.07] blur-[100px] pointer-events-none" />
          <CardHeader className="px-6 pt-8 pb-4">
            <CardTitle className="text-lg font-black uppercase tracking-[0.2em] text-[#007AFF]">Creative Strategy Blueprint</CardTitle>
            <CardDescription className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Framework for the next iteration</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Keep</span>
                </div>
                <p className="text-sm font-bold leading-relaxed text-zinc-300">{adData.keepElements}</p>
              </div>
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-amber-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Change</span>
                </div>
                <p className="text-sm font-bold leading-relaxed text-zinc-300">{adData.changeElements}</p>
              </div>
              <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 transition-all hover:bg-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <PlusCircle className="h-4 w-4 text-[#007AFF]" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#007AFF]">Add</span>
                </div>
                <p className="text-sm font-bold leading-relaxed text-zinc-300">{adData.addElements}</p>
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
            <div key={idx} className="flex flex-col gap-4 p-6 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all hover:shadow-2xl hover:border-[#007AFF]/20 group/rec">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-zinc-800 text-[#007AFF] text-sm font-black shadow-lg group-hover/rec:bg-[#007AFF] group-hover/rec:text-white transition-all duration-300">
                    {idx + 1}
                  </span>
                </div>
                <div className="flex-1 space-y-6">
                  {formatRecommendationText(rec.text)}

                  <div className="flex flex-wrap gap-3 items-stretch">
                    {rec.impact && (
                      <div className="flex flex-col gap-1 min-w-[200px] flex-1 px-4 py-3 bg-[#007AFF]/5 dark:bg-[#007AFF]/10 rounded-2xl border border-[#007AFF]/10 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#007AFF]/60">Expected Performance Impact</span>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 leading-tight">{rec.impact}</span>
                      </div>
                    )}
                    {rec.effort && (
                      <div className="flex flex-col gap-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shrink-0 transition-all hover:scale-[1.02] cursor-default">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Implementation Effort</span>
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{rec.effort}</span>
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
