
import React, { useMemo, useState } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart 
} from 'recharts';
import { CalcMethod, CalculationResult, LabelPosition } from '../types';
import { convertFlowFromSI, convertFlowToSI } from '../services/calcService';
import { generateReportHtml } from '../services/reportService';
import { 
  ChartIcon, SettingsIcon, FilePdfIcon, TableIcon, MaximizeIcon, CheckIcon
} from './Icons';

import L from 'leaflet';
import html2canvas from 'html2canvas';
import { generateDXF } from '../services/dxfService';

// Helper: Seta de direção
const Arrow = ({ rot }: { rot: number }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" transform={`rotate(${rot})`}>
        <path d="M7 17l9.2-9.2M17 17V7H7"/>
    </svg>
);

export const DirectionControl = ({ value, onChange, size = "normal" }: { value: LabelPosition, onChange: (p: LabelPosition) => void, size?: "small"|"normal" }) => {
    const btnClass = `flex items-center justify-center rounded-md border transition-all ${size === "small" ? "w-8 h-8" : "w-10 h-10"}`;
    const activeClass = "bg-slate-700 text-white border-slate-800 shadow-sm";
    const inactiveClass = "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600";

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
          <label className="text-[11px] font-semibold text-slate-500">{isDW ? "Rugosidade Global (mm)" : "Coeficiente C Global"}</label>
          <input 
            type="text" inputMode="decimal" placeholder={isDW ? "Ex: 0.01" : "Ex: 140"}
            className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-[12px] outline-none focus:border-blue-500 shadow-sm"
            value={isDW ? globalRoughness : globalC}
            onChange={(e) => isDW ? setGlobalRoughness(e.target.value) : setGlobalC(e.target.value)}
          />
        </div>
        <button onClick={onApply} className="h-[38px] px-6 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold rounded-md flex items-center gap-2 uppercase tracking-wide">
          <CheckIcon /> Replicar
        </button>
      </div>
    </div>
  );
};

