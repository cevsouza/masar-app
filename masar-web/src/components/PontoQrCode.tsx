'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, Play, Square, UserCheck } from 'lucide-react';

interface Casa {
  id: string;
  numero: string;
  empreendimento: {
    nome: string;
  };
}

interface PontoQrCodeProps {
  casas: Casa[];
}

export default function PontoQrCode({ casas }: PontoQrCodeProps) {
  const [selectedCasaId, setSelectedCasaId] = useState('');
  const [tipo, setTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scannedWorker, setScannedWorker] = useState<{ nome: string; cpf: string } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Exemplo de banco de operários simulados que o mestre de obras lê via QR Code
  const MOCK_WORKERS = [
    { nome: 'José da Silva (Carpinteiro)', cpf: '102.304.506-88' },
    { nome: 'Manoel de Souza (Pedreiro)', cpf: '223.445.667-00' },
    { nome: 'Carlos Eduardo (Armador)', cpf: '887.665.443-11' },
    { nome: 'Antônio Ferreira (Servente)', cpf: '445.556.667-22' }
  ];

  const [mockWorkerIndex, setMockWorkerIndex] = useState(0);

  const startCamera = async () => {
    setScanStatus('scanning');
    setFeedbackMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Câmera traseira
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraAccess(true);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Erro de acesso à câmera:', err);
      setHasCameraAccess(false);
      setIsCameraActive(false);
      setScanStatus('error');
      setFeedbackMsg('Não foi possível obter acesso à câmera do dispositivo.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Limpa o stream da câmera ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSimulateScan = async () => {
    if (!selectedCasaId) {
      alert('Selecione primeiro a Unidade (Casa) onde o ponto será registrado.');
      return;
    }

    setScanStatus('scanning');
    
    // Simula a leitura e decodificação do QR Code (2 segundos de leitura da câmera)
    setTimeout(async () => {
      const worker = MOCK_WORKERS[mockWorkerIndex];
      // Rotaciona para o próximo operário na simulação seguinte
      setMockWorkerIndex((prev) => (prev + 1) % MOCK_WORKERS.length);

      try {
        const response = await fetch('/api/canteiro/ponto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trabalhadorNome: worker.nome,
            trabalhadorCpf: worker.cpf,
            casaId: selectedCasaId,
            tipo
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao bater ponto.');
        }

        setScannedWorker({ nome: worker.nome, cpf: worker.cpf });
        setScanStatus('success');
        setFeedbackMsg(`Ponto de ${tipo} batido com sucesso!`);
        stopCamera();
      } catch (err: any) {
        setScanStatus('error');
        setFeedbackMsg(err.message || 'Falha ao registrar ponto no servidor.');
      }
    }, 2000);
  };

  return (
    <div className="glassmorphism p-5 rounded-2xl border border-slate-800/80 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Camera size={16} className="text-blue-400" /> Ponto Digital por QR Code
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Leitura de crachá de operários no canteiro via câmera</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <label className="text-slate-400 block mb-1">Unidade/Casa</label>
          <select
            value={selectedCasaId}
            onChange={(e) => setSelectedCasaId(e.target.value)}
            className="w-full bg-[#0f1422] border border-slate-800 rounded-xl px-2.5 py-2 text-slate-300 focus:outline-none"
          >
            <option value="">Selecione...</option>
            {casas.map(c => (
              <option key={c.id} value={c.id}>
                Casa {c.numero} ({c.empreendimento.nome.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Tipo de Registro</label>
          <div className="flex bg-[#0f1422] border border-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setTipo('ENTRADA')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                tipo === 'ENTRADA' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setTipo('SAIDA')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition cursor-pointer text-center ${
                tipo === 'SAIDA' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Saída
            </button>
          </div>
        </div>
      </div>

      {/* Vídeo / Câmera Interface */}
      <div className="relative h-56 bg-slate-950/80 rounded-xl border border-slate-850 overflow-hidden flex flex-col items-center justify-center">
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <div className="mx-auto w-12 h-12 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-500">
              <Camera size={24} />
            </div>
            <p className="text-[11px] text-slate-400 max-w-[200px]">Câmera desativada. Selecione a unidade e clique abaixo para abrir.</p>
          </div>
        )}

        {/* Scanning Overlay animation */}
        {scanStatus === 'scanning' && (
          <div className="absolute inset-0 bg-[#000000]/20 flex flex-col items-center justify-center">
            <div className="w-40 h-40 border-2 border-dashed border-blue-500 rounded-xl relative animate-pulse flex items-center justify-center">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500 shadow-md shadow-blue-500/50 animate-scanner-line" />
              <RefreshCw className="animate-spin text-blue-400" size={24} />
            </div>
            <p className="text-[10px] text-white font-bold bg-slate-900/80 px-2 py-0.5 rounded-full mt-3 uppercase tracking-wider">Aguardando QR Code...</p>
          </div>
        )}

        {/* Scan success message overlay */}
        {scanStatus === 'success' && scannedWorker && (
          <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center p-4 text-center animate-fade-in">
            <CheckCircle className="text-emerald-400" size={32} />
            <h4 className="text-white font-bold text-xs mt-2">{feedbackMsg}</h4>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 mt-3 text-left w-full max-w-[240px]">
              <p className="text-[10px] text-slate-400 uppercase font-semibold block">Operário</p>
              <span className="text-xs font-bold text-white block truncate">{scannedWorker.nome}</span>
              <span className="text-[10px] font-mono text-slate-500 mt-1 block">CPF: ***.***.{scannedWorker.cpf.slice(-6)}</span>
            </div>
            <button
              onClick={() => {
                setScanStatus('idle');
                setScannedWorker(null);
              }}
              className="mt-3 text-[10px] font-bold text-blue-400 hover:underline cursor-pointer"
            >
              Registrar Outro Ponto
            </button>
          </div>
        )}

        {/* Scan error message overlay */}
        {scanStatus === 'error' && (
          <div className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center p-4 text-center">
            <AlertCircle className="text-red-400" size={32} />
            <h4 className="text-white font-bold text-xs mt-2">Falha na Leitura</h4>
            <p className="text-[10px] text-slate-300 mt-1.5 max-w-[200px]">{feedbackMsg}</p>
            <button
              onClick={() => setScanStatus('idle')}
              className="mt-3 py-1.5 px-4 bg-red-650 hover:bg-red-500 text-white font-bold text-[10px] rounded-lg cursor-pointer transition"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {/* Botoes de Acao */}
      <div className="flex gap-2.5">
        {!isCameraActive ? (
          <button
            type="button"
            disabled={!selectedCasaId}
            onClick={startCamera}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
          >
            <Play size={12} /> Abrir Leitor QR
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={stopCamera}
              className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center transition cursor-pointer"
              title="Fechar Câmera"
            >
              <Square size={12} />
            </button>
            <button
              type="button"
              onClick={handleSimulateScan}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <UserCheck size={12} /> Ler Crachá Operário
            </button>
          </>
        )}
      </div>
    </div>
  );
}
