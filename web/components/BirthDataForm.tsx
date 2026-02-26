"use client";

import { useMemo, useState } from "react";
import { BirthData } from "@/lib/api";
import { LunarMonth } from "lunar-javascript";
import { useTranslations, useLocale } from 'next-intl';

// 中国主要城市及经度
// 城市分组数据
const CITY_GROUPS = {
    "北京时间 (UTC+8)": {
        北京: 116.4, 上海: 121.5, 广州: 113.3, 深圳: 114.1, 杭州: 120.2,
        南京: 118.8, 武汉: 114.3, 天津: 117.2, 苏州: 120.6, 长沙: 112.9,
    },
    "西部地区 (偏晚)": {
        成都: 104.1, 重庆: 106.5, 西安: 109.0, 昆明: 102.7, 兰州: 103.7,
        乌鲁木齐: 87.6, 拉萨: 91.1
    },
    "东部/东北 (偏早)": {
        哈尔滨: 126.6, 沈阳: 123.4, 长春: 125.3, 大连: 121.6, 青岛: 120.4,
        福州: 119.3, 厦门: 118.1, 台北: 121.5
    },
    "其他": {
        其他: 120.0
    }
};

// 国际城市分组 - 覆盖全球主要时区
const INTERNATIONAL_CITY_GROUPS = {
    "UTC-12 ~ UTC-8 (Americas West)": {
        "Honolulu (UTC-10)": -157.9,
        "Los Angeles (UTC-8)": -118.2,
        "San Francisco (UTC-8)": -122.4,
        "Vancouver (UTC-8)": -123.1,
    },
    "UTC-7 ~ UTC-5 (Americas Central/East)": {
        "Denver (UTC-7)": -104.9,
        "Chicago (UTC-6)": -87.6,
        "New York (UTC-5)": -74.0,
        "Toronto (UTC-5)": -79.4,
        "Miami (UTC-5)": -80.2,
    },
    "UTC-4 ~ UTC-3 (South America)": {
        "São Paulo (UTC-3)": -46.6,
        "Buenos Aires (UTC-3)": -58.4,
        "Lima (UTC-5)": -77.0,
    },
    "UTC-6 (Central America/Mexico)": {
        "Mexico City (UTC-6)": -99.1,
        "Guatemala City (UTC-6)": -90.5,
        "Panama City (UTC-5)": -79.5,
    },
    "UTC+0 ~ UTC+1 (Europe West)": {
        "London (UTC+0)": -0.1,
        "Paris (UTC+1)": 2.3,
        "Berlin (UTC+1)": 13.4,
        "Amsterdam (UTC+1)": 4.9,
        "Madrid (UTC+1)": -3.7,
    },
    "UTC+2 ~ UTC+3 (Europe East/Middle East)": {
        "Cairo (UTC+2)": 31.2,
        "Istanbul (UTC+3)": 29.0,
        "Moscow (UTC+3)": 37.6,
        "Dubai (UTC+4)": 55.3,
    },
    "UTC+5 ~ UTC+6 (South Asia)": {
        "Mumbai (UTC+5:30)": 72.9,
        "New Delhi (UTC+5:30)": 77.2,
        "Dhaka (UTC+6)": 90.4,
        "Kolkata (UTC+5:30)": 88.4,
    },
    "UTC+7 ~ UTC+8 (Southeast Asia)": {
        "Bangkok (UTC+7)": 100.5,
        "Singapore (UTC+8)": 103.8,
        "Kuala Lumpur (UTC+8)": 101.7,
        "Jakarta (UTC+7)": 106.8,
        "Hong Kong (UTC+8)": 114.2,
    },
    "UTC+9 ~ UTC+12 (East Asia/Pacific)": {
        "Tokyo (UTC+9)": 139.7,
        "Seoul (UTC+9)": 127.0,
        "Sydney (UTC+10)": 151.2,
        "Melbourne (UTC+10)": 144.9,
        "Auckland (UTC+12)": 174.8,
    },
};

// 扁平化映射用于查询
const CITIES_FLAT = {
    ...Object.values(CITY_GROUPS).reduce((acc, group) => ({ ...acc, ...group }), {} as Record<string, number>),
    ...Object.values(INTERNATIONAL_CITY_GROUPS).reduce((acc, group) => ({ ...acc, ...group }), {} as Record<string, number>),
};

