"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookOpen, RefreshCw, Feather, User, Briefcase, Heart, Activity, Calendar, MessageCircle, Star, Shield, Zap } from "lucide-react";
import Header from "@/components/Header";
import ExportManager from "@/components/export/ExportManager";
import { BirthData } from "@/lib/api";
import { useRouter } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';

// Loading Component
function LoadingSpinner() {
    return (
        <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-2 border-[#B8860B]/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-2 border-[#B8860B] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
}

export default function AnalysisPage() {
    const t = useTranslations('Analysis');
    const locale = useLocale();
    const commonT = useTranslations('Common');
    const router = useRouter();
    const [birthData, setBirthData] = useState<BirthData | null>(null);
    const [topic, setTopic] = useState<string>("main");
    const [analysis, setAnalysis] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [giftQuota, setGiftQuota] = useState<{ total: number; used: number } | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [showExport, setShowExport] = useState(false);

    // Dynamic Topics using translations
    const ANALYSIS_TOPICS = [
        { id: "main", label: t('topics.main'), desc: t('topics.mainDesc'), icon: Star },
        { id: "elements", label: t('topics.elements'), desc: t('topics.elementsDesc'), icon: Shield },
        { id: "personality", label: t('topics.personality'), desc: t('topics.personalityDesc'), icon: User },
        { id: "career", label: t('topics.career'), desc: t('topics.careerDesc'), icon: Briefcase },
        { id: "love", label: t('topics.love'), desc: t('topics.loveDesc'), icon: Heart },
        { id: "health", label: t('topics.health'), desc: t('topics.healthDesc'), icon: Activity },
        { id: "fortune", label: t('topics.fortune'), desc: t('topics.fortuneDesc'), icon: Calendar },
        { id: "advice", label: t('topics.advice'), desc: t('topics.adviceDesc'), icon: MessageCircle },
    ];

    useEffect(() => {
        // Load birth data
        const stored = localStorage.getItem("birth_data");
        if (stored) {
            setBirthData(JSON.parse(stored));
        } else {
            router.push("/");
        }

        // Check quota
        checkQuota();
    }, [router]);

    const checkQuota = async () => {
        // Mock quota check
        setGiftQuota({ total: 3, used: 0 });
    };

    const handleAnalysis = async (forceRefresh = false) => {
        if (!birthData) return;

        setLoading(true);
        setError(null);
        setAnalysis("");
        setFromCache(false);

        try {
            const res = await fetch("/api/analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_data: birthData,
                    question_type: topic,
                    force_refresh: forceRefresh,
                    language: locale,
                }),
            });

            if (!res.ok) throw new Error(commonT('error'));

            const reader = res.body?.getReader();
            if (!reader) throw new Error("No stream");

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                // Simple stream parsing
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.full_text) {
                                setAnalysis(data.full_text); // Or Append based on implementation
                            }
                            if (data.chunk) {
                                setAnalysis(prev => prev + data.chunk);
                            }
                            if (data.from_cache) {
                                setFromCache(true);
                            }
                            if (data.error) {
                                setError(data.error);
                            }
                        } catch (e) {
                            // ignore parse error for partial chunks
                        }
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : commonT('error'));
        } finally {
            setLoading(false);
        }
    };

    if (!birthData) {
        return (
            <main className="min-h-screen bg-[#F8F8F0] flex items-center justify-center">
                <LoadingSpinner />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#F8F8F0]">
            <Header />
            <div className="page-shell">
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Left: Topics */}
                    <div className="lg:col-span-5 space-y-8 animate-fade-in">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
                                {t('title')}
                            </h2>
                            <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm leading-relaxed">
                                {t('subtitle')}
                            </p>
                        </div>

                        {/* 档案信息 */}
                        <div className="zen-card p-4">
                            <p className="text-[10px] text-[#1A1A1A]/40 tracking-widest uppercase mb-2">{t('currentProfile')}</p>
                            <p className="text-sm font-medium">
                                {birthData?.birth_year}{commonT('month')}{birthData?.month}{commonT('day')}{birthData?.day}{commonT('hour')} {birthData?.hour}{commonT('hour')} · {birthData.gender === '男' ? commonT('male') : commonT('female')}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase">
                                {t('chooseTopic')}
                            </label>
                            <div className="grid grid-cols-1 gap-3">
                                {ANALYSIS_TOPICS.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setTopic(item.id)}
                                        className={`
                                        flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 text-left
                                        ${topic === item.id
                                                ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#F8F8F0] shadow-lg shadow-[#1A1A1A]/20'
                                                : 'bg-[#F8F8F0] border-[#1A1A1A]/5 text-[#1A1A1A]/60 hover:border-[#1A1A1A]/20'}
                                    `}
                                    >
                                        <div className={`p-2 rounded-lg ${topic === item.id ? 'bg-white/10' : 'bg-black/5'}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium tracking-widest">{item.label}</p>
                                            <p className={`text-xs mt-0.5 ${topic === item.id ? 'text-white/40' : 'text-[#1A1A1A]/30'}`}>
                                                {item.desc}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => handleAnalysis(false)}
                            disabled={loading}
                            className="zen-button w-full"
                        >
                            {loading ? t('analyzing') : t('startAnalysis')}
                        </button>

                        {giftQuota !== null && (
                            <p className="text-center text-xs text-[#1A1A1A]/40 tracking-widest mt-2">
                                {t('giftQuota')}：<span className="text-[#B8860B] font-medium">{giftQuota.total - giftQuota.used}/{giftQuota.total}</span>
                            </p>
                        )}
                    </div>

                    {/* Right: Results */}
                    <div className="lg:col-span-7 space-y-8 h-full">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center min-h-[400px] border border-[#1A1A1A]/5 rounded-3xl bg-[#F8F8F0]/50 animate-pulse">
                                <LoadingSpinner />
                                <p className="mt-6 text-[#1A1A1A]/40 text-sm tracking-[0.5em] italic">
                                    {t('analyzing')}
                                </p>
                            </div>
                        ) : analysis ? (
                            <div className="zen-card p-8 md:p-12 space-y-10 animate-fade-in h-fit sticky top-24">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <BookOpen className="w-5 h-5 text-[#B8860B]" />
                                        <span className="text-lg font-light tracking-[0.4em]">
                                            {ANALYSIS_TOPICS.find(t => t.id === topic)?.label || topic}
                                        </span>
                                        {fromCache && (
                                            <span className="text-xs text-[#B8860B]/60 tracking-widest">{t('cache')}</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleAnalysis(true)}
                                        disabled={loading}
                                        className="flex items-center gap-2 text-xs text-[#1A1A1A]/50 hover:text-[#1A1A1A] transition-colors tracking-widest"
                                        title={t('reanalyze')}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {t('reanalyze')}
                                    </button>
                                    <button
                                        onClick={() => setShowExport(true)}
                                        disabled={loading}
                                        className="flex items-center gap-2 text-xs text-[#B8860B] hover:text-[#B8860B]/80 transition-colors tracking-widest ml-4 border border-[#B8860B]/20 px-3 py-1 rounded-full"
                                        title={commonT('exportResult')}
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        {commonT('exportResult')}
                                    </button>
                                </div>

                                <div className="zen-divider" />

                                <div className="prose prose-stone max-w-none">
                                    <div className="whitespace-pre-wrap text-[#1A1A1A]/90 leading-loose text-[15px] font-light tracking-wide space-y-4">
                                        <ReactMarkdown>{analysis}</ReactMarkdown>
                                    </div>
                                </div>

                                <div className="pt-8 text-center">
                                    <p className="text-[10px] text-[#1A1A1A]/20 tracking-[0.2em] italic">
                                        {t('hint')}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full border border-dashed border-[#1A1A1A]/10 rounded-3xl flex flex-col items-center justify-center min-h-[400px] text-[#1A1A1A]/20">
                                <p className="tracking-widest font-light">
                                    {t('chooseTopic')}
                                </p>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800/70 text-sm tracking-widest text-center">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Export Manager Modal */}
            <ExportManager
                isOpen={showExport}
                onClose={() => setShowExport(false)}
                currentTopic={ANALYSIS_TOPICS.find(t => t.id === topic)?.label || topic}
                currentContent={analysis}
            />
        </main>
    );
}
