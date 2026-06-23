import React from "react";

interface TimerCountDownProps {
  timeLeft: number | null;
  status: string;
  releaseReason: string | null;
}

export default function TimerCountDown({ timeLeft, status, releaseReason }: TimerCountDownProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col justify-center items-center p-6 bg-white/2 rounded-3xl border border-white/5 text-center">
      {status === "PENDING" && timeLeft !== null && (
        <div className="space-y-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Lock Expiration Counter</span>
          <div className="text-5xl font-extrabold text-amber-400 font-mono tracking-wider animate-pulse">
            {formatTime(timeLeft)}
          </div>
          <p className="text-[10px] text-zinc-400 max-w-[200px] leading-tight mx-auto">
            Stock is temporarily blocked from other checkout shoppers. Complete purchase before time runs out.
          </p>
        </div>
      )}

      {status === "CONFIRMED" && (
        <div className="space-y-2">
          <div className="text-4xl">✅</div>
          <h4 className="font-bold text-white text-sm">Purchase Secured!</h4>
          <p className="text-[10px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
            The checkout completed successfully. Reserved stock has been permanently decremented.
          </p>
        </div>
      )}

      {status === "RELEASED" && (
        <div className="space-y-2">
          <div className="text-4xl">❌</div>
          <h4 className="font-bold text-white text-sm">Stock Hold Released</h4>
          <p className="text-[10px] text-zinc-400 max-w-[200px] mx-auto leading-relaxed">
            {releaseReason === "EXPIRED" 
              ? "The 10-minute hold timer expired. Units were returned to available stock." 
              : "The reservation hold was cancelled early by user action."}
          </p>
        </div>
      )}
    </div>
  );
}
