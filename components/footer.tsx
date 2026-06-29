import { memo } from "react"

// Standard footer — shown on the Main Dashboard overview only (see app-shell).
// Minimal: a single centered copyright line.
const Footer = memo(function Footer() {
    return (
        <footer className="mt-auto w-full border-t border-border bg-card/30 px-4 py-5 md:px-6">
            <p className="text-center text-[11px] text-muted-foreground">
                © 2026 Hola Prime Inc. All rights reserved.
            </p>
        </footer>
    )
})

export default Footer
