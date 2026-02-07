"use client";

import { useEffect, useMemo, useState } from "react";
import { BirthData } from "@/lib/api";
import { LunarMonth } from "lunar-javascript";

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

// 扁平化映射用于查询
const CITIES_FLAT = Object.values(CITY_GROUPS).reduce((acc, group) => ({ ...acc, ...group }), {} as Record<string, number>);

interface BirthDataFormProps {
    onSubmit: (data: BirthData) => void;
    isLoading: boolean;
    initialData?: BirthData;
}

export default function BirthDataForm({ onSubmit, isLoading, initialData }: BirthDataFormProps) {
    const currentYear = new Date().getFullYear();

    const [birthYear, setBirthYear] = useState(initialData?.birth_year ?? 1990);
    const [month, setMonth] = useState(initialData?.month ?? 1);
    const [day, setDay] = useState(initialData?.day ?? 15);
    const [hour, setHour] = useState(initialData?.hour ?? 8);
    const [minute, setMinute] = useState(initialData?.minute ?? 0);
    const [gender, setGender] = useState<"男" | "女">(initialData?.gender ?? "男");
    const [city, setCity] = useState("北京");
    const [isLunar, setIsLunar] = useState<boolean>(initialData?.is_lunar ?? false);
    const [timeMode, setTimeMode] = useState<"time" | "shichen">(initialData?.time_mode ?? "time");
    const [shichen, setShichen] = useState<BirthData["shichen"]>(initialData?.shichen ?? "子时");

    const SHICHEN_OPTIONS: BirthData["shichen"][] = [
        "子时", "丑时", "寅时", "卯时", "辰时", "巳时",
        "午时", "未时", "申时", "酉时", "戌时", "亥时"
    ];

    const lunarDayCount = useMemo(() => {
        if (!isLunar) return null;
        const lunarMonth = LunarMonth.fromYm(birthYear, month);
        return lunarMonth ? lunarMonth.getDayCount() : null;
    }, [birthYear, isLunar, month]);

    const lunarError = useMemo(() => {
        if (!isLunar) return null;
        if (!lunarDayCount) return "农历月份无效，请检查年份与月份";
        if (day > lunarDayCount) return `农历日期无效：该月只有 ${lunarDayCount} 天`;
        return null;
    }, [day, isLunar, lunarDayCount]);

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
            time_mode: timeMode,
            shichen: timeMode === "shichen" ? shichen : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="zen-card animate-fade-in">
            {/* 标题 */}
            <div className="text-center mb-8">
                <h2 className="text-lg font-medium text-[#1A1A1A] tracking-wide">
                    输入出生信息
                </h2>
                <p className="text-sm text-[#666666] mt-2">
                    请填写公历/农历出生日期与时辰
                </p>
            </div>

            <div className="space-y-6">
                {/* 出生日期 */}
                <div>
                    <label className="block text-xs text-[#666666] tracking-widest uppercase mb-3 text-center">
                        出生日期
                    </label>
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <label className="text-xs text-[#666666] tracking-widest flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isLunar}
                                onChange={(e) => setIsLunar(e.target.checked)}
                                className="w-4 h-4 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                            />
                            农历
                        </label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <select
                            value={birthYear}
                            onChange={(e) => setBirthYear(Number(e.target.value))}
                            className="zen-select"
                        >
                            {Array.from({ length: 100 }, (_, i) => currentYear - i).map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="zen-select"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={m}>{m}月</option>
                            ))}
                        </select>
                        <select
                            value={day}
                            onChange={(e) => setDay(Number(e.target.value))}
                            className="zen-select"
                        >
                            {Array.from({ length: isLunar ? 30 : 31 }, (_, i) => i + 1).map((d) => (
                                <option key={d} value={d}>{d}日</option>
                            ))}
                        </select>
                    </div>
                    {isLunar && (
                        <p className={`text-[11px] text-center mt-2 ${lunarError ? "text-red-800/70" : "text-[#999999]"}`}>
                            {lunarError || "农历每月可能为 29 或 30 天，若提示无效请调整日期"}
                        </p>
                    )}
                </div>

                {/* 出生时间 */}
                <div>
                    <label className="block text-xs text-[#666666] tracking-widest uppercase mb-3 text-center">
                        出生时辰
                    </label>
                    <div className="flex items-center justify-center gap-4 mb-3">
                        <label className="text-xs text-[#666666] tracking-widest flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={timeMode === "shichen"}
                                onChange={(e) => setTimeMode(e.target.checked ? "shichen" : "time")}
                                className="w-4 h-4 rounded border-[#1A1A1A]/20 text-[#B8860B] focus:ring-[#B8860B]/20"
                            />
                            时辰
                        </label>
                        <span className="text-xs text-[#999999] tracking-widest">
                            {timeMode === "shichen" ? "已选择时辰" : "使用具体时间"}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {timeMode === "shichen" ? (
                            <>
                                <select
                                    value={shichen}
                                    onChange={(e) => setShichen(e.target.value as BirthData["shichen"])}
                                    className="zen-select col-span-2"
                                >
                                    {SHICHEN_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <>
                                <select
                                    value={hour}
                                    onChange={(e) => setHour(Number(e.target.value))}
                                    className="zen-select"
                                >
                                    {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                                        <option key={h} value={h}>{h.toString().padStart(2, "0")} 时</option>
                                    ))}
                                </select>
                                <select
                                    value={minute}
                                    onChange={(e) => setMinute(Number(e.target.value))}
                                    className="zen-select"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                                        <option key={m} value={m}>{m.toString().padStart(2, "0")} 分</option>
                                    ))}
                                </select>
                            </>
                        )}
                    </div>
                </div>

                {/* 性别 */}
                <div>
                    <label className="block text-xs text-[#666666] tracking-widest uppercase mb-3 text-center">
                        性别
                    </label>
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
                                <span className="text-sm tracking-wide">{g}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 出生城市 */}
                <div>
                    <label className="block text-xs text-[#666666] tracking-widest uppercase mb-3 text-center">
                        出生城市
                    </label>
                    <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="zen-select"
                    >
                        {Object.entries(CITY_GROUPS).map(([groupName, cities]) => (
                            <optgroup key={groupName} label={groupName}>
                                {Object.keys(cities).map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                    <p className="text-xs text-[#999999] text-center mt-2">
                        请选择离您最近的城市（用于真太阳时校正）
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
                                推演中
                            </span>
                        ) : (
                            "开始排盘"
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
