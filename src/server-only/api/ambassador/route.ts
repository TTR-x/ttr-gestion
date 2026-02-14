
// This proxy is no longer used. Communication with the ABT app
// is now handled by an external proxy (e.g., Cloudflare Worker)
// for better stability and security management.
// This file is kept empty to avoid breaking any potential old imports, but it does nothing.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    return NextResponse.json({ message: "This internal proxy is deprecated. Use the external proxy." }, { status: 410 });
}
