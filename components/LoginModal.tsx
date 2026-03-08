
import React, { useState } from 'react';
import { ModalContainer, InputGroup } from './CommonUI';
import { LockIcon, CloseIcon, CheckIcon } from './Icons';
import { loginUser } from '../services/firebaseService';
import { User } from '../types';

interface LoginModalProps {
    onClose: () => void;
    onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLoginSuccess }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
        } catch (err: any) {
            setError("Erro ao conectar: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[8000]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up border border-slate-200">
                <div className="bg-slate-800 p-6 flex flex-col items-center justify-center text-white relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><CloseIcon/></button>
                    <div className="bg-slate-700 p-3 rounded-full mb-3">
                        <LockIcon />
                    </div>
                    <h3 className="font-bold text-lg">Acesso Restrito</h3>
                    <p className="text-xs text-slate-400">Identifique-se para acessar os projetos</p>
                </div>

                <form onSubmit={handleLogin} className="p-6 space-y-4">
                    <InputGroup label="Usuário">
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                    </InputGroup>
                    <InputGroup label="Senha">
                        <input 
                            type="password" 
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </InputGroup>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-bold text-center border border-red-100">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
                    >
                        {loading ? 'Verificando...' : <><CheckIcon /> Acessar</>}
                    </button>
                </form>
            </div>
        </ModalContainer>
    );
};
