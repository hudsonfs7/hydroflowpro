
import React, { useState, useMemo, useEffect } from 'react';
import { PipeSegment, UnitSystem, FlowUnit, DemandGroup, DemandCalculatorParams } from '../types';
import { DropIcon, CloseIcon, CheckIcon, TrashIcon, PlusIcon, FolderIcon, CalculatorIcon, MapIcon } from './Icons';
import { SmartNumberInput, InputGroup } from './CommonUI';

interface DemandToolProps {
    onClose: () => void;
    selection: string[]; // Current selected pipe IDs (from map)
    setSelection: (ids: string[]) => void;
    pipes: PipeSegment[];
    flowUnit: FlowUnit;
    unitSystem: UnitSystem;
    demandDecimals: number;
    setDemandDecimals: (v: number) => void;
    
    // Group Management
    demandGroups: DemandGroup[];
    addDemandGroup: () => DemandGroup;
    updateDemandGroup: (id: string, updates: Partial<DemandGroup>) => void;
    removeDemandGroup: (id: string) => void;

    // Mobile specific
    isMobile?: boolean;
}

interface ModalProps {
    onClose: () => void;
    onApply: (flow: number, params: DemandCalculatorParams) => void;
    initialParams?: DemandCalculatorParams;
    flowUnit: FlowUnit;
    decimals: number;
}

