"use client";

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

export default function BaziChart({ data, cycleData, isExport = false }: BaziChartProps) {
    const t = useTranslations('BaziChart');
    const commonT = useTranslations('Common');

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
                <div className="bg-[#F8F8F0] border-b border-[#1A1A1A]/5 p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-[#1A1A1A]/70">
                        {data.time_correction && (
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A1A1A]/5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{data.time_correction}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[#1A1A1A]">{data.pattern_name}</span>
                            <span className="w-px h-3 bg-[#1A1A1A]/20"></span>
                            <span>{data.day_master}{t('dayMaster')} · {data.strength}</span>
                            <span className="w-px h-3 bg-[#1A1A1A]/20"></span>
                            <span>{t('favorable')}: {data.joy_elements}</span>
                        </div>
                    </div>
                </div>

                {/* The Bazi Table */}
                <div className={`${isExport ? '' : 'overflow-x-auto'}`}>
                    <table className="w-full min-w-[600px] border-collapse bg-white/50">
                        <thead>
                            <tr className="border-b border-[#1A1A1A]/5">
                                <th className="p-4 w-24 text-xs text-[#1A1A1A]/40 font-normal uppercase tracking-widest text-left">{t('item')}</th>
                                {pillars.map(p => (
                                    <th key={p.key} className="p-4 text-center">
                                        <span className="inline-block px-3 py-1 rounded-md bg-[#B8860B]/10 text-[#8B4513] text-sm font-medium">
                                            {p.label}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]/5">
                            {/* Ten Gods (Stem) */}
                            <tr className="bg-[#FAFAF5]">
                                <td className="p-3 pl-4 text-xs text-[#1A1A1A]/40 font-medium">{t('tenGods')}</td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-2 text-center text-xs text-[#1A1A1A]/50">
                                        {p.data.ten_god || "—"}
                                    </td>
                                ))}
                            </tr>

                            {/* Heavenly Stems */}
                            <tr>
                                <td className="p-3 pl-4 text-sm text-[#1A1A1A]/60 font-medium">{t('heavenlyStems')}</td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-3 text-center">
                                        <span className={`text-2xl font-bold ${getCharColorStyle(p.data.gan)} font-song`}>
                                            {p.data.gan}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Earthly Branches */}
                            <tr>
                                <td className="p-3 pl-4 text-sm text-[#1A1A1A]/60 font-medium">{t('earthlyBranches')}</td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-3 text-center">
                                        <span className={`text-2xl font-bold ${getCharColorStyle(p.data.zhi)} font-song`}>
                                            {p.data.zhi}
                                        </span>
                                    </td>
                                ))}
                            </tr>

                            {/* Hidden Stems */}
                            <tr className="bg-[#FAFAF5]/50">
                                <td className="p-3 pl-4 text-xs text-[#1A1A1A]/40 font-medium">{t('hiddenStems')}</td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-3 text-center align-top">
                                        <div className="flex flex-col items-center gap-1">
                                            {p.data.hidden_stems?.map((stem, idx) => (
                                                <div key={idx} className="flex items-center gap-1 text-xs">
                                                    <span className={`font-medium ${getCharColorStyle(stem)}`}>{stem}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* Na Yin */}
                            <tr>
                                <td className="p-3 pl-4 text-xs text-[#1A1A1A]/40 font-medium">{t('nayin')}</td>
                                {pillars.map(p => (
                                    <td key={p.key} className="p-2 text-center text-xs text-[#1A1A1A]/60">
                                        {p.nayin || "—"}
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Info: Shen Sha & Void */}
                {(data.shen_sha || data.kong_wang) && (
                    <div className="p-4 bg-[#FAFAF5] border-t border-[#1A1A1A]/5 text-xs">
                        <div className="flex flex-col gap-2">
                            {data.kong_wang && (
                                <div className="flex gap-2">
                                    <span className="text-[#1A1A1A]/40 w-12 shrink-0">{t('kongwang')}:</span>
                                    <div className="flex flex-wrap gap-2 text-[#1A1A1A]/70">
                                        {data.kong_wang.map((k, i) => <span key={i}>{k}</span>)}
                                    </div>
                                </div>
                            )}
                            {data.shen_sha && (
                                <div className="flex gap-2">
                                    <span className="text-[#1A1A1A]/40 w-12 shrink-0">{t('shensha')}:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {data.shen_sha.map((sha, i) => (
                                            <span key={i} className="px-1.5 py-0.5 rounded bg-[#B8860B]/10 text-[#8B4513]">{sha}</span>
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
                        <Zap className="w-4 h-4 text-[#B8860B]" />
                        <span className="text-xs tracking-widest uppercase text-[#1A1A1A]/40">{t('energy')}</span>
                    </div>
                    <div className="space-y-4">
                        {data.energy_distribution && Object.entries(data.energy_distribution).map(([element, info]) => (
                            <div key={element} className="flex items-center gap-3">
                                <span className={`text-sm font-bold w-8 text-center ${WUXING_TEXT_COLORS[element]}`}>
                                    {ELEMENT_NAMES[element] || element}
                                </span>
                                <div className="flex-1 h-2 bg-[#1A1A1A]/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${WUXING_BG_COLORS[element] || 'bg-gray-400'} transition-all duration-1000`}
                                        style={{ width: `${info.pct * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-[#1A1A1A]/50 w-8 text-right font-mono">
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
                                <TrendingUp className="w-4 h-4 text-[#B8860B]" />
                                <span className="text-xs tracking-widest uppercase text-[#1A1A1A]/40">{t('cycles')}</span>
                            </div>
                            <span className="text-xs text-[#1A1A1A]/40 bg-[#1A1A1A]/5 px-2 py-1 rounded">
                                {t('startAge')}: {cycleData.start_info.age}
                            </span>
                        </div>

                        {/* Da Yun List */}
                        <div className="mb-6 overflow-x-auto pb-2">
                            <div className="flex gap-2 min-w-max">
                                {cycleData.da_yun.slice(0, 8).map((dy, idx) => (
                                    <div key={idx} className="flex flex-col items-center space-y-1 p-2 min-w-[3.5rem] rounded-lg border border-[#1A1A1A]/5 bg-[#FAFAF5]">
                                        <span className="text-xs text-[#1A1A1A]/40 font-mono">{dy.start_age}</span>
                                        <span className="font-bold text-[#1A1A1A] text-lg font-song">{dy.gan_zhi}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] text-[#1A1A1A]/30 uppercase tracking-widest">{t('recentYears')}</p>
                            <div className="grid grid-cols-5 gap-2">
                                {cycleData.liu_nian.slice(0, 5).map((ln, idx) => (
                                    <div key={idx} className="text-center p-2 rounded bg-[#FFFFFF] border border-[#1A1A1A]/5">
                                        <div className="text-[10px] text-[#1A1A1A]/40 mb-0.5">{ln.year}</div>
                                        <div className="text-base font-bold text-[#1A1A1A] font-song">{ln.gan_zhi}</div>
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
