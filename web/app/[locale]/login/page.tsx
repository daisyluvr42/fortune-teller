"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import Header from "@/components/Header";
import { Mail, Lock, ArrowRight, UserPlus, LogIn, AlertCircle, CheckCircle } from "lucide-react";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/routing";

type Mode = "login" | "register";

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signUp, isAuthenticated, isLoading: authLoading } = useAuth();
    const t = useTranslations('Login');

    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/");
        }
    }, [authLoading, isAuthenticated, router]);

    // 如果已登录，避免渲染表单
    if (!authLoading && isAuthenticated) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // 验证
        if (!email || !password) {
            setError(t('fillAll'));
            return;
        }

        if (mode === "register") {
            if (password !== confirmPassword) {
                setError(t('passwordMismatch'));
                return;
            }
            if (password.length < 6) {
                setError(t('passwordLength'));
                return;
            }
        }

        setIsLoading(true);

        try {
            if (mode === "login") {
                const { error } = await signIn(email, password);
                if (error) {
                    if (error.message.includes("Invalid login")) {
                        setError(t('emailError'));
                    } else if (error.message.includes("Email not confirmed")) {
                        setError(t('emailNotConfirmed'));
                    } else {
                        setError(error.message);
                    }
                } else {
                    router.push("/");
                }
            } else {
                const { error } = await signUp(email, password);
                if (error) {
                    if (error.message.includes("already registered")) {
                        setError(t('emailRegistered'));
                    } else {
                        setError(error.message);
                    }
                } else {
                    setSuccess(t('registerSuccess'));
                    setMode("login");
                    setPassword("");
                    setConfirmPassword("");
                }
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#F8F8F0]">
            <Header />

            <main className="flex-1">
                <div className="page-shell flex justify-center">
                    <div className="w-full max-w-md">
                        {/* 标题 */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-light text-[#1A1A1A] tracking-wide mb-2">
                                {mode === "login" ? t('welcomeBack') : t('createAccount')}
                            </h1>
                            <p className="text-sm text-[#1A1A1A]/50">
                                {mode === "login"
                                    ? t('loginDesc')
                                    : t('registerDesc')
                                }
                            </p>
                        </div>

                        {/* 表单卡片 */}
                        <div className="zen-card p-8">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* 邮箱 */}
                                <div className="space-y-2">
                                    <label className="text-xs text-[#1A1A1A]/50 tracking-widest uppercase">
                                        {t('email')}
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            className="w-full pl-11 pr-4 py-3 bg-[#F8F8F0] border border-[#1A1A1A]/10 rounded-lg text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:border-[#B8860B]/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* 密码 */}
                                <div className="space-y-2">
                                    <label className="text-xs text-[#1A1A1A]/50 tracking-widest uppercase">
                                        {t('password')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••"
                                            className="w-full pl-11 pr-4 py-3 bg-[#F8F8F0] border border-[#1A1A1A]/10 rounded-lg text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:border-[#B8860B]/50 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* 确认密码（仅注册时显示） */}
                                {mode === "register" && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-[#1A1A1A]/50 tracking-widest uppercase">
                                            {t('confirmPassword')}
                                        </label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1A1A]/30" />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••"
                                                className="w-full pl-11 pr-4 py-3 bg-[#F8F8F0] border border-[#1A1A1A]/10 rounded-lg text-[#1A1A1A] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:border-[#B8860B]/50 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* 错误提示 */}
                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {/* 成功提示 */}
                                {success && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                        {success}
                                    </div>
                                )}

                                {/* 提交按钮 */}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#B8860B] to-[#DAA520] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : mode === "login" ? (
                                        <>
                                            <LogIn className="w-4 h-4" />
                                            {t('submitLogin')}
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            {t('submitRegister')}
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* 切换模式 */}
                            <div className="mt-6 pt-6 border-t border-[#1A1A1A]/5 text-center">
                                <button
                                    onClick={() => {
                                        setMode(mode === "login" ? "register" : "login");
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    className="text-sm text-[#B8860B] hover:text-[#DAA520] transition-colors inline-flex items-center gap-1"
                                >
                                    {mode === "login" ? t('noAccount') : t('hasAccount')}
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* 跳过登录 */}
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => router.push("/")}
                                className="text-xs text-[#1A1A1A]/40 hover:text-[#1A1A1A]/60 transition-colors"
                            >
                                {t('skipLogin')}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
