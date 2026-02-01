import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
//import { NextRequestWithAuth } from 'next-auth/middleware';

/*
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 */
const pathsToExclude = /^(?!\/(api|_next\/static|favicon\.ico|manifest|icon|static)).*$/;

// set of public pages that needed to be excluded from middleware
const publicPagesSet = new Set<string>(["/error"]);

const rootRegex = /^\/($|\?.+|#.+)?$/;

export default async function middleware(req: NextRequest) {
    if (!pathsToExclude.test(req.nextUrl.pathname) || publicPagesSet.has(req.nextUrl.pathname)) {
        return NextResponse.next();
    }

    const token = await getToken({ req });
    const isAuthenticated = !!token;

    if (isAuthenticated) {
        if (rootRegex.test(req.nextUrl.pathname)) {
            return NextResponse.redirect(new URL("/patients", req.url));
        }
        if (req.nextUrl.pathname.startsWith("/auth-pages/login")) {
            return NextResponse.redirect(new URL("/patients", req.url));
        }
        if (req.nextUrl.pathname.startsWith("/auth-pages/register")) {
            return NextResponse.redirect(new URL("/patients", req.url));
        }
    } else {
        if (rootRegex.test(req.nextUrl.pathname)) {
            return NextResponse.redirect(new URL("/auth-pages/login", req.url));
        }
        if (req.nextUrl.pathname.startsWith("/auth-pages/login")) {
            return NextResponse.next();
        }
        if (req.nextUrl.pathname.startsWith("/auth-pages/register")) {
            return NextResponse.next();
        }
        if (
            !req.nextUrl.pathname.startsWith("/auth-pages/") &&
            !req.nextUrl.pathname.startsWith("/auth-pages/login")
        ) {
            return NextResponse.redirect(new URL("/auth-pages/login", req.url));
        }
    }
}
