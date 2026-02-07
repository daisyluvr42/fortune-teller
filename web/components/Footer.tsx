import { Link } from "@/i18n/routing";
import { getAppVersion } from "@/lib/version";
import { useTranslations } from 'next-intl';

export default function Footer() {
  const version = getAppVersion();
  const t = useTranslations('Footer'); // Assume 'Footer' key exists or will be added

  // Minimal fallback for missing keys
  const aboutText = "About" // t('about'); 
  const contactText = "Contact" // t('contact');
  const rightsText = "All Rights Reserved" // t('rights');

  return (
    <footer className="w-full border-t border-[#1A1A1A]/10 py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[11px] text-[#1A1A1A]/60 tracking-widest">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[#1A1A1A]">Monad-lab Works LLC</span>
          <span>Delaware, USA</span>
          <Link className="underline underline-offset-4" href="/about">
            {/* Use Translations later, keeping simple for now to fix errors */}
            About
          </Link>
          <span>Founder: Xiangyu</span>
          <span>
            Contact:
            <a className="ml-1 underline underline-offset-4" href="mailto:founder@monad-lab.com">
              founder@monad-lab.com
            </a>
          </span>
        </div>
      </div>
      <div className="mt-6 text-center text-[10px] text-[#1A1A1A]/30 tracking-[0.3em]">
        © 2026 Monad-lab Works LLC. {rightsText}. · VERSION {version}
      </div>
    </footer>
  );
}
