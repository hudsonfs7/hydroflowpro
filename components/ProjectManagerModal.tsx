import React, { useState, useEffect, useMemo } from 'react';
import { User, ProjectMetadata } from '../types';
import { getCloudProjects } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { CloseIcon, MapIcon, WalletIcon, FileSignatureIcon, PenToolIcon, BuildingIcon, ChartIcon, UserIcon, WaypointIcon, SettingsIcon, FolderIcon } from './Icons';

interface ProjectManagerModalProps {
    onClose: () => void;
    onOpenProject: (project: any) => void | Promise<void>;
    currentUser: User | null;
    refreshKey?: number;
    userOrgName?: string;
    onOpenFinance?: () => void;
    onOpenAdmin?: () => void;
    onEditMetadata?: (proj: any) => void;
    activeProjectId?: string;
    onOpenDocuments?: (projData: any) => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
    onClose,
    onOpenProject,
    currentUser,
    refreshKey = 0,
    userOrgName = "",
    onOpenFinance,
    onOpenAdmin,
    onEditMetadata,
    activeProjectId,
    onOpenDocuments
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

        if (currentUser) load();
    }, [refreshKey, currentUser]);

    const activeProject = useMemo(
        () => projects.find(p => p.id === activeProjectId),
        [projects, activeProjectId]
    );

    const metadata: ProjectMetadata | null = useMemo(() => {
        if (!activeProject) return null;
        try {
            const data = JSON.parse(activeProject.data);
            return { ...(data.metadata || {}), _id: activeProject.id };
        } catch (e) {
            return null;
        }
    }, [activeProject]);

    // Renderiza estado vazio se não houver projeto ativo
    if (!activeProjectId || (!loading && !activeProject)) {
        return (
            <ModalContainer onClose={onClose} zIndex="z-[5500]" closeOnBackdropClick={true}>
                <div className="bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] w-[600px] max-w-[95vw] h-[500px] flex flex-col items-center justify-center p-12 text-center overflow-hidden border border-slate-200 animate-slide-up-center">
                    <div className="w-24 h-24 mb-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 scale-125 border-4 border-slate-50 shadow-inner">
                        <FolderIcon />
                    </div>
                    <h2 className="text-2xl font-black text-slate-400 uppercase tracking-tighter">Nenhum Projeto Aberto</h2>
                    <p className="text-sm font-bold max-w-xs mt-4 text-slate-500 uppercase tracking-tight leading-relaxed">
                        Para gerenciar faturamentos, documentos e metadados, você precisa abrir um empreendimento primeiro.
                    </p>
                    <button 
                        onClick={onClose}
                        className="mt-10 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/30 transition-all active:scale-95"
                    >
                        Entendido
                    </button>
                    <div className="mt-6 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">HydroFlow Pro Management</div>
                </div>
            </ModalContainer>
        );
    }

    return (
        <ModalContainer onClose={onClose} zIndex="z-[5500]" closeOnBackdropClick={true}>
            <div className="bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] w-[950px] max-w-[95vw] h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-slide-up-center">
                {/* Header Superior Moderno */}
                <div className="h-20 bg-slate-900 flex items-center justify-between px-8 shrink-0 shadow-2xl z-20 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.5),transparent)]"></div>
                    
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="flex flex-col">
                            <h2 className="text-white text-xl font-black tracking-tighter uppercase italic flex items-center gap-2">
                                <span className="bg-blue-600 p-1.5 rounded-lg not-italic"><BuildingIcon /></span>
                                Gerenciar Empreendimento
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">Projeto Ativo no Mapa</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 relative z-10">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Usuário Online</span>
                            <span className="text-xs font-bold text-white uppercase">{currentUser?.username || 'GUEST'}</span>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 border border-slate-700 transition-all">
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50 py-20">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Sincronizando Dados Cloud...</span>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                            {/* Seção 1: Identificação Principal */}
                            <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity scale-150 pointer-events-none">
                                    <BuildingIcon />
                                </div>
                                <div className="flex items-start justify-between mb-8">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-full uppercase tracking-widest">PROJETO ATUAL</span>
                                            <span className="text-slate-200">•</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {activeProjectId?.slice(0, 12)}</span>
                                        </div>
                                        <h1 className="text-4xl font-black text-slate-900 leading-tight uppercase tracking-tighter mb-2">{activeProject?.name}</h1>
                                        <p className="text-slate-500 font-bold uppercase tracking-tight text-sm flex items-center gap-2">
                                            <WaypointIcon /> {metadata?.studyName || 'Localidade não especificada'}
                                        </p>
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Modificação</div>
                                        <div className="text-sm font-black text-slate-700">{activeProject?.createdAt?.toDate ? activeProject.createdAt.toDate().toLocaleDateString() : '---'}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <InfoItem icon={<BuildingIcon />} label="Empresa/Cliente" value={metadata?.company || 'Não informado'} />
                                    <InfoItem icon={<MapIcon />} label="Cidade / UF" value={metadata?.city || 'Não informado'} />
                                    <InfoItem icon={<UserIcon />} label="Consultor Responsável" value={metadata?.consultant || 'Equipe Padrão'} />
                                </div>
                            </div>

                            {/* Grid Duplo de Informações Técnicas */}
                            <div className="grid grid-cols-2 gap-8">
                                {/* Seção 2: Parâmetros de População e Consumo */}
                                <TechnicalSection title="Informações de Consumo" icon={<DropIcon />}>
                                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                        <StatItem label="Habitantes/Dom" value={`${metadata?.habDomRate || '---'} hab/dom`} />
                                        <StatItem label="Consumo Per Capita" value={`${metadata?.perCapita || '---'} L/hab.dia`} />
                                        <StatItem label="K1 (Maior Dia)" value={metadata?.useK1 ? 'Habilitado' : '---'} />
                                        <StatItem label="K2 (Maior Hora)" value={metadata?.useK2 ? 'Habilitado' : '---'} />
                                        <StatItem label="Horas Abastecimento" value={`${metadata?.supplyHours || 24}h`} />
                                        <StatItem label="Taxa Atendimento" value={`${metadata?.attendanceRate || 100}%`} />
                                    </div>
                                </TechnicalSection>

                                {/* Seção 3: Estatísticas de Lotes */}
                                <TechnicalSection title="Inventário de Lotes" icon={<ChartIcon />}>
                                    <div className="space-y-4">
                                        <LotRow label="Habitacional" value={metadata?.lotsHab || 0} color="text-blue-600" bg="bg-blue-50" icon={<FolderIcon />} />
                                        <LotRow label="Comercial" value={metadata?.lotsCom || 0} color="text-indigo-600" bg="bg-indigo-50" icon={<BuildingIcon />} />
                                        <LotRow label="Institucional" value={metadata?.lotsInst || 0} color="text-slate-600" bg="bg-slate-100" icon={<SettingsIcon />} />
                                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center px-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</span>
                                            <span className="text-xl font-black text-slate-900">{(metadata?.lotsHab || 0) + (metadata?.lotsCom || 0) + (metadata?.lotsInst || 0)}</span>
                                        </div>
                                    </div>
                                </TechnicalSection>
                            </div>

                            {/* Seção 4: Ações de Gestão */}
                            <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-lg">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400">Módulos de Gestão Administrativa</h4>
                                    <span className="h-[1px] flex-1 bg-slate-100 mx-6"></span>
                                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                        <span className="text-[9px] font-black text-emerald-700 uppercase">Sincronizado via Cloud</span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-6">
                                    <ActionButton 
                                        icon={<WalletIcon />} 
                                        label="Financeiro" 
                                        sub="Propostas e Notas"
                                        onClick={() => onOpenFinance?.()}
                                        color="emerald"
                                    />
                                    <ActionButton 
                                        icon={<FileSignatureIcon />} 
                                        label="Documentação" 
                                        sub="Relatórios e Contratos"
                                        onClick={() => {
                                            try {
                                                const pData = JSON.parse(activeProject.data);
                                                onOpenDocuments?.({
                                                    ...pData,
                                                    metadata: pData.metadata || pData.projectMetadata,
                                                    _id: activeProject.id
                                                });
                                            } catch(e) {}
                                        }}
                                        color="indigo"
                                    />
                                    <ActionButton 
                                        icon={<PenToolIcon />} 
                                        label="Editar Metadados" 
                                        sub="Informações de Capa"
                                        onClick={() => onEditMetadata?.(activeProject)}
                                        color="slate"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rodapé Único */}
                <div className="h-14 bg-white border-t border-slate-200 px-8 flex items-center justify-between shrink-0 relative z-10">
                    <div className="flex items-center gap-6 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> HydroFlow Pro Enterprise</span>
                        <span className="text-slate-200 font-light">|</span>
                        <span>Unidade: {userOrgName || 'LICENÇA INDIVIDUAL'}</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Business Intelligence Platform v1.8.4</div>
                </div>
            </div>
        </ModalContainer>
    );
};

