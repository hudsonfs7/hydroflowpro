
import React, { useState, useEffect, useMemo } from 'react';
import { User, ProjectMetadata, Proposal, ProposalCategory } from '../types';
import { getCloudProjects, updateProjectInCloud } from '../services/firebaseService';
import { ModalContainer } from './CommonUI';
import { 
    CloseIcon, SearchIcon, UndoIcon, CalculatorIcon, WalletIcon, CheckIcon, LayersIcon, SettingsIcon, TrashIcon, PenToolIcon, LayoutIcon, HammerIcon
} from './Icons';
import { BudgetEditorModal } from './BudgetEditorModal';

interface FinancialManagerModalProps {
    onClose: () => void;
    currentUser: User | null;
    userOrgName?: string;
    onBackToProjects: () => void;
    onOpenBudget: (metadata: ProjectMetadata, proposalId?: string) => void;
    lockedProjectId?: string | null;
}

export const FinancialManagerModal: React.FC<FinancialManagerModalProps> = ({ 
    onClose, currentUser, userOrgName, onBackToProjects, onOpenBudget, lockedProjectId = null
}) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isProposalIdValid, setIsProposalIdValid] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // New Proposal Type Handling
    const [showNewProposalMenu, setShowNewProposalMenu] = useState(false);
    const [activeBudgetEditor, setActiveBudgetEditor] = useState<{ meta: ProjectMetadata, category: ProposalCategory, proposalId?: string } | null>(null);

    // Estado para edição do pagamento da proposta aceita
    const [paymentEditValue, setPaymentEditValue] = useState("");

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

    useEffect(() => { load(); }, [currentUser]);

    const scopedProjects = useMemo(() => {
        if (!lockedProjectId) return projects;
        return projects.filter(p => p.id === lockedProjectId);
    }, [projects, lockedProjectId]);

    // Enhanced Search: Filter by Project Name OR Proposal Number within the project
    const filteredProjects = scopedProjects.filter(p => {
        const searchText = search.toLowerCase();
        const name = (p.name || "").toLowerCase();
        
        // Check project name
        if (name.includes(searchText)) return true;

        // Check proposal numbers deep inside
        try {
            const meta = JSON.parse(p.data).metadata as ProjectMetadata;
            if (meta && meta.proposals) {
                return meta.proposals.some(prop => prop.number.toLowerCase().includes(searchText));
            }
        } catch(e) {}
        
        return false;
    });

    const selectedProject = useMemo(() => {
        if (!selectedId) return null;
        return scopedProjects.find(proj => proj.id === selectedId) || null;
    }, [selectedId, scopedProjects]);

    const selectedMetadata = useMemo(() => {
        if (!selectedProject) return null;
        try {
            const data = JSON.parse(selectedProject.data);
            return { ...data.metadata, _id: selectedProject.id } as ProjectMetadata;
        } catch (e) {
            return null;
        }
    }, [selectedProject]);

    const acceptedProposal = useMemo(() => {
        if (!selectedMetadata?.proposals) return null;
        return selectedMetadata.proposals.find(p => p.id === selectedMetadata.acceptedProposalId) || null;
    }, [selectedMetadata]);

    useEffect(() => {
        if (acceptedProposal) {
            setPaymentEditValue(acceptedProposal.paymentInstallments || "");
        }
    }, [acceptedProposal]);

    // Reset proposal selection when changing projects
    useEffect(() => {
        setSelectedProposalId(null);
        setIsProposalIdValid(false);
        setShowDeleteConfirm(false);
    }, [selectedId]);

    useEffect(() => {
        if (!lockedProjectId) return;
        if (scopedProjects.some(p => p.id === lockedProjectId)) {
            setSelectedId(lockedProjectId);
        }
    }, [lockedProjectId, scopedProjects]);

    // Validate if the selected proposal ID actually exists in the current metadata
    useEffect(() => {
        setShowDeleteConfirm(false);
        if (selectedProposalId && selectedMetadata?.proposals) {
            const exists = selectedMetadata.proposals.some(p => String(p.id) === String(selectedProposalId));
            setIsProposalIdValid(exists);
        } else {
            setIsProposalIdValid(false);
        }
    }, [selectedProposalId, selectedMetadata]);

    const handleAcceptProposal = async (proposalId: string) => {
        if (!selectedMetadata || !selectedId) return;
        setIsSaving(true);
        try {
            const data = JSON.parse(selectedProject.data);
            data.metadata.acceptedProposalId = proposalId;
            // Atualiza status no array de propostas
            data.metadata.proposals = data.metadata.proposals.map((p: Proposal) => 
                p.id === proposalId ? { ...p, status: 'accepted' } : { ...p, status: 'pending' }
            );

            await updateProjectInCloud(selectedId, selectedMetadata.name, data);
            await load();
            alert("Proposta aceita e vinculada ao financeiro!");
        } catch (e) {
            alert("Erro ao aceitar proposta.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePaymentTerms = async () => {
        if (!selectedMetadata || !selectedId || !acceptedProposal) return;
        setIsSaving(true);
        try {
            const data = JSON.parse(selectedProject.data);
            data.metadata.proposals = data.metadata.proposals.map((p: Proposal) => 
                p.id === selectedMetadata.acceptedProposalId 
                    ? { ...p, paymentInstallments: paymentEditValue } 
                    : p
            );

            await updateProjectInCloud(selectedId, selectedMetadata.name, data);
            await load();
            alert("Condições de pagamento atualizadas!");
        } catch (e) {
            alert("Erro ao salvar.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteProposal = async () => {
        if (!selectedId || !selectedProposalId) {
            setShowDeleteConfirm(false);
            return;
        }

        setIsSaving(true);
        try {
            // 1. Buscar o projeto atualizado diretamente da lista
            const project = projects.find(p => p.id === selectedId);
            if (!project) {
                throw new Error("Projeto não encontrado.");
            }

            // 2. Parse dos dados
            const data = JSON.parse(project.data);
            const proposals = data.metadata.proposals || [];
            
            // 3. Filtrar com comparação flexível (ID pode ser string ou number)
            const initialCount = proposals.length;
            const updatedProposals = proposals.filter((p: any) => String(p.id) !== String(selectedProposalId));

            if (updatedProposals.length === initialCount) {
                throw new Error("A proposta selecionada não foi encontrada nos dados do projeto.");
            }

            // 4. Atualizar objeto de dados
            data.metadata.proposals = updatedProposals;
            
            // Limpar aceite se for a proposta deletada
            if (String(data.metadata.acceptedProposalId) === String(selectedProposalId)) {
                data.metadata.acceptedProposalId = null;
            }

            // 5. Salvar no Firebase
            await updateProjectInCloud(selectedId, project.name, data);

            // 6. Atualização otimista imediata para parecer instantâneo
            setProjects(prev => prev.map(p => 
                p.id === selectedId ? { ...p, data: JSON.stringify(data) } : p
            ));
            
            // 7. Limpar seleções
            setSelectedProposalId(null);
            setIsProposalIdValid(false);
            setShowDeleteConfirm(false);
            
            // Recarregar em background para garantir sincronia
            load();

        } catch (err: any) {
            console.error("Erro na exclusão:", err);
            setShowDeleteConfirm(false);
        } finally {
            setIsSaving(false);
        }
    };

    const openInternalBudget = (category: ProposalCategory, proposalId?: string) => {
        if (selectedMetadata) {
            setActiveBudgetEditor({ meta: selectedMetadata, category, proposalId });
        }
        setShowNewProposalMenu(false);
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[5500]" closeOnBackdropClick={false}>
            <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] w-[95vw] h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-slide-up-center">
                
                {/* Ribbon Financeira */}
                <div className="h-16 bg-slate-800 flex items-center justify-between px-6 shrink-0 shadow-lg z-10">
                    <div className="flex items-center gap-1">
                        {!lockedProjectId && (
                            <>
                                <RibbonButton icon={<UndoIcon/>} label="Voltar para Projetos" onClick={onBackToProjects} active />
                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                            </>
                        )}
                        
                        {/* New Proposal Group */}
                        <div className="relative">
                            <RibbonButton 
                                icon={<CalculatorIcon/>} 
                                label="Criar Proposta" 
                                disabled={!selectedId} 
                                onClick={() => setShowNewProposalMenu(!showNewProposalMenu)}
                                active={showNewProposalMenu}
                            />
                            {showNewProposalMenu && (
                                <div className="absolute top-full left-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 flex flex-col animate-fade-in overflow-hidden">
                                    <button onClick={() => openInternalBudget('subdivision')} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left text-xs font-bold text-slate-700 border-b border-slate-50">
                                        <LayoutIcon /> Loteamento
                                    </button>
                                    <button onClick={() => openInternalBudget('service')} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left text-xs font-bold text-slate-700">
                                        <HammerIcon /> Obra / Serviço
                                    </button>
                                </div>
                            )}
                        </div>

                        {selectedProposalId && (
                            <>
                                <div className="w-[1px] h-8 bg-slate-700 mx-2"></div>
                                <RibbonButton 
                                    icon={<PenToolIcon/>} 
                                    label="Editar Proposta" 
                                    onClick={() => {
                                        if (selectedMetadata) {
                                            const prop = selectedMetadata.proposals?.find(p => p.id === selectedProposalId);
                                            if (prop) openInternalBudget(prop.category || 'subdivision', selectedProposalId);
                                        }
                                    }} 
                                    active 
                                />
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Botão de Deletar (Lixeira) com Confirmação Inline */}
                        {showDeleteConfirm ? (
                            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 animate-fade-in">
                                <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">Excluir?</span>
                                <button onClick={handleDeleteProposal} disabled={isSaving} className="text-[10px] font-black bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors">Sim</button>
                                <button onClick={() => setShowDeleteConfirm(false)} disabled={isSaving} className="text-[10px] font-black text-slate-500 hover:text-slate-700 px-2 py-1 transition-colors">Não</button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                disabled={!selectedProposalId || isSaving}
                                onClick={() => setShowDeleteConfirm(true)}
                                className={`p-2 rounded-lg transition-all duration-300 ${
                                    selectedProposalId 
                                    ? 'text-red-500 bg-red-500/10 hover:bg-red-500/30 opacity-100 cursor-pointer' 
                                    : 'text-slate-600 opacity-10 cursor-not-allowed grayscale'
                                }`}
                                title="Deletar Proposta Selecionada"
                            >
                                <TrashIcon />
                            </button>
                        )}

                        <div className="relative">
                            <input type="text" placeholder="Consultar financeiro..." className="bg-slate-700 text-white text-xs rounded-lg py-2 pl-8 pr-4 border-none focus:ring-2 focus:ring-indigo-500 w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
                            <div className="absolute left-2.5 top-2 text-slate-400"><SearchIcon/></div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><CloseIcon/></button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex bg-slate-50">
                    {/* Lista de Projetos */}
                    <div className="w-1/2 border-r border-slate-200 overflow-auto p-4 custom-scrollbar">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3 border-b border-slate-200">Empreendimento</th>
                                        <th className="px-4 py-3 border-b border-slate-200 text-right">Propostas</th>
                                        <th className="px-4 py-3 border-b border-slate-200 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={3} className="p-20 text-center text-slate-400 italic">Carregando...</td></tr>
                                    ) : filteredProjects.length === 0 ? (
                                        <tr><td colSpan={3} className="p-20 text-center text-slate-400 italic">Nenhum projeto encontrado.</td></tr>
                                    ) : filteredProjects.map(p => {
                                        let meta: any = {};
                                        try { meta = JSON.parse(p.data).metadata || {}; } catch(e) {}
                                        const isSelected = selectedId === p.id;
                                        const hasAccepted = !!meta.acceptedProposalId;
                                        // Count matches inside logic
                                        const totalProposals = meta.proposals?.length || 0;
                                        
                                        return (
                                            <tr key={p.id} onClick={() => setSelectedId(isSelected ? null : p.id)} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                                                <td className={`px-4 py-4 text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{p.name}</td>
                                                <td className="px-4 py-4 text-xs text-right font-mono text-slate-400">{totalProposals}</td>
                                                <td className="px-4 py-4 text-center">
                                                    {hasAccepted ? (
                                                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-green-100 text-green-700">Aprovado</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-400">Pendente</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detalhes da Proposta Selecionada */}
                    <div className="flex-1 p-6 overflow-auto custom-scrollbar">
                        {selectedMetadata ? (
                            <div className="animate-fade-in space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedMetadata.name}</h3>
                                        <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">{selectedMetadata.company}</p>
                                    </div>
                                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="text-center">
                                            <div className="text-[9px] font-black text-slate-400 uppercase">Propostas Enviadas</div>
                                            <div className="text-lg font-black text-slate-700">{(selectedMetadata.proposals?.length || 0)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                        <LayersIcon /> Histórico de Versões
                                    </h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedMetadata.proposals?.map(prop => {
                                            const isPropSelected = prop.id === selectedProposalId;
                                            const isService = prop.category === 'service';
                                            return (
                                                <div 
                                                    key={prop.id} 
                                                    onClick={() => setSelectedProposalId(isPropSelected ? null : prop.id)}
                                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${prop.id === selectedMetadata.acceptedProposalId ? 'border-green-500 bg-green-50/30' : isPropSelected ? 'border-indigo-400 bg-indigo-50 shadow-md ring-2 ring-indigo-200' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${prop.id === selectedMetadata.acceptedProposalId ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                {prop.number.split('/')[0]}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="text-sm font-black text-slate-700">Proposta {prop.number}</div>
                                                                    {isService && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Serviço</span>}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{prop.generatedBy} • {new Date(prop.createdAt).toLocaleDateString()}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex items-center gap-4">
                                                            <div className="text-sm font-mono font-black text-slate-800">R$ {prop.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                            {prop.id === selectedMetadata.acceptedProposalId ? (
                                                                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">Aceita</span>
                                                            ) : (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); handleAcceptProposal(prop.id); }}
                                                                    className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black hover:bg-indigo-700 transition-colors uppercase"
                                                                >
                                                                    Aceitar Esta
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!selectedMetadata.proposals || selectedMetadata.proposals.length === 0) && (
                                            <div className="p-12 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-2xl">
                                                Nenhuma proposta gerada para este empreendimento.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {acceptedProposal && (
                                    <div className="bg-slate-800 rounded-2xl p-6 text-white shadow-xl animate-slide-up">
                                        <div className="flex items-center gap-2 mb-4 text-emerald-400">
                                            <WalletIcon />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Controle de Recebimento (Proposta Ativa: {acceptedProposal.number})</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Definir Parcelamento / Condições de Aceite</label>
                                                <textarea 
                                                    value={paymentEditValue}
                                                    onChange={e => setPaymentEditValue(e.target.value)}
                                                    placeholder="Ex: 25% entrada + 25% entrega diretrizes + 50% entrega final"
                                                    className="w-full h-24 bg-slate-700 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                                />
                                                <button 
                                                    onClick={handleSavePaymentTerms}
                                                    disabled={isSaving}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-2 px-6 rounded-lg text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                                                >
                                                    <CheckIcon /> Atualizar Condições
                                                </button>
                                            </div>

                                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Valor Total do Contrato</div>
                                                <div className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">
                                                    R$ {acceptedProposal.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="mt-4 text-[10px] text-slate-500 leading-relaxed italic">
                                                    Uma vez aceita, a proposta define o valor base do faturamento. Para alterar o valor, emita uma nova revisão técnica.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                                <CalculatorIcon className="w-12 h-12" />
                                <p className="font-bold uppercase text-xs tracking-widest">Selecione um projeto para gerenciar o financeiro</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-10 bg-white border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase">
                        <span>Filtro: {filteredProjects.length} Projetos</span>
                        <span>•</span>
                        <span>HydroFlow Financial v2.0</span>
                    </div>
                </div>
            </div>

            {/* Budget Editor Modal when triggered internally */}
            {activeBudgetEditor && (
                <BudgetEditorModal 
                    metadata={activeBudgetEditor.meta}
                    userOrgName={userOrgName}
                    initialCategory={activeBudgetEditor.category}
                    initialProposalId={activeBudgetEditor.proposalId}
                    onClose={() => { setActiveBudgetEditor(null); load(); }}
                />
            )}
        </ModalContainer>
    );
};

const RibbonButton = ({ icon, label, onClick, disabled, active, variant = 'default' }: any) => {
    const baseClass = "flex flex-col items-center justify-center h-12 px-4 rounded-lg transition-all gap-1 outline-none relative overflow-hidden";
    let colorClass = "";
    if (disabled) colorClass = "opacity-30 grayscale cursor-not-allowed text-slate-300";
    else if (active) colorClass = "bg-indigo-600 text-white hover:bg-indigo-500";
    else if (variant === 'danger') colorClass = "text-red-400 hover:bg-red-900/30 hover:text-red-200";
    else colorClass = "text-slate-300 hover:bg-slate-700 hover:text-white";

    return (
        <button type="button" disabled={disabled} onClick={onClick} className={`${baseClass} ${colorClass}`}>
            <span className="text-lg relative z-10">{icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tight relative z-10">{label}</span>
        </button>
    );
};
