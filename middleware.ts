import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes only accessible to trainers — students are redirected to /dashboard
const TRAINER_ONLY_PREFIXES = [
  "/dashboard/students",
  "/dashboard/routines",
  "/dashboard/calendar",
  "/dashboard/exercises",
  "/admin",
];

// Routes only accessible to students — trainers are redirected to /dashboard
const STUDENT_ONLY_PREFIXES = [
  "/dashboard/my-sessions",
];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API routes and webhooks — never redirect, let the route handler deal with auth
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // Public routes
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/auth");

  if (isPublic) {
    if (user && pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  // Protected routes — must be authenticated
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Role-based access control — only fetch profile for role-gated routes
  const isTrainerRoute = TRAINER_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const isStudentRoute = STUDENT_ONLY_PREFIXES.some((p) => pathname.startsWith(p));

  if (isTrainerRoute || isStudentRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;

    if (isTrainerRoute && role !== "trainer") {
      // Student trying to access a trainer-only page
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isStudentRoute && role !== "student") {
      // Trainer trying to access a student-only page
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|.*\\.png$).*)"],
};
