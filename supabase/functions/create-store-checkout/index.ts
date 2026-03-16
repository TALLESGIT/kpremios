import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  selectedSize?: string;
}

interface StoreCheckoutRequest {
  user_id: string;
  customer_name: string;
  customer_email: string;
  items: CartItem[];
  shipping_cost: number;
  zip_code: string;
  address_state: string;
  house_number?: string;
  complement?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
}

Deno.serve(async (req: Request) => {
  // 1. Manuseio de Preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  const origin = req.headers.get("origin") || "http://localhost:5173";

  try {
    const { 
      user_id, 
      customer_name, 
      customer_email, 
      items, 
      shipping_cost, 
      zip_code, 
      address_state,
      house_number,
      complement,
      street,
      neighborhood,
      city
    }: StoreCheckoutRequest = await req.json();

    const mercadoPagoToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mercadoPagoToken || !supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const total = subtotal + shipping_cost;

    console.log("Processing checkout for user:", user_id);
    console.log("Payload:", { customer_name, customer_email, total_items: items.length, total });

    // 1. Criar o pedido no Banco de Dados
    const { data: order, error: orderError } = await supabaseClient
      .from("store_orders")
      .insert({
        user_id,
        customer_name,
        customer_email,
        subtotal_amount: subtotal,
        shipping_cost,
        total_amount: total,
        zip_code,
        address_state,
        address_street: street,
        address_number: house_number,
        address_complement: complement,
        address_neighborhood: neighborhood,
        address_city: city,
        status: "pending",
        items_snapshot: items
      })
      .select()
      .single();

    if (orderError) {
      console.error("Database Order Error:", orderError);
      throw orderError;
    }

    console.log("Order created:", order.id);

    // 2. Criar itens do pedido na tabela detalhada
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      selected_size: item.selectedSize
    }));

    const { error: itemsError } = await supabaseClient.from("store_order_items").insert(orderItems);
    if (itemsError) {
      console.error("Database Items Error:", itemsError);
      throw itemsError;
    }

    // 3. Criar Preferência no Mercado Pago (Checkout Pro)
    // Documentação: https://www.mercadopago.com.br/developers/pt/reference/preferences/_checkout_preferences/post
    
    // Limpar o nome para garantir que temos nome e sobrenome
    const nameParts = customer_name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(' ') || "S"; // MP exige sobrenome em algumas validações

    const preferenceData = {
      items: items.map(item => {
        let pictureUrl = item.image_url;
        if (pictureUrl && pictureUrl.startsWith("/")) {
          if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
             pictureUrl = undefined; 
          } else {
             pictureUrl = `${origin.replace(/\/$/, "")}${pictureUrl}`;
          }
        }

        return {
          id: item.id,
          title: `${item.name}${item.selectedSize ? ` (Tam: ${item.selectedSize})` : ''}`,
          unit_price: Number(item.price),
          quantity: Number(item.quantity),
          currency_id: "BRL",
          picture_url: pictureUrl || undefined,
          category_id: "fashion"
        };
      }),
      payer: {
        name: firstName,
        surname: lastName,
        email: customer_email,
        // Omitindo endereço complexo por enquanto para evitar erros de validação de CEP/Número
      },
      shipments: shipping_cost > 0 ? {
        cost: Number(shipping_cost),
        mode: "not_specified"
      } : undefined,
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      back_urls: {
        success: `${origin}/shop/success`,
        failure: `${origin}/shop/cart`,
        pending: `${origin}/shop/pending`
      },
      auto_return: "approved",
      payment_methods: {
        installments: 12,
        excluded_payment_types: [
          { id: "ticket" } 
        ]
      },
      statement_descriptor: "ZK OFICIAL"
    };

    console.log("Creating MP Preference... Token exists:", !!mercadoPagoToken);

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mercadoPagoToken}`
      },
      body: JSON.stringify(preferenceData)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP API Error:", JSON.stringify(mpData));
      // Pegar a causa específica se existir
      const cause = mpData.cause?.[0]?.description || mpData.message || "Erro na API do Mercado Pago";
      throw new Error(cause);
    }

    console.log("MP Preference Created:", mpData.id);

    // 4. Atualizar pedido com o ID da preferência
    await supabaseClient
      .from("store_orders")
      .update({ mercadopago_preference_id: mpData.id })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({ 
        checkout_url: mpData.init_point, 
        order_id: order.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Store Checkout Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro interno no checkout",
        message: error.message
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
