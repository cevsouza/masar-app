'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  HardHat,
  AlertCircle,
  Pencil,
  Ban,
  RotateCcw,
  X,
} from 'lucide-react';

interface Trabalhador {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  funcao: string | null;
  tipoVinculo: string;
  empresa: string | null;
  telefone: string | null;
  dataAdmissao: string | null;
  observacoes: string | null;
  ativo: boolean;
}

const FORM_VAZIO = {
  nome: '',
  cpf: '',
  rg: '',
  funcao: '',
  tipoVinculo: 'PROPRIO',
  empresa: '',
  telefone: '',
  dataAdmissao: '',
  observacoes: '',
};

const VINCULO_META: Record<string, { label: string; cls: string }> = {
  PROPRIO: { label: 'Próprio', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  TERCEIRO: { label: 'Terceiro', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  EMPREITEIRO: { label: 'Empreiteiro', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

const inputCls =
  'w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/80 transition';
const labelCls = 'text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold';

export default function TrabalhadoresPage() {
  const [trabalhadores, setTrabalhadores] = useState<Trabalhador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof FORM_VAZIO>(FORM_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchTrabalhadores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trabalhadores?incluirInativos=${incluirInativos}`);
      if (res.ok) setTrabalhadores(await res.json());
    } catch (err) {
      console.error('Erro ao buscar trabalhadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrabalhadores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluirInativos]);

  const abrirNovo = () => {
    setEditId(null);
    setForm(FORM_VAZIO);
    setError('');
    setIsModalOpen(true);
  };

  const abrirEdicao = (t: Trabalhador) => {
    setEditId(t.id);
    setForm({
      nome: t.nome ?? '',
      cpf: t.cpf ?? '',
      rg: t.rg ?? '',
      funcao: t.funcao ?? '',
      tipoVinculo: t.tipoVinculo ?? 'PROPRIO',
      empresa: t.empresa ?? '',
      telefone: t.telefone ?? '',
      dataAdmissao: t.dataAdmissao ? t.dataAdmissao.split('T')[0] : '',
      observacoes: t.observacoes ?? '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const setField = (campo: keyof typeof FORM_VAZIO, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editId ? `/api/trabalhadores/${editId}` : '/api/trabalhadores';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchTrabalhadores();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar trabalhador');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInativar = async (t: Trabalhador) => {
    if (!confirm(`Inativar o trabalhador "${t.nome}"? O histórico de ponto é preservado.`)) return;
    try {
      const res = await fetch(`/api/trabalhadores/${t.id}`, { method: 'DELETE' });
      if (res.ok) fetchTrabalhadores();
      else alert('Erro ao inativar trabalhador');
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleReativar = async (t: Trabalhador) => {
    try {
      const res = await fetch(`/api/trabalhadores/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, dataAdmissao: t.dataAdmissao ? t.dataAdmissao.split('T')[0] : '', ativo: true }),
      });
      if (res.ok) fetchTrabalhadores();
      else alert('Erro ao reativar trabalhador');
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  const filtrados = trabalhadores.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.nome.toLowerCase().includes(q) ||
      (t.cpf || '').toLowerCase().includes(q) ||
      (t.funcao || '').toLowerCase().includes(q) ||
      (t.empresa || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <HardHat className="text-amber-400" size={24} /> Cadastro de Trabalhadores
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Base de trabalhadores da obra (próprios, terceiros e empreiteiros) — fundação do módulo de Segurança do Trabalho.
          </p>
        </div>

        <button
          onClick={abrirNovo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/10"
        >
          <Plus size={14} />
          Cadastrar Trabalhador
        </button>
      </div>

      {/* Busca + filtro */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
        <div className="md:col-span-9 relative">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, CPF, função ou empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0a0d18] border border-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500/80 transition"
          />
        </div>
        <label className="md:col-span-3 flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none px-2">
          <input
            type="checkbox"
            checked={incluirInativos}
            onChange={(e) => setIncluirInativos(e.target.checked)}
            className="accent-blue-500"
          />
          Mostrar inativos
        </label>
      </div>

      {/* Lista */}
      <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={28} />
            <p className="text-xs text-slate-500 font-mono">Carregando trabalhadores...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-slate-400">Nenhum trabalhador encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Cadastre seu primeiro trabalhador clicando em &quot;Cadastrar Trabalhador&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Trabalhador</th>
                  <th className="py-3 px-4">CPF</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4">Vínculo</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                {filtrados.map((t) => {
                  const vm = VINCULO_META[t.tipoVinculo] || VINCULO_META.PROPRIO;
                  return (
                    <tr key={t.id} className={`hover:bg-slate-900/20 transition-all ${!t.ativo ? 'opacity-50' : ''}`}>
                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        <div className="flex items-center gap-2">
                          {t.nome}
                          {!t.ativo && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[8px] uppercase font-bold">Inativo</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px]">{t.cpf || '—'}</td>
                      <td className="py-3.5 px-4">{t.funcao || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${vm.cls}`}>{vm.label}</span>
                      </td>
                      <td className="py-3.5 px-4">{t.empresa || '—'}</td>
                      <td className="py-3.5 px-4">{t.telefone || '—'}</td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => abrirEdicao(t)}
                          className="p-1.5 hover:bg-slate-900 text-blue-400 hover:text-blue-300 rounded-lg transition cursor-pointer inline-block"
                          title="Editar trabalhador"
                        >
                          <Pencil size={13} />
                        </button>
                        {t.ativo ? (
                          <button
                            onClick={() => handleInativar(t)}
                            className="p-1.5 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer inline-block"
                            title="Inativar trabalhador"
                          >
                            <Ban size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReativar(t)}
                            className="p-1.5 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 rounded-lg transition cursor-pointer inline-block"
                            title="Reativar trabalhador"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal cadastro/edição */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-2xl rounded-2xl border border-slate-900 shadow-2xl p-6 relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X size={16} />
            </button>

            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-5 border-b border-slate-900 pb-2 flex items-center gap-2">
              <HardHat size={16} className="text-amber-400" />
              {editId ? 'Editar Trabalhador' : 'Cadastrar Novo Trabalhador'}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div>
                <label className={labelCls}>Nome completo *</label>
                <input type="text" required value={form.nome} onChange={(e) => setField('nome', e.target.value)} placeholder="Ex: João da Silva" className={inputCls} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>CPF</label>
                  <input type="text" value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} className={inputCls} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className={labelCls}>RG</label>
                  <input type="text" value={form.rg} onChange={(e) => setField('rg', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Função</label>
                  <input type="text" value={form.funcao} onChange={(e) => setField('funcao', e.target.value)} className={inputCls} placeholder="Pedreiro, servente, mestre..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Vínculo</label>
                  <select value={form.tipoVinculo} onChange={(e) => setField('tipoVinculo', e.target.value)} className={inputCls}>
                    <option value="PROPRIO">Próprio</option>
                    <option value="TERCEIRO">Terceiro</option>
                    <option value="EMPREITEIRO">Empreiteiro</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Empresa (se terceiro/empreiteiro)</label>
                  <input type="text" value={form.empresa} onChange={(e) => setField('empresa', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Telefone</label>
                  <input type="text" value={form.telefone} onChange={(e) => setField('telefone', e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Data de admissão</label>
                  <input type="date" value={form.dataAdmissao} onChange={(e) => setField('dataAdmissao', e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} className={inputCls} placeholder="Anotações, restrições, histórico..." />
              </div>

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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/10 disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                  {editId ? 'Salvar Alterações' : 'Cadastrar Trabalhador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
