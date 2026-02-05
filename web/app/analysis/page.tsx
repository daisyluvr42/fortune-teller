"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getAnalysis } from '@/lib/api';
import { useUserProfile } from '@/lib/context';
import { BookOpen, Target, Heart, Coins, Activity, Crown, ArrowLeft, AlertCircle } from 'lucide-react';

const ANALYSIS_TOPICS = [
    { id: '整体命格', label: '整体命格', icon: Crown, desc: '全面剖析人生基调与格局' },
    { id: '事业运势', label: '事业职场', icon: Target, desc: '职业方向、晋升空间与格调' },
    { id: '财运分析', label: '财富运势', icon: Coins, desc: '正财偏财、守财能力与时机' },
    { id: '婚恋感情', label: '婚恋感情', icon: Heart, desc: '情感特质、缘分深浅与相处' },
    { id: '健康体魄', label: '健康建议', icon: Activity, desc: '五行平衡、脏腑健康与保养' },
];

export default function AnalysisPage() {
    const router = useRouter();
    const { birthData, hasProfile } = useUserProfile();

    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string>('');
    const [topic, setTopic] = useState('整体命格');
    const [error, setError] = useState<string | null>(null);

    const handleAnalysis = async () => {
        if (!birthData) return;

        try {
            setLoading(true);
            setError(null);
            setAnalysis('');

            const res = await getAnalysis({
                user_data: birthData,
                question_type: topic,
                birthplace: "未指定",
            });

            setAnalysis(res.markdown_content);
        } catch (err: any) {
            setError(err.message || "分析失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    };

    // 无档案时显示提示
    if (!hasProfile) {
        return (
            <main className="min-h-screen pt-24 pb-12 px-6 bg-[#F8F8F0]">
                <Header />
                <div className="max-w-md mx-auto">
                    <div className="zen-card p-12 text-center space-y-6">
                        <AlertCircle className="w-12 h-12 text-[#B8860B]/40 mx-auto" />
                        <h2 className="text-xl font-light tracking-[0.2em]">尚未建立档案</h2>
                        <p className="text-sm text-[#1A1A1A]/50 leading-relaxed">
                            请先前往首页完成排盘，<br />系统将自动记录您的命盘数据
                        </p>
                        <button
                            onClick={() => router.push('/')}
                            className="zen-button"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            前往排盘
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pt-24 pb-12 px-6 bg-[#F8F8F0]">
            <Header />

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Topics */}
                <div className="lg:col-span-5 space-y-8 animate-fade-in">
                    <div className="space-y-4">
                        <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
                            深度析命
                        </h2>
                        <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm leading-relaxed">
                            融合古籍智慧与 AI 洞察，为你拨开命运的迷雾
                        </p>
                    </div>

                    {/* 档案信息 */}
                    <div className="zen-card p-4">
                        <p className="text-[10px] text-[#1A1A1A]/40 tracking-widest uppercase mb-2">当前档案</p>
                        <p className="text-sm font-medium">
                            {birthData?.birth_year}年{birthData?.month}月{birthData?.day}日 {birthData?.hour}时 · {birthData?.gender}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase">
                            选择分析维度
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
                        onClick={handleAnalysis}
                        disabled={loading}
                        className="zen-button w-full"
                    >
                        {loading ? "正在分析..." : "开始深度分析"}
                    </button>
                </div>

                {/* Right: Results */}
                <div className="lg:col-span-7 space-y-8 h-full">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center min-h-[400px] border border-[#1A1A1A]/5 rounded-3xl bg-[#F8F8F0]/50 animate-pulse">
                            <LoadingSpinner />
                            <p className="mt-6 text-[#1A1A1A]/40 text-sm tracking-[0.5em] italic">
                                AI 正在翻阅命书...
                            </p>
                        </div>
                    ) : analysis ? (
                        <div className="zen-card p-8 md:p-12 space-y-10 animate-fade-in h-fit sticky top-24">
                            <div className="flex items-center gap-4">
                                <BookOpen className="w-5 h-5 text-[#B8860B]" />
                                <span className="text-lg font-light tracking-[0.4em]">{topic}</span>
                            </div>

                            <div className="zen-divider" />

                            <div className="prose prose-stone max-w-none">
                                <div className="whitespace-pre-wrap text-[#1A1A1A]/90 leading-loose text-[15px] font-light tracking-wide space-y-4">
                                    {analysis}
                                </div>
                            </div>

                            <div className="pt-8 text-center">
                                <p className="text-[10px] text-[#1A1A1A]/20 tracking-[0.2em] italic">
                                    提示：命理仅供参考，愿你能把握当下，顺势而为。
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full border border-dashed border-[#1A1A1A]/10 rounded-3xl flex flex-col items-center justify-center min-h-[400px] text-[#1A1A1A]/20">
                            <p className="tracking-widest font-light">
                                选择维度后点击开始分析
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
        </main>
    );
}