// Sub-componentes Auxiliares
const InfoItem = ({ icon, label, value }: any) => (
    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 text-slate-400 mb-1.5">
            <span className="text-sm">{icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest leading-none mt-0.5">{label}</span>
        </div>
        <p className="text-sm font-black text-slate-800 uppercase truncate">{value}</p>
    </div>
);

const TechnicalSection = ({ title, icon, children }: any) => (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-sm flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-50">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">{icon}</div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mt-1">{title}</h4>
        </div>
        <div className="flex-1">{children}</div>
    </div>
);

const StatItem = ({ label, value }: any) => (
    <div>
        <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">{label}</h5>
        <p className="text-sm font-black text-slate-700 uppercase">{value}</p>
    </div>
);

const LotRow = ({ label, value, color, bg, icon }: any) => (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${bg} ${color}`}>{icon}</div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        </div>
        <span className={`text-base font-black ${color}`}>{value}</span>
    </div>
);

const ActionButton = ({ icon, label, sub, onClick, color }: any) => {
    const colorSchemes: any = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-400 active:bg-emerald-200 shadow-emerald-500/10',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 active:bg-indigo-200 shadow-indigo-500/10',
        slate: 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-400 active:bg-slate-300 shadow-slate-500/10'
    };
    
    const scheme = colorSchemes[color] || colorSchemes.slate;
    
    return (
        <button 
            type="button" 
            onClick={onClick} 
            className={`flex items-center gap-5 px-8 py-6 rounded-3xl border transition-all text-left group min-w-[280px] shadow-lg hover:-translate-y-1 active:scale-[0.98] ${scheme}`}
        >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-white transition-transform group-hover:scale-110">
                {icon}
            </div>
            <div>
                <h4 className="font-black text-base uppercase leading-none mb-1.5">{label}</h4>
                <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{sub}</p>
            </div>
        </button>
    );
};


const DropIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
    </svg>
);
