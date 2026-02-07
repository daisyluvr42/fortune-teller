"use client";

import { Circle } from "lucide-react";

interface LoadingSpinnerProps {
    text?: string;
}

export default function LoadingSpinner({ text = "Calculating..." }: LoadingSpinnerProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16">
            {/* 极简圆形旋转 */}
            <div className="relative w-12 h-12">
                <Circle
                    className="w-12 h-12 text-[#1A1A1A] animate-spin-slow"
                    strokeWidth={1}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#B8860B] animate-pulse-subtle" />
                </div>
            </div>

            {/* 文字 - 渐隐渐现 */}
            <p className="mt-8 text-sm text-[#666666] tracking-widest animate-pulse-subtle">
                {text}
            </p>
        </div>
    );
}
