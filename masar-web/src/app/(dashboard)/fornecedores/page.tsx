'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Loader2,
  Truck,
  AlertCircle,
  Pencil,
  Ban,
  RotateCcw,
  Star,
  MapPin,
  Landmark,
  Handshake,
  X,
} from 'lucide-react';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  ramo: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cep: string | null;
  cidade: string | null;
  estado: string | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipoConta: string | null;
  chavePix: string | null;
  prazoPagamentoDias: number | null;
  prazoEntregaDias: number | null;
  avaliacao: number | null;
  observacoes: string | null;
  ativo: boolean;
}

const FORM_VAZIO = {
  nome: '',
  cnpj: '',
  cpf: '',
  email: '',
  telefone: '',
  ramo: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cep: '',
  cidade: '',
  estado: '',
  banco: '',
  agencia: '',
  conta: '',
  tipoConta: '',
  chavePix: '',
  prazoPagamentoDias: '',
  prazoEntregaDias: '',
  avaliacao: '',
  observacoes: '',
};

const inputCls =
  'w-full bg-[#0a0d18] border border-slate-900 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-blue-500/80 transition';
const labelCls = 'text-[10px] text-slate-400 uppercase tracking-wide block mb-1 font-semibold';

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [incluirInativos, setIncluirInativos] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof FORM_VAZIO>(FORM_VAZIO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/fornecedores?incluirInativos=${incluirInativos}`);
      if (res.ok) setFornecedores(await res.json());
    } catch (err) {
      console.error('Erro ao buscar fornecedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluirInativos]);

  const abrirNovo = () => {
    setEditId(null);
    setForm(FORM_VAZIO);
    setError('');
    setIsModalOpen(true);
  };

  const abrirEdicao = (f: Fornecedor) => {
    setEditId(f.id);
    setForm({
      nome: f.nome ?? '',
      cnpj: f.cnpj ?? '',
      cpf: f.cpf ?? '',
      email: f.email ?? '',
      telefone: f.telefone ?? '',
      ramo: f.ramo ?? '',
      logradouro: f.logradouro ?? '',
      numero: f.numero ?? '',
      bairro: f.bairro ?? '',
      cep: f.cep ?? '',
      cidade: f.cidade ?? '',
      estado: f.estado ?? '',
      banco: f.banco ?? '',
      agencia: f.agencia ?? '',
      conta: f.conta ?? '',
      tipoConta: f.tipoConta ?? '',
      chavePix: f.chavePix ?? '',
      prazoPagamentoDias: f.prazoPagamentoDias != null ? String(f.prazoPagamentoDias) : '',
      prazoEntregaDias: f.prazoEntregaDias != null ? String(f.prazoEntregaDias) : '',
      avaliacao: f.avaliacao != null ? String(f.avaliacao) : '',
      observacoes: f.observacoes ?? '',
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
      const url = editId ? `/api/fornecedores/${editId}` : '/api/fornecedores';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchFornecedores();
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao salvar fornecedor');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInativar = async (f: Fornecedor) => {
    if (!confirm(`Inativar o fornecedor "${f.nome}"? Ele deixa de aparecer nas seleções, mas o histórico é preservado.`))
      return;
    try {
      const res = await fetch(`/api/fornecedores/${f.id}`, { method: 'DELETE' });
      if (res.ok) fetchFornecedores();
      else alert('Erro ao inativar fornecedor');
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  const handleReativar = async (f: Fornecedor) => {
    try {
      const res = await fetch(`/api/fornecedores/${f.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, ativo: true }),
      });
      if (res.ok) fetchFornecedores();
      else alert('Erro ao reativar fornecedor');
    } catch {
      alert('Erro de conexão com o servidor.');
    }
  };

  const filtrados = fornecedores.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.nome.toLowerCase().includes(q) ||
      (f.cnpj || '').toLowerCase().includes(q) ||
      (f.cpf || '').toLowerCase().includes(q) ||
      (f.ramo || '').toLowerCase().includes(q) ||
      (f.cidade || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Truck className="text-blue-400" size={24} /> Cadastro de Fornecedores
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Base de fornecedores da construtora: dados de contato, endereço, dados bancários e condições comerciais.
          </p>
        </div>

        <button
          onClick={abrirNovo}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-blue-600/10"
        >
          <Plus size={14} />
          Cadastrar Fornecedor
        </button>
      </div>

      {/* Busca + filtro */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
        <div className="md:col-span-9 relative">
          <Search className="absolute left-3.5 top-3 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ/CPF, ramo ou cidade..."
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
            <p className="text-xs text-slate-500 font-mono">Carregando fornecedores...</p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <AlertCircle className="text-slate-600 mb-3" size={32} />
            <h3 className="text-sm font-bold text-slate-400">Nenhum fornecedor encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Cadastre seu primeiro fornecedor clicando em &quot;Cadastrar Fornecedor&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Fornecedor</th>
                  <th className="py-3 px-4">CNPJ / CPF</th>
                  <th className="py-3 px-4">Ramo</th>
                  <th className="py-3 px-4">Cidade/UF</th>
                  <th className="py-3 px-4">Contato</th>
                  <th className="py-3 px-4 text-center">Prazo Pgto</th>
                  <th className="py-3 px-4 text-center">Avaliação</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60 text-slate-300">
                {filtrados.map((f) => (
                  <tr key={f.id} className={`hover:bg-slate-900/20 transition-all ${!f.ativo ? 'opacity-50' : ''}`}>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        {f.nome}
                        {!f.ativo && (
                          <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[8px] uppercase font-bold">
                            Inativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">{f.cnpj || f.cpf || '—'}</td>
                    <td className="py-3.5 px-4">{f.ramo || '—'}</td>
                    <td className="py-3.5 px-4">{f.cidade ? `${f.cidade}${f.estado ? '/' + f.estado : ''}` : '—'}</td>
                    <td className="py-3.5 px-4">{f.telefone || f.email || '—'}</td>
                    <td className="py-3.5 px-4 text-center">
                      {f.prazoPagamentoDias != null ? `${f.prazoPagamentoDias}d` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {f.avaliacao != null ? (
                        <span className="inline-flex items-center gap-0.5 text-amber-400 font-bold">
                          <Star size={11} className="fill-amber-400" /> {f.avaliacao}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => abrirEdicao(f)}
                        className="p-1.5 hover:bg-slate-900 text-blue-400 hover:text-blue-300 rounded-lg transition cursor-pointer inline-block"
                        title="Editar fornecedor"
                      >
                        <Pencil size={13} />
                      </button>
                      {f.ativo ? (
                        <button
                          onClick={() => handleInativar(f)}
                          className="p-1.5 hover:bg-slate-900 text-rose-400 hover:text-rose-300 rounded-lg transition cursor-pointer inline-block"
                          title="Inativar fornecedor"
                        >
                          <Ban size={13} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReativar(f)}
                          className="p-1.5 hover:bg-slate-900 text-emerald-400 hover:text-emerald-300 rounded-lg transition cursor-pointer inline-block"
                          title="Reativar fornecedor"
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
              <Truck size={16} className="text-blue-400" />
              {editId ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Dados básicos */}
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Dados básicos
                </legend>
                <div>
                  <label className={labelCls}>Nome / Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={form.nome}
                    onChange={(e) => setField('nome', e.target.value)}
                    placeholder="Ex: Depósito de Materiais Silva Ltda"
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>CNPJ</label>
                    <input type="text" value={form.cnpj} onChange={(e) => setField('cnpj', e.target.value)} className={inputCls} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <label className={labelCls}>CPF</label>
                    <input type="text" value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} className={inputCls} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <label className={labelCls}>Ramo</label>
                    <input type="text" value={form.ramo} onChange={(e) => setField('ramo', e.target.value)} className={inputCls} placeholder="Material, Mão de obra, Serviço..." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Telefone</label>
                    <input type="text" value={form.telefone} onChange={(e) => setField('telefone', e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className={labelCls}>E-mail</label>
                    <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} className={inputCls} placeholder="contato@fornecedor.com" />
                  </div>
                </div>
              </fieldset>

              {/* Endereço */}
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-500" /> Endereço
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3">
                    <label className={labelCls}>Logradouro</label>
                    <input type="text" value={form.logradouro} onChange={(e) => setField('logradouro', e.target.value)} className={inputCls} placeholder="Rua / Avenida" />
                  </div>
                  <div>
                    <label className={labelCls}>Número</label>
                    <input type="text" value={form.numero} onChange={(e) => setField('numero', e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>Bairro</label>
                    <input type="text" value={form.bairro} onChange={(e) => setField('bairro', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>CEP</label>
                    <input type="text" value={form.cep} onChange={(e) => setField('cep', e.target.value)} className={inputCls} placeholder="00000-000" />
                  </div>
                  <div>
                    <label className={labelCls}>Cidade</label>
                    <input type="text" value={form.cidade} onChange={(e) => setField('cidade', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>UF</label>
                    <input type="text" maxLength={2} value={form.estado} onChange={(e) => setField('estado', e.target.value.toUpperCase())} className={inputCls} placeholder="SP" />
                  </div>
                </div>
              </fieldset>

              {/* Dados bancários */}
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Landmark size={12} className="text-slate-500" /> Dados bancários
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>Banco</label>
                    <input type="text" value={form.banco} onChange={(e) => setField('banco', e.target.value)} className={inputCls} placeholder="Ex: 341 / Itaú" />
                  </div>
                  <div>
                    <label className={labelCls}>Agência</label>
                    <input type="text" value={form.agencia} onChange={(e) => setField('agencia', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Conta</label>
                    <input type="text" value={form.conta} onChange={(e) => setField('conta', e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tipo</label>
                    <select value={form.tipoConta} onChange={(e) => setField('tipoConta', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      <option value="CORRENTE">Corrente</option>
                      <option value="POUPANCA">Poupança</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Chave PIX</label>
                  <input type="text" value={form.chavePix} onChange={(e) => setField('chavePix', e.target.value)} className={inputCls} placeholder="CNPJ, e-mail, telefone ou chave aleatória" />
                </div>
              </fieldset>

              {/* Condições comerciais */}
              <fieldset className="space-y-4">
                <legend className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Handshake size={12} className="text-slate-500" /> Condições comerciais
                </legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Prazo de pagamento (dias)</label>
                    <input type="number" min={0} value={form.prazoPagamentoDias} onChange={(e) => setField('prazoPagamentoDias', e.target.value)} className={inputCls} placeholder="Ex: 30" />
                  </div>
                  <div>
                    <label className={labelCls}>Prazo de entrega (dias)</label>
                    <input type="number" min={0} value={form.prazoEntregaDias} onChange={(e) => setField('prazoEntregaDias', e.target.value)} className={inputCls} placeholder="Ex: 7" />
                  </div>
                  <div>
                    <label className={labelCls}>Avaliação (1 a 5)</label>
                    <select value={form.avaliacao} onChange={(e) => setField('avaliacao', e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      <option value="1">1 - Ruim</option>
                      <option value="2">2 - Regular</option>
                      <option value="3">3 - Bom</option>
                      <option value="4">4 - Muito bom</option>
                      <option value="5">5 - Excelente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Observações</label>
                  <textarea
                    rows={2}
                    value={form.observacoes}
                    onChange={(e) => setField('observacoes', e.target.value)}
                    className={inputCls}
                    placeholder="Anotações sobre condições, histórico, restrições..."
                  />
                </div>
              </fieldset>

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
                  {editId ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
