
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ProjectMetadata, BudgetItem, BudgetData, Proposal, PaymentStage, Organization, ProposalCategory } from '../types';
import { generateBudgetHtml, resolveContractorName } from '../services/contractService';
import { ModalContainer, SmartNumberInput } from './CommonUI';
import { CloseIcon, CalculatorIcon, SaveIcon, PlusIcon, TrashIcon, CheckIcon, LayersIcon, EyeIcon, PenToolIcon, HammerIcon, LayoutIcon, FilePdfIcon } from './Icons';
import { updateProjectInCloud, getCloudProjects, getOrganizationDetails, generateNextProposalNumber } from '../services/firebaseService';

interface BudgetEditorModalProps {
    metadata: ProjectMetadata;
    userOrgName?: string;
    currentUser?: any;
    onClose: () => void;
    initialProposalId?: string;
    initialCategory?: ProposalCategory; // Optional: Force category for new
}

const DEFAULT_STAGES: Omit<PaymentStage, 'id'>[] = [
    { description: 'Assinatura do contrato', percentage: 40 },
    { description: 'Protocolo do documento', percentage: 30 },
    { description: 'Aprovação do projeto', percentage: 30 }
];

/**
 * ATENÇÃO: Este arquivo contém o PREVIEW do orçamento.
 * SEMPRE que atualizar o visual aqui, certifique-se de atualizar o gerador de PDF em services/contractService.ts.
 * O preview e o PDF devem ser espelhos um do outro.
 */

