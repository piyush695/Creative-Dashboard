// ────────────────────────────────────────────────────────────────────────────
// Shared types + constants for the redesigned (chat-conversation) Studio.
// Kept framework-agnostic so the composer, attachment modal and the main
// Studio view all speak the same vocabulary.
// ────────────────────────────────────────────────────────────────────────────

// A single turn in the Custom-tab chat conversation.
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  /** User prompt text (role === "user"). */
  text?: string
  /** Generated creative result (role === "assistant"). */
  result?: any
  /** Prompt used for this generation (assistant) — kept for save metadata. */
  prompt?: string
  /** History creativeId — lets a restored assistant turn lazy-load its image. */
  creativeId?: string
  /** Count of Top Ads used as context for a user turn (for the bubble label). */
  contextAdCount?: number
  /** Count of image attachments sent with a user turn (for the bubble label). */
  attachmentCount?: number
  /** Attachment previews shown inline in a user bubble (thumbnails/chips). */
  attachments?: ChatAttachmentPreview[]
  /** Top Ads shown inline in a user bubble (thumbnails). */
  contextAds?: { id: string; name: string; thumbnailUrl?: string }[]
  /** Failure reason for an assistant turn — renders an inline error bubble. */
  error?: string
}

export type AttachmentKind = "image" | "video" | "doc" | "html" | "text" | "file"

/** Lightweight snapshot of an attachment rendered inside a chat bubble. */
export interface ChatAttachmentPreview {
  id: string
  name: string
  kind: AttachmentKind
  /** Persisted preview source (base64 for images) — object URLs get revoked. */
  previewUrl: string | null
}

export interface StudioAttachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  /** Object URL for inline image/video preview (revoke on removal). */
  url: string | null
  /** Base64 data URL — only populated for images, used as a generation reference. */
  dataUrl: string | null
}

// Multi-select generation types shown in the composer's "Generation" popover.
export const GEN_TYPES = ["Image", "Video", "Carousel", "Story", "UGC"] as const
export type GenType = (typeof GEN_TYPES)[number]

// Single-select style presets. "" === None.
export const STYLE_PRESETS = ["", "Neon", "Minimal", "Retro", "Luxe"] as const
export type StylePreset = (typeof STYLE_PRESETS)[number]

// Human-readable directive appended to the prompt when a style is selected.
// Keeps the backend untouched — the style simply enriches the prompt text.
export const STYLE_DIRECTIVES: Record<string, string> = {
  Neon: "Visual style: bold neon glow, high-contrast electric accents, dark backdrop.",
  Minimal: "Visual style: clean minimalist layout, generous whitespace, restrained palette.",
  Retro: "Visual style: retro/vintage aesthetic, warm grain, nostalgic typography.",
  Luxe: "Visual style: premium luxe finish, refined typography, deep tones with metallic accents.",
}

// Empty-state starter prompts (the four cards in the wireframe).
export const STUDIO_STARTERS: { title: string; sub: string; prompt: string }[] = [
  { title: "Mid-season sale promo", sub: "Bold, neon, 4:5", prompt: "Mid-season sale promo — bold, neon, 4:5" },
  { title: "UGC testimonial", sub: "Authentic, story 9:16", prompt: "UGC testimonial — authentic, story 9:16" },
  { title: "Forex challenge hook", sub: "High-contrast A/B", prompt: "Forex challenge hook — high-contrast A/B" },
  { title: "Carousel — bestsellers", sub: "Clean product grid", prompt: "Carousel — bestsellers, clean product grid" },
]

// Rebuild a Custom-tab chat thread from raw History "turn" documents
// (getConversationMessages output). Shared by the History "View chat" flow and
// the sidebar "Recent" jump so both restore identically.
export function buildChatMessagesFromTurns(turns: any[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  ;(turns || []).forEach((doc: any, i: number) => {
    // Restore the user's reference image(s) as attachment thumbnails on the turn.
    const refs: string[] = Array.isArray(doc.referenceImages) ? doc.referenceImages.filter(Boolean) : []
    const refAttachments: ChatAttachmentPreview[] = refs.map((url, ri) => ({
      id: `ref-${i}-${ri}`,
      name: "Reference image",
      kind: "image" as const,
      previewUrl: url,
    }))
    // Push the user turn when there's text OR a reference (image-only turns too).
    if ((doc.prompt && String(doc.prompt).trim()) || refAttachments.length > 0) {
      messages.push({
        id: `hu-${i}-${doc.creativeId || i}`,
        role: "user",
        text: doc.prompt || "",
        attachments: refAttachments.length > 0 ? refAttachments : undefined,
      })
    }
    // Hoist a variant image onto result.imageUrl so the creative shows without
    // waiting on the lazy-load-by-creativeId fallback.
    const res = doc.result || {}
    const variantUrl = Array.isArray(res.variants)
      ? res.variants.map((v: any) => v?.imageUrl).find(Boolean)
      : null
    const resolvedResult = !res.imageUrl && variantUrl ? { ...res, imageUrl: variantUrl } : res
    messages.push({
      id: `ha-${i}-${doc.creativeId || i}`,
      role: "assistant",
      result: resolvedResult,
      prompt: doc.prompt || "",
      creativeId: doc.creativeId,
    })
  })
  return messages
}

export function kindOfFile(file: File): AttachmentKind {
  const t = file.type
  const n = file.name.toLowerCase()
  if (t.startsWith("image/")) return "image"
  if (t.startsWith("video/")) return "video"
  if (/\.(html?|htm)$/.test(n) || t === "text/html") return "html"
  if (/\.(pdf|docx?)$/.test(n)) return "doc"
  if (/\.txt$/.test(n) || t === "text/plain") return "text"
  return "file"
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
