"use client";

import type { CSSProperties } from "react";
import { ChartResponse, CycleResponse } from "@/lib/api";
import { Clock, Zap, TrendingUp, Info } from "lucide-react";
import { useTranslations } from 'next-intl';

interface BaziChartProps {
    data: ChartResponse;
    cycleData?: CycleResponse | null;
    isExport?: boolean;
}

// Five Elements Mapping
const CHAR_TO_WUXING: Record<string, string> = {
    // Wood
    "甲": "木", "乙": "木", "寅": "木", "卯": "木",
    // Fire
    "丙": "火", "丁": "火", "巳": "火", "午": "火",
    // Earth
    "戊": "土", "己": "土", "辰": "土", "戌": "土", "丑": "土", "未": "土",
    // Metal
    "庚": "金", "辛": "金", "申": "金", "酉": "金",
    // Water
    "壬": "水", "癸": "水", "亥": "水", "子": "水",
};

// Text Colors for Light Theme (Rice Paper)
const WUXING_TEXT_COLORS: Record<string, string> = {
    "木": "text-[#228B22]", // ForestGreen
    "火": "text-[#DC143C]", // Crimson
    "土": "text-[#B8860B]", // DarkGoldenRod
    "金": "text-[#D4AC0D]", // Golden (adjusted for visibility)
    "水": "text-[#1E90FF]", // DodgerBlue
};

// Helper to get color class
const getCharColorStyle = (char: string) => {
    const wuxing = CHAR_TO_WUXING[char];
    return wuxing ? WUXING_TEXT_COLORS[wuxing] : "text-[#1A1A1A]";
};

// Energy Bar Colors (Backgrounds)
const WUXING_BG_COLORS: Record<string, string> = {
    "木": "bg-[#228B22]/80",
    "火": "bg-[#DC143C]/80",
    "土": "bg-[#B8860B]/80",
    "金": "bg-[#D4AC0D]/80",
    "水": "bg-[#1E90FF]/80",
};

const EXPORT_COLORS = {
    ink: "#1A1A1A",
    ink70: "rgba(26, 26, 26, 0.7)",
    ink60: "rgba(26, 26, 26, 0.6)",
    ink50: "rgba(26, 26, 26, 0.5)",
    ink40: "rgba(26, 26, 26, 0.4)",
    ink30: "rgba(26, 26, 26, 0.3)",
    ink20: "rgba(26, 26, 26, 0.2)",
    ink10: "rgba(26, 26, 26, 0.1)",
    ink05: "rgba(26, 26, 26, 0.05)",
    paper: "#F8F8F0",
    card: "#FFFFFF",
    muted: "#FAFAF5",
    bronze: "#B8860B",
    bronze10: "rgba(184, 134, 11, 0.1)",
};

const EXPORT_WUXING_TEXT_COLORS: Record<string, string> = {
    "木": "#228B22",
    "火": "#DC143C",
    "土": "#B8860B",
    "金": "#D4AC0D",
    "水": "#1E90FF",
};

const EXPORT_WUXING_BG_COLORS: Record<string, string> = {
    "木": "rgba(34, 139, 34, 0.8)",
    "火": "rgba(220, 20, 60, 0.8)",
    "土": "rgba(184, 134, 11, 0.8)",
    "金": "rgba(212, 172, 13, 0.8)",
    "水": "rgba(30, 144, 255, 0.8)",
};

