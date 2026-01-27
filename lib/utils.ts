import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHighResImage(url: string | undefined): string {
  if (!url) return "/placeholder.svg"

  // 1. Handle Meta/Facebook CDN URLs
  if (url.includes('fbcdn.net') || url.includes('scontent')) {
    return url
      .replace(/([&?]width=)\d+/, '$12048')
      .replace(/([&?]height=)\d+/, '$12048')
      .replace(/([&?]s=)\d+/, '$12048')
  }

  // 2. Handle Cloudinary URLs - Just return original without transformations
  if (url.includes('cloudinary.com')) {
    // Simply return the URL as-is - Cloudinary will serve the original
    return url
  }

  return url
}
