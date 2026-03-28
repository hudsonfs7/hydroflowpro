import React, { useState, useEffect, useMemo } from 'react';
import { User, ProjectMetadata } from '../types';
import { getCloudProjects, deleteProjectFromCloud } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { FolderIcon, PlusIcon, CloseIcon, SearchIcon, TrashIcon, CalculatorIcon, LayoutIcon } from './Icons';

interface ProjectSelectorModalProps {
    currentUser: User | null;
    onSelect: (p: any) => void | Promise<void>;
    onCreateNew: () => void;
    onLogout: () => void;
}

export const ProjectSelectorModal: React.FC<ProjectSelectorModalProps> = ({ 
    currentUser, onSelect, onCreateNew, onLogout 
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadProjects = async () => {
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

    useEffect(() => {
        if (currentUser) {
            loadProjects();
        }
    }, [currentUser]);

    const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
        e.stopPropagation(); // Evita abrir o projeto ao clicar em excluir
        if (!window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o projeto "${name}"?\nEsta ação não poderá ser desfeita.`)) return;

        setDeletingId(id);
        try {
            await deleteProjectFromCloud(id);
            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (err: any) {
            alert("Erro ao excluir projeto: " + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return projects;
        const q = searchQuery.toLowerCase();
        return projects.filter(p => {
            const meta = JSON.parse(p.data).metadata || {};
            return (
                p.name.toLowerCase().includes(q) ||
                (meta.company && meta.company.toLowerCase().includes(q)) ||
                (meta.city && meta.city.toLowerCase().includes(q))
            );
        });
    }, [projects, searchQuery]);

    return (
        <ModalContainer onClose={() => {}} zIndex="z-[8500]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-3xl shadow-2xl w-[700px] max-w-[95vw] overflow-hidden animate-slide-up-center flex flex-col border border-slate-200">
                {/* Header Section */}
                <div className="bg-slate-900 p-6 shadow-md flex justify-between items-center relative overflow-hidden shrink-0 border-b border-slate-700">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 scale-110">
                            <FolderIcon />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Selecione o Empreendimento</h2>
                            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest mt-0.5 opacity-80">Gestão Centralizada de Projetos</p>
                        </div>
                    </div>
                </div>

                {/* Sub-header / Search */}
                <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-4">
                    <div className="flex-1 relative group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                            <SearchIcon />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome, contratante ou cidade..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all shadow-inner"
                        />
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">
                        {filteredProjects.length} Projetos
                    </div>
                </div>

                {/* List Body */}
                <div className="flex-1 p-6 overflow-y-auto max-h-[60vh] bg-slate-50/50 custom-scrollbar space-y-3">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                            <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Nuvem...</span>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <div className="text-red-500 font-black uppercase text-sm mb-2">Erro de Sincronização</div>
                            <div className="text-xs text-slate-500 mb-4">{error}</div>
                            <button onClick={loadProjects} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase hover:bg-slate-300">Tentar Novamente</button>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-100 text-slate-200 rounded-full flex items-center justify-center mb-4 scale-125 opacity-50"><FolderIcon /></div>
                            <h3 className="text-slate-600 font-black uppercase mb-1">Nenhum Registro Encontrado</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Tente ajustar sua busca ou crie um novo projeto.</p>
                        </div>
                    ) : (
                        filteredProjects.map(p => {
                            let meta: ProjectMetadata = { name: p.name, company: '', city: '', eventNumber: '' } as any;
                            try { meta = JSON.parse(p.data).metadata || {}; } catch(e) {}
                            
                            const totalLots = (meta.lotsHab || 0) + (meta.lotsCom || 0) + (meta.lotsInst || 0);
                            const createdAt = p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt)) : null;
                            const proposalCount = meta.proposals?.length || 0;
                            const hasAccepted = !!meta.acceptedProposalId;

                            return (
                                <div 
                                    key={p.id} 
                                    className={`group relative bg-white border border-slate-200 hover:border-blue-400 rounded-[24px] overflow-hidden transition-all hover:shadow-xl hover:-translate-y-0.5 flex flex-col sm:flex-row cursor-pointer ${deletingId === p.id ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={() => void onSelect(p)}
                                >
                                    {/* Project Main Info */}
                                    <div className="flex-1 p-5 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm leading-tight tracking-tight mb-1">
                                                    {p.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                    <span className="text-slate-500">{meta.company || 'Empresa Direta'}</span>
                                                    <span className="opacity-30">•</span>
                                                    <span>{meta.city || 'Localidade NM'}</span>
                                                </div>
                                            </div>
                                            
                                            {hasAccepted && (
                                                <div className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[9px] font-black uppercase shadow-sm border border-emerald-200">
                                                    Contratado
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Data Row */}
                                        <div className="flex flex-wrap items-center gap-4 mt-1 border-t border-slate-50 pt-3">
                                            <div className="flex items-center gap-1.5" title="Total de Lotes">
                                                <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors"><LayoutIcon /></div>
                                                <span className="text-[10px] font-black text-slate-600 tracking-tighter">{totalLots} Lotes</span>
                                            </div>
                                            <div className="flex items-center gap-1.5" title="Propostas Geradas">
                                                <div className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><CalculatorIcon /></div>
                                                <span className="text-[10px] font-black text-slate-600 tracking-tighter">{proposalCount} Orç.</span>
                                            </div>
                                            {createdAt && (
                                                <div className="ml-auto text-[9px] font-bold text-slate-400 uppercase">
                                                    {createdAt.toLocaleDateString('pt-BR')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="w-full sm:w-16 bg-slate-50/50 border-t sm:border-t-0 sm:border-l border-slate-100 flex sm:flex-col items-center justify-center gap-2 p-3 sm:p-0">
                                        <button 
                                            onClick={(e) => handleDelete(e, p.id, p.name)}
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-500 hover:shadow-inner transition-all group/del"
                                            title="Excluir Empreendimento"
                                        >
                                            <TrashIcon />
                                        </button>
                                        <div className="hidden sm:flex w-10 h-10 rounded-2xl items-center justify-center text-slate-200 group-hover:text-blue-500 transition-all font-black text-lg">
                                            →
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-5 bg-white border-t border-slate-200 flex flex-wrap justify-between items-center gap-4 shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-10">
                    <button onClick={onLogout} className="px-5 py-3 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 active:scale-95">
                        <CloseIcon /> Encerrar Sessão
                    </button>
                    
                    <button onClick={onCreateNew} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest shadow-xl shadow-blue-200 flex items-center gap-2 active:scale-95 group">
                        <PlusIcon /> 
                        <span>Novo Empreendimento</span>
                        <span className="w-5 h-5 bg-white/20 rounded-lg flex items-center justify-center ml-1 group-hover:bg-white/30 tracking-tight">+</span>
                    </button>
                </div>
            </div>
        </ModalContainer>
    );
};
