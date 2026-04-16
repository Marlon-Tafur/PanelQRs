import { NextRequest, NextResponse } from "next/server";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/auth/session";

export async function middleware(request: NextRequest) {
  // iron-session 8 CookieStore.set() overloads differ from Next.js 16 RequestCookies
  // at the type level only — functionally compatible at runtime
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const session = await getIronSession<IronSessionData>(request.cookies, sessionOptions);

  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");
  const isPublicRoute = pathname.startsWith("/r/");

  if (isAuthRoute || isApiRoute || isPublicRoute) {
    return NextResponse.next();
  }

  if (!session.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
