"use client";

import { signIn } from "next-auth/react";
import { continueAsGuest } from "@/app/actions/auth";
import { useState } from "react";
import { Shield, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoadingGoogle(true);
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      console.error("Google sign in failed:", error);
      setLoadingGoogle(false);
    }
  };

  const handleGuestContinue = async () => {
    try {
      setLoadingGuest(true);
      await continueAsGuest();
      // After action completes, redirect to /
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Guest access failed:", error);
      setLoadingGuest(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md space-y-8 glass-panel p-8 sm:p-10 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl animate-fade-in">
        {/* Glow effect on hover */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur opacity-70 group-hover:opacity-100 transition duration-1000 -z-10" />

        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-inner mb-6 text-indigo-400 group">
            <Shield className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-orange-500 sm:text-4xl">
            StockShield 🛡️
          </h1>
          <p className="mt-3 text-sm text-zinc-400 font-medium">
            Real-Time Inventory Reservation System
          </p>
          <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Concurrency Protection
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={loadingGoogle || loadingGuest}
              className="relative w-full flex items-center justify-center gap-3 px-6 py-3.5 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
            >
              {loadingGoogle ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-3 bg-[#0a0a0c] text-zinc-500 font-medium">Or explore the app</span>
            </div>
          </div>

          <div>
            <button
              onClick={handleGuestContinue}
              disabled={loadingGoogle || loadingGuest}
              className="group relative w-full flex items-center justify-center gap-2 px-6 py-3.5 border border-dashed border-zinc-700/50 hover:border-zinc-500 rounded-xl bg-zinc-950/20 hover:bg-zinc-950/40 text-zinc-300 hover:text-white font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none cursor-pointer"
            >
              {loadingGuest ? (
                <div className="w-5 h-5 border-2 border-zinc-500/20 border-t-zinc-400 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue as Guest</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-zinc-500 leading-normal">
          <p>
            Guests can view all products and test the checkout system with shared demo data.
            Google sign-in isolates your reservation history.
          </p>
        </div>
      </div>
    </div>
  );
}
