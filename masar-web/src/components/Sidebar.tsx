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
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';

const MENU_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projetos (Kanban)', href: '/empreendimentos', icon: KanbanSquare },
  { name: 'Comercial (CRM)', href: '/comercial', icon: BadgeDollarSign },
  { name: 'Apontamento Canteiro', href: '/canteiro', icon: Smartphone },
  { name: 'Tesouraria Societária', href: '/socios/caixa', icon: PiggyBank },
  { name: 'Gerenciar Equipe', href: '/usuarios', icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [hasGlosa, setHasGlosa] = useState(false);
  const [user, setUser] = useState({ nome: 'Carregando...', email: 'gestor@masar.com', role: 'COMERCIAL' });
  
  // Theme state
  const [theme, setTheme] = useState('dark');
  
  // Dropdown/Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
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

  return (
    <aside className="w-64 bg-[#0f1422] border-r border-[#1e293b] flex flex-col h-screen fixed left-0 top-0 z-40 text-slate-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
          <Building2 size={20} />
        </div>
        <div>
          <span className="font-extrabold text-base text-white tracking-wide block font-sans">MASAR</span>
          <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Empreendimentos</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {MENU_ITEMS.filter((item) => {
          const role = user.role || 'COMERCIAL';
          if (item.href === '/socios/caixa' && !['ADMIN', 'FINANCEIRO'].includes(role)) return false;
          if (item.href === '/usuarios' && role !== 'ADMIN') return false;
          if (item.href === '/canteiro' && !['ADMIN', 'FINANCEIRO', 'ENGENHARIA'].includes(role)) return false;
          return true;
        }).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium cursor-pointer",
                isActive 
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              )}
            >
              <Icon 
                size={18} 
                className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span>{item.name}</span>
            </Link>
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
  );
}
