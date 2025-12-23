import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }

  try {
    const { user_id, user_email, user_name, bet_id, pool_id, amount }: PoolPaymentRequest = await req.json();

    if (!user_id || !bet_id || !pool_id) {
      return new Response(
        JSON.stringify({ error: 'user_id, bet_id and pool_id are required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Obter Access Token do Mercado Pago
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!mercadoPagoToken) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não configurada');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Valor fixo do bolão: R$ 2,00
    const poolAmount = amount || 2.00;
    
    // URL do Supabase (suporta ambos os nomes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       Deno.env.get('URL_SUPABASE') || 
                       'https://bukigyhhgrtgryklabjg.supabase.co';
    
    // Criar pagamento PIX diretamente no Mercado Pago
    const paymentData = {
      transaction_amount: poolAmount,
      description: 'Aposta no Bolão - ZK Prêmios',
      payment_method_id: 'pix',
      payer: {
        email: user_email || undefined,
        first_name: user_name?.split(' ')[0] || undefined,
        last_name: user_name?.split(' ').slice(1).join(' ') || undefined
      },
      external_reference: `bet_${bet_id}`, // ID da aposta para identificar pagamento
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'ZK Premios Bola'
    };

    // Chamar API do Mercado Pago para criar pagamento PIX
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`
      },
      body: JSON.stringify(paymentData)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Erro na API do Mercado Pago:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create PIX payment',
          details: errorData 
        }),
        { 
          status: mpResponse.status, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const mpData = await mpResponse.json();
    
    // Verificar se o pagamento foi criado e tem dados do PIX
    if (!mpData.id || !mpData.point_of_interaction?.transaction_data) {
      return new Response(
        JSON.stringify({ error: 'No PIX payment data received' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const pixData = mpData.point_of_interaction.transaction_data;

    // Atualizar aposta com payment_id
    const supabaseClient = Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      ? await import('https://esm.sh/@supabase/supabase-js@2')
        .then(m => m.createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!))
      : null;

    if (supabaseClient) {
      await supabaseClient
        .from('pool_bets')
        .update({ payment_id: mpData.id.toString() })
        .eq('id', bet_id);
    }

    return new Response(
      JSON.stringify({
        payment_id: mpData.id,
        qr_code: pixData.qr_code_base64 || null, // QR Code em base64
        qr_code_text: pixData.qr_code || null, // Código PIX copia-e-cola
        ticket_url: pixData.ticket_url || null, // URL alternativa (se disponível)
        status: mpData.status,
        transaction_amount: mpData.transaction_amount
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        }
      }
    );

  } catch (error: any) {
    console.error('Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});

