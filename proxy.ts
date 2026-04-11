import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

const protectedPrefixes = [
  "/dashboard",
  "/checkin",
  "/memories",
  "/patterns",
  "/review",
  "/settings",
];

export const proxy = auth((request) => {
  const isProtected = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!request.auth?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/checkin/:path*",
    "/memories/:path*",
    "/patterns/:path*",
    "/review/:path*",
    "/settings/:path*",
  ],
};
