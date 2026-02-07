import Link from "next/link";
import { getAppVersion } from "@/lib/version";

export default function Footer() {
  const version = getAppVersion();
  return (
    <footer className="w-full border-t border-[#1A1A1A]/10 py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-[11px] text-[#1A1A1A]/60 tracking-widest">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[#1A1A1A]">Monad-lab Works LLC</span>
          <span>Delaware, USA</span>
          <Link className="underline underline-offset-4" href="/about">
            关于
          </Link>
          <span>Founder: Xiangyu</span>
          <span>
            联系：
            <a className="ml-1 underline underline-offset-4" href="mailto:founder@monad-lab.com">
              founder@monad-lab.com
            </a>
          </span>
        </div>
      </div>
      <div className="mt-6 text-center text-[10px] text-[#1A1A1A]/30 tracking-[0.3em]">
        © 2026 Monad-lab Works LLC. 保留所有权利。 · VERSION {version}
      </div>
    </footer>
  );
}
