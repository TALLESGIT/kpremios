import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRequest {
  room?: string;
  roomName?: string;
  role?: "admin" | "reporter" | "viewer";
  participantName?: string;
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

    // Aceitar ambos os formatos: {room, role} ou {roomName, participantName}
    const room = body.room || body.roomName;
    const role = body.role || (body.participantName ? "admin" : "viewer");

    if (!room) {
      return new Response(
        JSON.stringify({ error: "room or roomName is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!["admin", "reporter", "viewer"].includes(role)) {
      return new Response(
        JSON.stringify({ error: "Invalid role. Must be admin, reporter, or viewer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Usar participantName se fornecido, senão gerar identity baseado em role
    const identity = body.participantName || `${role}-${Date.now()}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: identity,
    });

    at.addGrant({
      room: room,
      roomJoin: true,
      canPublish: role === "admin" || role === "reporter",
      canSubscribe: true,
      canPublishData: role === "admin" || role === "reporter",
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

