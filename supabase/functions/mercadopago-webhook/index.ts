import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  // Tratar requisições OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const webhookData = await req.json();
    const { type, data } = webhookData;

    // Mercado Pago envia webhook com type = "payment" e data.id = payment_id
    if (type !== 'payment' || !data?.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook data' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const paymentId = data.id;
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

    // Buscar detalhes do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`
      }
    });

    if (!mpResponse.ok) {
      console.error('Erro ao buscar pagamento no Mercado Pago:', await mpResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch payment details' }),
        {
          status: mpResponse.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const paymentDetails = await mpResponse.json();
    const paymentStatus = paymentDetails.status;
    const externalReference = paymentDetails.external_reference;

    if (!externalReference) {
      console.error('external_reference não encontrado no pagamento');
      return new Response(
        JSON.stringify({ error: 'Invalid payment reference' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('URL_SUPABASE') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variáveis do Supabase não configuradas');
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se é pagamento de bolão (external_reference começa com "bet_")
    if (externalReference.startsWith('bet_')) {
      const betId = externalReference.replace('bet_', '');

      if (paymentStatus === 'approved') {
        // Atualizar aposta como aprovada
        const { error: updateError } = await supabase
          .from('pool_bets')
          .update({
            payment_status: 'approved',
            updated_at: new Date().toISOString()
          })
          .eq('id', betId)
          .eq('payment_id', paymentId.toString());

        if (updateError) {
          console.error('Erro ao atualizar aposta:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update bet' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        // Atualizar estatísticas do bolão
        const { data: betData } = await supabase
          .from('pool_bets')
          .select('pool_id')
          .eq('id', betId)
          .single();

        if (betData?.pool_id) {
          await supabase.rpc('update_pool_stats', { p_pool_id: betData.pool_id });
        }

        console.log(`✅ Pagamento de bolão aprovado: bet_id=${betId}, payment_id=${paymentId}`);

        // Enviar notificação WhatsApp no bolão
        try {
          const { data: betWithUser } = await supabase
            .from('pool_bets')
            .select(`
              amount,
              predicted_score,
              match_pools (title),
              users (name, whatsapp)
            `)
            .eq('id', betId)
            .single();

          if (betWithUser?.users?.whatsapp) {
            await sendWhatsAppNotification(
              betWithUser.users.whatsapp,
              'pool_bet_approved',
              {
                name: betWithUser.users.name,
                matchTitle: betWithUser.match_pools?.title || 'Bolão',
                predictedScore: betWithUser.predicted_score,
                amount: betWithUser.amount
              }
            );
          }
        } catch (waError) {
          console.error('Erro ao enviar WhatsApp do bolão:', waError);
        }
      } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
        // Atualizar aposta como falhada
        await supabase
          .from('pool_bets')
          .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', betId)
          .eq('payment_id', paymentId.toString());
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'pool_bet',
          bet_id: betId,
          status: paymentStatus
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    } else {
      // É pagamento VIP (external_reference é o user_id)
      const userId = externalReference;

      if (paymentStatus === 'approved') {
        // Ativar VIP por 30 dias
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        // Criar/atualizar assinatura VIP
        const { error: subscriptionError } = await supabase
          .from('vip_subscriptions')
          .upsert({
            user_id: userId,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            payment_id: paymentId.toString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (subscriptionError) {
          console.error('Erro ao criar assinatura VIP:', subscriptionError);
        }

        // Atualizar usuário como VIP
        const { error: userError } = await supabase
          .from('users')
          .update({
            is_vip: true,
            vip_type: 'paid',
            vip_expires_at: expiresAt.toISOString(),
            vip_payment_id: paymentId.toString(),
            vip_since: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (userError) {
          console.error('Erro ao atualizar usuário VIP:', userError);
          return new Response(
            JSON.stringify({ error: 'Failed to update user VIP status' }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              }
            }
          );
        }

        console.log(`✅ Pagamento VIP aprovado: user_id=${userId}, payment_id=${paymentId}`);

        // Enviar notificação WhatsApp VIP
        try {
          const { data: user } = await supabase
            .from('users')
            .select('name, whatsapp')
            .eq('id', userId)
            .single();

          if (user?.whatsapp) {
            await sendWhatsAppNotification(
              user.whatsapp,
              'vip_approved',
              {
                name: user.name
              }
            );
          }
        } catch (waError) {
          console.error('Erro ao enviar WhatsApp VIP:', waError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          type: 'vip_subscription',
          user_id: userId,
          status: paymentStatus
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

  } catch (error: any) {
    console.error('Erro no webhook:', error);
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

// Helper Functions para WhatsApp
async function sendWhatsAppNotification(to: string, type: string, data: any) {
  const apiUrl = Deno.env.get('VITE_EVOLUTION_API_URL');
  const apiKey = Deno.env.get('VITE_EVOLUTION_API_KEY');
  const instanceName = Deno.env.get('VITE_EVOLUTION_INSTANCE_NAME');
  const baseUrl = Deno.env.get('VITE_APP_URL') || 'https://www.zkoficial.com.br';

  if (!apiUrl || !apiKey || !instanceName) {
    console.warn('Configuração da Evolution API incompleta nas variáveis de ambiente');
    return;
  }

  let text = '';
  const name = data.name || 'usuário';

  if (type === 'vip_approved') {
    text = `💎 *VIP ATIVADO!*

Olá ${name}!

🎉 Parabéns! Sua assinatura VIP na ZK Oficial foi aprovada e já está ativa!

✨ *Seus novos benefícios:*
• Mensagens destacadas no chat
• Áudio liberado nas lives
• Slow mode reduzido
• Cores personalizadas
• Acesso ao grupo exclusivo

🚀 Aproveite agora: ${baseUrl}

Bem-vindo ao clube VIP! 💎`;
  } else if (type === 'pool_bet_approved') {
    text = `⚽ *APOSTA CONFIRMADA!*

Olá ${name}!

✅ Sua aposta no bolão foi confirmada com sucesso!

⚽ *Jogo:* ${data.matchTitle}
📊 *Seu palpite:* ${data.predictedScore}

💰 Valor da aposta: R$ ${parseFloat(data.amount || '0').toFixed(2)}

Boa sorte no bolão! ⚽🍀`;
  }

  if (!text) return;

  try {
    // Formatar número (55xxxxxxxxxxx)
    const cleanPhone = to.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: text
      })
    });

    const result = await response.json();
    console.log(`WhatsApp sent: ${type} to ${formattedPhone}, success: ${response.ok}`);
    return result;
  } catch (e) {
    console.error('Falha ao enviar mensagem WhatsApp:', e);
  }
}

