import React from "react";
import Link from "next/link";

interface ReservationActionProps {
  status: string;
  isSubmitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ReservationAction({
  status,
  isSubmitting,
  onConfirm,
  onCancel,
}: ReservationActionProps) {
  if (status === "PENDING") {
    return (
      <div className="flex gap-4 pt-6 border-t border-white/5 w-full">
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-secondary flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
        >
          Cancel Hold
        </button>
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="btn-primary flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? "Processing..." : "Confirm Purchase"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-4 pt-6 border-t border-white/5 w-full">
      <Link
        href="/"
        className="w-full btn-secondary py-3 rounded-xl font-bold text-sm text-center block"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