const DemandCalculatorModal = ({ onClose, onApply, initialParams, flowUnit, decimals }: ModalProps) => {
    // Defaults: 2.8 hab/dom and 120 L/hab/day
    const [connections, setConnections] = useState(initialParams?.connections ?? 0);
    const [habPerConn, setHabPerConn] = useState(initialParams?.habPerConn ?? 2.8);
    const [perCapita, setPerCapita] = useState(initialParams?.perCapita ?? 120);
    const [kFactor, setKFactor] = useState(initialParams?.kFactor ?? 1.8);
    const [singularDemand, setSingularDemand] = useState(initialParams?.singularDemand ?? 0);
    const [supplyHours, setSupplyHours] = useState(initialParams?.supplyHours ?? 24);

    const totalPop = useMemo(() => Math.round(connections * habPerConn), [connections, habPerConn]);

    const resultFlow = useMemo(() => {
        // Volume Domestico = P * q * K
        const volDom = totalPop * perCapita * kFactor;
        // Total Volume = Domestico + Singular
        const volTotal = volDom + singularDemand;
        
        // Flow L/s = Vol / (Hours * 3600)
        // If hours is 0, avoid division by zero
        if (supplyHours <= 0) return 0;
        return volTotal / (supplyHours * 3600);
    }, [totalPop, perCapita, kFactor, singularDemand, supplyHours]);

    const handleApplyClick = () => {
        const params: DemandCalculatorParams = {
            connections,
            habPerConn,
            perCapita,
            kFactor,
            singularDemand,
            supplyHours
        };
        onApply(resultFlow, params);
    };

    return (
        <div className="fixed inset-0 z-[600] bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <CalculatorIcon /> Calculadora de Vazão
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800 text-xs mb-2">
                        Q = (Pop × q × K + Qsing) / (T × 3600)
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Nº Ligações">
                            <SmartNumberInput value={connections} onChange={setConnections} className="bg-white border-slate-300" />
                        </InputGroup>
                        <InputGroup label="Hab/Ligação">
                            <SmartNumberInput value={habPerConn} onChange={setHabPerConn} className="bg-white border-slate-300" />
                        </InputGroup>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase">População Estimada</span>
                        <span className="font-mono font-bold text-slate-700">{totalPop} hab</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <InputGroup label="Consumo (L/hab/dia)">
                            <SmartNumberInput value={perCapita} onChange={setPerCapita} className="bg-white border-slate-300" />
                        </InputGroup>
                        <InputGroup label="Coeficiente K (K1xK2)">
                            <SmartNumberInput value={kFactor} onChange={setKFactor} className="bg-white border-slate-300" />
                        </InputGroup>
                    </div>

                    <InputGroup label="Demanda Singular (Comercial/Inst) L/dia">
                        <SmartNumberInput value={singularDemand} onChange={setSingularDemand} className="bg-white border-slate-300" />
                    </InputGroup>

                    <div className="pt-2 border-t border-slate-100">
                        <InputGroup label="Horas de Abastecimento (T)">
                            <div className="flex items-center gap-2">
                                <SmartNumberInput value={supplyHours} onChange={setSupplyHours} className="bg-white border-slate-300 font-bold" />
                                <span className="text-xs text-slate-500 font-bold">Horas</span>
                            </div>
                        </InputGroup>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-xs font-bold text-slate-600 uppercase">Vazão Resultante</span>
                        <div className="bg-green-500 text-white px-3 py-1 rounded font-bold font-mono text-lg shadow-sm">
                            {resultFlow.toFixed(decimals)} <span className="text-xs font-normal">l/s</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleApplyClick}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg shadow-sm transition-colors"
                    >
                        Confirmar Valor
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DemandTool = ({ 
    onClose, 
    selection, 
    setSelection,
    pipes, 
    flowUnit, 
    unitSystem,
    demandDecimals,
    setDemandDecimals,
    demandGroups,
    addDemandGroup,
    updateDemandGroup,
    removeDemandGroup,
    isMobile = false
}: DemandToolProps) => {
    const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
    const [showCalculator, setShowCalculator] = useState(false);
    const [isMapSelectionMode, setIsMapSelectionMode] = useState(false);

    // Get Active Group
    const activeGroup = useMemo(() => {
        return demandGroups.find(g => g.id === activeGroupId) || null;
    }, [demandGroups, activeGroupId]);

    // Reset map selection mode when changing groups or closing
    useEffect(() => {
        if (!activeGroupId) setIsMapSelectionMode(false);
    }, [activeGroupId]);

    // Sync Selection: Map <-> Active Group
    useEffect(() => {
        if (activeGroup) {
            const groupSet = new Set<string>(activeGroup.pipeIds);
            const selectionSet = new Set<string>(selection);
            const groupArr = Array.from(groupSet);

            if (groupSet.size !== selectionSet.size || !groupArr.every((x: string) => selectionSet.has(x))) {
                setSelection(activeGroup.pipeIds);
            }
        } else {
            setSelection([]);
        }
    }, [activeGroupId]); 

    // When Map Selection changes, update Active Group (Auto-Save Pipe List)
    useEffect(() => {
        if (activeGroup) {
            const groupSet = new Set<string>(activeGroup.pipeIds);
            const selectionSet = new Set<string>(selection);
            const selectionArr = Array.from(selectionSet);
            if (groupSet.size !== selectionSet.size || !selectionArr.every((x: string) => groupSet.has(x))) {
                updateDemandGroup(activeGroup.id, { pipeIds: selection });
            }
        }
    }, [selection]); 

    // Compute detailed pipe list for the active group table
    const activeGroupPipes = useMemo(() => {
        if (!activeGroup) return [];
        const groupPipes = pipes.filter(p => activeGroup.pipeIds.includes(p.id));
        const totalLen = groupPipes.reduce((sum, p) => sum + p.length, 0);
        
        return groupPipes.map(p => ({
            ...p,
            // Calculate hypothetical demand just for display in this context
            calculatedDemand: totalLen > 0 ? (activeGroup.totalFlow * (p.length / totalLen)) : 0
        }));
    }, [activeGroup, pipes]);

    const handleCreateGroup = () => {
        const g = addDemandGroup();
        setActiveGroupId(g.id);
    };

    const handleDeleteGroup = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm("Tem certeza que deseja excluir este setor de demanda?")) {
            removeDemandGroup(id);
            if (activeGroupId === id) {
                setActiveGroupId(null);
            }
        }
    };

    const handleApply = () => {
        setActiveGroupId(null);
    };

    const handleCalculatorApply = (val: number, params: DemandCalculatorParams) => {
        const roundedVal = parseFloat(val.toFixed(demandDecimals));
        if (activeGroup) {
            updateDemandGroup(activeGroup.id, { 
                totalFlow: roundedVal,
                calculatorParams: params // Save the calculator state
            });
        }
        setShowCalculator(false);
    };

    const lenUnit = unitSystem === UnitSystem.SI ? 'm' : 'ft';

    // --- CONTENT RENDER ---
    const renderContent = () => (
        <div className="flex flex-col h-full bg-white relative animate-fade-in pointer-events-auto">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white shadow-sm z-10">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <span className="text-blue-600"><DropIcon /></span> 
                    Gerenciador de Demanda
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition">
                    <CloseIcon />
                </button>
            </div>
            
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Global Settings Bar */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-600 uppercase">Casas Decimais (Vis)</label>
                        <input 
                            type="number" 
                            min="0" max="6" 
                            value={demandDecimals} 
                            onChange={(e) => setDemandDecimals(parseInt(e.target.value))} 
                            className="w-12 text-center text-xs border border-slate-300 rounded p-1 outline-none focus:border-blue-500 bg-white text-slate-900 shadow-sm"
                        />
                    </div>
                </div>

                {/* Scenario List (Visible when NO active group) */}
                {!activeGroup ? (
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Setores de Demanda</h4>
                            <button 
                                onClick={handleCreateGroup}
                                className="text-xs bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-600 px-3 py-1.5 rounded shadow-sm flex items-center gap-1 transition-all font-medium"
                            >
                                <PlusIcon /> Novo Setor
                            </button>
                        </div>

                        <div className="space-y-3">
                            {demandGroups.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs italic border-2 border-dashed border-slate-200 rounded-lg">
                                    Nenhum setor criado. Clique em "Novo Setor" para começar.
                                </div>
                            )}
                            {demandGroups.map(group => (
                                <div 
                                    key={group.id}
                                    onClick={() => setActiveGroupId(group.id)}
                                    className="group relative p-4 rounded-lg border border-slate-200 bg-white hover:border-blue-300 cursor-pointer transition-all shadow-sm hover:shadow-md"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-sm text-slate-700 group-hover:text-blue-700 transition-colors">{group.name}</div>
                                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-medium">{group.pipeIds.length} tubos</span>
                                                <span>•</span>
                                                <span className="font-mono font-bold text-blue-600">{group.totalFlow.toFixed(demandDecimals)} {flowUnit}</span>
                                            </div>
                                        </div>
                                        <div className="text-slate-300 group-hover:text-blue-400">
                                            <FolderIcon />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => handleDeleteGroup(group.id, e)}
                                        className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Excluir Setor"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Editor Area */
                    <div className="flex flex-col h-full bg-white animate-slide-up">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                            <button onClick={() => setActiveGroupId(null)} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                ← Voltar para Lista
                            </button>
                            <span className="text-xs font-bold text-slate-400 uppercase">Editando</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-5">
                            <InputGroup label="Nome do Setor">
                                <input 
                                    type="text" 
                                    value={activeGroup.name}
                                    onChange={(e) => updateDemandGroup(activeGroup.id, { name: e.target.value })}
                                    className="w-full bg-white text-slate-900 border border-slate-300 rounded p-2 text-sm outline-none focus:border-accent shadow-sm"
                                />
                            </InputGroup>

                            <InputGroup label={`Vazão Total a Distribuir (${flowUnit})`}>
                                <div className="flex gap-2 items-center">
                                    <div className="flex-1 min-w-0">
                                        <SmartNumberInput 
                                            value={activeGroup.totalFlow} 
                                            onChange={(val: number) => updateDemandGroup(activeGroup.id, { totalFlow: val })} 
                                            placeholder="0.00"
                                            className="font-bold text-slate-800 border-slate-300 focus:border-blue-500 focus:ring-blue-200 text-base md:text-lg bg-white shadow-sm w-full"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => setShowCalculator(true)}
                                        className="bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                                        title="Calcular vazão por habitantes e horas"
                                    >
                                        <CalculatorIcon />
                                    </button>
                                </div>
                            </InputGroup>

                            {/* Pipe Selection Section */}
                            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex flex-col max-h-60">
                                <div className="p-2 border-b border-slate-200 bg-slate-100 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-600 uppercase">Tubos Selecionados ({activeGroupPipes.length})</span>
                                    {isMobile && (
                                        <button 
                                            onClick={() => setIsMapSelectionMode(true)}
                                            className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 font-bold shadow-sm"
                                        >
                                            <MapIcon /> Selecionar no Mapa
                                        </button>
                                    )}
                                </div>
                                
                                {activeGroupPipes.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-xs italic">
                                        Nenhum tubo selecionado.
                                        {isMobile && <div className="mt-2 text-[10px] text-blue-500">Clique em "Selecionar no Mapa" para começar.</div>}
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-xs">
                                            <thead className="bg-white sticky top-0 shadow-sm">
                                                <tr>
                                                    <th className="p-2 text-left text-slate-400 font-medium pl-3">ID</th>
                                                    <th className="p-2 text-right text-slate-400 font-medium">Comp. ({lenUnit})</th>
                                                    <th className="p-2 text-right text-slate-400 font-medium">Demanda</th>
                                                    <th className="p-2 w-8"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeGroupPipes.map(p => (
                                                    <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                                                        <td className="p-2 pl-3 font-mono text-slate-600">{p.id.replace('p', 'T')}</td>
                                                        <td className="p-2 text-right text-slate-500">{p.length.toFixed(1)}</td>
                                                        <td className="p-2 text-right font-mono font-bold text-blue-600">{p.calculatedDemand.toFixed(demandDecimals)}</td>
                                                        <td className="p-2 text-center">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newSelection = activeGroup.pipeIds.filter(id => id !== p.id);
                                                                    setSelection(newSelection);
                                                                }} 
                                                                className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50"
                                                                title="Remover tubo do setor"
                                                            >
                                                                <TrashIcon/>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Apply Button Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                            <button 
                                onClick={handleApply}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                <CheckIcon /> Aplicar Distribuição
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Calculator Modal */}
            {showCalculator && activeGroup && (
                <DemandCalculatorModal 
                    onClose={() => setShowCalculator(false)}
                    onApply={handleCalculatorApply}
                    initialParams={activeGroup.calculatorParams}
                    flowUnit={flowUnit}
                    decimals={demandDecimals}
                />
            )}
        </div>
    );

    // --- MOBILE HANDLING ---
    if (isMobile) {
        if (isMapSelectionMode && activeGroup) {
            return (
                <div className="fixed inset-x-4 bottom-4 z-[70] bg-white rounded-xl shadow-2xl border border-slate-200 p-4 animate-slide-up pointer-events-auto">
                    <div className="flex justify-between items-center mb-2">
                        <div>
                           <div className="text-[10px] text-slate-400 uppercase font-bold">Selecionando para:</div>
                           <div className="font-bold text-slate-800 truncate max-w-[150px]">{activeGroup.name}</div>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                           {selection.length} tubos
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 mb-3 leading-tight">Toque nos tubos do mapa para adicionar ou remover do setor.</div>
                    <button onClick={() => setIsMapSelectionMode(false)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg shadow-lg active:scale-[0.98] transition-transform">
                       Concluir Seleção
                    </button>
                </div>
            );
        }

        return (
            <div className="fixed inset-0 top-14 z-[60] bg-white flex flex-col pointer-events-auto">
                {renderContent()}
            </div>
        );
    }

    // --- DESKTOP RENDER ---
    return renderContent();
};
