"use server";

import { cookies } from "next/headers";

/**
 * Sets a guest access cookie valid for 24 hours
 */
export async function continueAsGuest() {
  const cookieStore = await cookies();
  cookieStore.set("stockshield_guest", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
    sameSite: "lax",
  });
}

/**
 * Clears the guest access cookie
 */
export async function clearGuestSession() {
  const cookieStore = await cookies();
  cookieStore.delete("stockshield_guest");
}
