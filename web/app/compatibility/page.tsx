"use client";

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import { getCompatibility, BirthData, CompatibilityResponse } from '@/lib/api';
import { Users, Heart, Briefcase, UserPlus, Info } from 'lucide-react';
import { useUserProfile } from '@/lib/context';

const RELATION_TYPES = [
    { id: '恋人/伴侣', label: '恋人伴侣', icon: Heart },
    { id: '事业合伙人', label: '事业合伙', icon: Briefcase },
    { id: '知己好友', label: '知己好友', icon: UserPlus },
];

export default function CompatibilityPage() {
    const { birthData: savedBirthData, activeProfileId, profiles } = useUserProfile();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CompatibilityResponse | null>(null);
    const [relationType, setRelationType] = useState('恋人/伴侣');
    const [error, setError] = useState<string | null>(null);

    // 默认初始数据
    const initialBirthData: BirthData = {
        birth_year: 1990,
        month: 1,
        day: 15,
        hour: 8,
        minute: 0,
        gender: '男'
    };

    const [personA, setPersonA] = useState<BirthData>(savedBirthData || initialBirthData);
    const [personB, setPersonB] = useState<BirthData>({ ...initialBirthData, gender: '女' });

    useEffect(() => {
        const activeProfile = profiles.find((p) => p.id === activeProfileId);
        if (activeProfile?.birthData) {
            setPersonA({ ...activeProfile.birthData });
            return;
        }
        if (savedBirthData) {
            setPersonA({ ...savedBirthData });
        } else {
            setPersonA({ ...initialBirthData });
        }
    }, [activeProfileId, profiles, savedBirthData]);

    const handleCompatibility = async () => {
        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const res = await getCompatibility({
                user_a_data: personA,
                user_b_data: personB,
                relation_type: relationType,
            });

            setResult(res);
        } catch (err: any) {
            setError(err.message || "合盘分析失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen pt-24 pb-12 px-6">
            <Header />

            <div className="max-w-4xl mx-auto space-y-12">
                <section className="text-center space-y-4 animate-fade-in">
                    <h2 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
                        双人合盘
                    </h2>
                    <p className="text-[#1A1A1A]/60 font-light tracking-widest text-sm">
                        看缘分深浅，析相处之道
                    </p>
                </section>

                {/* Input Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex items-center justify-center w-12 h-12 bg-[#F8F8F0] border border-[#1A1A1A]/10 rounded-full text-[#B8860B]">
                        <Users className="w-5 h-5" />
                    </div>

                    {/* Person A */}
                    <div className="zen-card p-6 space-y-6">
                        <h3 className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase text-center">甲方 (User A)</h3>
                        <BirthFormBrief data={personA} setData={setPersonA} />
                    </div>

                    {/* Person B */}
                    <div className="zen-card p-6 space-y-6">
                        <h3 className="text-xs tracking-[0.2em] font-medium text-[#1A1A1A]/40 uppercase text-center">乙方 (User B)</h3>
                        <BirthFormBrief data={personB} setData={setPersonB} />
                    </div>
                </div>

                {/* Relation Type Selector */}
                <div className="flex justify-center gap-4">
                    {RELATION_TYPES.map((type) => (
                        <button
                            key={type.id}
                            onClick={() => setRelationType(type.id)}
                            className={`
                flex items-center gap-2 px-6 py-3 rounded-full border transition-all duration-300
                ${relationType === type.id
                                    ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                                    : 'bg-white border-[#1A1A1A]/10 text-[#1A1A1A]/60 hover:border-[#1A1A1A]/30'}
              `}
                        >
                            <type.icon className="w-4 h-4" />
                            <span className="text-sm tracking-widest">{type.label}</span>
                        </button>
                    ))}
                </div>

                <div className="text-center">
                    <button
                        onClick={handleCompatibility}
                        disabled={loading}
                        className="zen-button px-12"
                    >
                        {loading ? "正在推演姻缘..." : "开始合盘分析"}
                    </button>
                </div>

                {/* Result Section */}
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <LoadingSpinner />
                    </div>
                ) : result ? (
                    <div className="space-y-8 animate-fade-in">
                        <div className="zen-card p-12 text-center space-y-8">
                            <div className="relative inline-block">
                                <div className="w-32 h-32 rounded-full border-2 border-[#B8860B]/20 flex items-center justify-center">
                                    <span className="text-4xl font-light text-[#1A1A1A] tracking-tighter">
                                        {result.base_score}
                                    </span>
                                    <span className="text-xs ml-1 text-[#1A1A1A]/40">分</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-light tracking-[0.3em]">契合总评</h3>
                                <p className="text-[#1A1A1A]/60 text-sm tracking-widest italic">
                                    两人缘分天定，相处需修。
                                </p>
                            </div>

                            <div className="zen-divider" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left max-w-2xl mx-auto">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                        <Info className="w-3 h-3" /> 甲方分析
                                    </h4>
                                    <p className="text-sm font-light leading-relaxed">{result.user_a_summary}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold tracking-widest text-[#1A1A1A]/40 uppercase flex items-center gap-2">
                                        <Info className="w-3 h-3" /> 乙方分析
                                    </h4>
                                    <p className="text-sm font-light leading-relaxed">{result.user_b_summary}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {result.details.map((detail, idx) => (
                                <div key={idx} className="zen-card p-6 flex items-start gap-4">
                                    <div className="mt-1">
                                        <div className="w-2 h-2 rounded-full bg-[#B8860B]" />
                                    </div>
                                    <p className="text-sm font-light text-[#1A1A1A]/90 leading-relaxed tracking-wide">
                                        {detail.replace(/\*\*(.*?)\*\*/g, '$1')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800/70 text-sm tracking-widest text-center">
                        {error}
                    </div>
                )}
            </div>
        </main>
    );
}

function BirthFormBrief({ data, setData }: { data: BirthData, setData: (d: BirthData) => void }) {
    const update = (key: keyof BirthData, val: any) => setData({ ...data, [key]: val });

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">出生年</label>
                    <select value={data.birth_year} onChange={e => update('birth_year', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 80 }, (_, i) => 2024 - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">出生月</label>
                    <select value={data.month} onChange={e => update('month', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">出生日</label>
                    <select value={data.day} onChange={e => update('day', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40">时辰</label>
                    <select value={data.hour} onChange={e => update('hour', Number(e.target.value))} className="zen-select py-1.5 text-xs">
                        {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h}时</option>)}
                    </select>
                </div>
            </div>
            <div className="space-y-1 text-center">
                <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block mb-2">性别</label>
                <div className="flex justify-center gap-4">
                    {['男', '女'].map(g => (
                        <button
                            key={g}
                            onClick={() => update('gender', g)}
                            className={`px-4 py-1.5 rounded-full text-xs transition-colors ${data.gender === g ? 'bg-[#1A1A1A] text-white' : 'bg-[#1A1A1A]/5 text-[#1A1A1A]/60'}`}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
