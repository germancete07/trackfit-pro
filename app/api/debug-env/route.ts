import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "UNDEFINED";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "UNDEFINED";
  return NextResponse.json({
    url_length: url.length,
    url_preview: url.slice(0, 40),
    key_length: key.length,
    key_start: key.slice(0, 10),
    key_end: key.slice(-10),
    key_has_non_ascii: key.split("").some(c => c.charCodeAt(0) > 127),
    url_has_non_ascii: url.split("").some(c => c.charCodeAt(0) > 127),
  });
}
