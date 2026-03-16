import { supabase } from '../lib/supabase';
import { Product, ShippingRate } from '../types';

export interface ShippingCalculation {
  cost: number;
  estimatedDays: number;
  isFree: boolean;
  stateCode: string;
  address?: {
    street: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

/**
 * Calcula o frete baseado no estado do usuário e nos produtos do carrinho
 */
export async function calculateShipping(
  stateCode: string,
  productsInCart: Product[]
): Promise<ShippingCalculation> {
  try {
    // 1. Verificar se TODOS os produtos no carrinho têm frete grátis para este estado
    // Regra: Se um produto NÃO tiver frete grátis, o frete base do estado é cobrado.
    // Ou podemos fazer: cobrar o frete do estado se pelo menos um produto exigir frete.
    
    let allFree = true;
    for (const product of productsInCart) {
      const isGlobalFree = product.is_free_shipping;
      const isStateFree = product.free_shipping_states?.includes(stateCode);
      
      if (!isGlobalFree && !isStateFree) {
        allFree = false;
        break;
      }
    }

    if (allFree) {
      return {
        cost: 0,
        estimatedDays: 5, // Valor padrão ou buscar do banco
        isFree: true,
        stateCode
      };
    }

    // 2. Buscar taxa do estado no banco de dados
    const { data, error } = await supabase
      .from('shipping_rates')
      .select('base_cost, estimated_days')
      .eq('state_code', stateCode)
      .single();

    if (error || !data) {
      // Fallback caso o estado não esteja na tabela
      return {
        cost: 35.00,
        estimatedDays: 10,
        isFree: false,
        stateCode
      };
    }

    const rate = data as ShippingRate;

    return {
      cost: Number(rate.base_cost),
      estimatedDays: rate.estimated_days,
      isFree: false,
      stateCode
    };
  } catch (error) {
    console.error('Erro no cálculo de frete:', error);
    return {
      cost: 40.00,
      estimatedDays: 12,
      isFree: false,
      stateCode
    };
  }
}

/**
 * Utilitário para extrair o estado (UF) a partir de um CEP (Simulação ou via API externa)
 * Em uma implementação real, usaríamos a API do ViaCEP ou similar.
 */
export async function getAddressFromZip(cep: string) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();
    if (data.erro) return null;
    return {
      street: data.logradouro,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf
    };
  } catch (error) {
    return null;
  }
}

export async function getStateFromZip(cep: string): Promise<string | null> {
  const address = await getAddressFromZip(cep);
  return address?.state || null;
}
