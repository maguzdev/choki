import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";

function copySessionCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login" || pathname.startsWith("/login/");

  if (!user) {
    if (isLoginRoute) return response;

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return copySessionCookies(response, NextResponse.redirect(loginUrl));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("type, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return copySessionCookies(response, NextResponse.redirect(loginUrl));
  }

  const destination = profile.type === "PARENT" ? "/admin" : "/";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (
    isLoginRoute ||
    (profile.type === "CHILD" && isAdminRoute) ||
    (profile.type === "PARENT" && !isAdminRoute)
  ) {
    const destinationUrl = request.nextUrl.clone();
    destinationUrl.pathname = destination;
    destinationUrl.search = "";
    return copySessionCookies(response, NextResponse.redirect(destinationUrl));
  }

  return response;
}
