'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  /** Nome da construtora do usuário logado. Vem da sessão, não do Host. */
  empresaNome: string;
  exibeSeloMasar: boolean;
}

export default function DashboardShell({ children, empresaNome, exibeSeloMasar }: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex w-full min-h-screen bg-[#0b0f19]">
      {/* Sidebar - responsivo via props */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} empresaNome={empresaNome} exibeSeloMasar={exibeSeloMasar} />

      {/* Main Content Area */}
      <div className="flex-1 pl-0 md:pl-64 min-h-screen flex flex-col w-full">
        
        {/* Mobile Top Header (Visível apenas em telas menores que MD) */}
        <header className="flex md:hidden items-center justify-between px-5 py-3.5 bg-[#0f1422] border-b border-slate-800/80 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded-lg text-white"
              style={{ backgroundColor: 'var(--cor-primaria, #2563eb)' }}
            >
              <span className="font-extrabold text-[10px] tracking-widest block font-sans">
                {empresaNome.trim().charAt(0).toUpperCase() || 'M'}
              </span>
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-wide block font-sans truncate max-w-[180px]">
                {empresaNome}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 bg-slate-800/30 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Abrir Menu"
          >
            <Menu size={18} />
          </button>
        </header>

        {/* Corpo principal do conteúdo */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
