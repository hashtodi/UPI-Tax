import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "checks";

/**
 * The Vercel Marketplace Upstash integration injects one of two naming
 * schemes depending on the template. Read whichever exists.
 */
function client(): Redis | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[count] Upstash credentials missing, counter disabled");
    return null;
  }
  return new Redis({ url, token });
}

export async function POST() {
  const redis = client();
  if (!redis) return new Response(null, { status: 204 });

  try {
    const total = await redis.incr(KEY);
    return Response.json({ total });
  } catch (error) {
    console.warn("[count] incr failed", error);
    return new Response(null, { status: 204 });
  }
}

export async function GET() {
  const redis = client();
  if (!redis) return new Response(null, { status: 204 });

  try {
    const total = (await redis.get<number>(KEY)) ?? 0;
    return Response.json({ total });
  } catch (error) {
    console.warn("[count] get failed", error);
    return new Response(null, { status: 204 });
  }
}
