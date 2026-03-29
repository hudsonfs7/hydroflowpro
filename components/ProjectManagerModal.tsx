import React, { useState, useEffect, useMemo } from 'react';
import { User, ProjectMetadata } from '../types';
import { getCloudProjects, updateProjectInCloud } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { CloseIcon, MapIcon, WalletIcon, FileSignatureIcon, PenToolIcon, BuildingIcon, ChartIcon, UserIcon, WaypointIcon, SettingsIcon, FolderIcon, CheckIcon } from './Icons';

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

    // New States for Observations
    const [showNewObs, setShowNewObs] = useState(false);
    const [newObsText, setNewObsText] = useState("");
    const [newObsPublic, setNewObsPublic] = useState(true);

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

    // Cálculos de Vazão para o Quadro de Resumo
    const summaryFlows = useMemo(() => {
        if (!metadata) return { pop: 0, qRes: 0, qCom: 0, qInst: 0, qTotal: 0 };
        const k1 = metadata.useK1 ? 1.2 : 1;
        const k2 = metadata.useK2 ? 1.5 : 1;
        const currentK = k1 * k2;
        const hours = metadata.supplyHours || 24;
        const seconds = hours * 3600;

        const pop = (metadata.lotsHab || 0) * (metadata.habDomRate || 2.8);
        const qRes = seconds > 0 ? ((pop * (metadata.perCapita || 120)) / seconds) * currentK : 0;
        
        const volCom = (metadata.lotsCom || 0) * (metadata.consumptionCom || 0);
        const qCom = seconds > 0 ? (volCom / seconds) * currentK : 0;

        const popAtendida = pop * ((metadata.attendanceRate || 100) / 100);
        const qInst = (seconds > 0 && metadata.lotsInst && metadata.lotsInst > 0) ? ((popAtendida * (metadata.consumptionInst || 0)) / seconds) * currentK : 0;

        return {
            pop: Math.round(pop),
            qRes,
            qCom,
            qInst,
            qTotal: qRes + qCom + qInst
        };
    }, [metadata]);

    // Handlers
    const handleUpdateStatus = async (field: string, value: string) => {
        if (!activeProject || !metadata) return;
        const newStatus = { ...(metadata.projectStatus || { evte: 'Pendente', water: 'Andamento', sewage: 'Andamento' }), [field]: value };
        const updatedMetadata = { ...metadata, projectStatus: newStatus };
        const pData = JSON.parse(activeProject.data);
        pData.metadata = updatedMetadata;
        
        try {
            await updateProjectInCloud(activeProject.id, activeProject.name, pData);
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, data: JSON.stringify(pData) } : p));
        } catch (e) {
            alert("Erro ao atualizar status.");
        }
    };

    const handleAddObservation = async () => {
        if (!activeProject || !metadata || !newObsText.trim()) return;
        
        const newObs: any = {
            id: Math.random().toString(36).substr(2, 9),
            text: newObsText,
            date: new Date().toISOString(),
            author: currentUser?.username || 'Sistema',
            visibleToPublic: newObsPublic,
            acknowledged: false
        };

        const updatedObs = [...(metadata.observations || []), newObs];
        const updatedMetadata = { ...metadata, observations: updatedObs };
        const pData = JSON.parse(activeProject.data);
        pData.metadata = updatedMetadata;

        try {
            await updateProjectInCloud(activeProject.id, activeProject.name, pData);
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, data: JSON.stringify(pData) } : p));
            setNewObsText("");
            setShowNewObs(false);
            
            if (newObsPublic) {
                console.log(`[SIMULAÇÃO EMAIL] Para: ${metadata.company} - Assunto: Nova atualização no projeto ${activeProject.name}. Protocolo: ${metadata.projectCode}`);
            }
        } catch (e) {
            alert("Erro ao remover observação.");
        }
    };

    const handleUpdatePortalSettings = async (settings: Partial<any>) => {
        if (!activeProject || !metadata) return;
        const newPortalSettings = { ...(metadata.portalSettings || {}), ...settings };
        const updatedMetadata = { ...metadata, portalSettings: newPortalSettings };
        const pData = JSON.parse(activeProject.data);
        pData.metadata = updatedMetadata;
        
        try {
            await updateProjectInCloud(activeProject.id, activeProject.name, pData);
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, data: JSON.stringify(pData) } : p));
        } catch (e) {
            alert("Erro ao atualizar configurações do portal.");
        }
    };

    const handleDeleteObservation = async (id: string) => {
        if (!activeProject || !metadata || !window.confirm("Excluir esta observação?")) return;
        
        const updatedObs = (metadata.observations || []).filter((o: any) => o.id !== id);
        const updatedMetadata = { ...metadata, observations: updatedObs };
        const pData = JSON.parse(activeProject.data);
        pData.metadata = updatedMetadata;

        try {
            await updateProjectInCloud(activeProject.id, activeProject.name, pData);
            setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, data: JSON.stringify(pData) } : p));
        } catch (e) {
            alert("Erro ao excluir observação.");
        }
    };

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

                    <div className="flex items-center gap-4 relative z-10">
                        <div className="flex flex-col items-end mr-2">
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Usuário Online</span>
                            <span className="text-xs font-bold text-white uppercase mt-1">{currentUser?.username || 'GUEST'}</span>
                        </div>
                        
                        <button 
                            onClick={() => onEditMetadata?.(activeProject)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/50 border border-slate-700 transition-all shadow-lg active:scale-95"
                            title="Editar Informações do Projeto"
                        >
                            <PenToolIcon />
                        </button>

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
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prot: {metadata?.projectCode || activeProjectId?.slice(0, 8)}</span>
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
                                <TechnicalSection 
                                    title="Informações de Consumo" 
                                    icon={<DropIcon />}
                                >
                                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                        <StatItem label="Lotes Residenciais" value={`${metadata?.lotsHab || 0} UNID`} />
                                        <StatItem label="Consumo Per Capita" value={`${metadata?.perCapita || '---'} L/HAB.DIA`} />
                                        <StatItem label="Taxa Hab/Dom" value={`${metadata?.habDomRate || '2.8'} HAB/DOM`} />
                                        <StatItem label="População Total" value={`${summaryFlows.pop} HAB`} />
                                        <StatItem label="Horas Abastecimento" value={`${metadata?.supplyHours || 24}H`} />
                                        <StatItem 
                                            label="Coeficientes" 
                                            value={metadata?.useK1 && metadata?.useK2 ? "K1 E K2" : metadata?.useK1 ? "SOMENTE K1" : metadata?.useK2 ? "SOMENTE K2" : "NENHUM"} 
                                        />
                                    </div>

                                    {/* Footer do Quadro: Vazões */}
                                    <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                            <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Q Residencial</div>
                                            <div className="text-sm font-black text-blue-700">{summaryFlows.qRes.toFixed(2)} <span className="text-[10px] opacity-60 ml-0.5">L/s</span></div>
                                        </div>
                                        <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                                            <div className="text-[8px] font-black text-orange-400 uppercase tracking-widest mb-1">Q Comercial</div>
                                            <div className="text-sm font-black text-orange-700">{summaryFlows.qCom.toFixed(2)} <span className="text-[10px] opacity-60 ml-0.5">L/s</span></div>
                                        </div>
                                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/50">
                                            <div className="text-[8px] font-black text-purple-400 uppercase tracking-widest mb-1">Q Institucional</div>
                                            <div className="text-sm font-black text-purple-700">{summaryFlows.qInst.toFixed(2)} <span className="text-[10px] opacity-60 ml-0.5">L/s</span></div>
                                        </div>
                                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-lg">
                                            <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Vazão Total</div>
                                            <div className="text-sm font-black text-white">{summaryFlows.qTotal.toFixed(2)} <span className="text-[10px] opacity-40 ml-0.5 text-blue-400">L/s</span></div>
                                        </div>
                                    </div>
                                </TechnicalSection>

                                {/* Seção 3: Status do Protocolo */}
                                <TechnicalSection title="Gestão de Fases / Status" icon={<ChartIcon />}>
                                    <div className="space-y-6">
                                        <StatusSelector 
                                            label="Viabilidade (EVTE)" 
                                            value={metadata?.projectStatus?.evte || 'Pendente'} 
                                            options={['Pendente', 'Emitida']}
                                            onChange={(val) => handleUpdateStatus('evte', val)}
                                        />
                                        <StatusSelector 
                                            label="Projeto de Água" 
                                            value={metadata?.projectStatus?.water || 'Andamento'} 
                                            options={['Andamento', 'Concluído']}
                                            onChange={(val) => handleUpdateStatus('water', val)}
                                        />
                                        <StatusSelector 
                                            label="Projeto de Esgoto" 
                                            value={metadata?.projectStatus?.sewage || 'Andamento'} 
                                            options={['Andamento', 'Concluído']}
                                            onChange={(val) => handleUpdateStatus('sewage', val)}
                                        />
                                    </div>
                                </TechnicalSection>
                            </div>

                            {/* Seção Nova: Diário de Observações e Protocolo */}
                            <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-sm">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><PenToolIcon /></div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mt-1">Diário de Observações do Projeto</h4>
                                    </div>
                                    <button 
                                        onClick={() => setShowNewObs(true)}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all"
                                    >
                                        Nova Anotação
                                    </button>
                                </div>

                                {showNewObs && (
                                    <div className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-slide-up">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4">Cadastrar Nova Informação</h5>
                                        <textarea 
                                            className="w-full bg-white border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 h-24 mb-4"
                                            placeholder="Descreva o andamento ou observação técnica..."
                                            value={newObsText}
                                            onChange={(e) => setNewObsText(e.target.value)}
                                        />
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={newObsPublic}
                                                    onChange={(e) => setNewObsPublic(e.target.checked)}
                                                />
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight group-hover:text-slate-900 transition-colors">Informar ao Empreendedor (Portal Público)</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <button onClick={() => setShowNewObs(false)} className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Cancelar</button>
                                                <button 
                                                    onClick={handleAddObservation}
                                                    disabled={!newObsText.trim()}
                                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                                                >
                                                    Protocolar e Salvar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {(metadata?.observations || []).length === 0 ? (
                                        <div className="py-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] border-2 border-slate-50 border-dashed rounded-3xl">
                                            Nenhum histórico registrado no protocolo
                                        </div>
                                    ) : (
                                        [...(metadata?.observations || [])].reverse().map((obs: any) => (
                                            <div key={obs.id} className="group bg-white border border-slate-100 p-5 rounded-2xl hover:border-slate-200 transition-all flex flex-col sm:flex-row gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(obs.date).toLocaleDateString()} {new Date(obs.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="text-slate-200 font-light text-[8px]">•</span>
                                                        <span className="text-[9px] font-black text-blue-500 uppercase">Por: {obs.author}</span>
                                                        {obs.visibleToPublic && (
                                                            <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded-full uppercase tracking-widest">Público</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{obs.text}</p>
                                                </div>
                                                <div className="flex items-center gap-4 sm:border-l border-slate-50 sm:pl-6 shrink-0">
                                                    {obs.visibleToPublic && (
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase mb-1">Status Empreendedor</span>
                                                            {obs.acknowledged ? (
                                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                                    <div className="w-4 h-4 bg-emerald-100 rounded-full flex items-center justify-center text-[8px]"><CheckIcon /></div>
                                                                    <span className="text-[9px] font-black uppercase">Ciente em {new Date(obs.acknowledgedAt).toLocaleDateString()}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[9px] font-black text-orange-400 uppercase">Aguardando Ciência</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <button 
                                                        onClick={() => handleDeleteObservation(obs.id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    >
                                                        <CloseIcon />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Seção 3.5: Configurações do Portal Público (Dashboards) */}
                            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative overflow-hidden mb-8">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                                
                                <div className="flex items-center justify-between mb-8 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20"><ChartIcon /></div>
                                        <div>
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white leading-none mt-1">Visibilidade no Portal do Cliente</h4>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-2 leading-none">Controle o que o empreendedor visualiza no dashboard público</p>
                                        </div>
                                    </div>
                                    <div className="bg-blue-600/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Dashboard Público</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-4">
                                        <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Exibir Módulos Técnicos</h5>
                                        <div className="grid grid-cols-2 gap-3">
                                            <PortalToggle label="EVTE" checked={metadata?.portalSettings?.showEvte} onChange={(v) => handleUpdatePortalSettings({ showEvte: v })} />
                                            <PortalToggle label="Água" checked={metadata?.portalSettings?.showWater} onChange={(v) => handleUpdatePortalSettings({ showWater: v })} />
                                            <PortalToggle label="Esgoto" checked={metadata?.portalSettings?.showSewage} onChange={(v) => handleUpdatePortalSettings({ showSewage: v })} />
                                            <PortalToggle label="Orçamento" checked={metadata?.portalSettings?.showBudget} onChange={(v) => handleUpdatePortalSettings({ showBudget: v })} />
                                            <PortalToggle label="Contrato" checked={metadata?.portalSettings?.showContract} onChange={(v) => handleUpdatePortalSettings({ showContract: v })} />
                                        </div>
                                    </div>

                                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            <span>Progresso Global</span>
                                            <span className="text-white bg-blue-600 px-2 py-0.5 rounded-full">{metadata?.portalSettings?.developmentProgress || 0}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="100" 
                                            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                                            value={metadata?.portalSettings?.developmentProgress || 0}
                                            onChange={(e) => handleUpdatePortalSettings({ developmentProgress: parseInt(e.target.value) })}
                                        />
                                        <p className="text-[8px] font-bold text-slate-500 leading-relaxed uppercase">Arraste para definir o progresso que o cliente verá no Dashboard dele.</p>
                                    </div>
                                </div>
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

const StatusSelector = ({ label, value, options, onChange }: any) => (
    <div className="flex flex-col gap-2">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</label>
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
        >
            {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
    </div>
);


const PortalToggle = ({ label, checked, onChange }: { label: string, checked?: boolean, onChange: (val: boolean) => void }) => (
    <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${checked ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
        <span className={`text-[10px] font-black uppercase tracking-tight ${checked ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}`}>{label}</span>
        <div className="relative inline-flex items-center cursor-pointer">
            <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={!!checked}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className={`w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600`}></div>
        </div>
    </label>
);

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

const TechnicalSection = ({ title, icon, children, onEdit }: any) => (
    <div className="bg-white rounded-[2rem] p-8 border border-slate-200/60 shadow-sm flex flex-col h-full">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">{icon}</div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 leading-none mt-1">{title}</h4>
            </div>
            {onEdit && (
                <button 
                    onClick={onEdit}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-90"
                    title="Editar informações técnicas"
                >
                    <PenToolIcon />
                </button>
            )}
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
