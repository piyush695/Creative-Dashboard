"use client"

import React, { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Image as ImageIcon,
  Film,
  FileText,
  Code2,
  FileType,
  UploadCloud,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type StudioAttachment,
  type AttachmentKind,
  formatBytes,
} from "./studio-shared"

const QUICK_ADD: { label: string; accept: string; icon: React.ElementType }[] = [
  { label: "Images", accept: "image/*", icon: ImageIcon },
  { label: "Videos", accept: "video/*", icon: Film },
  { label: "Documents", accept: ".pdf,.doc,.docx", icon: FileText },
  { label: "HTML", accept: ".html,.htm", icon: Code2 },
  { label: "Text", accept: ".txt,text/plain", icon: FileType },
]

const KIND_ICON: Record<AttachmentKind, React.ElementType> = {
  image: ImageIcon,
  video: Film,
  doc: FileText,
  html: Code2,
  text: FileType,
  file: FileText,
}

interface AttachmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachments: StudioAttachment[]
  onAddFiles: (files: FileList | File[]) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function AttachmentModal({
  open,
  onOpenChange,
  attachments,
  onAddFiles,
  onRemove,
  onClear,
}: AttachmentModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (accept?: string) => {
    if (!inputRef.current) return
    if (accept) inputRef.current.setAttribute("accept", accept)
    else inputRef.current.removeAttribute("accept")
    inputRef.current.click()
  }

  const count = attachments.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[540px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="text-base">Add to creative</DialogTitle>
          <DialogDescription className="text-xs">
            Upload references and drop files to guide your generation.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5 pb-2 custom-scrollbar">
          {/* Quick add */}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick add
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {QUICK_ADD.map(({ label, accept, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => pick(accept)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-[11px] font-medium text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/5 hover:text-primary"
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Dropzone */}
          <button
            type="button"
            onClick={() => pick()}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => {
              e.preventDefault()
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              if (e.dataTransfer?.files?.length) onAddFiles(e.dataTransfer.files)
            }}
            className={cn(
              "mt-3 flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed px-6 py-7 text-center transition-all",
              dragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-muted/40 text-muted-foreground hover:border-primary/50"
            )}
          >
            <UploadCloud className="h-6 w-6" />
            <span className="text-sm font-semibold text-foreground">Drag &amp; drop files here</span>
            <span className="text-[11px]">
              or <span className="text-primary underline underline-offset-2">browse</span> · Images, Video, PDF, DOC, DOCX, HTML, TXT
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) onAddFiles(e.target.files)
              e.currentTarget.value = ""
            }}
          />

          {/* Files */}
          <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Files <span className="text-muted-foreground/60">({count})</span>
          </p>
          {count === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground/70">
              No files yet — drop or browse to add.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {attachments.map((a) => {
                const Icon = KIND_ICON[a.kind]
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-2 animate-fade-in"
                  >
                    {a.url && a.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {a.kind.toUpperCase()} · {formatBytes(a.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(a.id)}
                      aria-label={`Remove ${a.name}`}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center gap-2 border-t border-border px-5 py-4">
          <span className="mr-auto text-xs text-muted-foreground">
            {count} {count === 1 ? "file" : "files"} attached
          </span>
          {count > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-105"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