export default function BaziChart({ data, cycleData, isExport = false }: BaziChartProps) {
    const t = useTranslations('BaziChart');
    const commonT = useTranslations('Common');
    const whenExport = (style: CSSProperties) => (isExport ? style : undefined);
    const getCharColorInline = (char: string) => {
        const wuxing = CHAR_TO_WUXING[char];
        return { color: wuxing ? EXPORT_WUXING_TEXT_COLORS[wuxing] : EXPORT_COLORS.ink };
    };

    // Chinese to English element name mapping
    const ELEMENT_NAMES: Record<string, string> = {
        "木": t('wood'),
        "火": t('fire'),
        "土": t('earth'),
        "金": t('metal'),
        "水": t('water'),
    };

    const pillars = [
        { key: 'year', label: t('yearPillar'), data: data.year_pillar, nayin: data.nayin?.year },
        { key: 'month', label: t('monthPillar'), data: data.month_pillar, nayin: data.nayin?.month },
        { key: 'day', label: t('dayPillar'), data: data.day_pillar, nayin: data.nayin?.day, isDayMaster: true },
        { key: 'hour', label: t('hourPillar'), data: data.hour_pillar, nayin: data.nayin?.hour },
    ];

    return (
        <div className={`space-y-8 font-serif ${isExport ? '' : 'animate-fade-in'}`}>
            {/* Main Chart Container */}
            <div className={`zen-card overflow-hidden ${isExport ? 'border-none shadow-none bg-transparent' : ''}`}>
                {/* Header Info */}
                <div
                    className="bg-[#F8F8F0] border-b border-[#1A1A1A]/5 p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4"
                    style={whenExport({ backgroundColor: EXPORT_COLORS.paper, borderColor: EXPORT_COLORS.ink05 })}
                >
                    {/* Time correction moves to its own visual line on mobile easily using flex-col on the outer container,
                        but let's group to keep desktop as one line if possible, or top/bottom stack on mobile. */}
                    {data.time_correction && (
                        <div
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A1A]/5 text-xs sm:text-sm text-[#1A1A1A]/70 w-fit"
                            style={whenExport({ backgroundColor: EXPORT_COLORS.ink05, color: EXPORT_COLORS.ink70 })}
                        >
                            <Clock className="w-3.5 h-3.5" />
                            <span>{data.time_correction}</span>
                        </div>
                    )}

                    <div
                        className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#1A1A1A]/70 leading-relaxed"
                        style={whenExport({ color: EXPORT_COLORS.ink70 })}
                    >
                        <span className="font-bold text-[#1A1A1A]" style={whenExport({ color: EXPORT_COLORS.ink })}>
                            {data.pattern_name}
                        </span>
                        <span className="w-px h-3 bg-[#1A1A1A]/20" style={whenExport({ backgroundColor: EXPORT_COLORS.ink20 })}></span>
                        <span>{data.day_master}{t('dayMaster')} · {data.strength}</span>
                        <span className="w-px h-3 bg-[#1A1A1A]/20" style={whenExport({ backgroundColor: EXPORT_COLORS.ink20 })}></span>
                        <span>{t('favorable')}: {data.joy_elements}</span>
                    </div>
                </div>

                {/* The Bazi Table */}
                <div className={`${isExport ? '' : 'overflow-x-auto overflow-y-hidden w-full'}`}>
                    {/* Remove min-w-[600px] and switch to w-full table-fixed to fit everything on mobile without scrolling */}
                    <table
                        className="w-full border-collapse bg-white/50 table-fixed"
                        style={whenExport({ backgroundColor: "rgba(255, 255, 255, 0.5)" })}
                    >
                        <thead>
                            <tr className="border-b border-[#1A1A1A]/5" style={whenExport({ borderColor: EXPORT_COLORS.ink05 })}>
                                <th
                                    className="p-2 sm:p-4 w-12 sm:w-24 text-[10px] sm:text-xs text-[#1A1A1A]/40 font-normal uppercase tracking-widest text-left"
                                    style={whenExport({ color: EXPORT_COLORS.ink40 })}
                                >
                                    {t('item')}
                                </th>
                                {pillars.map(p => (
                                    <th key={p.key} className="p-1 sm:p-4 text-center">
                                        <span
                                            className="inline-flex justify-center items-center px-1 sm:px-3 py-1 rounded-md bg-[#B8860B]/10 text-[#8B4513] text-[10px] sm:text-sm font-medium min-w-max w-full sm:w-auto"
                                            style={whenExport({ backgroundColor: EXPORT_COLORS.bronze10, color: "#8B4513" })}
                                        >
                                            {p.label}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className={isExport ? "" : "divide-y divide-[#1A1A1A]/5"}>
                            {/* Ten Gods (Stem) */}
                            <tr
                                className="bg-[#FAFAF5] border-b"
                                style={whenExport({ backgroundColor: EXPORT_COLORS.muted, borderColor: EXPORT_COLORS.ink05 })}
                            >
                                <td
                                    className="p-2 sm:p-3 pl-2 sm:pl-4 text-[10px] sm:text-xs text-[#1A1A1A]/40 font-medium"
                                    style={whenExport({ color: EXPORT_COLORS.ink40 })}
                                >
                                    {t('tenGods')}
                                </td>
                                {pillars.map(p => (
                                    <td
                                        key={p.key}
                                        className="p-1 sm:p-2 text-center text-[10px] sm:text-xs text-[#1A1A1A]/50"
                                        style={whenExport({ color: EXPORT_COLORS.ink50 })}
                                    >
                                        {p.data.ten_god || "—"}
                                    </td>
                                ))}
                            </tr>

                            {/* Heavenly Stems */}
                            <tr className="border-b" style={whenExport({ borderColor: EXPORT_COLORS.ink05 })}>
                                <td
                                    className="p-2 sm:p-3 pl-2 sm:pl-4 text-xs sm:text-sm text-[#1A1A1A]/60 font-medium whitespace-nowrap"
                                    style={whenExport({ color: EXPORT_COLORS.ink60 })}
                                >
                                    {t('heavenlyStems')}
                                </td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-1 sm:p-3 text-center">
                                        <span
                                            className={`text-xl sm:text-2xl font-bold ${isExport ? '' : getCharColorStyle(p.data.gan)} font-song`}
                                            style={isExport ? getCharColorInline(p.data.gan) : undefined}
                                        >
                                            {p.data.gan}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Earthly Branches */}
                            <tr className="border-b" style={whenExport({ borderColor: EXPORT_COLORS.ink05 })}>
                                <td
                                    className="p-2 sm:p-3 pl-2 sm:pl-4 text-xs sm:text-sm text-[#1A1A1A]/60 font-medium whitespace-nowrap"
                                    style={whenExport({ color: EXPORT_COLORS.ink60 })}
                                >
                                    {t('earthlyBranches')}
                                </td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-1 sm:p-3 text-center">
                                        <span
                                            className={`text-xl sm:text-2xl font-bold ${isExport ? '' : getCharColorStyle(p.data.zhi)} font-song`}
                                            style={isExport ? getCharColorInline(p.data.zhi) : undefined}
                                        >
                                            {p.data.zhi}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Hidden Stems */}
                            <tr
                                className="bg-[#FAFAF5]/50 border-b"
                                style={whenExport({ backgroundColor: "rgba(250, 250, 245, 0.5)", borderColor: EXPORT_COLORS.ink05 })}
                            >
                                <td
                                    className="p-2 sm:p-3 pl-2 sm:pl-4 text-[10px] sm:text-xs text-[#1A1A1A]/40 font-medium whitespace-nowrap"
                                    style={whenExport({ color: EXPORT_COLORS.ink40 })}
                                >
                                    {t('hiddenStems')}
                                </td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-1 sm:p-3 text-center align-top">
                                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                                            {p.data.hidden_stems?.map((stem, idx) => (
                                                <div key={idx} className="flex items-center gap-1 text-[10px] sm:text-xs">
                                                    <span
                                                        className={`font-medium ${isExport ? '' : getCharColorStyle(stem)}`}
                                                        style={isExport ? getCharColorInline(stem) : undefined}
                                                    >
                                                        {stem}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Na Yin */}
                            <tr className="border-b" style={whenExport({ borderColor: EXPORT_COLORS.ink05 })}>
                                <td
                                    className="p-2 sm:p-3 pl-2 sm:pl-4 text-[10px] sm:text-xs text-[#1A1A1A]/40 font-medium"
                                    style={whenExport({ color: EXPORT_COLORS.ink40 })}
                                >
                                    {t('nayin')}
                                </td>
                                {pillars.map(p => (
                                    <td
                                        key={p.key}
                                        className="p-1 sm:p-2 text-center text-[10px] sm:text-xs text-[#1A1A1A]/60 max-w-[4rem] sm:max-w-none truncate sm:whitespace-normal"
                                        style={whenExport({ color: EXPORT_COLORS.ink60 })}
                                    >
                                        {p.nayin || "—"}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Info: Shen Sha & Void */}
                {(data.shen_sha || data.kong_wang) && (
                    <div
                        className="p-4 bg-[#FAFAF5] border-t border-[#1A1A1A]/5 text-xs"
                        style={whenExport({ backgroundColor: EXPORT_COLORS.muted, borderColor: EXPORT_COLORS.ink05 })}
                    >
                        <div className="flex flex-col gap-2">
                            {data.kong_wang && (
                                <div className="flex gap-2">
                                    <span className="text-[#1A1A1A]/40 w-12 shrink-0" style={whenExport({ color: EXPORT_COLORS.ink40 })}>
                                        {t('kongwang')}:
                                    </span>
                                    <div className="flex flex-wrap gap-2 text-[#1A1A1A]/70" style={whenExport({ color: EXPORT_COLORS.ink70 })}>
                                        {data.kong_wang.map((k, i) => <span key={i}>{k}</span>)}
                                    </div>
                                </div>
                            )}
                            {data.shen_sha && (
                                <div className="flex gap-2">
                                    <span className="text-[#1A1A1A]/40 w-12 shrink-0" style={whenExport({ color: EXPORT_COLORS.ink40 })}>
                                        {t('shensha')}:
                                    </span>
                                    <div className="flex flex-wrap gap-2">
                                        {data.shen_sha.map((sha, i) => (
                                            <span
                                                key={i}
                                                className="px-1.5 py-0.5 rounded bg-[#B8860B]/10 text-[#8B4513]"
                                                style={whenExport({ backgroundColor: EXPORT_COLORS.bronze10, color: "#8B4513" })}
                                            >
                                                {sha}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Energy Distribution & Luck Cycles Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Five Elements Energy */}
                <div className="zen-card p-6 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-4 h-4 text-[#B8860B]" style={whenExport({ color: EXPORT_COLORS.bronze })} />
                        <span
                            className="text-xs tracking-widest uppercase text-[#1A1A1A]/40"
                            style={whenExport({ color: EXPORT_COLORS.ink40 })}
                        >
                            {t('energy')}
                        </span>
                    </div>
                    <div className="space-y-4">
                        {data.energy_distribution && Object.entries(data.energy_distribution).map(([element, info]) => (
                            <div key={element} className="flex items-center gap-3">
                                <span
                                    className={`text-sm font-bold w-8 text-center ${isExport ? '' : WUXING_TEXT_COLORS[element]}`}
                                    style={isExport ? { color: EXPORT_WUXING_TEXT_COLORS[element] || EXPORT_COLORS.ink } : undefined}
                                >
                                    {ELEMENT_NAMES[element] || element}
                                </span>
                                <div
                                    className="flex-1 h-2 bg-[#1A1A1A]/5 rounded-full overflow-hidden"
                                    style={whenExport({ backgroundColor: EXPORT_COLORS.ink05 })}
                                >
                                    <div
                                        className={`h-full ${isExport ? '' : (WUXING_BG_COLORS[element] || 'bg-gray-400')} transition-all duration-1000`}
                                        style={{
                                            width: `${info.pct * 100}%`,
                                            ...(isExport ? { backgroundColor: EXPORT_WUXING_BG_COLORS[element] || "rgba(156, 163, 175, 0.8)" } : {})
                                        }}
                                    />
                                </div>
                                <span
                                    className="text-xs text-[#1A1A1A]/50 w-8 text-right font-mono"
                                    style={whenExport({ color: EXPORT_COLORS.ink50 })}
                                >
                                    {Math.round(info.pct * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Luck Cycles (Da Yun & Liu Nian) */}
                {cycleData && (
                    <div className="zen-card p-6 lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#B8860B]" style={whenExport({ color: EXPORT_COLORS.bronze })} />
                                <span
                                    className="text-xs tracking-widest uppercase text-[#1A1A1A]/40"
                                    style={whenExport({ color: EXPORT_COLORS.ink40 })}
                                >
                                    {t('cycles')}
                                </span>
                            </div>
                            <span
                                className="text-xs text-[#1A1A1A]/40 bg-[#1A1A1A]/5 px-2 py-1 rounded"
                                style={whenExport({ color: EXPORT_COLORS.ink40, backgroundColor: EXPORT_COLORS.ink05 })}
                            >
                                {t('startAge')}: {cycleData.start_info.age}
                            </span>
                        </div>

                        {/* Da Yun List */}
                        <div className={isExport ? "mb-6" : "mb-6 overflow-x-auto pb-2"}>
                            <div className={isExport ? "grid grid-cols-8 gap-2" : "flex gap-2 min-w-max"}>
                                {cycleData.da_yun.slice(0, 8).map((dy, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex flex-col items-center space-y-1 p-2 rounded-lg border border-[#1A1A1A]/5 bg-[#FAFAF5] ${isExport ? "w-full min-w-0" : "min-w-[3.5rem]"}`}
                                        style={whenExport({ borderColor: EXPORT_COLORS.ink05, backgroundColor: EXPORT_COLORS.muted })}
                                    >
                                        <span className="text-xs text-[#1A1A1A]/40 font-mono" style={whenExport({ color: EXPORT_COLORS.ink40 })}>
                                            {dy.start_age}
                                        </span>
                                        <span className="font-bold text-[#1A1A1A] text-lg font-song" style={whenExport({ color: EXPORT_COLORS.ink })}>
                                            {dy.gan_zhi}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p
                                className="text-[10px] text-[#1A1A1A]/30 uppercase tracking-widest"
                                style={whenExport({ color: EXPORT_COLORS.ink30 })}
                            >
                                {t('recentYears')}
                            </p>
                            <div className="grid grid-cols-5 gap-2">
                                {cycleData.liu_nian.slice(0, 5).map((ln, idx) => (
                                    <div
                                        key={idx}
                                        className="text-center p-2 rounded bg-[#FFFFFF] border border-[#1A1A1A]/5"
                                        style={whenExport({ backgroundColor: EXPORT_COLORS.card, borderColor: EXPORT_COLORS.ink05 })}
                                    >
                                        <div className="text-[10px] text-[#1A1A1A]/40 mb-0.5" style={whenExport({ color: EXPORT_COLORS.ink40 })}>
                                            {ln.year}
                                        </div>
                                        <div className="text-base font-bold text-[#1A1A1A] font-song" style={whenExport({ color: EXPORT_COLORS.ink })}>
                                            {ln.gan_zhi}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
