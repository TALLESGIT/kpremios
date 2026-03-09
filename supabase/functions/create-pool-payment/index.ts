import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PoolPaymentRequest {
  user_id: string;
  user_email?: string;
  user_name?: string;
  bet_id: string;
  pool_id: string;
  amount: number;
}

Deno.serve(async (req: Request) => {
  // Tratar requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody: PoolPaymentRequest = await req.json();
    const { user_id, user_email, user_name, bet_id, amount } = requestBody;

    if (!user_id || !bet_id) {
      return new Response(
        JSON.stringify({ error: 'user_id and bet_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mercadoPagoToken) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valor fixo do bolão: R$ 5,00
    const poolAmount = amount || 5.00;

    // URL do Supabase para o webhook
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://bukigyhhgrtgryklabjg.supabase.co';

    const paymentData = {
      transaction_amount: poolAmount,
      description: 'Aposta no Bolão - ZK Prêmios',
      payment_method_id: 'pix',
      payer: {
        email: user_email || 'usuario@zkpremios.com',
        first_name: user_name?.split(' ')[0] || 'Usuário',
        last_name: user_name?.split(' ').slice(1).join(' ') || 'ZK'
      },
      external_reference: `bet_${bet_id}`,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'ZK Premios Bola'
    };

    const idempotencyKey = crypto.randomUUID();

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create PIX payment',
          message: mpData.message || mpData.error || 'Erro no Mercado Pago',
          details: mpData
        }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pixData = mpData.point_of_interaction?.transaction_data;
    if (!pixData) {
      return new Response(
        JSON.stringify({ error: 'No PIX payment data received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar aposta com payment_id
    try {
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseServiceKey) {
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseClient
          .from('pool_bets')
          .update({ payment_id: mpData.id.toString() })
          .eq('id', bet_id);
      }
    } catch (e) {
      console.warn('Erro ao atualizar payment_id:', e);
    }

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        qr_code: pixData.qr_code_base64,
        qr_code_text: pixData.qr_code,
        status: mpData.status,
        transaction_amount: mpData.transaction_amount
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
