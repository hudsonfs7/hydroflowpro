
import React, { useState } from 'react';import { Node, PipeSegment, Material, UnitSystem, CalculationResult, NodeResult, FlowUnit } from '../types';
import { ModalContainer } from './CommonUI';
import { TableIcon, CloseIcon } from './Icons';
import { convertFlowFromSI } from '../services/calcService';

interface FlexTableModalProps {
    onClose: () => void;
    pipes: PipeSegment[];
    nodes: Node[];
    results: CalculationResult[];
    nodeResults?: NodeResult[];
    materials: Material[];
    flowUnit: FlowUnit;
    unitSystem: UnitSystem;
    calcMethod: string;
}

export const FlexTableModal = ({ onClose, pipes, nodes, results, nodeResults, materials, flowUnit, unitSystem }: FlexTableModalProps) => {
    const [tab, setTab] = useState<'pipes' | 'nodes'>('pipes');
    const nodeResMap = new Map<string, NodeResult>();
    if(nodeResults) nodeResults.forEach((nr: NodeResult) => nodeResMap.set(nr.nodeId, nr));

    const nodeRows = nodes.map((n: Node) => {
        const res = nodeResMap.get(n.id);
        const cp = res ? (unitSystem === UnitSystem.SI ? res.head : res.head / 0.3048) : n.elevation;
        const p = res ? (unitSystem === UnitSystem.SI ? res.pressure : res.pressure / 0.3048) : (n.pressureHead || 0);
        return { ...n, cp, p };
    });

    const pipeRows = pipes.map((p: PipeSegment) => {
        const res = results.find((r: CalculationResult) => r.segmentId === p.id);
        const mat = materials.find((m: Material) => m.id === p.materialId);
        return {
            ...p, matName: mat?.name.split(' ')[0] || 'Unknown',
            velocity: res?.velocity || 0, hlTotal: res?.totalHeadLoss || 0, hlUnit: res?.unitHeadLoss || 0,
            regime: res?.regime || '-', flowRate: res ? res.flowRate : 0
        };
    });

    const thClass = "px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-slate-50 whitespace-nowrap sticky top-0";
    const tdClass = "px-4 py-2 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap font-mono";

    return (
        <ModalContainer onClose={onClose} zIndex="z-[2000]" backdropClass="bg-white/95 backdrop-blur-sm">
            <div className="w-full h-full flex flex-col bg-transparent">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><TableIcon/> Tabelas de Dados</h2>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button onClick={() => setTab('pipes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'pipes' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Tubulações</button>
                            <button onClick={() => setTab('nodes')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === 'nodes' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Nós</button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><CloseIcon/></button>
                </div>
                <div className="flex-1 overflow-auto bg-slate-50 p-4">
                    <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden min-w-full inline-block align-middle">
                    {tab === 'pipes' ? (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead><tr><th className={thClass}>ID</th><th className={thClass}>DN</th><th className={thClass}>Vazão ({flowUnit})</th><th className={thClass}>Vel. (m/s)</th><th className={thClass}>Hf (m)</th><th className={thClass}>Regime</th></tr></thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {pipeRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className={tdClass}>{row.id}</td><td className={tdClass}>{row.nominalDiameter}</td>
                                        <td className={`${tdClass} text-blue-600`}>{Math.abs(convertFlowFromSI(row.flowRate, flowUnit)).toFixed(2)}</td>
                                        <td className={tdClass}>{row.velocity.toFixed(2)}</td><td className={tdClass}>{row.hlTotal.toFixed(3)}</td>
                                        <td className={tdClass}>{row.regime}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead><tr><th className={thClass}>ID</th><th className={thClass}>Nome</th><th className={thClass}>Cota Piez. (m)</th><th className={thClass}>Pressão (mca)</th></tr></thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {nodeRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50">
                                        <td className={tdClass}>{row.id}</td><td className={tdClass}>{row.name}</td>
                                        <td className={tdClass}>{row.cp?.toFixed(2)}</td>
                                        <td className={`${tdClass} font-bold text-blue-600`}>{row.p?.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};
