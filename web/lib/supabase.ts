"use client";

import { createBrowserClient } from "@supabase/ssr";

// ============================================
// Supabase Browser Client
// 用于 Next.js 客户端组件
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Supabase credentials not configured. Auth features disabled.");
}

export function createClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// 导出单例客户端（用于简单场景）
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
    if (!browserClient && supabaseUrl && supabaseAnonKey) {
        browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return browserClient;
}
