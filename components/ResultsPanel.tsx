
import React, { useMemo, useState } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart 
} from 'recharts';
import { CalcMethod, FlowUnit, CalculationResult, UnitSystem, LabelPosition } from '../types';
import { convertFlowFromSI, convertFlowToSI } from '../services/calcService';
import { generateReportHtml } from '../services/reportService';
import { 
  ChartIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon, 
  FilePdfIcon, TableIcon, SaveIcon, CheckIcon
} from './Icons';

// Directional Control Component
export const DirectionControl = ({ value, onChange, size = "normal" }: { value: LabelPosition, onChange: (p: LabelPosition) => void, size?: "small"|"normal" }) => {
    const btnClass = `flex items-center justify-center rounded-md border transition-all ${size === "small" ? "w-8 h-8" : "w-10 h-10"}`;
    const activeClass = "bg-slate-700 text-white border-slate-800 shadow-sm";
    const inactiveClass = "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600";

    const Arrow = ({ rot }: { rot: number }) => (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${rot})`}>
            <path d="M7 17l9.2-9.2M17 17V7H7"/>
        </svg>
    );

    return (
        <div className="grid grid-cols-2 gap-2 w-fit mx-auto">
             <button onClick={() => onChange('top-left')} className={`${btnClass} ${value === 'top-left' ? activeClass : inactiveClass}`}><Arrow rot={-90} /></button>
             <button onClick={() => onChange('top-right')} className={`${btnClass} ${value === 'top-right' ? activeClass : inactiveClass}`}><Arrow rot={0} /></button>
             <button onClick={() => onChange('bottom-left')} className={`${btnClass} ${value === 'bottom-left' ? activeClass : inactiveClass}`}><Arrow rot={-180} /></button>
             <button onClick={() => onChange('bottom-right')} className={`${btnClass} ${value === 'bottom-right' ? activeClass : inactiveClass}`}><Arrow rot={90} /></button>
        </div>
    );
};

export const GlobalSettingsInputs = ({ calcMethod, globalC, setGlobalC, globalRoughness, setGlobalRoughness, onApply }: any) => {
  const isDW = calcMethod === CalcMethod.DARCY_WEISBACH;
  
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">
        <SettingsIcon /> Parâmetros em Massa
      </div>
      
      <div className="flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-[11px] font-semibold text-slate-500">
            {isDW ? "Rugosidade Global (mm)" : "Coeficiente C Global"}
          </label>
          <input 
            type="text" 
            inputMode="decimal"
            placeholder={isDW ? "Ex: 0.01" : "Ex: 140"}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[12px] outline-none focus:border-blue-500 shadow-sm font-medium"
            value={isDW ? globalRoughness : globalC}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[\d.,]*$/.test(val)) {
                isDW ? setGlobalRoughness(val) : setGlobalC(val);
              }
            }}
          />
        </div>
        <button 
          onClick={onApply}
          className="h-[38px] px-6 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold rounded-md shadow-md transition-all active:scale-[0.97] flex items-center gap-2 uppercase tracking-wide"
        >
          <CheckIcon /> Replicar
        </button>
      </div>
      <p className="text-[10px] text-slate-400 italic">Esta ação substituirá os valores individuais de todos os trechos do projeto.</p>
    </div>
  );
};

export const ResultsContent = ({ 
    calcError, calcWarning, results, nodes, pipes, materials, nodeResults, flowUnit, unitSystem,
    selectedPipeId, setSelectedPipeId, setSelectedNodeId, setShowMobileResults, onOpenTable, calcMethod 
}: any) => {
    const [summarySortBy, setSummarySortBy] = useState<'id' | 'hl_total' | 'hl_unit' | 'velocity'>('id');

    const totals = useMemo(() => {
        if (!results || results.length === 0) return { friction: 0, singular: 0, total: 0, flow: 0 };
        const totalFlowSI = nodes.reduce((sum: number, n: any) => {
            return sum + (n.type === 'demand' ? convertFlowToSI(n.baseDemand || 0, flowUnit) : 0);
        }, 0) + pipes.reduce((sum: number, p: any) => sum + convertFlowToSI(p.distributedDemand || 0, flowUnit), 0);
        return results.reduce((acc: any, r: any) => ({
          friction: acc.friction + r.headLossFriction,
          singular: acc.singular + r.headLossSingular,
          total: acc.total + r.totalHeadLoss,
          flow: totalFlowSI
        }), { friction: 0, singular: 0, total: 0, flow: totalFlowSI });
    }, [results, nodes, pipes, flowUnit]);

    const graphData = useMemo(() => {
        if (!results || results.length === 0 || nodes.length === 0 || !nodeResults) return [];
        let headMap: Map<string, any>;
        if (nodeResults instanceof Map) headMap = nodeResults;
        else if (Array.isArray(nodeResults)) {
            headMap = new Map();
            nodeResults.forEach((nr: any) => headMap.set(nr.nodeId, { cp: nr.head, p: nr.pressure }));
        } else return [];

        const startNode = nodes.find((n:any) => n.type === 'source' || n.type === 'well');
        if(!startNode) return [];

        const path: any[] = [];
        let currentId = startNode.id;
        let cumulativeDist = 0;
        let currentHGL = startNode.elevation + (startNode.pressureHead || 0);
        const startRes = headMap.get(currentId);
        if(startRes) currentHGL = startRes.cp !== undefined ? startRes.cp : (startRes.head || currentHGL);

        path.push({ dist: 0, elevation: startNode.elevation, hgl: currentHGL });

        const usedPipes = new Set();
        let safety = 0;
        while(currentId && safety < 500) {
            const nextPipe = pipes.find((p:any) => p.startNodeId === currentId && !usedPipes.has(p.id));
            if(!nextPipe) break;
            usedPipes.add(nextPipe.id);
            const endNode = nodes.find((n:any) => n.id === nextPipe.endNodeId);
            const endRes = headMap.get(nextPipe.endNodeId);
            const pipeRes = results.find((r:any) => r.segmentId === nextPipe.id);
            if(endNode && endRes && pipeRes) {
                cumulativeDist = parseFloat((cumulativeDist + nextPipe.length).toFixed(2));
                if (endNode.type === 'pump') {
                    const prevPoint = path[path.length - 1];
                    path.push({ dist: cumulativeDist, elevation: endNode.elevation, hgl: prevPoint.hgl - pipeRes.totalHeadLoss });
                }
                path.push({ dist: cumulativeDist, elevation: endNode.elevation, hgl: endRes.cp !== undefined ? endRes.cp : (endRes.head || endNode.elevation) });
                currentId = endNode.id;
            } else break;
            safety++;
        }
        return path;
    }, [results, pipes, nodes, nodeResults]);

    const sortedSummary = useMemo(() => {
        if (!results || results.length === 0) return [];
        return [...results].sort((a: CalculationResult, b: CalculationResult) => {
            if (summarySortBy === 'id') return a.segmentId.localeCompare(b.segmentId, undefined, { numeric: true });
            if (summarySortBy === 'hl_total') return b.totalHeadLoss - a.totalHeadLoss;
            if (summarySortBy === 'hl_unit') return b.unitHeadLoss - a.unitHeadLoss;
            if (summarySortBy === 'velocity') return b.velocity - a.velocity;
            return 0;
        }).slice(0, summarySortBy === 'id' ? 20 : 10);
    }, [results, summarySortBy]);

    const handleExport = () => {
        if(!results.length) return;
        const html = generateReportHtml({ 
            nodes, pipes, results, nodeResults, materials, 
            totals: { ...totals, flowDisplay: convertFlowFromSI(totals.flow, flowUnit).toFixed(2) }, 
            flowUnit, unitSystem
        });
        const win = window.open('', '_blank');
        if(win) { win.document.write(html); win.document.close(); }
    };

    if (calcError) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div><strong>Erro de Cálculo:</strong><p className="mt-1">{calcError}</p></div>
            </div>
        );
    }

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center">
                <ChartIcon /><p className="text-xs mt-2 font-medium">Calcule a rede para visualizar os resultados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10">
             {calcWarning && (
                <div className="p-3 bg-orange-50 text-orange-700 rounded-lg text-[11px] border border-orange-200 font-medium">
                    <strong>Aviso:</strong> {calcWarning}
                </div>
             )}

             <div className="flex gap-2">
                 <button onClick={onOpenTable} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold py-2 rounded-md flex items-center justify-center gap-2 transition-colors">
                     <TableIcon /> Tabelas
                 </button>
                 <button onClick={handleExport} className="flex-1 bg-slate-800 text-white hover:bg-slate-700 text-[11px] font-semibold py-2 rounded-md flex items-center justify-center gap-2 transition-colors shadow-sm">
                     <FilePdfIcon /> Relatório
                 </button>
             </div>

             <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                     <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Perda Total</div>
                     <div className="text-xl font-bold text-slate-800">{totals.total?.toFixed(2) || '0.00'}<span className="text-xs font-medium text-slate-400 ml-1">m</span></div>
                 </div>
                 <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-200">
                     <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">Vazão do Sistema</div>
                     <div className="text-xl font-bold text-blue-600">{convertFlowFromSI(totals.flow || 0, flowUnit).toFixed(2)}<span className="text-xs font-medium text-slate-400 ml-1">{flowUnit}</span></div>
                 </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                 <h4 className="text-[10px] font-semibold text-slate-400 uppercase mb-4 text-center tracking-widest">Perfil Longitudinal</h4>
                 <div className="h-40 w-full">
                    {graphData.length > 1 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={graphData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dist" type="number" tick={{fontSize: 9, fill: '#94a3b8'}} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} />
                                <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{fontSize: '11px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} formatter={(value: any) => typeof value === 'number' ? value.toFixed(2) : '-'} />
                                <Area type="monotone" dataKey="elevation" stroke="#cbd5e1" fill="#f8fafc" fillOpacity={1} name="Terreno" />
                                <Line type="monotone" dataKey="hgl" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Piezométrica" isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-[10px] text-slate-300 italic">Gráfico indisponível para esta topologia.</div>}
                 </div>
             </div>

             <div className="space-y-3">
                 <div className="flex justify-between items-center px-1">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Trechos</h4>
                    <select value={summarySortBy} onChange={(e) => setSummarySortBy(e.target.value as any)} className="bg-transparent text-[10px] font-semibold text-slate-400 outline-none cursor-pointer hover:text-slate-600 transition-colors">
                        <option value="id">Ordem ID</option>
                        <option value="hl_total">Perda (m)</option>
                        <option value="hl_unit">Perda Unit.</option>
                        <option value="velocity">Velocidade</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                     {sortedSummary.map((res: CalculationResult) => {
                         const pipe = pipes.find((p: any) => p.id === res.segmentId);
                         return (
                             <div key={res.segmentId} className={`p-3 rounded-md border cursor-pointer transition-all ${selectedPipeId === res.segmentId ? 'border-blue-400 bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`} onClick={() => { setSelectedPipeId(res.segmentId); setSelectedNodeId(null); if(setShowMobileResults) setShowMobileResults(false); }}>
                                 <div className="flex justify-between items-center mb-2">
                                     <div className="flex items-center gap-2">
                                         <div className={`w-1.5 h-1.5 rounded-full ${res.regime === 'Turbulent' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                         <span className="text-[12px] font-semibold text-slate-700">T{res.segmentId.replace(/\D/g, '')}</span>
                                     </div>
                                     <span className="text-[12px] font-bold text-slate-800">{res.totalHeadLoss?.toFixed(2)} m</span>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-tighter">
                                     <div>Vazão <span className="block text-slate-600 font-mono font-bold">{Math.abs(convertFlowFromSI(res.flowRate, flowUnit)).toFixed(2)}</span></div>
                                     <div>Velocidade <span className="block text-slate-600 font-mono font-bold">{res.velocity?.toFixed(2)} m/s</span></div>
                                     <div className="text-right">Perda Unit. <span className="block text-slate-600 font-mono font-bold">{res.unitHeadLoss?.toFixed(1)}</span></div>
                                 </div>
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
    );
};
