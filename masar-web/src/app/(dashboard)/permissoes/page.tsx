'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, Check, X, Info } from 'lucide-react';

const ROLE_LABEL: Record<string, string> = {
  FINANCEIRO: 'Financeiro',
  ENGENHARIA: 'Engenharia',
  COMERCIAL: 'Comercial',
};

export default function PermissoesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/permissoes').then((r) => r.json());
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const toggle = async (role: string, modulo: string, atual: boolean) => {
    const key = `${role}:${modulo}`;
    setSalvando(key);
    // otimista
    setData((d: any) => ({
      ...d,
      papeis: d.papeis.map((p: any) => (p.role === role ? { ...p, modulos: { ...p.modulos, [modulo]: !atual } } : p)),
    }));
    try {
      const res = await fetch('/api/permissoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, modulo, permitido: !atual }),
      });
      if (!res.ok) { await carregar(); alert('Não foi possível salvar.'); }
    } catch {
      await carregar();
    } finally {
      setSalvando(null);
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-[#060814] text-slate-100">
      <div className="border-b border-slate-900 pb-5">
        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Sistema · Acessos</span>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
          <ShieldCheck className="text-indigo-400" size={24} /> Permissões por Módulo
        </h1>
        <p className="text-xs text-slate-400 mt-1">Defina quais módulos cada papel enxerga. O <strong className="text-slate-300">Administrador</strong> sempre tem acesso a tudo.</p>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-xs text-indigo-200/80">
        <Info size={16} className="shrink-0 mt-0.5 text-indigo-400" />
        <span>Isto controla o acesso às <strong>telas e ao menu</strong>. As alterações valem no <strong>próximo login</strong> do usuário. As rotas de dados (API) mantêm a checagem por papel como camada extra de segurança.</span>
      </div>

      {loading || !data ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin text-indigo-500 mx-auto" size={26} /></div>
      ) : (
        <div className="bg-slate-950/20 border border-slate-900 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-900 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Módulo</th>
                  {data.papeis.map((p: any) => (
                    <th key={p.role} className="py-3 px-4 text-center">{ROLE_LABEL[p.role] || p.role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {data.modulos.map((m: any) => (
                  <tr key={m.chave} className="hover:bg-slate-900/20">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200">{m.label}</span>
                      <span className="block text-[10px] text-slate-500">{m.descricao}</span>
                    </td>
                    {data.papeis.map((p: any) => {
                      const on = !!p.modulos[m.chave];
                      const key = `${p.role}:${m.chave}`;
                      return (
                        <td key={p.role} className="py-3 px-4 text-center">
                          <button
                            onClick={() => toggle(p.role, m.chave, on)}
                            disabled={salvando === key}
                            className={`inline-flex items-center justify-center w-9 h-6 rounded-full transition cursor-pointer disabled:opacity-50 ${on ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-slate-800/60 border border-slate-700'}`}
                            title={on ? 'Permitido — clique para bloquear' : 'Bloqueado — clique para permitir'}
                          >
                            {salvando === key ? <Loader2 size={12} className="animate-spin text-slate-400" /> : on ? <Check size={13} className="text-emerald-400" /> : <X size={13} className="text-slate-500" />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
