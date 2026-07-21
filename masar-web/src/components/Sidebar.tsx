'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  BadgeDollarSign,
  Building2,
  AlertTriangle,
  LogOut,
  Settings,
  KeyRound,
  Sun,
  Moon,
  X,
  Loader2,
  Smartphone,
  PiggyBank,
  Users,
  Bell,
  ShoppingBag,
  ShoppingCart,
  ClipboardList,
  Home,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  ChevronDown,
  Sliders,
  CalendarClock,
  HardHat,
  BookOpen,
  Truck,
  ShieldCheck,
  FolderLock,
  Percent,
  PackageCheck,
  Activity,
  Target,
  Sparkles,
  Lock,
  ClipboardCheck,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moduloDaRota } from '@/lib/permissoes';
import { useEffect, useState, useRef } from 'react';
import ModalNovoLancamento from './ModalNovoLancamento';

// Item fixo no topo: a visão geral (Painel do Sócio). Só ADMIN acessa a home.
const INICIO_ITEM = { name: 'Início', href: '/', icon: LayoutDashboard, roles: ['ADMIN'] };

// Navegação agrupada por intenção: Gestão (dinheiro/visão), Operação (tocar o
// negócio) e Configurações. Cada grupo abre sozinho quando você está numa tela dele.
const NAV_GROUPS = [
  {
    id: 'gestao',
    label: 'Gestão',
    icon: Sliders,
    items: [
      { name: 'Assistente de Novo Projeto', href: '/gestao/onboarding', icon: Rocket, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Consultor de Eficiência', href: '/gestao/recomendacoes', icon: Sparkles, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Completude do Cadastro', href: '/gestao/completude', icon: ClipboardCheck, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Painel Executivo', href: '/gestao/painel', icon: LayoutDashboard, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Painel de Eficiência', href: '/gestao/eficiencia-diaria', icon: Target, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Indicadores', href: '/gestao/indicadores', icon: Sliders, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Desempenho (EVM)', href: '/gestao/evm', icon: Activity, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Linha de Base', href: '/gestao/linha-base', icon: Lock, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Eficiência de Material', href: '/gestao/eficiencia', icon: PackageCheck, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Necessidade de Materiais', href: '/gestao/materiais', icon: ShoppingCart, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Financeiro', href: '/financeiro', icon: TrendingUp, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Fluxo Projetado', href: '/gestao/fluxo-projetado', icon: CalendarClock, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Sócios', href: '/socios/caixa', icon: PiggyBank, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Prontidão Caixa (MCMV)', href: '/gestao/prontidao-caixa', icon: ShieldCheck, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Agenda', href: '/agenda', icon: CalendarClock, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Relatórios', href: '/relatorios', icon: FileText, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
    ],
  },
  {
    id: 'operacao',
    label: 'Operação',
    icon: HardHat,
    items: [
      { name: 'Empreendimentos', href: '/empreendimentos', icon: KanbanSquare, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Obras', href: '/casas', icon: Home, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Importar Planilha', href: '/importacao', icon: FileSpreadsheet, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Vendas', href: '/comercial', icon: BadgeDollarSign, roles: ['ADMIN', 'FINANCEIRO', 'COMERCIAL'] },
      { name: 'Compras', href: '/suprimentos', icon: ShoppingBag, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Fornecedores', href: '/fornecedores', icon: Truck, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Ponto', href: '/canteiro/ponto', icon: Smartphone, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'Diário de Obra', href: '/canteiro/diario', icon: BookOpen, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
    ],
  },
  {
    id: 'sst',
    label: 'Segurança',
    icon: ShieldCheck,
    items: [
      { name: 'Trabalhadores', href: '/trabalhadores', icon: HardHat, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
      { name: 'DDS · Acidentes · NR', href: '/seguranca/registros', icon: ClipboardList, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA'] },
    ],
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: FileText,
    items: [
      { name: 'Notas de Entrada', href: '/fiscal/notas', icon: FileText, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Impostos (RET)', href: '/fiscal/impostos', icon: Percent, roles: ['ADMIN', 'FINANCEIRO'] },
      { name: 'Cofre de Documentos', href: '/fiscal/documentos', icon: FolderLock, roles: ['ADMIN', 'FINANCEIRO'] },
    ],
  },
  {
    id: 'config',
    label: 'Configurações',
    icon: Settings,
    items: [
      { name: 'Insumos', href: '/insumos', icon: ClipboardList, roles: ['ADMIN', 'FINANCEIRO', 'ENGENHARIA', 'COMERCIAL'] },
      { name: 'Parâmetros MCMV', href: '/configuracoes/mcmv', icon: ShieldCheck, roles: ['ADMIN'] },
      { name: 'Equipe', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
      { name: 'Permissões', href: '/permissoes', icon: ShieldCheck, roles: ['ADMIN'] },
    ],
  },
];

interface SidebarProps {
  /** Nome da construtora do usuário logado. */
  empresaNome?: string;
  /** Só a empresa raiz exibe o selo árabe — é marca da Masar, não do produto. */
  exibeSeloMasar?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

// exibeSeloMasar cai para FALSE por omissão: marca alheia se carimba por
// engano, nunca por falta. O padrão anterior era `true` e vinha de quando havia
// uma instância só, onde a Masar era o único caso possível.
export default function Sidebar({ isOpen, onClose, empresaNome = 'Masar Empreendimentos', exibeSeloMasar = false }: SidebarProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const [hasGlosa, setHasGlosa] = useState(false);
  const [user, setUser] = useState({ nome: 'Carregando...', email: '', role: 'COMERCIAL' });
  const [modulos, setModulos] = useState<string[] | null>(null);

  // Theme state
  const [theme, setTheme] = useState('dark');

  // Dropdown/Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLancamentoModalOpen, setIsLancamentoModalOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Notifications states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Check if there are glosed measurements to show a pulsing warning icon in the sidebar
  useEffect(() => {
    fetch('/api/medicoes/status')
      .then(res => res.json())
      .then(data => {
        setHasGlosa(data.hasGlosa);
      })
      .catch(err => console.error(err));

    // Get dynamic user details
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser({ nome: data.nome, email: data.email, role: data.role || 'COMERCIAL' });
          if (Array.isArray(data.modulos)) setModulos(data.modulos);
        }
      })
      .catch(err => console.error(err));

    // Get saved theme preference
    const savedTheme = localStorage.getItem('masar_theme') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Dynamic notifications poller
    const fetchNotifications = () => {
      fetch('/api/notificacoes')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setNotifications(data);
            setUnreadCount(data.filter((n: any) => !n.lida).length);
          }
        })
        .catch(err => console.error(err));
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  // Abre automaticamente o grupo que contém a rota atual.
  useEffect(() => {
    const grupoAtivo = NAV_GROUPS.find(g => g.items.some(item => pathname === item.href));
    if (grupoAtivo) {
      setOpenGroups(prev => ({ ...prev, [grupoAtivo.id]: true }));
    }
  }, [pathname]);

  // Close profile and notification menu on clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('masar_theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('Preencha todos os campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('As novas senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsChangingPwd(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao alterar senha');

      setPwdSuccess('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPwdSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setIsChangingPwd(false);
    }
  };

  const getUserInitials = (name: string) => {
    if (!name || name === 'Carregando...') return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  const role = user.role || 'COMERCIAL';

  // Visibilidade por módulo (Fase 5.2): além do papel, respeita a matriz.
  // Rotas fora de módulo (ex.: /insumos, /usuarios) seguem só o filtro de papel.
  const podeVerItem = (href: string) => {
    if (role === 'ADMIN') return true;
    const mod = moduloDaRota(href);
    if (!mod) return true;
    if (!modulos) return true; // sessão antiga / ainda carregando: não esconde
    return modulos.includes(mod);
  };

  return (
    <>
      {/* Backdrop de fundo no mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-45 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside className={cn(
        "w-64 bg-[#0f1422] border-r border-[#1e293b] flex flex-col h-screen fixed left-0 top-0 bottom-0 z-50 text-slate-300 transition-transform duration-300 ease-in-out md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#1e293b] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl text-white shadow-lg"
              style={{ backgroundColor: 'var(--cor-primaria, #2563eb)' }}
            >
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-wide block font-sans truncate max-w-[150px]">
                  {empresaNome}
                </span>
                {exibeSeloMasar && (
                  <span className="text-xs font-serif text-slate-400 font-bold" dir="rtl" lang="ar" title="مسار - Trajetória">
                    مسار
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
            title="Fechar Menu"
          >
            <X size={16} />
          </button>
        </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">

        {/* Início (visão geral) */}
        {INICIO_ITEM.roles.includes(role) && (() => {
          const isActive = pathname === INICIO_ITEM.href;
          const Icon = INICIO_ITEM.icon;
          return (
            <Link
              href={INICIO_ITEM.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium cursor-pointer",
                isActive
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              )}
            >
              <Icon size={18} className={cn("transition-colors duration-200", isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200")} />
              <span>{INICIO_ITEM.name}</span>
            </Link>
          );
        })()}

        {/* Grupos de navegação */}
        {NAV_GROUPS.map((group) => {
          const allowed = group.items.filter(item => item.roles.includes(role) && podeVerItem(item.href));
          if (allowed.length === 0) return null;

          const isSubActive = allowed.some(item => pathname === item.href);
          const isOpenGroup = !!openGroups[group.id];
          const GroupIcon = group.icon;

          return (
            <div key={group.id} className="space-y-1.5 pt-2">
              <button
                type="button"
                onClick={() => setOpenGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium cursor-pointer",
                  isSubActive && !isOpenGroup
                    ? "bg-slate-800/30 text-slate-300 border border-slate-850"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-3">
                  <GroupIcon size={18} className={cn("transition-colors duration-200", isSubActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200")} />
                  <span>{group.label}</span>
                </div>
                <ChevronDown size={14} className={cn("transition-transform duration-200 text-slate-500 group-hover:text-slate-400", isOpenGroup ? "rotate-180 text-blue-400" : "")} />
              </button>

              {isOpenGroup && (
                <div className="pl-4 space-y-1 border-l border-slate-805/50 ml-6">
                  {allowed.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg transition-all duration-150 group text-xs font-medium cursor-pointer",
                          isActive
                            ? "bg-blue-600/10 text-blue-400 border border-blue-500/15"
                            : "text-slate-450 hover:bg-slate-800/30 hover:text-slate-350"
                        )}
                      >
                        <Icon size={15} className={cn("transition-colors duration-150", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-350")} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Warning Footer if there's a glosed measurement */}
      {hasGlosa && (
        <div className="p-4 m-4 bg-red-950/40 border border-red-500/30 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-xs font-semibold text-red-400">Atenção: Glosa Ativa</h4>
            <p className="text-[11px] text-red-200/80 mt-1 leading-relaxed">
              Há medições reprovadas pela Caixa. Verifique o Dashboard.
            </p>
          </div>
        </div>
      )}

      {/* User info / Settings Dropdown menu wrapper */}
      <div className="relative p-4 border-t border-[#1e293b] bg-[#0f1422]" ref={menuRef}>

        {/* Settings Dropdown popover */}
        {showMenu && (
          <div className="absolute bottom-18 left-4 right-4 bg-[#151b2c] border border-slate-800 rounded-xl shadow-2xl p-2.5 space-y-1.5 z-50">
            <button
              onClick={() => {
                setIsPasswordModalOpen(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition text-left cursor-pointer"
            >
              <KeyRound size={14} className="text-slate-400" />
              Trocar Senha
            </button>
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition text-left cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={14} className="text-amber-500" />
                  Tema Claro
                </>
              ) : (
                <>
                  <Moon size={14} className="text-indigo-400" />
                  Tema Escuro
                </>
              )}
            </button>
            <div className="h-px bg-slate-800 my-1" />
            <button
              onClick={async () => {
                if (confirm('Deseja realmente sair?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition text-left cursor-pointer"
            >
              <LogOut size={14} />
              Sair do Sistema
            </button>
          </div>
        )}

        {/* Notifications Popover */}
        {showNotifications && (
          <div className="absolute bottom-18 left-4 right-4 bg-[#151b2c] border border-slate-800 rounded-xl shadow-2xl p-3.5 space-y-2.5 z-50 max-h-60 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">Notificações</span>
              {unreadCount > 0 && (
                <button
                  onClick={async () => {
                    await fetch('/api/notificacoes', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ marcarTodasLidas: true })
                    });
                    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
                    setUnreadCount(0);
                  }}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Lidas
                </button>
              )}
            </div>
            <div className="space-y-2 text-[10px] text-slate-300">
              {notifications.length === 0 ? (
                <p className="text-slate-500 text-center py-4">Nenhum alerta recente</p>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`p-2 rounded-lg ${n.lida ? 'bg-[#0f1422]/30 text-slate-400' : 'bg-blue-600/5 border border-blue-500/10 text-slate-200'}`}>
                    <p className="leading-normal">{n.mensagem}</p>
                    <span className="text-[8px] text-slate-500 mt-1 block font-mono">
                      {new Date(n.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-3 overflow-hidden cursor-pointer hover:bg-slate-800/20 p-1.5 rounded-lg transition grow"
            title="Menu do usuário"
          >
            <div className="w-8.5 h-8.5 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
              {getUserInitials(user.nome)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-tight">{user.nome}</p>
              <span className="text-[9px] text-slate-400 block truncate mt-0.5">{user.email}</span>
              <span className="text-[8px] text-indigo-400 font-extrabold tracking-wider uppercase block mt-0.5 font-sans">{user.role}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMenu(false);
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer relative"
              title="Notificações"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </button>
            <button
              onClick={() => {
                setShowMenu(!showMenu);
                setShowNotifications(false);
              }}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Configurações do usuário"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Troca de Senha */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glassmorphism w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute right-4 top-4 p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 font-sans">
              <KeyRound className="text-blue-500" size={18} /> Trocar Minha Senha
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              {pwdError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs">
                  {pwdError}
                </div>
              )}
              {pwdSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg text-xs">
                  {pwdSuccess}
                </div>
              )}

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Senha Atual</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5 font-medium">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  placeholder="Repetir nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  {isChangingPwd && <Loader2 size={12} className="animate-spin" />}
                  Alterar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>

    <ModalNovoLancamento
      isOpen={isLancamentoModalOpen}
      onClose={() => setIsLancamentoModalOpen(false)}
      onSuccess={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }}
      defaultEmpreendimentoId={(() => {
        if (!pathname) return undefined;
        if (pathname.includes('/empreendimentos/')) {
          return pathname.split('/empreendimentos/')[1]?.split('/')[0];
        }
        return undefined;
      })()}
      defaultCasaId={(() => {
        if (!pathname) return undefined;
        if (pathname.includes('/casas/')) {
          return pathname.split('/casas/')[1]?.split('/')[0];
        }
        return undefined;
      })()}
    />
    </>
  );
}
