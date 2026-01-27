import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, TrendingUp, Lightbulb } from "lucide-react"
import { AdData } from "@/lib/types"

interface InsightsSectionProps {
  adData: AdData | null
}

export default function InsightsSection({ adData }: InsightsSectionProps) {
  if (!adData) return null

  const safeString = (val: any) => typeof val === 'string' ? val : "";
  const safeArray = (val: any) => typeof val === 'string' ? val.split("|").map(s => s.trim()).filter(Boolean) : [];

  const strengths = safeArray(adData.keyStrengths);
  const weaknesses = safeArray(adData.keyWeaknesses);

  const recommendations = [
    { text: safeString(adData.recommendation1), impact: safeString(adData.recommendation1Impact), effort: safeString(adData.recommendation1Effort) },
    { text: safeString(adData.recommendation2), impact: safeString(adData.recommendation2Impact), effort: safeString(adData.recommendation2Effort) },
    { text: safeString(adData.recommendation3), impact: safeString(adData.recommendation3Impact), effort: safeString(adData.recommendation3Effort) },
  ].filter(r => r.text)

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">AI Analysis & Insights</h3>

      {/* Top Insight */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex gap-3 items-start">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-base">Key Insight</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground leading-relaxed">
            {typeof adData.topInsight === 'object' ? JSON.stringify(adData.topInsight) : adData.topInsight}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card>
          <CardHeader>
            <div className="flex gap-3 items-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Key Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {strengths.map((strength, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="text-green-600 font-bold shrink-0">✓</span>
                  <span className="text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader>
            <div className="flex gap-3 items-center">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Areas to Improve</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {weaknesses.map((weakness, idx) => (
                <li key={idx} className="flex gap-3 text-sm">
                  <span className="text-amber-600 font-bold shrink-0">→</span>
                  <span className="text-foreground">{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold">Recommendations for Optimization</CardTitle>
          <CardDescription className="text-xs">Actionable steps to improve your creative performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex flex-col gap-4 p-5 rounded-xl bg-zinc-50 border border-zinc-100 transition-all hover:bg-white hover:shadow-md">
                <div className="flex gap-4">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-900 text-white text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-4">
                    <p className="text-sm text-zinc-700 leading-relaxed font-medium">
                      {rec.text}
                    </p>

                    <div className="flex flex-wrap gap-3 items-stretch">
                      {rec.impact && (
                        <div className="flex flex-col gap-1 min-w-[140px] flex-1 max-w-[400px] px-3 py-2 bg-[#F5E6D3]/50 rounded-lg border border-[#F5E6D3] transition-all hover:bg-[#F5E6D3]">
                          <span className="text-[8px] font-black uppercase tracking-widest text-[#8B4513]/60">Expected Impact</span>
                          <span className="text-[10px] md:text-xs font-bold text-[#8B4513] leading-tight">{rec.impact}</span>
                        </div>
                      )}
                      {rec.effort && (
                        <div className="flex flex-col gap-1 px-3 py-2 bg-zinc-100 rounded-lg border border-zinc-200 shrink-0">
                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Effort level</span>
                          <span className="text-[10px] md:text-xs font-black text-zinc-900">{rec.effort}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

