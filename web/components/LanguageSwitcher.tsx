"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useTransition } from 'react';

export default function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const switchToLocale = (nextLocale: 'en' | 'zh') => {
        if (locale === nextLocale) return;
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
        });
    };

    return (
        <div className="flex items-center gap-1.5 text-sm font-medium select-none">
            <button
                onClick={() => switchToLocale('en')}
                disabled={isPending}
                className={`transition-all ${locale === 'en' ? 'text-[#1A1A1A] font-bold' : 'text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60'}`}
            >
                EN
            </button>
            <span className="text-[#1A1A1A]/20 font-light">/</span>
            <button
                onClick={() => switchToLocale('zh')}
                disabled={isPending}
                className={`transition-all ${locale === 'zh' ? 'text-[#1A1A1A] font-bold' : 'text-[#1A1A1A]/30 hover:text-[#1A1A1A]/60'}`}
            >
                中
            </button>
        </div>
    );
}
