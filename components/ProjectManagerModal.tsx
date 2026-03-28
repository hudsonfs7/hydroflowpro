import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { getCloudProjects } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { PlusIcon, CloseIcon, SearchIcon, MapIcon } from './Icons';

interface ProjectManagerModalProps {
    onClose: () => void;
    onOpenProject: (project: any) => void | Promise<void>;
    onCreateNew: () => void;
    currentUser: User | null;
    refreshKey?: number;
    userOrgName?: string;
    onOpenFinance?: () => void;
    onOpenAdmin?: () => void;
    onEditMetadata?: (proj: any) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
    onClose,
    onOpenProject,
    onCreateNew,
    currentUser,
    refreshKey = 0,
    userOrgName = "",
    onOpenFinance,
    onOpenAdmin,
    onEditMetadata
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
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

        load();
    }, [refreshKey, currentUser]);

    const filteredProjects = useMemo(
        () =>
            projects.filter(p => {
                const name = (p.name || '').toLowerCase();
                return name.includes(search.toLowerCase());
            }),
        [projects, search]
    );

    const selectedProject = useMemo(
        () => projects.find(p => p.id === selectedId),
        [projects, selectedId]
    );

    return (
        <ModalContainer onClose={onClose} zIndex="z-[5500]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-[95vw] h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-slide-up-center">
                <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
                    <div className="flex items-center gap-1">
                        <h2 className="text-white text-lg font-black hidden md:block mr-2 tracking-tight whitespace-nowrap">Projetos Cadastrados</h2>
                        <div className="w-[1px] h-8 bg-slate-700 mx-2 hidden md:block"></div>
                        <RibbonButton
                            icon={<MapIcon />}
                            label="Abrir Projeto"
                            disabled={!selectedProject}
                            onClick={() => selectedProject && void onOpenProject(selectedProject)}
                            active={!!selectedProject}
                        />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        <RibbonButton icon={<PlusIcon />} label="Criar Projeto" onClick={onCreateNew} />
                        <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                        <RibbonButton
                            icon={<MapIcon />}
                            label="Editar Capa"
                            disabled={!selectedProject}
                            onClick={() => selectedProject && onEditMetadata?.(selectedProject)}
                        />
                        {currentUser?.role === 'master' && onOpenAdmin && (
                            <>
                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                                <RibbonButton icon={<PlusIcon />} label="Usuários" onClick={onOpenAdmin} />
                            </>
                        )}
                        {onOpenFinance && (
                            <>
                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                                <RibbonButton icon={<SearchIcon />} label="Financeiro" onClick={onOpenFinance} />
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Filtrar..."
                                className="bg-slate-700 text-white text-xs rounded-lg py-2 pl-8 pr-4 border-none focus:ring-2 focus:ring-blue-500 w-64"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <div className="absolute left-2.5 top-2 text-slate-400">
                                <SearchIcon />
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[1000px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Projeto</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Empresa</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-r border-slate-200 align-middle">Cidade</th>
                                        <th colSpan={3} className="px-3 py-1 border-b border-r border-slate-200 text-center bg-slate-200/20">Lotes</th>
                                        <th rowSpan={2} className="px-3 py-2 border-b border-slate-200 text-right align-middle">Data</th>
                                    </tr>
                                    <tr className="bg-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Hab</th>
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Com</th>
                                        <th className="px-2 py-1 border-b border-r border-slate-200 text-center w-16">Inst</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center text-slate-400">Carregando banco de dados...</td>
                                        </tr>
                                    ) : error ? (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center text-red-500">{error}</td>
                                        </tr>
                                    ) : filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center text-slate-400">Nenhum projeto encontrado.</td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map(p => {
                                            let meta: any = {};
                                            try {
                                                meta = JSON.parse(p.data).metadata || {};
                                            } catch (e) {}
                                            const date = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : '---';
                                            const isSelected = selectedId === p.id;
                                            return (
                                                <tr
                                                    key={p.id}
                                                    onClick={e => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedId(isSelected ? null : p.id);
                                                    }}
                                                    onDoubleClick={() => void onOpenProject(p)}
                                                    className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                                >
                                                    <td className={`p-3 border-r border-slate-100 text-sm font-bold uppercase ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{p.name}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-slate-600 uppercase">{meta.company || '---'}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-slate-600 uppercase">{meta.city || '---'}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsHab || 0}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsCom || 0}</td>
                                                    <td className="p-3 border-r border-slate-100 text-sm text-center font-mono text-slate-500 bg-slate-50/20">{meta.lotsInst || 0}</td>
                                                    <td className="p-3 text-xs text-slate-400 text-right">{date}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Total: {filteredProjects.length}</span>
                        <span>•</span>
                        <span>Usuário: {currentUser?.username || 'Desconhecido'}</span>
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};

const RibbonButton = ({ icon, label, onClick, disabled, active }: any) => {
    const baseClass = 'flex flex-col items-center justify-center h-12 px-4 rounded-lg transition-all gap-1 outline-none relative overflow-hidden';
    let colorClass = '';
    if (disabled) colorClass = 'opacity-30 grayscale cursor-not-allowed text-slate-300';
    else if (active) colorClass = 'bg-blue-600 text-white hover:bg-blue-500';
    else colorClass = 'text-slate-300 hover:bg-slate-700 hover:text-white';

    return (
        <button type="button" disabled={disabled} onClick={onClick} className={`${baseClass} ${colorClass}`}>
            <span className="text-lg relative z-10">{icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight relative z-10">{label}</span>
        </button>
    );
};
