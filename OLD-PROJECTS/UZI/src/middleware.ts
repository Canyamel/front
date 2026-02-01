import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
//import { NextRequestWithAuth } from 'next-auth/middleware';

/*
 * Match all request paths except for the ones starting with:
 * - api (API routes)
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicon file)
 */
const pathsToExclude =
    /^(?!\/(api|_next\/static|favicon\.ico|manifest|icon|static)).*$/

// set of public pages that needed to be excluded from middleware
const publicPagesSet = new Set<string>(['/error'])

const rootRegex = /^\/($|\?.+|#.+)?$/

export default async function middleware(req: NextRequest) {
    if (
        !pathsToExclude.test(req.nextUrl.pathname) ||
        publicPagesSet.has(req.nextUrl.pathname)
    ) {
        return NextResponse.next()
    }

    console.log('middleware:')
    const token = await getToken({ req })
    console.log('token', token)
    const isAuthenticated = !!token

    console.log('isAuthenticated', isAuthenticated)

    // if user goes to root path '/' then redirect
    // /patients if authenticated
    // /auth-pages/login if unauthenticated

    if (isAuthenticated) {
        if (rootRegex.test(req.nextUrl.pathname)) {
            return NextResponse.redirect(
                new URL('/patients', req.url)
            ) as NextResponse
        }
        // redirects user from '/auth-pages/login' if authenticated
        if (req.nextUrl.pathname.startsWith('/auth-pages/login')) {
            return NextResponse.redirect(
                new URL('/patients', req.url)
            ) as NextResponse
        }
        // redirects user from '/auth-pages/register' if authenticated
        if (req.nextUrl.pathname.startsWith('/auth-pages/register')) {
            return NextResponse.redirect(
                new URL('/patients', req.url)
            ) as NextResponse
        }
    } else {
        if (rootRegex.test(req.nextUrl.pathname)) {
            return NextResponse.redirect(
                new URL('/auth-pages/login', req.url)
            ) as NextResponse
        }

        if (req.nextUrl.pathname.startsWith('/auth-pages/login')) {
            NextResponse.next()
        }

        if (req.nextUrl.pathname.startsWith('/auth-pages/register')) {
            NextResponse.next()
        }

        if (
            !req.nextUrl.pathname.startsWith('/auth-pages/register') &&
            !req.nextUrl.pathname.startsWith('/auth-pages/login')
        ) {
            return NextResponse.redirect(
                new URL('/auth-pages/login', req.url)
            ) as NextResponse
        }
    }
    // This has to be same page option as in AuthOptions
    // const authMiddleware = withAuth({
    //     pages: {
    //         signIn: `/auth-pages/login`,
    //         newUser: "/auth-pages/register",
    //     },
    // });
    // return authMiddleware(req, event);
}
