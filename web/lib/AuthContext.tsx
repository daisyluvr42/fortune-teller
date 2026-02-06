"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";

// ============================================
// Auth Context - 用户认证状态管理
// ============================================

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseClient();
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        // 获取初始 session
        supabase.auth.getSession().then(({ data: { session: initialSession } }: { data: { session: Session | null } }) => {
            setSession(initialSession);
            setUser(initialSession?.user ?? null);
            setIsLoading(false);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: string, newSession: Session | null) => {
                setSession(newSession);
                setUser(newSession?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) return { error: { message: "Supabase not configured" } as AuthError };

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
            },
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const supabase = getSupabaseClient();
        if (!supabase) return { error: { message: "Supabase not configured" } as AuthError };

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                isLoading,
                isAuthenticated: !!user,
                signUp,
                signIn,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
