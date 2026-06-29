// Backend-only: importing this from a client component is a build error.
import "server-only";

// Shared cache for high-resolution images to enable instant preview popups
export const historyImageCache: Record<string, string> = {};
