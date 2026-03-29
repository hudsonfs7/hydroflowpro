
import React, { useState } from 'react';
import { ModalContainer, InputGroup } from './CommonUI';
import { LockIcon, CloseIcon, CheckIcon, BuildingIcon } from './Icons';
import { loginUser } from '../services/firebaseService';
import { User } from '../types';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
    showClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess, showClose = true }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [protocolInput, setProtocolInput] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const user = await loginUser(username, password);
            if (user) {
                onLoginSuccess(user);
            } else {
                setError("Credenciais inválidas.");
            }
        } catch (err: unknown) {
            setError("Erro ao conectar: " + (err instanceof Error ? err.message : String(err)));
        } finally {
            setLoading(false);
        }
    };

    const handleProtocolSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!protocolInput.trim()) return;
        (window as any).openProtocolConsult?.(protocolInput);
    };

    return (
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-6 bg-slate-950 overflow-hidden">
            {/* High-End Cinematic Background */}
            <div className="absolute inset-0 opacity-40">
                <div className="w-full h-full bg-slate-900 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.2),transparent)]"></div>
            </div>
            
            {/* Login Card */}
            <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                
                <div className="p-10 pb-6 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl shadow-xl flex items-center justify-center text-white mb-6 animate-float text-2xl font-black italic tracking-tighter">
                        HF
                    </div>
                    
                    <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none flex items-center gap-2">
                        HydroFlow<span className="text-blue-500 not-italic">PRO</span>
                    </h1>
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mt-3 opacity-60">Professional Management</p>
                </div>

                <form onSubmit={handleLogin} className="px-10 space-y-4">
                    <InputGroup label="Usuário" labelColor="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                        <input 
                            type="text" 
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-slate-950 text-white font-bold transition-all shadow-inner"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                    </InputGroup>
                    <InputGroup label="Senha" labelColor="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                        <input 
                            type="password" 
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-slate-950 text-white font-bold transition-all shadow-inner"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </InputGroup>

                    {error && (
                        <div className="p-4 bg-red-500/10 text-red-400 text-[10px] rounded-xl font-bold text-center border border-red-500/20 uppercase tracking-widest leading-none">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white shadow-2xl transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        {loading ? 'Autenticando...' : <><CheckIcon /> Acessar Sistema</>}
                    </button>
                </form>

                {/* Inline Protocol Search */}
                <div className="mt-8 px-10 pb-10">
                    <div className="pt-6 border-t border-slate-800 text-center">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 block">Consulta de Protocolo</label>
                        <form onSubmit={handleProtocolSubmit} className="flex gap-2">
                            <input 
                                type="text"
                                placeholder="CÓDIGO"
                                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black text-blue-400 uppercase outline-none focus:border-blue-900 transition-all"
                                value={protocolInput}
                                onChange={(e) => setProtocolInput(e.target.value)}
                            />
                            <button 
                                type="submit"
                                className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all active:scale-95 border border-slate-700"
                            >
                                Consultar
                            </button>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.5em]">
                HydroFlow Pro Enterprise
            </div>
        </div>
    );
};

