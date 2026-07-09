'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Loader2, 
  Settings, 
  Tag, 
  Layers, 
  AlertCircle, 
  Sparkles,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';

interface Insumo {
  id: string;
  nome: string;
  unidadeMedida: string;
  categoria: string;
  createdAt: string;
}

// Helper para classificação MCMV
function getInsumoMCMVType(nome: string, categoria: string): 'FIXO' | 'VARIAVEL' {
  const nomeLower = nome.toLowerCase();
  const catLower = categoria.toLowerCase();
  
  const isFixoKeywords = [
    'engenheiro', 'mestre', 'equipe', 'canteiro', 'tapume', 'refeitório',
    'água', 'luz', 'energia', 'internet', 'segurança', 'vigia', 'andaime', 'betoneira',
    'container', 'sanitário', 'alvará', 'crea', 'art', 'registro', 'cartório', 'seguro', 'taxa'
  ];
  
  const isFixo = isFixoKeywords.some(keyword => nomeLower.includes(keyword)) || catLower === 'taxa';
  return isFixo ? 'FIXO' : 'VARIAVEL';
}

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TODAS');
  const [selectedClassification, setSelectedClassification] = useState('TODAS');

  // Form states para criação
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [unidadeMedida, setUnidadeMedida] = useState('SC');
  const [categoria, setCategoria] = useState('MATERIAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Populando semente
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  // Carregar insumos
  const fetchInsumos = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/insumos');
      if (res.ok) {
        const data = await res.json();
        setInsumos(data);
      }
    } catch (err) {
      console.error('Erro ao buscar insumos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  // Handler para criar insumo
  const handleCreateInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, unidadeMedida, categoria })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNome('');
        setUnidadeMedida('SC');
        setCategoria('MATERIAL');
        fetchInsumos();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao cadastrar insumo');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler para excluir insumo
  const handleDeleteInsumo = async (id: string) => {
    if (!confirm('Deseja realmente excluir este insumo do catálogo padrão?')) return;

    try {
      const res = await fetch(`/api/insumos?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        fetchInsumos();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir insumo');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    }
  };

  // Handler para semear catálogo padrão
  const handlePopulateDefault = async () => {
    setIsSeeding(true);
    setSeedMessage('');
    try {
      const res = await fetch('/api/insumos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ populateDefault: true })
      });
      const data = await res.json();
      if (res.ok) {
        setSeedMessage(data.message);
        fetchInsumos();
        setTimeout(() => setSeedMessage(''), 5000);
      } else {
        alert(data.error || 'Erro ao popular sementes');
      }
    } catch (err) {
      alert('Erro de conexão com o servidor.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Filtragem local dos insumos
  const filteredInsumos = insumos.filter(insumo => {
    const matchesSearch = insumo.nome.toLowerCase().includes(search.toLowerCase()) || 
                          insumo.unidadeMedida.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = selectedCategory === 'TODAS' || insumo.categoria === selectedCategory;
    
    const classification = getInsumoMCMVType(insumo.nome, insumo.categoria);
    const matchesClassification = selectedClassification === 'TODAS' || classification === selectedClassification;

    return matchesSearch && matchesCategory && matchesClassification;
  });

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BookOpen className="text-indigo-400" size={24} /> Catálogo de Insumos Padrão
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie o catálogo global de materiais, mão de obra, equipamentos e taxas da construtora.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handlePopulateDefault}
            disabled={isSeeding}
            className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
          >
            {isSeeding ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Popular Catálogo Padrão (MCMV)
          </button>
          
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/10"
          >
            <Plus size={14} />
            Cadastrar Insumo
          </button>
        </div>
      </div>

      {seedMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Sparkles size={14} /> {seedMessage}
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome do insumo ou unidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/80 transition"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODAS">Categorias: Todas</option>
            <option value="MATERIAL">Materiais</option>
            <option value="MAO_DE_OBRA">Mão de Obra / Serviços</option>
            <option value="EQUIPAMENTO">Equipamentos</option>
            <option value="TAXA">Taxas / Administrativo</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODAS">Classificação MCMV: Todas</option>
            <option value="FIXO">Custos Fixos (Cronograma)</option>
            <option value="VARIAVEL">Custos Variáveis (Produção)</option>
          </select>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-indigo-500" size={28} />
            <p className="text-xs text-slate-500 font-mono">Carregando catálogo de insumos...</p>
          </div>
        ) : filteredInsumos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-slate-400">Nenhum insumo encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Use os filtros acima para refinar a busca ou clique em &quot;Popular Catálogo Padrão (MCMV)&quot; para preencher o sistema.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Insumo</th>
                  <th className="py-3 px-4">Unidade</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Classificação MCMV</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                {filteredInsumos.map((insumo) => {
                  const mcmvType = getInsumoMCMVType(insumo.nome, insumo.categoria);
                  return (
                    <tr key={insumo.id} className="hover:bg-slate-900/20 transition-all">
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {insumo.nome}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {insumo.unidadeMedida}
                      </td>
                      <td className="py-3.5 px-4">
                        {insumo.categoria === 'MATERIAL' && (
                          <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-bold text-[9px] uppercase">
                            Material
                          </span>
                        )}
                        {insumo.categoria === 'MAO_DE_OBRA' && (
                          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-bold text-[9px] uppercase">
                            Mão de Obra
                          </span>
                        )}
                        {insumo.categoria === 'EQUIPAMENTO' && (
                          <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded font-bold text-[9px] uppercase">
                            Equipamento
                          </span>
                        )}
                        {insumo.categoria === 'TAXA' && (
                          <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded font-bold text-[9px] uppercase">
                            Taxa / ADM
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {mcmvType === 'FIXO' ? (
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded font-bold text-[9px] uppercase">
                            Custo Fixo (Cronograma)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded font-bold text-[9px] uppercase">
                            Custo Variável (Produção)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDeleteInsumo(insumo.id)}
                          className="p-1.5 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer inline-block"
                          title="Excluir insumo padrão"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CADASTRO INSUMO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-md rounded-2xl border border-slate-900 shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <Plus size={16} className="rotate-45" />
            </button>
            
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-4 border-b border-slate-900 pb-2 flex items-center gap-2">
              <Settings size={16} className="text-indigo-400 animate-spin" style={{ animationDuration: '6s' }} /> Cadastrar Novo Insumo Padrão
            </h4>
            
            <form onSubmit={handleCreateInsumo} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Nome do Insumo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cimento CP-II (Saco 50kg), Mão de Obra de Pintura"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Unidade de Medida *</label>
                  <select
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value)}
                    className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="SC">SC (Saco / Pacote / Galão)</option>
                    <option value="KG">KG (Quilograma / Tonelada)</option>
                    <option value="M3">M3 (Metro Cúbico / Volume)</option>
                    <option value="HORA">HORA (Hora de Serviço/Máquina)</option>
                    <option value="EMPREITADA">EMPREITADA (Mão de Obra / Serviço / Taxas)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold">Categoria *</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none"
                  >
                    <option value="MATERIAL">Material</option>
                    <option value="MAO_DE_OBRA">Mão de Obra</option>
                    <option value="EQUIPAMENTO">Equipamento</option>
                    <option value="TAXA">Taxa / Custos Fixos</option>
                  </select>
                </div>
              </div>

              {nome.trim().length > 0 && (
                <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wide block font-semibold mb-1">
                    Classificação MCMV Automática
                  </span>
                  {getInsumoMCMVType(nome, categoria) === 'FIXO' ? (
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded font-bold text-[9px] uppercase">
                      Custo Fixo (Cronograma)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded font-bold text-[9px] uppercase">
                      Custo Variável (Produção)
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-350 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  Cadastrar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
