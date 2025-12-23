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
      '10.00'
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
    
    // Criar preferência de pagamento no Mercado Pago
    const preferenceData = {
      items: [
        {
          title: 'Assinatura VIP - ZK Prêmios',
          description: 'Acesso VIP mensal com benefícios exclusivos',
          quantity: 1,
          unit_price: vipMonthlyPrice,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email: user_email || undefined,
        name: user_name || undefined
      },
      back_urls: {
        success: `${appUrl}/vip/success`,
        failure: `${appUrl}/vip/failure`,
        pending: `${appUrl}/vip/pending`
      },
      auto_return: 'approved',
      external_reference: user_id, // ID do usuário para identificar pagamento
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: 'ZK Premios VIP'
    };

    // Chamar API do Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      console.error('Erro na API do Mercado Pago:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create payment preference',
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
    
    if (!mpData.init_point) {
      return new Response(
        JSON.stringify({ error: 'No payment link received' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        payment_link: mpData.init_point,
        preference_id: mpData.id,
        sandbox_init_point: mpData.sandbox_init_point
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