export const BudgetEditorModal: React.FC<BudgetEditorModalProps> = ({ metadata, userOrgName, currentUser, onClose, initialProposalId, initialCategory }) => {
    // Carrega a última proposta apenas como modelo inicial
    const lastProposal = metadata.proposals && metadata.proposals.length > 0 
        ? metadata.proposals[metadata.proposals.length - 1] 
        : null;

    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Local state for proposals to ensure UI updates immediately
    const [localProposals, setLocalProposals] = useState<Proposal[]>(metadata.proposals || []);

    // Sync local proposals when metadata changes
    useEffect(() => {
        setLocalProposals(metadata.proposals || []);
    }, [metadata.proposals]);

    // Determines the mode. If initialProposalId exists, use its category. Else use initialCategory or default to subdivision.
    const [category, setCategory] = useState<ProposalCategory>(initialCategory || 'subdivision');

    // Estados do Formulário
    const [projectType, setProjectType] = useState<'water' | 'sewage' | 'both'>(lastProposal?.projectType || 'both');
    const [waterRate, setWaterRate] = useState(lastProposal?.waterRate ?? 35.00);
    const [sewageRate, setSewageRate] = useState(lastProposal?.sewageRate ?? 45.00);
    const [evtePrice, setEvtePrice] = useState(lastProposal?.evtePrice ?? 1500.00);
    const [evteQty, setEvteQty] = useState(lastProposal?.evteQty ?? 1);
    const [hasEvte, setHasEvte] = useState(lastProposal?.hasEvte ?? true);
    const [hasBooster, setHasBooster] = useState(lastProposal?.hasBooster ?? false);
    const [boosterPrice, setBoosterPrice] = useState(lastProposal?.boosterPrice ?? 2500.00);
    const [boosterQty, setBoosterQty] = useState(lastProposal?.boosterQty ?? 1);
    const [hasLiftStation, setHasLiftStation] = useState(lastProposal?.hasLiftStation ?? false);
    const [liftStationPrice, setLiftStationPrice] = useState(lastProposal?.liftStationPrice ?? 3500.00);
    const [liftStationQty, setLiftStationQty] = useState(lastProposal?.liftStationQty ?? 1);
    const [extraItems, setExtraItems] = useState<BudgetItem[]>(lastProposal?.extraItems || []);
    // Default validity changed to 30 days
    const [validityDays, setValidityDays] = useState(lastProposal?.validityDays ?? 30);
    const [paymentStages, setPaymentStages] = useState<PaymentStage[]>(
        lastProposal?.paymentStages || DEFAULT_STAGES.map(s => ({ ...s, id: `stg-${Math.random().toString(36).substr(2, 9)}` }))
    );
    
    // States for New Extra Item Input
    const [newExtraDesc, setNewExtraDesc] = useState('');
    const [newExtraVal, setNewExtraVal] = useState(0);

    const [isSaving, setIsSaving] = useState(false);
    const [previewScale, setPreviewScale] = useState(1);
    const [showHistory, setShowHistory] = useState(false); // Toggle do menu lateral
    
    const [orgDetails, setOrgDetails] = useState<Organization | undefined>(undefined);

    const previewContainerRef = useRef<HTMLDivElement>(null);
    const totalLots = (metadata.lotsHab || 0) + (metadata.lotsCom || 0) + (metadata.lotsInst || 0);
    const contractorName = useMemo(() => resolveContractorName(metadata, userOrgName), [metadata, userOrgName]);

    // Fetch Organization Details for Branding
    useEffect(() => {
        const fetchOrg = async () => {
            if (metadata.organizationId && metadata.organizationId !== 'legacy') {
                const org = await getOrganizationDetails(metadata.organizationId);
                if (org) setOrgDetails(org);
            }
        };
        fetchOrg();
    }, [metadata.organizationId]);

    // Carregar proposta para edição
    const handleLoadProposal = (p: Proposal) => {
        setEditingId(p.id);
        setCategory(p.category || 'subdivision'); // Load category
        setProjectType(p.projectType);
        setWaterRate(p.waterRate);
        setSewageRate(p.sewageRate);
        setEvtePrice(p.evtePrice);
        setEvteQty(p.evteQty ?? 1);
        setHasEvte(p.hasEvte);
        setHasBooster(p.hasBooster);
        setBoosterPrice(p.boosterPrice);
        setBoosterQty(p.boosterQty ?? 1);
        setHasLiftStation(p.hasLiftStation);
        setLiftStationPrice(p.liftStationPrice);
        setLiftStationQty(p.liftStationQty ?? 1);
        setExtraItems(p.extraItems || []);
        setValidityDays(p.validityDays);
        setPaymentStages(p.paymentStages || []);
        setShowHistory(false); // Fecha a lista para mostrar o editor
    };

    // Effect to load initial proposal if provided
    useEffect(() => {
        if (initialProposalId && metadata.proposals) {
            const prop = metadata.proposals.find(p => p.id === initialProposalId);
            if (prop) {
                handleLoadProposal(prop);
            }
        }
    }, [initialProposalId, metadata.proposals]);

    // Ajuste de escala do preview
    useEffect(() => {
        const updateScale = () => {
            if (previewContainerRef.current) {
                const containerWidth = previewContainerRef.current.offsetWidth - 64;
                const docWidth = 794; // A4 width in pixels approx
                const scale = Math.min(containerWidth / docWidth, 1);
                setPreviewScale(scale);
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // Get current proposal data for display
    const currentProposal = useMemo(() => {
        if (editingId && localProposals) {
            return localProposals.find(p => p.id === editingId);
        }
        return null;
    }, [editingId, localProposals]);

    const proposalNumberDisplay = currentProposal ? currentProposal.number : '---';
    const revisionDisplay = currentProposal ? (currentProposal.revision || 0) : 0;

    // Detect changes between current state and saved proposal
    const hasChanges = useMemo(() => {
        if (!editingId) return true; // New proposal is always "changed" relative to saved state
        if (!currentProposal) return false;

        const isDifferent = 
            category !== currentProposal.category ||
            projectType !== currentProposal.projectType ||
            waterRate !== currentProposal.waterRate ||
            sewageRate !== currentProposal.sewageRate ||
            evtePrice !== currentProposal.evtePrice ||
            evteQty !== (currentProposal.evteQty ?? 1) ||
            hasEvte !== currentProposal.hasEvte ||
            hasBooster !== currentProposal.hasBooster ||
            boosterPrice !== currentProposal.boosterPrice ||
            boosterQty !== (currentProposal.boosterQty ?? 1) ||
            hasLiftStation !== currentProposal.hasLiftStation ||
            liftStationPrice !== currentProposal.liftStationPrice ||
            liftStationQty !== (currentProposal.liftStationQty ?? 1) ||
            validityDays !== currentProposal.validityDays ||
            JSON.stringify(extraItems) !== JSON.stringify(currentProposal.extraItems) ||
            JSON.stringify(paymentStages) !== JSON.stringify(currentProposal.paymentStages);
            
        return isDifferent;
    }, [
        editingId, currentProposal, category, projectType, waterRate, sewageRate, 
        evtePrice, hasEvte, hasBooster, boosterPrice, hasLiftStation, 
        liftStationPrice, validityDays, extraItems, paymentStages
    ]);

    // Helper for rounding
    const round = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

    // Itens Automáticos baseados na configuração (ONLY FOR SUBDIVISION)
    const autoItems = useMemo(() => {
        if (category === 'service') return []; 

        const items: BudgetItem[] = [];
        if (hasEvte) items.push({ id: 'evte', description: 'Solicitação de Viabilidade Técnica e Econômica (EVTE)', unit: 'un', quantity: evteQty, unitPrice: evtePrice, totalPrice: round(evteQty * evtePrice), isAuto: true });
        if (projectType === 'water' || projectType === 'both') {
            items.push({ id: 'water_proj', description: 'Projeto Executivo de Rede de Água', unit: 'lote', quantity: totalLots, unitPrice: waterRate, totalPrice: round(totalLots * waterRate), isAuto: true });
            if (hasBooster) items.push({ id: 'booster', description: 'Estação Pressurizadora (Booster)', unit: 'un', quantity: boosterQty, unitPrice: boosterPrice, totalPrice: round(boosterQty * boosterPrice), isAuto: true });
        }
        if (projectType === 'sewage' || projectType === 'both') {
            items.push({ id: 'sewage_proj', description: 'Projeto Executivo de Rede de Esgoto', unit: 'lote', quantity: totalLots, unitPrice: sewageRate, totalPrice: round(totalLots * sewageRate), isAuto: true });
            if (hasLiftStation) items.push({ id: 'eee', description: 'Estação Elevatória de Esgoto (EEE)', unit: 'un', quantity: liftStationQty, unitPrice: liftStationPrice, totalPrice: round(liftStationQty * liftStationPrice), isAuto: true });
        }
        return items;
    }, [category, projectType, totalLots, waterRate, sewageRate, hasEvte, evtePrice, evteQty, hasBooster, boosterPrice, boosterQty, hasLiftStation, liftStationPrice, liftStationQty]);

    const allItems = useMemo(() => {
        return [...autoItems, ...extraItems].filter(item => item.totalPrice > 0);
    }, [autoItems, extraItems]);

    const totalValue = allItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const handleAddExtra = () => {
        if (!newExtraDesc.trim() || newExtraVal <= 0) return;
        const newItem: BudgetItem = {
            id: `ex-${Date.now()}`,
            description: newExtraDesc,
            unit: 'vb',
            quantity: 1,
            unitPrice: newExtraVal,
            totalPrice: newExtraVal
        };
        setExtraItems([...extraItems, newItem]);
        setNewExtraDesc('');
        setNewExtraVal(0);
    };

    const handleNewProposal = () => {
        setEditingId(null);
        setValidityDays(30); 
        setShowHistory(false);
    };

    const handleDeleteProposal = async (id: string) => {
        if (!confirm("Tem certeza que deseja EXCLUIR esta proposta? Esta ação é irreversível.")) return;
        if (!metadata._id) return alert("Erro: ID do projeto inválido.");
        
        setIsSaving(true);
        try {
            const orgFilter = currentUser?.role === 'master' ? 'MASTER_ACCESS' : currentUser?.organizationId;
            const allProjects = await getCloudProjects(orgFilter);
            const currentProject = allProjects.find(p => p.id === metadata._id);
            
            if (!currentProject) throw new Error("Projeto não encontrado na nuvem.");

            const projectData = JSON.parse(currentProject.data);
            const updatedProposals = (projectData.metadata.proposals || []).filter((p: Proposal) => p.id !== id);
            projectData.metadata.proposals = updatedProposals;

            await updateProjectInCloud(metadata._id!, metadata.name, projectData);
            
            // Atualiza localmente
            metadata.proposals = updatedProposals;
            setLocalProposals(updatedProposals);
            
            if (editingId === id) handleNewProposal();
            
            alert("Proposta excluída com sucesso.");
        } catch (e: any) {
            console.error(e);
            alert("Erro ao excluir: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!metadata._id) return alert("Erro: ID do projeto inválido.");
        setIsSaving(true);

        try {
            const orgFilter = currentUser?.role === 'master' ? 'MASTER_ACCESS' : currentUser?.organizationId;
            const allProjects = await getCloudProjects(orgFilter);
            const currentProject = allProjects.find(p => p.id === metadata._id);
            
            if (!currentProject) throw new Error("Projeto não sincronizado.");

            const projectData = JSON.parse(currentProject.data);
            let currentProposals: Proposal[] = projectData.metadata.proposals || [];

            const now = new Date().toISOString();
            
            let finalNumber = '';
            let finalRevision = 0;

            if (editingId) {
                // Editing existing: Keep Number, Increment Revision
                const existing = currentProposals.find(p => p.id === editingId);
                if (existing) {
                    finalNumber = existing.number;
                    finalRevision = (existing.revision || 0) + 1;
                } else {
                    // Fallback (should not happen)
                    finalNumber = await generateNextProposalNumber();
                }
            } else {
                // New Proposal: Generate Global Number, Rev 0
                finalNumber = await generateNextProposalNumber();
                finalRevision = 0;
            }

            const proposalData: Proposal = {
                id: editingId || `prop-${Date.now()}`,
                number: finalNumber,
                revision: finalRevision,
                category: category, 
                status: editingId ? (currentProposals.find(p => p.id === editingId)?.status || 'pending') : 'pending',
                generatedBy: currentUser?.username || 'Usuário',
                createdAt: editingId ? (currentProposals.find(p => p.id === editingId)?.createdAt || now) : now,
                projectType, waterRate, sewageRate, evtePrice, evteQty, hasEvte, hasBooster, 
                boosterPrice, boosterQty, hasLiftStation, liftStationPrice, liftStationQty, extraItems, 
                validityDays, paymentStages, totalValue
            };

            if (editingId) {
                currentProposals = currentProposals.map(p => p.id === editingId ? proposalData : p);
            } else {
                currentProposals.push(proposalData);
            }

            projectData.metadata.proposals = currentProposals;
            await updateProjectInCloud(metadata._id, metadata.name, projectData);
            
            metadata.proposals = currentProposals;
            setLocalProposals(currentProposals);
            
            if (!editingId) {
                setEditingId(proposalData.id); 
            }
            
            alert(editingId ? `Proposta atualizada para Revisão ${finalRevision}!` : `Proposta ${finalNumber} gerada com sucesso!`);
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        const budgetData: BudgetData = { 
            companyName: contractorName, 
            clientName: metadata.company || 'CLIENTE', 
            projectName: metadata.name, 
            city: metadata.city, 
            date: new Date().toLocaleDateString('pt-BR'), 
            totalLots, 
            items: allItems, 
            totalValue, 
            validityDays, 
            paymentStages, 
            proposalNumber: proposalNumberDisplay,
            revision: revisionDisplay,
            generatedBy: currentUser?.username || 'Sistema',
            organization: orgDetails,
            category: category,
            projectType: projectType
        };
        const html = generateBudgetHtml(budgetData);
        const win = window.open('', '_blank');
        if (win) { win.document.write(html); win.document.close(); }
    };

    const pColor = orgDetails?.primaryColor || '#10b981';
    const sColor = orgDetails?.secondaryColor || '#f0fdf4';

    const isSubdivision = !category || category === 'subdivision';
    let subHeader = 'INFRAESTRUTURA E SANEAMENTO';
    if (isSubdivision) {
        if (projectType === 'both') {
            subHeader = 'ELABORAÇÃO DE PROJETOS DE ABASTECIMENTO DE ÁGUA E ESGOTAMENTO SANITÁRIO.';
        } else if (projectType === 'water') {
            subHeader = 'ELABORAÇÃO DE PROJETOS DE ABASTECIMENTO DE ÁGUA.';
        } else if (projectType === 'sewage') {
            subHeader = 'ELABORAÇÃO DE PROJETOS DE ESGOTAMENTO SANITÁRIO.';
        }
    }

    return (
        <ModalContainer onClose={onClose} zIndex="z-[8000]" backdropClass="bg-slate-900/70 backdrop-blur-md" closeOnBackdropClick={false}>
            <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-[95vw] h-[95vh] flex flex-col overflow-hidden border border-white/20 animate-slide-up">
                
                {/* Header */}
                <div className="bg-white px-6 py-4 flex justify-between items-center border-b border-slate-200 shrink-0 shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-colors ${editingId ? 'bg-orange-500 shadow-orange-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                            {editingId ? <PenToolIcon /> : <CalculatorIcon />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                {editingId ? 'Editando Proposta' : 'Nova Proposta'}
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold">
                                    {category === 'subdivision' ? 'Loteamento' : 'Obra / Serviço'}
                                </span>
                            </h2>
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">{metadata.name}</span>
                                <span className="text-slate-300">|</span>
                                <span className={editingId ? 'text-orange-500' : 'text-emerald-600'}>
                                    {editingId ? `REV ${revisionDisplay} • ${proposalNumberDisplay}` : 'EM CRIAÇÃO'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {editingId && (
                            <button onClick={handleNewProposal} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all uppercase">
                                <PlusIcon /> Criar Nova
                            </button>
                        )}
                        
                        <button 
                            onClick={() => setShowHistory(!showHistory)} 
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showHistory ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <LayersIcon /> Histórico ({localProposals.length})
                        </button>

                        <button 
                            onClick={handleSave} 
                            disabled={isSaving}
                            className={`flex items-center gap-2 px-8 py-3 text-white rounded-xl text-sm font-black transition-all uppercase tracking-tight shadow-lg active:scale-95 disabled:bg-slate-300 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                        >
                            {isSaving ? "Salvando..." : editingId ? <><CheckIcon /> Atualizar Rev.</> : <><SaveIcon /> Salvar</>}
                        </button>
                        
                        <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"><CloseIcon /></button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar de Configuração */}
                    <aside className="w-[400px] shrink-0 flex flex-col bg-white border-r border-slate-200 shadow-xl z-10 relative">
                        
                        {/* Lista de Histórico */}
                        {showHistory && (
                            <div className="absolute inset-0 bg-slate-50 z-20 flex flex-col animate-fade-in border-r border-slate-200">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                                    <h5 className="text-xs font-black text-slate-600 uppercase tracking-wider">Histórico de Versões</h5>
                                    <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600"><CloseIcon/></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                    {(!localProposals || localProposals.length === 0) && (
                                        <div className="text-center text-slate-400 text-xs italic py-10">Nenhuma proposta salva.</div>
                                    )}
                                    {[...localProposals].reverse().map(p => (
                                        <div key={p.id} className={`bg-white p-3 rounded-xl border-2 transition-all shadow-sm flex flex-col gap-3 ${p.id === editingId ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-100 hover:border-slate-300'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="text-sm font-black text-slate-700">Proposta {p.number} <span className="text-slate-400 text-[10px]">R{p.revision || 0}</span></div>
                                                        {p.category === 'service' ? <HammerIcon /> : <LayoutIcon />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase">{new Date(p.createdAt).toLocaleDateString()} • {p.generatedBy}</div>
                                                </div>
                                                <div className="text-sm font-mono font-bold text-emerald-600">R$ {p.totalValue.toLocaleString('pt-BR')}</div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-slate-50">
                                                <button 
                                                    onClick={() => handleLoadProposal(p)} 
                                                    className="flex-1 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <PenToolIcon /> Editar
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProposal(p.id)} 
                                                    className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100 transition-colors hover:text-red-700"
                                                    title="Excluir"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Same editor fields as before */}
                            {category === 'subdivision' && (
                                <>
                                    <section className="space-y-4">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-blue-100 pb-1">Escopo do Projeto</h4>
                                        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                                            {['water', 'sewage', 'both'].map((t) => (
                                                <button key={t} onClick={() => setProjectType(t as any)} className={`py-2 text-[10px] font-bold rounded-lg transition-all ${projectType === t ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}>
                                                    {t === 'water' ? 'Água' : t === 'sewage' ? 'Esgoto' : 'Ambos'}
                                                </button>
                                            ))}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Valores Base</h4>
                                        <div className="space-y-3">
                                            {(projectType === 'water' || projectType === 'both') && (
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-600">R$/Lote (Água)</label>
                                                    <div className="w-24"><SmartNumberInput value={waterRate} onChange={setWaterRate} className="text-right font-bold text-slate-700" /></div>
                                                </div>
                                            )}
                                            {(projectType === 'sewage' || projectType === 'both') && (
                                                <div className="flex justify-between items-center">
                                                    <label className="text-xs font-bold text-slate-600">R$/Lote (Esgoto)</label>
                                                    <div className="w-24"><SmartNumberInput value={sewageRate} onChange={setSewageRate} className="text-right font-bold text-slate-700" /></div>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Adicionais</h4>
                                        <BudgetToggle checked={hasEvte} onChange={setHasEvte} value={evtePrice} onValueChange={setEvtePrice} qty={evteQty} onQtyChange={setEvteQty} label="EVTE" color="indigo" />
                                        <BudgetToggle checked={hasBooster} onChange={setHasBooster} value={boosterPrice} onValueChange={setBoosterPrice} qty={boosterQty} onQtyChange={setBoosterQty} label="Booster" color="blue" />
                                        <BudgetToggle checked={hasLiftStation} onChange={setHasLiftStation} value={liftStationPrice} onValueChange={setLiftStationPrice} qty={liftStationQty} onQtyChange={setLiftStationQty} label="EEE (Elevatória)" color="orange" />
                                    </section>
                                </>
                            )}

                            <section className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {category === 'service' ? 'Itens do Orçamento' : 'Itens Extras'}
                                    </h4>
                                </div>
                                
                                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <input 
                                        type="text" 
                                        value={newExtraDesc}
                                        onChange={e => setNewExtraDesc(e.target.value)}
                                        placeholder="Objeto (Descrição do serviço)" 
                                        className="w-full text-xs font-bold text-slate-700 bg-white border border-blue-200 rounded-lg p-2 mb-2 outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 shrink-0 bg-white border border-blue-200 px-2 rounded-lg flex-1">
                                            <span className="text-[10px] font-bold text-blue-400">R$</span>
                                            <SmartNumberInput 
                                                value={newExtraVal} 
                                                onChange={setNewExtraVal} 
                                                className="bg-transparent border-none p-1.5 text-xs font-black w-full text-right focus:ring-0" 
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleAddExtra}
                                            disabled={!newExtraDesc || newExtraVal <= 0}
                                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            OK
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-2">
                                    {extraItems.map(item => (
                                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-lg p-2 relative group">
                                            <button onClick={() => setExtraItems(extraItems.filter(i => i.id !== item.id))} className="absolute -top-1 -right-1 bg-white text-red-400 border border-slate-200 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"><TrashIcon/></button>
                                            <div className="mb-1">
                                                <input 
                                                    type="text" 
                                                    value={item.description} 
                                                    onChange={e => setExtraItems(extraItems.map(i => i.id === item.id ? { ...i, description: e.target.value } : i))} 
                                                    className="w-full bg-transparent text-xs font-bold outline-none text-slate-700 focus:bg-white focus:p-1 rounded" 
                                                    placeholder="Descrição" 
                                                />
                                            </div>
                                            <div className="flex justify-end items-center gap-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Qtd</span>
                                                    <div className="w-12">
                                                        <SmartNumberInput 
                                                            value={item.quantity} 
                                                            onChange={(v:number) => setExtraItems(extraItems.map(i => i.id === item.id ? { ...i, quantity: v, totalPrice: round(v*i.unitPrice) } : i))} 
                                                            className="text-center text-xs font-black bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1 py-0.5" 
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Valor</span>
                                                    <div className="w-24">
                                                        <SmartNumberInput 
                                                            value={item.unitPrice} 
                                                            onChange={(v:number) => setExtraItems(extraItems.map(i => i.id === item.id ? { ...i, unitPrice: v, totalPrice: round(v*i.quantity) } : i))} 
                                                            className="text-right text-xs font-black bg-transparent border-none focus:bg-white focus:ring-1 focus:ring-blue-200 rounded px-1 py-0.5" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Condições Gerais</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold text-slate-600">Validade da Proposta (Dias)</label>
                                        <div className="w-16"><SmartNumberInput value={validityDays} onChange={setValidityDays} className="text-right font-bold" /></div>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">Pagamento (%)</h4>
                                <div className="space-y-2">
                                    {paymentStages.map(stg => (
                                        <div key={stg.id} className="flex gap-2 items-center group">
                                            <input type="text" value={stg.description} onChange={e => setPaymentStages(paymentStages.map(s => s.id === stg.id ? { ...s, description: e.target.value } : s))} className="flex-1 text-xs border-b border-transparent focus:border-blue-300 outline-none bg-transparent" />
                                            <input type="number" value={stg.percentage} onChange={e => setPaymentStages(paymentStages.map(s => s.id === stg.id ? { ...s, percentage: parseFloat(e.target.value)||0 } : s))} className="w-10 text-right text-xs font-bold bg-slate-100 rounded px-1" />
                                            <span className="text-xs text-slate-400">%</span>
                                            <button onClick={() => setPaymentStages(paymentStages.filter(s => s.id !== stg.id))} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><TrashIcon/></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setPaymentStages([...paymentStages, { id: `stg-${Date.now()}`, description: 'Nova Etapa', percentage: 0 }])} className="text-[10px] text-blue-500 font-bold hover:underline">+ Adicionar Etapa</button>
                                </div>
                            </section>
                        </div>
                        
                        <div className="p-6 bg-slate-50 border-t border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOTAL</span>
                                <div className="text-2xl font-black text-emerald-600 tracking-tighter">
                                    R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <button 
                                onClick={handlePrint} 
                                disabled={!editingId || hasChanges}
                                className={`w-full font-black py-3 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-xs uppercase tracking-widest ${(!editingId || hasChanges) ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}
                                title={hasChanges ? "Salve as alterações para habilitar o PDF" : ""}
                            >
                                <FilePdfIcon /> {hasChanges ? "Salve para Gerar PDF" : "Gerar PDF"}
                            </button>
                        </div>
                    </aside>

                    <main ref={previewContainerRef} className="flex-1 bg-slate-200/50 flex flex-col items-center p-8 overflow-auto relative custom-scrollbar">
                        <div className="bg-white shadow-2xl overflow-hidden transition-transform duration-300 origin-top relative" style={{ width: '794px', minHeight: '1123px', padding: '18px', transform: `scale(${previewScale})`, paddingBottom: '30px' }}>
                            
                            {/* Marca D'água */}
                            {orgDetails?.logoUrl && (
                                <img 
                                    src={orgDetails.logoUrl} 
                                    alt="Watermark" 
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.15] pointer-events-none z-0" 
                                    style={{ width: '500px' }} 
                                />
                            )}

                            {/* BRANDED HEADER */}
                            <div className="flex justify-between items-end mb-8 pb-4 relative z-10" style={{borderBottom: `3px solid ${pColor}`}}>
                                <div className="text-left w-3/4">
                                    {orgDetails?.logoUrl && <img src={orgDetails.logoUrl} alt="Logo" className="h-24 mb-2 block" />}
                                    <div className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{orgDetails?.fantasyName || contractorName}</div>
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{orgDetails?.name || contractorName}</div>
                                    {orgDetails?.cnpj && <div className="text-[9px] text-slate-400 mt-0.5">CNPJ: {orgDetails.cnpj}</div>}
                                </div>
                                <div className="text-right w-1/4">
                                    <div className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Proposta Nº {proposalNumberDisplay}</div>
                                    <div className="text-[10px] font-bold text-slate-700">Data: {new Date().toLocaleDateString('pt-BR')}</div>
                                    <div className="text-[8px] text-slate-400 mt-1 uppercase font-bold">Por: {currentUser?.username || 'HydroFlow'}</div>
                                </div>
                            </div>

                            <div className="text-center mb-8 relative z-10">
                                <div className="text-base font-black text-slate-800 uppercase tracking-[0.2em]">PROPOSTA COMERCIAL</div>
                            </div>

                            <div className="mb-8 w-full relative z-10">
                                <div className="flex gap-4 mb-4">
                                    <div className="pl-3 flex-1" style={{borderLeft: `4px solid ${pColor}`}}>
                                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Objeto</label>
                                        <div className="text-[11px] font-black text-slate-800 uppercase leading-snug whitespace-nowrap">{subHeader}</div>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="pl-3 flex-1" style={{borderLeft: `4px solid ${pColor}`}}>
                                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Contratante</label>
                                        <div className="text-xs font-black text-slate-800 uppercase leading-snug">{metadata.company || '---'}</div>
                                    </div>
                                    <div className="border-l-4 border-slate-300 pl-3 flex-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Empreendimento</label>
                                        <div className="text-xs font-bold text-slate-700 leading-snug">{metadata.name} - {metadata.city}</div>
                                    </div>
                                </div>
                            </div>
                            
                            {category === 'subdivision' && (
                                <div className="mb-8 bg-slate-50 p-2 rounded text-center border border-slate-100 relative z-10">
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Base de Cálculo</div>
                                    <span className="text-sm font-black text-slate-800">{totalLots} Lotes</span>
                                </div>
                            )}

                            <table className="w-full text-left mb-8 border-separate border-spacing-0 relative z-10">
                                <thead>
                                    <tr style={{backgroundColor: pColor}}>
                                        <th className="px-4 py-2 text-[9px] font-black text-white uppercase tracking-widest rounded-l-md">Descrição</th>
                                        <th className="px-3 py-2 text-[9px] font-black text-white uppercase tracking-widest text-center">Qtd</th>
                                        <th className="px-3 py-2 text-[9px] font-black text-white uppercase tracking-widest text-right">Unitário (R$)</th>
                                        <th className="px-4 py-2 text-[9px] font-black text-white uppercase tracking-widest text-right rounded-r-md">Total (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {allItems.map((item, idx) => (
                                        <tr key={idx} className="group">
                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-700">{item.description}</td>
                                            <td className="px-3 py-3 text-[10px] font-bold text-slate-500 text-center">{item.quantity}</td>
                                            <td className="px-3 py-3 text-[10px] font-bold text-slate-500 text-right font-mono">{item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-[10px] font-black text-slate-800 text-right font-mono">{item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TOTAL</td>
                                        <td className="px-4 py-4 text-right text-lg font-black font-mono tracking-tighter" style={{color: pColor}}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-8 text-[10px] leading-relaxed text-slate-600 mb-12 relative z-10">
                                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                    <h5 className="font-black text-slate-800 uppercase mb-2 flex items-center gap-2 text-[9px]">
                                        <div className="w-1 h-1 rounded-full" style={{backgroundColor: pColor}}></div> Cronograma de Pagamento
                                    </h5>
                                    <div className="space-y-1">
                                        {paymentStages.map((stg, i) => (
                                            <div key={i} className="flex justify-between border-b border-slate-200 pb-1">
                                                <span>{stg.description}</span>
                                                <span className="font-bold text-slate-800">{stg.percentage}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-3 text-[9px]"><strong>Validade:</strong> {validityDays} dias corridos.</p>
                                </div>
                                <div className="p-4">
                                    <h5 className="font-black text-slate-800 uppercase mb-2 text-[9px]">Observações Técnicas</h5>
                                    {category === 'subdivision' ? (
                                        <ul className="list-disc list-inside space-y-1 text-[9px]"><li>Projetos conforme normas NBR/ABNT.</li><li>Incluso emissão de ART de Projeto.</li><li>Prazo de execução conforme cronograma físico.</li></ul>
                                    ) : (
                                        <ul className="list-disc list-inside space-y-1 text-[9px]"><li>Serviços executados conforme normas técnicas vigentes.</li><li>Incluso emissão de ART ou RRT.</li><li>Materiais e mão-de-obra conforme especificado.</li></ul>
                                    )}
                                </div>
                            </div>
                            
                            {/* ASSINATURA UNICA CONTRATADA FIXADA NO BOTTOM */}
                            <div className="absolute left-0 right-0 text-center flex justify-center z-10" style={{ bottom: '48px' }}>
                                <div className="w-1/2 border-t border-slate-300 pt-2">
                                    <div className="text-[9px] font-black text-slate-800 uppercase leading-tight">{orgDetails?.name || contractorName}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">CONTRATADA</div>
                                </div>
                            </div>

                            {/* Footer Stripes */}
                            <div className="absolute bottom-0 left-0 right-0 h-4 flex flex-col z-20">
                                <div className="h-1/2 w-full" style={{backgroundColor: pColor}}></div>
                                <div className="h-1/2 w-full" style={{backgroundColor: sColor}}></div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </ModalContainer>
    );
};

const BudgetToggle = ({ checked, onChange, value, onValueChange, qty, onQtyChange, label, color }: any) => {
    const colorClasses: any = {
        blue: 'text-blue-600 border-blue-200 bg-blue-50',
        orange: 'text-orange-600 border-orange-200 bg-orange-50',
        indigo: 'text-indigo-600 border-indigo-200 bg-indigo-50'
    };
    return (
        <div className={`p-3 rounded-2xl border-2 transition-all duration-300 ${checked ? `${colorClasses[color]} scale-[1.02] shadow-sm` : 'border-slate-100 bg-white'}`}>
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                        <div className={`relative w-9 h-5 rounded-full transition-colors ${checked ? (color === 'orange' ? 'bg-orange-500' : color === 'indigo' ? 'bg-indigo-500' : 'bg-blue-50') : 'bg-slate-200'}`}>
                            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only" />
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-4' : ''}`} />
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-tight truncate ${checked ? 'text-slate-800' : 'text-slate-400'}`}>{label}</span>
                    </label>
                </div>
                {checked && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
                        <div className="flex items-center gap-1.5 shrink-0 bg-white/50 px-2 py-1 rounded-lg flex-1 min-w-0">
                            <span className="text-[9px] font-bold opacity-60 uppercase">Qtd</span>
                            <SmartNumberInput value={qty} onChange={onQtyChange} className="bg-transparent border-none p-0 text-xs font-black w-full text-center focus:ring-0" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 bg-white/50 px-2 py-1 rounded-lg flex-[2] min-w-0">
                            <span className="text-[9px] font-bold opacity-60 uppercase">R$</span>
                            <SmartNumberInput value={value} onChange={onValueChange} className="bg-transparent border-none p-0 text-xs font-black w-full text-right focus:ring-0" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
