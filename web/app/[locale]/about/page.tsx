"use client";

import Header from "@/components/Header";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F8F8F0]">
      <Header />
      <div className="page-shell space-y-10 animate-fade-in">
        <section className="text-center space-y-4">
          <p className="text-xs tracking-[0.3em] text-[#1A1A1A]/50">关于</p>
          <h1 className="text-3xl font-light tracking-[0.3em] text-[#1A1A1A]">
            一人一宇宙。
          </h1>
        </section>

        <section className="space-y-5 text-[#1A1A1A]/75 leading-relaxed">
          <p>
            Monad-lab Works 起步于单人构建完整系统的实践。每一次合作都被视作一个自洽的宇宙：边界清晰、逻辑一致。
          </p>
          <p>
            “Monad”是一种自洽的逻辑单元。我们以同样的方式设计软件，通过精准接口与可组合模块，在复杂增长中保持清晰。
          </p>
        </section>

        <section className="border border-[#1A1A1A]/10 rounded-xl p-6 bg-white/60">
          <div className="text-[10px] tracking-[0.2em] text-[#1A1A1A]/50 uppercase mb-2">
            创始人 ID
          </div>
          <div className="text-lg tracking-widest text-[#1A1A1A] mb-2">Xiangyu</div>
          <p className="text-sm text-[#1A1A1A]/60">
            由单一身份统合多学科工作室，将研究、设计与工程在同一逻辑下协同。
          </p>
        </section>
      </div>
    </main>
  );
}
