import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  room: string;
  role: "admin" | "reporter" | "viewer";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({ error: "LiveKit credentials not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: TokenRequest = await req.json();

    if (!body.room || !body.role) {
      return new Response(
        JSON.stringify({ error: "room and role are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["admin", "reporter", "viewer"].includes(body.role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, reporter, or viewer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `${body.role}-${Date.now()}`,
    });

    at.addGrant({
      room: body.room,
      roomJoin: true,
      canPublish: body.role === "admin" || body.role === "reporter",
      canSubscribe: true,
      canPublishData: body.role === "admin" || body.role === "reporter",
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({ token }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

