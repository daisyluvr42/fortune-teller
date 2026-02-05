import Link from "next/link";
import { getAppVersion } from "@/lib/version";

export default function Footer() {
  const version = getAppVersion();
  return (
    <footer className="w-full border-t border-[#1A1A1A]/10 py-8">
      <div className="max-w-3xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2">
          <div className="text-sm tracking-widest text-[#1A1A1A]">Monad-lab Works LLC</div>
          <div className="text-[11px] text-[#1A1A1A]/50 tracking-widest">封装复杂性。</div>
          <div className="text-[11px] text-[#1A1A1A]/50 tracking-widest">创始人 ID：Xiangyu</div>
        </div>
        <div className="space-y-2 text-[11px] text-[#1A1A1A]/50 tracking-widest">
          <div>美国特拉华州注册。</div>
          <div>
            联系：
            <a className="ml-1 underline underline-offset-4" href="mailto:founder@monad-lab.com">
              founder@monad-lab.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link className="underline underline-offset-4" href="/about">
              关于
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-6 text-center text-[10px] text-[#1A1A1A]/30 tracking-[0.3em]">
        © 2026 Monad-lab Works LLC. 保留所有权利。 · VERSION {version}
      </div>
    </footer>
  );
}
