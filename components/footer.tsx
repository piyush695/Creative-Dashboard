import Link from "next/link"
import { Twitter, Facebook, Linkedin, Instagram, Twitch, Youtube, Mic2, Mail } from "lucide-react"

export default function Footer() {
    return (
        <footer className="w-full py-8 px-4 md:px-8 border-t border-border bg-card/30 backdrop-blur-sm mt-auto">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Analyzer Content / Disclaimer */}
                <div className="max-w-4xl">
                    <p className="text-[11px] md:text-xs text-muted-foreground/70 leading-relaxed font-medium uppercase tracking-tight">
                        Hola Prime is a Creative Performance Analyzer: Creative Quality / Ad Relevance / Conversion Impact / Visual Engagement / Audience Resonance / AI-Driven Insights / Brand Consistency.
                    </p>
                </div>

                {/* Bottom Section: Flexible Responsive Layout */}
                <div className="flex flex-col gap-6 pt-6 border-t border-border/40">
                    <div className="flex flex-col xl:flex-row items-center justify-between gap-y-6 gap-x-8 text-[10px] md:text-[11px] text-muted-foreground/80">
                        {/* 1. Policy Links (Left or Top) */}
                        <div className="flex items-center gap-4 md:gap-6 order-2 xl:order-1">
                            <Link href="#" className="hover:text-primary transition-colors font-semibold whitespace-nowrap">Privacy</Link>
                            <Link href="#" className="hover:text-primary transition-colors font-semibold whitespace-nowrap">Site terms</Link>
                            <Link href="#" className="hover:text-primary transition-colors font-semibold whitespace-nowrap">Cookie Preferences</Link>
                        </div>

                        {/* 2. Copyright (Center) */}
                        <div className="font-medium text-center order-1 xl:order-2">
                            © 2026, Hola Prime Inc. or its affiliates. All rights reserved.
                        </div>

                        {/* 3. Social Icons (Right or Bottom) */}
                        <div className="flex items-center gap-4 md:gap-5 order-3">
                            <Link href="#" className="group" aria-label="X (Twitter)">
                                <Twitter className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="Facebook">
                                <Facebook className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="LinkedIn">
                                <Linkedin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="Instagram">
                                <Instagram className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="Twitch">
                                <Twitch className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="YouTube">
                                <Youtube className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="Podcast">
                                <Mic2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                            <Link href="#" className="group" aria-label="Contact Us">
                                <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all duration-300 transform group-hover:scale-110" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