export const ResultsContent = (props: any) => {
    const { 
        calcError, calcWarning, results, nodes, pipes, materials, nodeResults, flowUnit, unitSystem,
        selectedPipeId, setSelectedPipeId, setSelectedNodeId, setShowMobileResults, onOpenTable, onOpenLongitudinal, calcMethod, projectMetadata,
        globalC, globalRoughness, unitSettings, setVisSettings, setMapStyle, mapInstance, visSettings, mapStyle
    } = props;
    
    const [summarySortBy, setSummarySortBy] = useState<'id' | 'hl_total' | 'hl_unit' | 'velocity'>('id');

    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        return val.toFixed(unitSettings[type].decimals);
    };

    const totals = useMemo(() => {
        if (!results || results.length === 0) return { friction: 0, singular: 0, total: 0, flow: 0 };
        const totalFlowSI = nodes.reduce((sum: number, n: any) => sum + (n.type === 'demand' ? convertFlowToSI(n.baseDemand || 0, flowUnit) : 0), 0) 
                          + pipes.reduce((sum: number, p: any) => sum + convertFlowToSI(p.distributedDemand || 0, flowUnit), 0);
        return results.reduce((acc: any, r: any) => ({
          friction: acc.friction + r.headLossFriction,
          singular: acc.singular + r.headLossSingular,
          total: acc.total + r.totalHeadLoss,
          flow: totalFlowSI
        }), { friction: 0, singular: 0, total: 0, flow: totalFlowSI });
    }, [results, nodes, pipes, flowUnit]);

    const graphData = useMemo(() => {
        if (!results || results.length === 0 || nodes.length === 0 || !nodeResults) return [];
        let headMap = new Map();
        if (nodeResults instanceof Map) headMap = nodeResults;
        else if (Array.isArray(nodeResults)) nodeResults.forEach((nr: any) => headMap.set(nr.nodeId, nr));

        const startNode = nodes.find((n:any) => n.type === 'source' || n.type === 'well');
        if(!startNode) return [];

        const path: any[] = [];
        let currentId = startNode.id;
        let cumulativeDist = 0;
        const startRes = headMap.get(currentId);
        path.push({ id: startNode.name || startNode.id, dist: 0, elevation: startNode.elevation, hgl: startRes?.head || startNode.elevation });

        const usedPipes = new Set();
        let safety = 0;
        while(currentId && safety < 1000) {
            const nextPipe = pipes.find((p:any) => !usedPipes.has(p.id) && (p.startNodeId === currentId || p.endNodeId === currentId));
            if(!nextPipe) break;
            usedPipes.add(nextPipe.id);
            const nextId = nextPipe.startNodeId === currentId ? nextPipe.endNodeId : nextPipe.startNodeId;
            const endNode = nodes.find((n:any) => n.id === nextId);
            const nodeRes = headMap.get(nextId);
            const currentHead = headMap.get(currentId)?.head || 0;
            
            if(endNode && nodeRes) {
                cumulativeDist += nextPipe.length;
                
                // PHYSICAL FIX: If the target node is a pump, we show the head 
                // BEFORE the boost and then AFTER the boost at the same distance point.
                if (endNode.type === 'pump') {
                    const res = results.find(r => r.segmentId === nextPipe.id);
                    const headAtSuction = currentHead - (res?.totalHeadLoss || 0);
                    path.push({ id: `${endNode.name || endNode.id} (S)`, dist: cumulativeDist, elevation: endNode.elevation, hgl: headAtSuction });
                }

                path.push({ id: endNode.name || endNode.id, dist: cumulativeDist, elevation: endNode.elevation, hgl: nodeRes.head, pressure: nodeRes.pressure });
                currentId = nextId;
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
        }).slice(0, 25);
    }, [results, summarySortBy]);

    const [isExporting, setIsExporting] = useState(false);
    const handleExport = async () => {
        if(!results.length) return;
        setIsExporting(true);
        const originalVis = { ...visSettings };
        const originalStyle = mapStyle;
        try {
            setVisSettings({ ...originalVis, reportMode: true, baseScale: 1.5 });
            setMapStyle('street');
            if (mapInstance) {
                const b = L.latLngBounds(nodes.map((n: any) => n.geoPosition));
                pipes.forEach((p: any) => p.vertices?.forEach((v: any) => b.extend(v.geoPosition)));
                mapInstance.fitBounds(b, { padding: [50, 50] });
            }
            await new Promise(r => setTimeout(r, 1200));
            const mapContainer = document.getElementById('network-map-container');
            let mapImage = '';
            if (mapContainer) {
                const canvas = await html2canvas(mapContainer, { useCORS: true, allowTaint: true, backgroundColor: '#f8fafc', scale: 2 });
                mapImage = canvas.toDataURL('image/jpeg', 0.8);
            }
            const html = generateReportHtml({ nodes, pipes, results, nodeResults, materials, totals: { ...totals, flowDisplay: format(convertFlowFromSI(totals.flow, flowUnit), 'flow') }, flowUnit, unitSystem, projectMetadata, calcMethod, mapImage, globalC, globalRoughness, unitSettings });
            const win = window.open('', '_blank');
            if(win) { win.document.write(html); win.document.close(); }
        } catch (e) { console.error(e); } finally { setVisSettings(originalVis); setMapStyle(originalStyle); setIsExporting(false); }
    };

    if (calcError) return <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200"><strong>Erro:</strong> {calcError}</div>;
    if (results.length === 0) return <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center"><ChartIcon /><p className="text-xs mt-2 font-medium">Calcule a rede para visualizar os resultados.</p></div>;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
             <div className="flex gap-2">
                 <button onClick={onOpenTable} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-[11px] font-bold py-2 rounded-md flex items-center justify-center gap-2"><TableIcon /> Tabelas</button>
                 <button onClick={handleExport} disabled={isExporting} className="flex-1 bg-slate-800 text-white hover:bg-slate-700 text-[11px] font-bold py-2 rounded-md flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"><FilePdfIcon /> {isExporting ? '...' : 'Relatório'}</button>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Perda Total</span>
                    <span className="text-sm font-black text-slate-800 tabular-nums">{format(totals.total, 'meters')} m</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <span className="block text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Vazão Total</span>
                    <span className="text-sm font-black text-slate-800 tabular-nums">{format(convertFlowFromSI(totals.flow, flowUnit), 'flow')} <span className="text-[10px] text-slate-400 font-bold">{flowUnit}</span></span>
                </div>
             </div>

             <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumo Piezométrico</h4>
                    <button onClick={onOpenLongitudinal} className="text-blue-600 bg-blue-50 p-1.5 rounded-lg hover:bg-blue-100 transition-colors"><MaximizeIcon /></button>
                </div>
                <div className="h-52 w-full">
                    {graphData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={graphData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dist" type="number" stroke="#cbd5e1" tick={{fontSize: 8, fill: '#94a3b8', fontWeight: 700}} />
                                <YAxis tick={{fontSize: 8, fill: '#94a3b8', fontWeight: 700}} stroke="#cbd5e1" domain={['auto', 'auto']} />
                                <Tooltip content={({ active, payload }) => {
                                    if (active && payload?.length) {
                                        const d = payload[0].payload;
                                        return <div className="bg-slate-900 border border-white/10 text-white p-2 rounded-lg text-[9px] shadow-2xl font-bold uppercase tracking-tighter">
                                            <p className="text-blue-400 mb-1">NÓ: {d.id}</p>
                                            <p className="text-slate-400 mb-1 underline">Ext: {d.dist.toFixed(0)}m</p>
                                            <div className="space-y-0.5">
                                                <p className="flex justify-between gap-4"><span>HGL:</span> <span className="text-blue-300">{d.hgl.toFixed(2)}m</span></p>
                                                {d.pressure !== undefined && <p className="flex justify-between gap-4 border-t border-white/5 pt-1 mt-1"><span>PRESS:</span> <span className="text-emerald-400">{d.pressure.toFixed(2)}mca</span></p>}
                                            </div>
                                        </div>;
                                    }
                                    return null;
                                }} />
                                <Area type="monotone" dataKey="elevation" stroke="#cbd5e1" fill="#f8fafc" strokeWidth={1} />
                                <Line type="monotone" dataKey="hgl" stroke="#2563eb" strokeWidth={1.5} dot={false} animationDuration={1000} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase italic">Perfil Indisponível</div>}
                </div>
             </div>

             <div className="space-y-3">
                 <div className="flex justify-between items-center px-1">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trechos Registrados</h4>
                    <select value={summarySortBy} onChange={(e) => setSummarySortBy(e.target.value as any)} className="bg-transparent text-[9px] font-black text-slate-400 uppercase outline-none cursor-pointer hover:text-slate-600 transition-colors">
                        <option value="id">ORDEM ID</option>
                        <option value="hl_total">PERDA (m)</option>
                        <option value="hl_unit">J (m/km)</option>
                        <option value="velocity">VELOCIDADE</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                     {sortedSummary.map((res: any) => {
                          const pipe = pipes.find((p: any) => p.id === res.segmentId);
                          const mat = materials.find((m: any) => m.id === pipe?.materialId);
                          let shortM = mat?.name || 'Mat';
                          shortM = shortM.includes('/') ? shortM.split('/').pop()?.split(' ')[0] || '' : shortM.split(' ')[0];

                          return (
                              <div key={res.segmentId} 
                                   className={`p-3 rounded-2xl border-2 transition-all cursor-pointer ${selectedPipeId === res.segmentId ? 'border-blue-500 bg-blue-50/20 shadow-lg shadow-blue-500/5' : 'border-slate-50 bg-white hover:border-slate-100 hover:shadow-sm'}`}
                                   onClick={() => { setSelectedPipeId(res.segmentId); setSelectedNodeId(null); if(setShowMobileResults) setShowMobileResults(false); }}
                                   onDoubleClick={() => {
                                       if (!mapInstance || !pipe) return;
                                       const n1 = nodes.find(n => n.id === pipe.startNodeId);
                                       const n2 = nodes.find(n => n.id === pipe.endNodeId);
                                       if(n1?.geoPosition && n2?.geoPosition) mapInstance.fitBounds(L.latLngBounds([n1.geoPosition.lat, n1.geoPosition.lng], [n2.geoPosition.lat, n2.geoPosition.lng]), { padding: [50, 50], maxZoom: 18 });
                                   }}>
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${res.regime === 'Turbulent' ? 'bg-amber-400' : 'bg-emerald-500'} shadow-sm`} />
                                          <div>
                                              <span className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">
                                                  {(pipe?.name || res.segmentId).replace(/^p/i, 'T')}
                                              </span>
                                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">{shortM} DN{pipe?.diameter}</p>
                                          </div>
                                      </div>
                                      <span className="text-[11px] font-black text-slate-800 bg-slate-900 text-white px-2 py-1 rounded-md tabular-nums shadow-sm">{format(convertFlowFromSI(res.flowRate, flowUnit), 'flow')} {flowUnit}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 border-t border-slate-50 pt-3">
                                      <div className="space-y-1">
                                          <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">Perda (m)</span>
                                          <span className="text-[12px] font-black text-slate-700 tabular-nums font-mono">{format(res.totalHeadLoss, 'meters')}</span>
                                      </div>
                                      <div className="space-y-1 border-x border-slate-50 px-2 text-center">
                                          <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">J (m/km)</span>
                                          <span className="text-[12px] font-black text-blue-600 tabular-nums font-mono">{(res.unitHeadLoss * 1000).toFixed(2)}</span>
                                      </div>
                                      <div className="space-y-1 text-right">
                                          <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">Ext. (m)</span>
                                          <span className="text-[12px] font-black text-slate-700 tabular-nums font-mono">{pipe?.length.toFixed(0)}</span>
                                      </div>
                                  </div>
                              </div>
                          );
                     })}
                 </div>
             </div>
        </div>
    );
};
