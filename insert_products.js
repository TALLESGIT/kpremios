const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler o arquivo .env manualmente para pegar as chaves
const envPath = path.resolve('c:/Users/Talle/Desktop/zkOfical', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase keys in .env');
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
  console.log('Inserting products...');
  for (const product of products) {
    const { data, error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'name' }); // Assuming 'name' is unique enough or not indexed as unique but we want to avoid dups based on name for now
    
    if (error) {
      console.error(`Error inserting ${product.name}:`, error.message);
    } else {
      console.log(`Inserted/Updated: ${product.name}`);
    }
  }
}

insertOrUpdate();
