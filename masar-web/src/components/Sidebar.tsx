'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  BadgeDollarSign, 
  Building2, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [hasGlosa, setHasGlosa] = useState(false);

  // Check if there are glosed measurements to show a pulsing warning icon in the sidebar
  useEffect(() => {
    fetch('/api/medicoes/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.hasGlosa) {
          setHasGlosa(true);
        } else {
          setHasGlosa(false);
        }
      })
      .catch(() => {});
  }, [pathname]); // Refresh on navigation

  const menuItems = [
    {
      name: 'Dashboard Executivo',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Kanban de Projetos',
      href: '/empreendimentos',
      icon: KanbanSquare,
    },
    {
      name: 'Comercial & CRM',
      href: '/comercial',
      icon: BadgeDollarSign,
    },
  ];

  return (
    <aside className="w-64 bg-[#151b2c] border-r border-[#1e293b] flex flex-col h-screen fixed left-0 top-0 text-slate-200 z-30">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e293b] flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Building2 size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none text-white">MASAR</h1>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider">EMPREENDIMENTOS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
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

      {/* User info */}
      <div className="p-4 border-t border-[#1e293b] flex items-center gap-3 bg-[#0f1422]">
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
          EV
        </div>
        <div className="overflow-hidden">
          <p className="text-xs font-semibold text-white truncate">Sócio Empreiteiro</p>
          <span className="text-[10px] text-slate-400 block truncate">MCMV Gestor</span>
        </div>
      </div>
    </aside>
  );
}
