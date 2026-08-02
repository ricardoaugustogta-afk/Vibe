import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const imageBase64: string | undefined = body.image;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "missing_image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Lightweight client-side-style heuristic: if no external moderation API key
    // is configured, we do a no-op pass (allow). This keeps the app functional
    // within the free-tier constraint. When a Google Cloud Vision key is added
    // as the secret VISION_API_KEY, real SafeSearch detection runs.
    const visionKey = Deno.env.get("VISION_API_KEY");

    if (!visionKey) {
      return new Response(
        JSON.stringify({ unsafe: false, method: "pass-through" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: cleanBase64 },
              features: [{ type: "SAFE_SEARCH_DETECTION" }],
            },
          ],
        }),
      },
    );

    if (!visionRes.ok) {
      return new Response(
        JSON.stringify({ unsafe: false, method: "vision_error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const visionData = await visionRes.json();
    const annotations = visionData?.responses?.[0]?.safeSearchAnnotation;

    if (!annotations) {
      return new Response(
        JSON.stringify({ unsafe: false, method: "no_annotation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const isUnsafe =
      annotations.adult === "VERY_LIKELY" || annotations.adult === "LIKELY" ||
      annotations.violence === "VERY_LIKELY" || annotations.violence === "LIKELY" ||
      annotations.racy === "VERY_LIKELY";

    return new Response(
      JSON.stringify({ unsafe: isUnsafe, method: "vision" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, unsafe: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
