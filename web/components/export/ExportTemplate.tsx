"use client";

import React, { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import { useTranslations } from "next-intl";
import { BirthData, ChartResponse, CycleResponse } from "@/lib/api";
import BaziChart from "@/components/BaziChart";

interface ExportTemplateProps {
    userName: string;
    birthData: BirthData;
    type: "chart" | "analysis" | "oracle";
    content?: string | ChartResponse; // content for analysis/chart
    cycleData?: CycleResponse | null; // for chart
    title?: string; // Analysis Topic or "八字排盘"
    qrCodeUrl?: string; // Optional QR code for sharing
}

const ExportTemplate = forwardRef<HTMLDivElement, ExportTemplateProps>(
    ({ userName, birthData, type, content, cycleData, title, qrCodeUrl }, ref) => {
        const tNav = useTranslations('Navbar');
        const tFooter = useTranslations('Footer');
        const colors = {
            paper: "#F8F8F0",
            ink: "#1A1A1A",
            ink80: "rgba(26, 26, 26, 0.8)",
            ink60: "rgba(26, 26, 26, 0.6)",
            ink40: "rgba(26, 26, 26, 0.4)",
            ink20: "rgba(26, 26, 26, 0.2)",
            ink10: "rgba(26, 26, 26, 0.1)",
            ink05: "rgba(26, 26, 26, 0.05)",
            bronze: "#B8860B",
            bronze60: "rgba(184, 134, 11, 0.6)",
            bronze50: "rgba(184, 134, 11, 0.5)",
            bronze30: "rgba(184, 134, 11, 0.3)",
            bronze10: "rgba(184, 134, 11, 0.1)",
        };
        const paperTexture =
            "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E";

        // Formatting Date
        const date = new Date();
        const dateStr = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
        const year = date.getFullYear();

        return (
            <div
                ref={ref}
                className="w-[800px] min-h-[1200px] relative font-serif overflow-hidden"
                style={{ padding: "60px 50px", backgroundColor: colors.paper, color: colors.ink }}
            >
                {/* === Aesthetic Background === */}
                {/* Texture Overlay (CSS handled globally or inline if needed) */}
                <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: `url("${paperTexture}")`, backgroundSize: "200px 200px" }}
                ></div>

                {/* Classical Border */}
                <div
                    className="absolute inset-4 border-4 border-double pointer-events-none rounded-2xl"
                    style={{ borderColor: colors.bronze30 }}
                ></div>
                <div
                    className="absolute inset-3 border pointer-events-none rounded-[18px]"
                    style={{ borderColor: colors.bronze10 }}
                ></div>

                {/* Corner Decor (Simple CSS Shapes for now) */}
                <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: colors.bronze50 }}></div>
                <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: colors.bronze50 }}></div>
                <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: colors.bronze50 }}></div>
                <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: colors.bronze50 }}></div>

                {/* === Header === */}
                <div className="text-center mb-10 relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img
                            src="/brand/logo.svg"
                            alt="Destiny logo"
                            className="w-8 h-8"
                            style={{ transform: "translateY(1px)" }}
                            crossOrigin="anonymous"
                        />
                        <span
                            className="text-lg font-medium tracking-wide font-song leading-none"
                            style={{ color: colors.ink, lineHeight: 1, transform: "translateY(1px)" }}
                        >
                            {tNav('brand')}
                        </span>
                    </div>
                    <h1 className="text-3xl font-song font-bold tracking-widest mb-4" style={{ color: colors.ink }}>
                        {title || (type === "chart" ? "八字排盘" : "命理分析报告")}
                    </h1>
                    <div className="flex items-center justify-center gap-6 text-sm font-song" style={{ color: colors.ink60 }}>
                        <span>{userName}</span>
                        <span>·</span>
                        <span>{birthData.gender === '男' ? '乾造' : '坤造'}</span>
                        <span>·</span>
                        <span>{birthData.birth_year}年{birthData.month}月{birthData.day}日 {birthData.hour}时</span>
                    </div>
                </div>

                {/* === Content Body === */}
                <div className="relative z-10 min-h-[800px] export-body" style={{ height: "800px" }}>
                    <div
                        className="export-frame"
                        style={{
                            height: "100%",
                            padding: "24px",
                            borderRadius: "18px",
                            border: `1.5px solid ${colors.bronze30}`,
                            backgroundColor: "#FFFFFF",
                            boxSizing: "border-box",
                        }}
                    >
                        <div className="export-content">
                        {/* VARIANT: CHART */}
                        {type === "chart" && content && typeof content !== 'string' && (
                            <div className="space-y-8 origin-top scale-[0.95]">
                                <BaziChart data={content as ChartResponse} cycleData={cycleData} isExport />
                            </div>
                        )}

                        {/* VARIANT: ANALYSIS / TEXT */}
                        {(type === "analysis" || type === "oracle") && typeof content === 'string' && (
                            <div className="max-w-none text-[15px] leading-relaxed" style={{ color: colors.ink80 }}>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h1 className="text-2xl font-song font-semibold tracking-widest mb-4" style={{ color: colors.bronze }}>
                                                {children}
                                            </h1>
                                        ),
                                        h2: ({ children }) => (
                                            <h2 className="text-xl font-song font-semibold tracking-widest mb-3" style={{ color: colors.bronze }}>
                                                {children}
                                            </h2>
                                        ),
                                        h3: ({ children }) => (
                                            <h3 className="text-lg font-song font-semibold tracking-widest mb-2" style={{ color: colors.bronze }}>
                                                {children}
                                            </h3>
                                        ),
                                        p: ({ children }) => (
                                            <p className="mb-4" style={{ color: colors.ink80 }}>
                                                {children}
                                            </p>
                                        ),
                                        ul: ({ children }) => (
                                            <ul className="list-disc pl-5 mb-4" style={{ color: colors.ink80 }}>
                                                {children}
                                            </ul>
                                        ),
                                        ol: ({ children }) => (
                                            <ol className="list-decimal pl-5 mb-4" style={{ color: colors.ink80 }}>
                                                {children}
                                            </ol>
                                        ),
                                        li: ({ children }) => (
                                            <li className="mb-1">
                                                {children}
                                            </li>
                                        ),
                                        blockquote: ({ children }) => (
                                            <blockquote className="pl-4 border-l-2 mb-4 italic" style={{ borderColor: colors.bronze30, color: colors.ink60 }}>
                                                {children}
                                            </blockquote>
                                        ),
                                        strong: ({ children }) => (
                                            <strong style={{ color: colors.ink }}>
                                                {children}
                                            </strong>
                                        ),
                                        em: ({ children }) => (
                                            <em style={{ color: colors.ink60 }}>
                                                {children}
                                            </em>
                                        ),
                                        a: ({ children, href }) => (
                                            <a href={href} className="underline underline-offset-4" style={{ color: colors.bronze60 }}>
                                                {children}
                                            </a>
                                        ),
                                    }}
                                >
                                    {content}
                                </ReactMarkdown>
                            </div>
                        )}
                        </div>
                    </div>
                </div>

                {/* === Footer === */}
                <div className="mt-12 pt-6 border-t flex items-end justify-between relative z-10" style={{ borderColor: colors.ink05 }}>
                    <div className="text-xs flex flex-wrap items-center gap-x-4 gap-y-1" style={{ color: colors.ink40 }}>
                        <span>Generated by Destiny AI</span>
                        <span>推演日期：{dateStr}</span>
                        <span>Monad-lab Works LLC · Delaware, USA</span>
                        <span>© {year} Monad-lab Works LLC. {tFooter('rights')}.</span>
                    </div>
                    {qrCodeUrl && (
                        <div className="bg-white p-2 border" style={{ borderColor: colors.ink10 }}>
                            {/* Placeholder for QR Code */}
                            <div className="w-16 h-16 flex items-center justify-center text-[10px]" style={{ backgroundColor: colors.ink05, color: colors.ink20 }}>
                                QR Code
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

ExportTemplate.displayName = "ExportTemplate";
export default ExportTemplate;
