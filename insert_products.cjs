const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler o arquivo .env manualmente para pegar as chaves
const envPath = path.resolve('c:/Users/Talle/Desktop/zkOfical', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [first, ...rest] = line.split('=');
  if (first && rest.length > 0) {
    const key = first.trim();
    const value = rest.join('=').trim();
    env[key] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase keys in .env');
  console.log('Keys found:', Object.keys(env));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const products = [
  {
    name: 'Manto "Papai Ama, Papai Cuida"',
    brand: 'ZK EXCLUSIVE',
    price: 199.90,
    category: 'exclusive',
    image_url: '/mockups/masculino.png',
    stock: 100,
    is_available: true,
    is_coming_soon: true,
    target_audience: 'masculino',
    available_sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    description: 'Edição limitada "Papai Ama, Papai Cuida". O manto que celebra a paternidade e a paixão pelo futebol com estilo e irreverência.'
  },
  {
    name: 'Manto "Mamãe Ama, Mamãe Cuida"',
    brand: 'ZK EXCLUSIVE',
    price: 199.90,
    category: 'exclusive',
    image_url: '/mockups/feminino.png',
    stock: 100,
    is_available: true,
    is_coming_soon: true,
    target_audience: 'feminino',
    available_sizes: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG'],
    description: 'Edição limitada "Mamãe Ama, Mamãe Cuida". Design exclusivo feminino com corte acinturado e arte de alta definição.'
  },
  {
    name: 'Camisa Kids "Propósito"',
    brand: 'ZK KIDS',
    price: 89.90,
    category: 'casual',
    image_url: '/mockups/kids_camisa.png',
    stock: 100,
    is_available: true,
    is_coming_soon: true,
    target_audience: 'kids',
    available_sizes: ['2', '4', '6', '8', '10', '12', '14'],
    description: 'Camisa streetwear infantil com a frase: "O Propósito é Maior que o Processo". Algodão premium para o máximo conforto.'
  },
  {
    name: 'Regata Kids "Predestinado"',
    brand: 'ZK KIDS',
    price: 79.90,
    category: 'casual',
    image_url: '/mockups/kids_regata.png',
    stock: 100,
    is_available: true,
    is_coming_soon: true,
    target_audience: 'kids',
    available_sizes: ['2', '4', '6', '8', '10', '12', '14'],
    description: 'Regata streetwear infantil com a frase: "Predestinado a Vencer". Estilo livre para os pequenos craques.'
  },
  {
    name: 'Boné ZK Premium Kids',
    brand: 'ZK KIDS',
    price: 99.90,
    category: 'casual',
    image_url: '/mockups/kids_bone.png',
    stock: 100,
    is_available: true,
    is_coming_soon: true,
    target_audience: 'kids',
    available_sizes: ['TAM. ÚNICO'],
    description: 'Boné exclusivo ZK Kids. Ajuste perfeito e design moderno para completar o visual streetwear.'
  }
];

async function insertOrUpdate() {
  console.log('Connecting to:', supabaseUrl);
  for (const product of products) {
    // Check if exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', product.name)
      .single();

    if (existing) {
      console.log(`Product "${product.name}" already exists, updating...`);
      const { error } = await supabase
        .from('products')
        .update(product)
        .eq('id', existing.id);
      if (error) console.error(`Error updating ${product.name}:`, error.message);
    } else {
      console.log(`Inserting product "${product.name}"...`);
      const { error } = await supabase
        .from('products')
        .insert([product]);
      if (error) console.error(`Error inserting ${product.name}:`, error.message);
    }
  }
  console.log('Operation finished.');
}

insertOrUpdate();
