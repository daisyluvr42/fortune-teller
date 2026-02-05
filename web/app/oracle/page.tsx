"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import CoinTossScene from '@/components/CoinTossScene';
import { getOracle, getAnalysis, OracleResponse } from '@/lib/api';
import { useUserProfile } from '@/lib/context';
import { useShakeTrigger } from '@/lib/useShakeTrigger';
import ReactMarkdown from 'react-markdown';
import { Sparkles, History, HelpCircle, AlertTriangle } from 'lucide-react';

export default function OraclePage() {
    const router = useRouter();
    const { birthData, hasProfile } = useUserProfile();

    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [stage, setStage] = useState<'idle' | 'casting' | 'result'>('idle');
    const [oracleData, setOracleData] = useState<OracleResponse | null>(null);
    const [analysis, setAnalysis] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [castingIndex, setCastingIndex] = useState<number>(0);
    const [castingLines, setCastingLines] = useState<{
        line_index: number;
        line_symbol: string;
        is_change: boolean;
        coins: number[];
    }[]>([]);
    const [shakeEnabled, setShakeEnabled] = useState(false);
    const [shakeNotice, setShakeNotice] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const isAnimatingRef = useRef(false);
    const hasFinalizedRef = useRef(false);

    // State for 3D coin positions and final faces
    const [coinState, setCoinState] = useState<{
        seed: number;
        positions: { top: number; left: number; rotate: string; finalX: number; finalY: number; finalZ: number }[];
        faces: number[]; // 0=Yang/Front, 1=Yin/Back
    } | null>(null);

    const generateCoinPositions = useCallback(() => {
        const positions: { top: number; left: number; rotate: string; finalX: number; finalY: number; finalZ: number }[] = [];
        const minDistance = 22; // percentage points
        const maxAttempts = 60;
        const bounds = { min: 60, max: 88 };

        for (let i = 0; i < 3; i += 1) {
            let placed = false;
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                const top = bounds.min + Math.random() * (bounds.max - bounds.min);
                const left = bounds.min + Math.random() * (bounds.max - bounds.min);
                const ok = positions.every((p) => {
                    const dy = p.top - top;
                    const dx = p.left - left;
                    return Math.hypot(dx, dy) >= minDistance;
                });
                if (ok) {
                    const isBack = false;
                    positions.push({
                        top,
                        left,
                        rotate: `${Math.random() * 360}deg`,
                        finalX: (Math.random() - 0.5) * 0.35,
                        finalY: 0,
                        finalZ: (Math.random() * Math.PI * 2)
                    });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const base = positions[0] || { top: '50%', left: '50%' };
                const baseTop = base.top;
                const baseLeft = base.left;
                const angle = Math.random() * Math.PI * 2;
                const dist = minDistance + 6 + Math.random() * 4;
                const top = Math.min(bounds.max, Math.max(bounds.min, baseTop + Math.sin(angle) * dist));
                const left = Math.min(bounds.max, Math.max(bounds.min, baseLeft + Math.cos(angle) * dist));
                positions.push({
                    top,
                    left,
                    rotate: `${Math.random() * 360}deg`,
                    finalX: (Math.random() - 0.5) * 0.35,
                    finalY: 0,
                    finalZ: (Math.random() * Math.PI * 2)
                });
            }
        }
        return positions;
    }, []);

    const finalizeCasting = useCallback(async (data: OracleResponse) => {
        if (hasFinalizedRef.current) return;
        hasFinalizedRef.current = true;
        setStage('result');

        const userData = birthData || {
            birth_year: 1990,
            month: 1,
            day: 1,
            hour: 12,
            minute: 0,
            gender: "男" as const
        };

        const analysisRes = await getAnalysis({
            user_data: userData,
            question_type: "大师解惑",
            custom_question: question,
            oracle_data: data
        });

        setAnalysis(analysisRes.markdown_content);
    }, [birthData, question]);

    const advanceCasting = useCallback(() => {
        if (isAnimatingRef.current) return;
        if (!oracleData) return;
        if (castingIndex >= 6) return;

        const i = castingIndex;
        const line = oracleData.lines?.[i];
        const coins = line?.coins || oracleData.coins_detail?.[i] || [0, 0, 0];
        const backCount = coins.filter((c) => c === 1).length;
        const fallbackLineVal = backCount === 1 || backCount === 3 ? 1 : 0;
        const fallbackIsChange = backCount === 0 || backCount === 3;
        const lineSymbol = line?.line_symbol || (fallbackLineVal === 1 ? '⚊' : '⚋');
        const isChange = line?.is_change ?? fallbackIsChange;

        isAnimatingRef.current = true;
        setIsAnimating(true);
        setCoinState({
            seed: Date.now(),
            positions: generateCoinPositions(),
            faces: coins
        });

        const nextIndex = i + 1;
        setCastingIndex(nextIndex);
        setCastingLines(prev => ([
            ...prev,
            {
                line_index: nextIndex,
                line_symbol: lineSymbol,
                is_change: isChange,
                coins
            }
        ]));

        window.setTimeout(() => {
            isAnimatingRef.current = false;
            setIsAnimating(false);
            if (nextIndex >= 6) {
                void finalizeCasting(oracleData);
            }
        }, 2600);
    }, [castingIndex, finalizeCasting, oracleData]);

    const shake = useShakeTrigger({
        onTrigger: () => {
            if (stage !== 'casting') return;
            advanceCasting();
        },
        cooldownMs: 2000,
        threshold: 18
    });

    useEffect(() => {
        if (stage !== 'casting') {
            isAnimatingRef.current = false;
            setIsAnimating(false);
            hasFinalizedRef.current = false;
            if (shakeEnabled) {
                shake.stop();
                setShakeEnabled(false);
            }
        }
    }, [shake, shakeEnabled, stage]);

    const handleCast = async () => {
        if (!question.trim()) {
            setError("请先输入你心中的困惑...");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            setAnalysis('');
            setCastingIndex(0);
            setCastingLines([]);
            setCoinState(null);

            // 1. 先获取起卦结果，因为动画需要知道硬币的正反面
            const data = await getOracle({
                question,
                user_data: birthData || undefined
            });
            setOracleData(data);

            // 2. 进入投掷阶段（每次由摇动或按钮触发）
            setStage('casting');
        } catch (err: any) {
            setError(err.message || "起卦失败，请稍后重试");
            setStage('idle');
        } finally {
            setLoading(false);
        }
    };

    const toggleShake = async () => {
        if (!shake.isSupported) return;
        if (shakeEnabled) {
            shake.stop();
            setShakeEnabled(false);
            setShakeNotice(null);
            return;
        }
        const permission = await shake.requestPermission();
        if (permission === "denied") {
            setShakeNotice("未获得传感器权限，请在系统设置中允许访问“运动与方向”。");
            return;
        }
        shake.start();
        setShakeEnabled(true);
        setShakeNotice(null);
    };


    return (
        <main className="min-h-screen pt-24 pb-12 px-6 bg-[#F8F8F0]">
            <Header />

            <div className="max-w-3xl mx-auto space-y-12">
                {/* Section: Input */}
                <section className="text-center space-y-6 animate-fade-in">
                    <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
                        每日一卦
                    </h2>
                    <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm">
                        心诚则灵，问事、问道、问吉凶
                    </p>

                    {/* 无档案提示 */}
                    {!hasProfile && (
                        <div className="flex items-center justify-center gap-2 py-2 px-4 bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-lg max-w-md mx-auto">
                            <AlertTriangle className="w-4 h-4 text-[#B8860B]" />
                            <span className="text-xs text-[#B8860B]/80 tracking-wide">
                                建议先<button onClick={() => router.push('/')} className="underline">完成排盘</button>，解卦将更加精准
                            </span>
                        </div>
                    )}

                    <div className="relative max-w-lg mx-auto mt-8">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="输入你此刻的困惑..."
                            className="zen-input w-full pr-12 text-center"
                            disabled={loading || stage === 'casting'}
                        />
                        <button
                            onClick={handleCast}
                            disabled={loading || !question.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#B8860B] hover:scale-110 transition-transform disabled:opacity-30"
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>
                    {error && <p className="text-red-800/60 text-xs tracking-widest">{error}</p>}
                </section>


                {/* Stage: Casting (3D True Coin Animation) */}
                {stage === 'casting' && (
                    <div className="flex flex-col items-center justify-center py-20 animate-fade-in relative h-80 w-full overflow-hidden">
                        {/* 投掷桌面区域 */}
                        <div className="relative w-full h-full max-w-md bg-[#1A1A1A]/5 rounded-full blur-3xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

                        {coinState && (
                            <div className="relative w-full h-full max-w-lg z-0 pointer-events-none">
                                <CoinTossScene
                                    modelUrl="/models/coin_optimized.glb"
                                    seed={coinState.seed}
                                    coins={coinState.positions.map((pos, i) => ({
                                        top: pos.top,
                                        left: pos.left,
                                        delay: i * 0.15,
                                        duration: 2.5,
                                        spinTurns: 4,
                                        finalRotation: { x: pos.finalX, y: pos.finalY, z: pos.finalZ },
                                        face: coinState.faces[i] === 1 ? 1 : 0,
                                    }))}
                                />
                            </div>
                        )}

                        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center">
                            <p className="text-xs text-[#1A1A1A]/60 tracking-[0.3em]">
                                第 {castingIndex} 次投掷 · 第 {castingIndex} 爻
                            </p>
                            {castingLines.length > 0 && (
                                <div className="mt-2 flex gap-2 items-center justify-center text-[10px] text-[#B8860B]/80 tracking-widest">
                                    {castingLines.map((line) => (
                                        <span key={line.line_index}>
                                            {line.line_symbol}{line.is_change ? '·动' : ''}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="absolute top-24 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
                            <button
                                onClick={toggleShake}
                                className="zen-button-ghost text-[10px] tracking-[0.2em]"
                            >
                                {shakeEnabled ? "关闭摇一摇" : "启用摇一摇"}
                            </button>
                            <button
                                onClick={advanceCasting}
                                className="zen-button-ghost text-[10px] tracking-[0.2em]"
                                disabled={castingIndex >= 6 || isAnimating}
                            >
                                {isAnimating ? "投掷中..." : (castingIndex === 0 ? "开始投掷" : "下一次投掷")}
                            </button>
                        </div>
                        <div className="absolute top-36 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-[#1A1A1A]/50">
                            摇动手机可触发下一次投掷（需授权）
                        </div>
                        {shakeNotice && (
                            <div className="absolute top-44 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-red-800/70">
                                {shakeNotice}
                            </div>
                        )}

                        <p className="absolute bottom-4 text-[#B8860B] tracking-[0.5em] text-sm animate-pulse font-song">
                            {['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'][Math.floor(Math.random() * 8)]}...
                        </p>
                    </div>
                )}

                {/* Stage: Result */}
                {stage === 'result' && oracleData && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Hexagram Card */}
                            <div className="zen-card flex flex-col items-center justify-center p-8 space-y-6">
                                <div
                                    className="w-32 h-40 bg-[#1A1A1A]/5 p-4 rounded-lg flex items-center justify-center"
                                    dangerouslySetInnerHTML={{ __html: oracleData.svg }}
                                />
                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-medium text-[#1A1A1A] tracking-wider">
                                        {oracleData.original_hex}
                                    </h3>
                                    <p className="text-[#B8860B] text-sm tracking-widest font-light">
                                        {oracleData.original_meaning}
                                    </p>
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div className="zen-card p-8 space-y-6">
                                <div className="flex items-center gap-2 text-[#1A1A1A]/40 mb-2">
                                    <HelpCircle className="w-4 h-4" />
                                    <span className="text-xs tracking-widest">卦意简述</span>
                                </div>
                                <div className="space-y-4">
                                    {oracleData.details.slice(-3).map((detail, idx) => (
                                        <p key={idx} className="text-sm font-light text-[#1A1A1A]/80 leading-relaxed tracking-wide">
                                            {detail}
                                        </p>
                                    ))}
                                    {oracleData.future_hex && (
                                        <div className="pt-4 border-t border-[#1A1A1A]/10">
                                            <p className="text-xs text-[#1A1A1A]/40 tracking-widest uppercase">变卦趋势</p>
                                            <p className="text-sm mt-1">{oracleData.future_hex} ({oracleData.future_short})</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI Deep Analysis */}
                        {analysis ? (
                            <div className="zen-card p-8 md:p-12 space-y-8">
                                <div className="flex items-center justify-center gap-4 mb-4">
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#1A1A1A]/10 to-transparent"></div>
                                    <span className="text-sm tracking-[0.3em] font-light text-[#1A1A1A]/40">大师解卦</span>
                                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#1A1A1A]/10 to-transparent"></div>
                                </div>
                                <div className="prose prose-stone max-w-none prose-p:font-light prose-p:tracking-wide prose-p:leading-relaxed prose-headings:font-normal prose-headings:tracking-widest">
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => <h3 className="text-xl font-medium mt-6 mb-4 text-[#B8860B]" {...props} />,
                                            h2: ({ node, ...props }) => <h4 className="text-lg font-medium mt-5 mb-3 text-[#1A1A1A]" {...props} />,
                                            h3: ({ node, ...props }) => <h5 className="text-base font-medium mt-4 mb-2 text-[#1A1A1A]" {...props} />,
                                            strong: ({ node, ...props }) => <span className="font-medium text-[#B8860B]" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-4 text-[#1A1A1A]/80 leading-loose" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2" {...props} />,
                                            li: ({ node, ...props }) => <li className="text-[#1A1A1A]/80" {...props} />,
                                        }}
                                    >
                                        {analysis}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center p-12">
                                <LoadingSpinner />
                            </div>
                        )}

                        <div className="text-center">
                            <button
                                onClick={() => {
                                    setStage('idle');
                                    setOracleData(null);
                                    setAnalysis('');
                                    setCastingIndex(0);
                                    setCastingLines([]);
                                    setCoinState(null);
                                }}
                                className="zen-button-ghost text-xs tracking-[0.2em]"
                            >
                                再次问卜
                            </button>
                        </div>
                    </div>
                )}

                {/* Placeholder: History Hint */}
                {stage === 'idle' && (
                    <section className="flex flex-col items-center py-12 border-t border-[#1A1A1A]/5">
                        <div className="flex items-center gap-2 text-[#1A1A1A]/20 mb-4">
                            <History className="w-4 h-4" />
                            <span className="text-xs tracking-widest uppercase">我的卜卦记录</span>
                        </div>
                        <p className="text-[#1A1A1A]/30 text-xs italic tracking-widest">
                            记录随云烟散，此刻即是永恒
                        </p>
                    </section>
                )}
            </div>
        </main>
    );
}
