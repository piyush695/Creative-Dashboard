"use client"

import { Sparkles } from "lucide-react"
import { STUDIO_STARTERS } from "./studio-shared"

interface StudioEmptyStageProps {
  title?: string
  description?: string
  onPickStarter: (prompt: string) => void
  showStarters?: boolean
}

export function StudioEmptyStage({
  title = "Start a new creative",
  description = "Describe the ad you want, add a reference, or pick a starting point below. Variations appear right here in the conversation.",
  onPickStarter,
  showStarters = true,
}: StudioEmptyStageProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-white shadow-glow animate-float">
        <Sparkles className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      {showStarters && (
        <div className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_STARTERS.map((s) => (
            <button
              key={s.title}
              type="button"
              onClick={() => onPickStarter(s.prompt)}
              className="group rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md"
            >
              <span className="block text-[13px] font-semibold text-foreground group-hover:text-primary">
                {s.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{s.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
