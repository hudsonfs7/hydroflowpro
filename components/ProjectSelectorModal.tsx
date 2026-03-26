import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getCloudProjects } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { FolderIcon, PlusIcon, CloseIcon } from './Icons';

interface ProjectSelectorModalProps {
    currentUser: User | null;
    onSelect: (p: any) => void;
    onCreateNew: () => void;
    onLogout: () => void;
}

export const ProjectSelectorModal: React.FC<ProjectSelectorModalProps> = ({ 
    currentUser, onSelect, onCreateNew, onLogout 
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const orgFilter = currentUser?.role === 'master' ? 'MASTER_ACCESS' : currentUser?.organizationId;
                const list = await getCloudProjects(orgFilter);
                setProjects(list);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };
        if (currentUser) {
            load();
        }
    }, [currentUser]);

    return (
        <ModalContainer onClose={() => {}} zIndex="z-[8500]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-3xl shadow-2xl w-[600px] max-w-[95vw] overflow-hidden animate-slide-up-center flex flex-col border border-slate-200">
                <div className="bg-slate-800 p-6 shadow-md flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-inner shrink-0">
                            <FolderIcon />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide">Selecione o Empreendimento</h2>
                            <p className="text-xs text-blue-200 mt-1">É obrigatório selecionar um projeto para acessar o sistema.</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto max-h-[50vh] bg-slate-50 custom-scrollbar">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 font-medium">Buscando na base de dados...</div>
                    ) : error ? (
                        <div className="py-12 text-center text-red-500 font-bold">{error}</div>
                    ) : projects.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mb-4"><FolderIcon /></div>
                            <h3 className="text-slate-600 font-bold mb-1">Nenhum Empreendimento Encontrado</h3>
                            <p className="text-xs text-slate-400">Inicie criando o seu primeiro empreendimento.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {projects.map(p => {
                                let meta: any = {};
                                try { meta = JSON.parse(p.data).metadata || {}; } catch(e) {}
                                return (
                                    <button 
                                        key={p.id} 
                                        onClick={() => onSelect(p)}
                                        className="bg-white border border-slate-200 hover:border-blue-400 p-4 rounded-xl flex items-center justify-between text-left transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 group"
                                    >
                                        <div>
                                            <h4 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors uppercase">{p.name}</h4>
                                            <div className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">
                                                {meta.company || 'Empresa Oculta'} • {meta.city || 'Cidade Não Informada'}
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 group-hover:bg-blue-50 transition-all font-bold">
                                            →
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
                    <button onClick={onLogout} className="px-5 py-2.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors uppercase tracking-wide flex items-center gap-2">
                        <CloseIcon /> Sair (Logout)
                    </button>
                    <button onClick={onCreateNew} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all uppercase tracking-wide shadow-md flex items-center gap-2">
                        <PlusIcon /> Criar Novo
                    </button>
                </div>
            </div>
        </ModalContainer>
    );
};
