'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function SairPlataforma() {
  const router = useRouter();

  const sair = async () => {
    await fetch('/api/auth/plataforma', { method: 'DELETE' });
    router.push('/plataforma/login');
    router.refresh();
  };

  return (
    <button
      onClick={sair}
      className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-white border border-stone-800 hover:border-stone-600 px-3 py-1.5 rounded-lg transition"
    >
      <LogOut size={13} /> Sair
    </button>
  );
}