interface BirthDataFormProps {
    onSubmit: (data: BirthData) => void;
    isLoading: boolean;
    initialData?: BirthData;
}

export default function BirthDataForm({ onSubmit, isLoading, initialData }: BirthDataFormProps) {
    const t = useTranslations('BirthDataForm');
    const commonT = useTranslations('Common');
    const locale = useLocale();
    const isZh = locale === 'zh';
    const currentYear = new Date().getFullYear();

    const [birthYear, setBirthYear] = useState(initialData?.birth_year ?? 1990);
    const [month, setMonth] = useState(initialData?.month ?? 1);
    const [day, setDay] = useState(initialData?.day ?? 15);
    const [hour, setHour] = useState(initialData?.hour ?? 8);
    const [minute, setMinute] = useState(initialData?.minute ?? 0);
    const [gender, setGender] = useState<"男" | "女">(initialData?.gender ?? "男");
    const [city, setCity] = useState("北京");
    const [isInternational, setIsInternational] = useState(false);
    const [isLunar, setIsLunar] = useState<boolean>(initialData?.is_lunar ?? false);
    const [timeMode, setTimeMode] = useState<"time" | "shichen">(
        initialData?.time_mode ?? "time"
    );
    const effectiveTimeMode: "time" | "shichen" = isZh ? timeMode : "time";
    const [shichen, setShichen] = useState<BirthData["shichen"]>(initialData?.shichen ?? "早子时");

    const SHICHEN_OPTIONS: BirthData["shichen"][] = [
        "早子时", "丑时", "寅时", "卯时", "辰时", "巳时",
        "午时", "未时", "申时", "酉时", "戌时", "亥时", "晚子时"
    ];

    const lunarDayCount = useMemo(() => {
        if (!isLunar) return null;
        const lunarMonth = LunarMonth.fromYm(birthYear, month);
        return lunarMonth ? lunarMonth.getDayCount() : null;
    }, [birthYear, isLunar, month]);

    const lunarError = useMemo(() => {
        if (!isLunar) return null;
        if (!lunarDayCount) return t('lunarErrorInvalid');
        if (day > lunarDayCount) return t('lunarErrorDays', { count: lunarDayCount });
        return null;
    }, [day, isLunar, lunarDayCount, t]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (lunarError) return;
        onSubmit({
            birth_year: birthYear,
            month,
            day,
            hour,
            minute,
            gender,
            longitude: CITIES_FLAT[city] || 120.0,
            is_lunar: isLunar,
            time_mode: effectiveTimeMode,
            shichen: effectiveTimeMode === "shichen" ? shichen : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="zen-card animate-fade-in">
            {/* 标题 */}
            <div className="text-center mb-8">
                <h2 className="text-lg font-medium text-[#1A1A1A] tracking-wide">
                    {t('title')}
                </h2>
                <p className="text-sm text-[#666666] mt-2">
                    {t('subtitle')}
                </p>
            </div>

            <div className="space-y-6">
                {/* 出生日期 */}
                {/* Date & Time Section */}
                <div className="space-y-6">
                    {/* Row 1: Year, Month, Day */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                {t('birthYear')}
                            </label>
                            <select
                                value={birthYear}
                                onChange={(e) => setBirthYear(Number(e.target.value))}
                                className="zen-select text-center"
                            >
                                {Array.from({ length: 100 }, (_, i) => currentYear - i).map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                {t('birthMonth')}
                            </label>
                            <select
                                value={month}
                                onChange={(e) => setMonth(Number(e.target.value))}
                                className="zen-select text-center"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                {t('birthDay')}
                            </label>
                            <select
                                value={day}
                                onChange={(e) => setDay(Number(e.target.value))}
                                className="zen-select text-center"
                            >
                                {Array.from({ length: isLunar ? 30 : 31 }, (_, i) => i + 1).map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Lunar Toggle (Chinese Only) */}
                    {isZh && (
                        <div className="flex items-center justify-center">
                            <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 flex items-center gap-2 cursor-pointer hover:text-[#B8860B] transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isLunar}
                                    onChange={(e) => setIsLunar(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                                />
                                {t('lunarLabel')}
                            </label>
                        </div>
                    )}

                    {/* Row 2: Hour & Minute & Toggle */}
                    <div className="grid grid-cols-3 gap-3">
                        {effectiveTimeMode === "shichen" ? (
                            <>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                        {t('shichenLabel')}
                                    </label>
                                    <select
                                        value={shichen}
                                        onChange={(e) => setShichen(e.target.value as BirthData["shichen"])}
                                        className="zen-select text-center"
                                    >
                                        {SHICHEN_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                        {t('birthHour')}
                                    </label>
                                    <select
                                        value={hour}
                                        onChange={(e) => setHour(Number(e.target.value))}
                                        className="zen-select text-center"
                                    >
                                        {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                                            <option key={h} value={h}>{h.toString().padStart(2, "0")}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] tracking-widest text-[#1A1A1A]/40 block text-center uppercase">
                                        {t('birthMinute')}
                                    </label>
                                    <select
                                        value={minute}
                                        onChange={(e) => setMinute(Number(e.target.value))}
                                        className="zen-select text-center"
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                                            <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* Shichen Toggle Button (Placed in the 3rd column) */}
                        <div className="flex items-end justify-center pb-2">
                            {isZh && (
                                <button
                                    type="button"
                                    onClick={() => setTimeMode(effectiveTimeMode === "time" ? "shichen" : "time")}
                                    className="text-[10px] text-[#B8860B] tracking-widest hover:underline whitespace-nowrap"
                                >
                                    {effectiveTimeMode === "time" ? "切换到时辰" : "切换到时间"}
                                </button>
                            )}
                        </div>
                    </div>

                    {isLunar && (
                        <p className={`text-[11px] text-center mt-1 ${lunarError ? "text-red-800/70" : "text-[#999999]"}`}>
                            {lunarError || t('lunarHint')}
                        </p>
                    )}
                </div>

                {/* Gender */}
                <div className="pt-2">
                    <div className="flex justify-center gap-6">
                        {(["男", "女"] as const).map((g) => (
                            <label
                                key={g}
                                className={`
                  flex items-center gap-2 px-8 py-3 rounded-full cursor-pointer transition-all
                  ${gender === g
                                        ? "bg-[#1A1A1A] text-white"
                                        : "bg-[#F8F8F0] text-[#666666] hover:bg-[#EFEFEF]"
                                    }
                `}
                            >
                                <input
                                    type="radio"
                                    name="gender"
                                    value={g}
                                    checked={gender === g}
                                    onChange={() => setGender(g)}
                                    className="sr-only"
                                />
                                <span className="text-sm tracking-wide">{g === '男' ? commonT('male') : commonT('female')}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 出生城市 */}
                <div>
                    <label className="block text-xs text-[#666666] tracking-widest uppercase mb-3 text-center">
                        {t('cityLabel')}
                    </label>
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <label className="text-xs text-[#666666] tracking-widest flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isInternational}
                                onChange={(e) => {
                                    setIsInternational(e.target.checked);
                                    // Reset city when switching modes
                                    if (e.target.checked) {
                                        setCity("New York (UTC-5)");
                                    } else {
                                        setCity("北京");
                                    }
                                }}
                                className="w-4 h-4 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                            />
                            {t('internationalLabel')}
                        </label>
                    </div>
                    <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="zen-select"
                    >
                        {isInternational ? (
                            Object.entries(INTERNATIONAL_CITY_GROUPS).map(([groupName, cities]) => (
                                <optgroup key={groupName} label={groupName}>
                                    {Object.keys(cities).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                            ))
                        ) : (
                            Object.entries(CITY_GROUPS).map(([groupName, cities]) => (
                                <optgroup key={groupName} label={groupName}>
                                    {Object.keys(cities).map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </optgroup>
                            ))
                        )}
                    </select>
                    <p className="text-xs text-[#999999] text-center mt-2">
                        {isInternational ? t('cityHintInternational') : t('cityHint')}
                    </p>
                </div>

                {/* 分割线 */}
                <div className="zen-divider" />

                {/* 提交按钮 */}
                <div className="text-center">
                    <button type="submit" disabled={isLoading || !!lunarError} className="zen-button">
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {t('calculating')}
                            </span>
                        ) : (
                            t('startButton')
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
