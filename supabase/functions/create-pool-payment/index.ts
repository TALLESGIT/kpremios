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
  // Log inicial para garantir que a função está sendo chamada
  console.log('=== create-pool-payment INICIADA ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));
  
  // Tratar requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request - retornando 204');
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
    console.error('Method not allowed:', req.method);
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
    console.log('Iniciando processamento da requisição POST');
    let requestBody: PoolPaymentRequest;
    try {
      console.log('Fazendo parse do JSON do body...');
      requestBody = await req.json();
      console.log('Body parseado com sucesso:', JSON.stringify(requestBody, null, 2));
    } catch (jsonError: any) {
      console.error('❌ ERRO ao fazer parse do JSON:', jsonError);
      console.error('Erro message:', jsonError.message);
      console.error('Erro stack:', jsonError.stack);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          message: jsonError.message 
        }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const { user_id, user_email, user_name, bet_id, pool_id, amount } = requestBody;
    console.log('Dados extraídos:', { user_id, bet_id, pool_id, amount });

    if (!user_id || !bet_id || !pool_id) {
      console.error('❌ Campos obrigatórios faltando:', { user_id: !!user_id, bet_id: !!bet_id, pool_id: !!pool_id });
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
    console.log('Verificando MERCADO_PAGO_ACCESS_TOKEN...');
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!mercadoPagoToken) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurada');
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
    console.log('✅ Token do Mercado Pago encontrado (primeiros 10 chars):', mercadoPagoToken.substring(0, 10) + '...');

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

    // Gerar ID de idempotência único para evitar duplicação
    const idempotencyKey = crypto.randomUUID();
    console.log('🔑 Idempotency Key gerado:', idempotencyKey);
    
    // Chamar API do Mercado Pago para criar pagamento PIX
    console.log('📞 Chamando API do Mercado Pago...');
    console.log('Payment data:', JSON.stringify(paymentData, null, 2));
    
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    });

    console.log('📥 Resposta do Mercado Pago recebida');
    console.log('Status:', mpResponse.status);
    console.log('Status Text:', mpResponse.statusText);
    console.log('OK?', mpResponse.ok);

    if (!mpResponse.ok) {
      let errorData: any;
      try {
        errorData = await mpResponse.json();
      } catch {
        errorData = await mpResponse.text();
      }
      
      console.error('Erro na API do Mercado Pago:');
      console.error('Status:', mpResponse.status);
      console.error('Status Text:', mpResponse.statusText);
      console.error('Response:', JSON.stringify(errorData, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create PIX payment',
          message: errorData?.message || errorData?.error || 'Erro ao criar pagamento no Mercado Pago',
          details: errorData,
          status: mpResponse.status
        }),
        { 
          status: mpResponse.status >= 400 && mpResponse.status < 600 ? mpResponse.status : 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    let mpData: any;
    try {
      mpData = await mpResponse.json();
    } catch (jsonError: any) {
      console.error('Erro ao fazer parse da resposta do Mercado Pago:', jsonError);
      const responseText = await mpResponse.text();
      console.error('Resposta em texto:', responseText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Mercado Pago response',
          message: jsonError.message,
          rawResponse: responseText.substring(0, 500) // Limitar tamanho
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
    
    // Verificar se o pagamento foi criado e tem dados do PIX
    if (!mpData.id || !mpData.point_of_interaction?.transaction_data) {
      console.error('Resposta do Mercado Pago sem dados PIX:', JSON.stringify(mpData, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'No PIX payment data received',
          message: 'O pagamento foi criado mas não contém dados do PIX',
          receivedData: mpData
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

    const pixData = mpData.point_of_interaction.transaction_data;

    // Atualizar aposta com payment_id (opcional - não crítico se falhar)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('URL_SUPABASE') || '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabaseClient
          .from('pool_bets')
          .update({ payment_id: mpData.id.toString() })
          .eq('id', bet_id);
      }
    } catch (updateError) {
      // Não falhar o pagamento se não conseguir atualizar o payment_id
      console.warn('Aviso: Não foi possível atualizar payment_id na aposta:', updateError);
    }

    console.log('✅ Pagamento criado com sucesso!');
    console.log('Payment ID:', mpData.id);
    console.log('Status:', mpData.status);
    
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
    console.error('❌❌❌ ERRO CRÍTICO na Edge Function ❌❌❌');
    console.error('Tipo do erro:', error?.constructor?.name || typeof error);
    console.error('Mensagem:', error?.message || 'Sem mensagem');
    console.error('Stack trace:', error?.stack || 'Sem stack trace');
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('Error toString:', error?.toString());
    console.error('=== FIM DO ERRO ===');
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Erro desconhecido',
        details: error?.toString() || 'Erro sem detalhes',
        stack: import.meta.env.DEV ? error?.stack : undefined
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

