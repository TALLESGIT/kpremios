import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface PaymentRequest {
  user_id: string;
  user_email?: string;
  user_name?: string;
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
    const { user_id, user_email, user_name }: PaymentRequest = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
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

    // Valor mensal do VIP (suporta ambos os nomes)
    const vipMonthlyPrice = parseFloat(
      Deno.env.get('VIP_MONTHLY_PRICE') || 
      Deno.env.get('PREÇO_VIP_MENSAL') || 
      '5.00'
    );
    
    // URL do app (suporta ambos os nomes)
    const appUrl = Deno.env.get('VITE_APP_URL') || 
                   Deno.env.get('URL_do_aplicativo_VITE') || 
                   Deno.env.get('URL_SUPABASE')?.replace('/functions/v1', '') ||
                   'https://www.zkoficial.com.br';
    
    // URL do Supabase (suporta ambos os nomes)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 
                       Deno.env.get('URL_SUPABASE') || 
                       'https://bukigyhhgrtgryklabjg.supabase.co';
    
    // Criar pagamento PIX diretamente no Mercado Pago
    const paymentData = {
      transaction_amount: vipMonthlyPrice,
      description: 'Assinatura VIP - ZK Prêmios',
      payment_method_id: 'pix',
      payer: {
        email: user_email || undefined,
        first_name: user_name?.split(' ')[0] || undefined,
        last_name: user_name?.split(' ').slice(1).join(' ') || undefined
      },
      external_reference: user_id, // ID do usuário para identificar pagamento
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'ZK Premios VIP'
    };

    // Gerar ID de idempotência único para evitar duplicação
    const idempotencyKey = crypto.randomUUID();
    
    // Chamar API do Mercado Pago para criar pagamento PIX
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'X-Idempotency-Key': idempotencyKey
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

