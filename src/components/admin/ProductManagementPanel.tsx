import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit2, Trash2, Package, 
  X, Save, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product } from '../../types';
import toast from 'react-hot-toast';

export function ProductManagementPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    category: 'jersey' as Product['category'],
    image_url: '',
    stock: '',
    description: '',
    is_available: true,
    weight_g: '500',
    width_cm: '20',
    height_cm: '5',
    length_cm: '30',
    is_free_shipping: false,
    free_shipping_states: [] as string[],
    gallery_urls: [] as string[],
    available_sizes: [] as string[],
    target_audience: 'unissex' as Product['target_audience']
  });

  const BRAZILIAN_STATES = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      price: '',
      category: 'jersey',
      image_url: '',
      stock: '',
      description: '',
      is_available: true,
      weight_g: '500',
      width_cm: '20',
      height_cm: '5',
      length_cm: '30',
      is_free_shipping: false,
      free_shipping_states: [] as string[],
      gallery_urls: [] as string[],
      available_sizes: [] as string[],
      target_audience: 'unissex'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      price: product.price.toString(),
      category: product.category,
      image_url: product.image_url,
      stock: product.stock.toString(),
      description: product.description || '',
      is_available: product.is_available,
      weight_g: (product.weight_g || 500).toString(),
      width_cm: (product.width_cm || 20).toString(),
      height_cm: (product.height_cm || 5).toString(),
      length_cm: (product.length_cm || 30).toString(),
      is_free_shipping: product.is_free_shipping || false,
      free_shipping_states: product.free_shipping_states || [],
      gallery_urls: product.gallery_urls || [],
      available_sizes: product.available_sizes || [],
      target_audience: product.target_audience || 'unissex'
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProducts(products.filter(p => p.id !== id));
      toast.success('Produto excluído com sucesso');
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const productData = {
      name: formData.name,
      brand: formData.brand,
      price: parseFloat(formData.price),
      category: formData.category,
      image_url: formData.image_url,
      stock: parseInt(formData.stock),
      description: formData.description,
      is_available: formData.is_available,
      weight_g: parseInt(formData.weight_g),
      width_cm: parseInt(formData.width_cm),
      height_cm: parseInt(formData.height_cm),
      length_cm: parseInt(formData.length_cm),
      is_free_shipping: formData.is_free_shipping,
      free_shipping_states: formData.free_shipping_states,
      gallery_urls: formData.gallery_urls,
      available_sizes: formData.available_sizes,
      target_audience: formData.target_audience
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Produto atualizado!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast.success('Produto criado!');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header com Busca e Botão Novo */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 transition-all font-medium"
          />
        </div>

        <button
          onClick={handleOpenAddModal}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-5 h-5" />
          Adicionar Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando estoque...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-[2.5rem] border border-dashed border-white/10">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-bold">Nenhum produto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <motion.div
              layout
              key={product.id}
              className="bg-slate-900/50 border border-white/5 rounded-[2rem] overflow-hidden group hover:border-blue-500/30 transition-all"
            >
              <div className="aspect-square relative overflow-hidden">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => handleOpenEditModal(product)}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-blue-600 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(product.id)}
                    className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10">
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">{product.brand}</p>
                <h4 className="text-white font-bold text-sm mb-4 line-clamp-2 uppercase italic">{product.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-black text-emerald-400 italic">R$ {product.price.toFixed(2)}</span>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${product.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    Estoque: {product.stock}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-600/30">
                      <Package className="w-6 h-6 text-blue-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tight">
                      {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                    </h3>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Nome do Produto</label>
                      <input
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="Ex: Manto Home 24/25"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Marca/Brand</label>
                      <input
                        required
                        type="text"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="Ex: Adidas"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Preço (R$)</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Categoria</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all appearance-none [&>option]:bg-slate-900 [&>option]:text-white"
                      >
                        <option value="jersey">Mantos</option>
                        <option value="exclusive">ZK Exclusivo</option>
                        <option value="casual">Casual</option>
                        <option value="accessories">Acessórios</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Gênero / Público</label>
                      <select
                        value={formData.target_audience}
                        onChange={(e) => setFormData({ ...formData, target_audience: e.target.value as any })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all appearance-none [&>option]:bg-slate-900 [&>option]:text-white"
                      >
                        <option value="unissex">Unissex</option>
                        <option value="masculino">Masculino</option>
                        <option value="feminino">Feminino</option>
                        <option value="kids">Kids (Infantil)</option>
                      </select>
                    </div>

                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Tamanhos Disponíveis (Separe por vírgula)</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={formData.available_sizes.join(', ')}
                          onChange={(e) => {
                            const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                            setFormData({ ...formData, available_sizes: sizes });
                          }}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                          placeholder="Ex: P, M, G, GG ou 2, 4, 6, 8"
                        />
                        <div className="flex flex-wrap gap-2 px-4">
                          {['P', 'M', 'G', 'GG', 'XG'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                const current = formData.available_sizes;
                                const next = current.includes(s) 
                                  ? current.filter(x => x !== s)
                                  : [...current, s];
                                setFormData({ ...formData, available_sizes: next });
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${formData.available_sizes.includes(s) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                            >
                              {s}
                            </button>
                          ))}
                          <div className="w-[1px] h-4 bg-white/10 self-center mx-2" />
                          {['2', '4', '6', '8', '10', '12', '14'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => {
                                const current = formData.available_sizes;
                                const next = current.includes(s) 
                                  ? current.filter(x => x !== s)
                                  : [...current, s];
                                setFormData({ ...formData, available_sizes: next });
                              }}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${formData.available_sizes.includes(s) ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/10 text-slate-500'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">URL da Imagem</label>
                        <input
                          required
                          type="url"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                          placeholder="https://..."
                        />
                      </div>
                      {formData.image_url && (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                          <img 
                            src={formData.image_url} 
                            alt="Preview" 
                            className="w-full h-full object-contain"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Estoque Inicial</label>
                      <input
                        required
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="0"
                      />
                    </div>

                    {/* Galeria de Imagens */}
                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-4">Galeria de Imagens (Opcional)</label>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, gallery_urls: [...formData.gallery_urls, ''] })}
                          className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Foto
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {formData.gallery_urls.map((url, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex-1 space-y-2">
                              <input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                  const newUrls = [...formData.gallery_urls];
                                  newUrls[index] = e.target.value;
                                  setFormData({ ...formData, gallery_urls: newUrls });
                                }}
                                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-medium focus:outline-none focus:border-blue-500/50 transition-all text-xs"
                                placeholder="https://... (Foto adicional)"
                              />
                              {url && (
                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                  <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newUrls = formData.gallery_urls.filter((_, i) => i !== index);
                                setFormData({ ...formData, gallery_urls: newUrls });
                              }}
                              className="self-start p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Seção de Logística */}
                  <div className="space-y-6 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <Package className="w-5 h-5 text-blue-500" />
                      <h4 className="text-sm font-black text-white uppercase italic tracking-wider">Logística & Frete</h4>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Peso (g)</label>
                        <input
                          type="number"
                          value={formData.weight_g}
                          onChange={(e) => setFormData({ ...formData, weight_g: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Largura (cm)</label>
                        <input
                          type="number"
                          value={formData.width_cm}
                          onChange={(e) => setFormData({ ...formData, width_cm: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Altura (cm)</label>
                        <input
                          type="number"
                          value={formData.height_cm}
                          onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Comprim. (cm)</label>
                        <input
                          type="number"
                          value={formData.length_cm}
                          onChange={(e) => setFormData({ ...formData, length_cm: e.target.value })}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-6 p-6 bg-blue-600/5 rounded-3xl border border-blue-500/10">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-white font-bold text-sm">Frete Grátis Global</p>
                          <p className="text-[10px] text-slate-400">Ativa o frete grátis para todo o Brasil sem exceções.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, is_free_shipping: !formData.is_free_shipping })}
                          className={`w-14 h-8 rounded-full transition-all relative ${formData.is_free_shipping ? 'bg-emerald-500' : 'bg-slate-700'}`}
                        >
                          <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.is_free_shipping ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      {!formData.is_free_shipping && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Frete Grátis por Estado (UF)</p>
                          <div className="flex flex-wrap gap-2">
                            {BRAZILIAN_STATES.map(state => (
                              <button
                                key={state}
                                type="button"
                                onClick={() => {
                                  const current = formData.free_shipping_states;
                                  const next = current.includes(state)
                                    ? current.filter(s => s !== state)
                                    : [...current, state];
                                  setFormData({ ...formData, free_shipping_states: next });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                  formData.free_shipping_states.includes(state)
                                    ? 'bg-blue-600 border-blue-400 text-white'
                                    : 'bg-white/5 border-white/10 text-slate-500'
                                }`}
                              >
                                {state}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-8">
                    <button
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
