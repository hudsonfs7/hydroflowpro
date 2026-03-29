import React from 'react';
import { Node, PipeSegment, Material, UnitSystem, FlowUnit, NodeResult, CalculationResult, LabelPosition, GlobalUnitSettings } from '../types';
import { convertFlowFromSI } from '../services/calcService';

// --- PROPS INTERFACES ---

interface NetworkPipeProps {
  pipe: PipeSegment;
  startNode: Node;
  endNode: Node;
  isSelected: boolean;
  material: Material | undefined;
  result: CalculationResult | undefined;
  unitSystem: UnitSystem;
  flowUnit: FlowUnit;
  demandDecimals?: number;
  showDemandValues?: boolean;
  unitSettings: GlobalUnitSettings;
  globalScale?: number; 
  reportMode?: boolean;
  handlers: {
    onClick: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onDoubleClick: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onPipeMouseDown: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onVertexMouseDown: (e: React.MouseEvent | React.TouchEvent, pipeId: string, idx: number) => void;
  };
}

interface NetworkNodeProps {
  node: Node;
  isSelected: boolean;
  isDrawStart?: boolean;
  resultDisplay: { head: number; pressure: number } | undefined;
  globalLabelPos: LabelPosition;
  globalLabelOffset: number;
  unitSettings: GlobalUnitSettings;
  globalScale?: number;
  reportMode?: boolean;
  suctionNodeId?: string; 
  nodesContext?: Node[]; 
  pumpExtraData?: { H: number; Q: number; Pm: number }; 
  handlers: {
    onMouseDown: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onClick: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    onDoubleClick: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
  };
}

// --- HELPER: PIPE COLORS ---
const getPipeColor = (dn: number, isSelected: boolean): string => {
    if (isSelected) return '#2563eb'; 
    switch (dn) {
        case 32: return '#cd853f'; 
        case 50: 
        case 63: return '#32cd32'; 
        case 75: 
        case 90: return '#f97316'; 
        case 100: 
        case 110: return '#0ea5e9'; 
        case 150: return '#dc2626'; 
        case 200: return '#9333ea'; 
        case 250: return '#eab308'; 
        case 300: return '#db2777'; 
        default: return '#64748b'; 
    }
};

// --- COMPONENTS ---

export const NetworkPipe: React.FC<NetworkPipeProps> = ({ 
  pipe, startNode, endNode, isSelected, material, result, unitSystem, flowUnit, handlers, demandDecimals = 4, showDemandValues = false, globalScale = 1, reportMode = false, unitSettings
}) => {
    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };
    let pointsStr = `${startNode.x},${startNode.y} `;
    const safeVertices = (pipe.vertices || []).filter(v => v && typeof v.x === 'number' && !isNaN(v.x) && typeof v.y === 'number' && !isNaN(v.y)); 
    if (safeVertices.length > 0) { pointsStr += safeVertices.map(v => `${v.x},${v.y}`).join(' ') + ' '; }
    pointsStr += `${endNode.x},${endNode.y}`;

    let labelX, labelY, baseAngle;
    const pts = [{x: startNode.x, y: startNode.y}, ...safeVertices, {x: endNode.x, y: endNode.y}];
    
    // Calcula a distância total do tubo (em pixels na tela)
    let totalDist = 0;
    const segDists: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i+1].x - pts[i].x;
        const dy = pts[i+1].y - pts[i].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        segDists.push(d);
        totalDist += d;
    }
    
    // Encontra o ponto exato no meio da distância total
    const midDist = totalDist / 2;
    let accum = 0;
    let targetSeg = 0;
    let ratio = 0.5;
    
    for (let i = 0; i < segDists.length; i++) {
        if (accum + segDists[i] >= midDist) {
            targetSeg = i;
            // Evita divisão por zero
            ratio = segDists[i] > 0 ? (midDist - accum) / segDists[i] : 0.5;
            break;
        }
        accum += segDists[i];
    }
    
    const s1 = pts[targetSeg];
    const s2 = pts[targetSeg + 1];
    
    if (s1 && s2) { 
        labelX = s1.x + (s2.x - s1.x) * ratio;
        labelY = s1.y + (s2.y - s1.y) * ratio;
        const angleRad = Math.atan2(s2.y - s1.y, s2.x - s1.x); 
        baseAngle = angleRad * 180 / Math.PI; 
    } else { 
        labelX = (startNode.x + endNode.x) / 2; 
        labelY = (startNode.y + endNode.y) / 2; 
        baseAngle = 0; 
    }
    
    let textAngle = baseAngle; 
    if (textAngle > 90 || textAngle < -90) { textAngle += 180; }

    const hasFlow = result && Math.abs(result.flowRate) > 1e-6;
    let arrowAngle = baseAngle; 
    if (hasFlow && result.flowRate < 0) { arrowAngle += 180; }

    let simpleMatName = 'Mat';
    if (material) {
        const idLower = material.id.toLowerCase();
        if (idLower.includes('defofo')) simpleMatName = 'DEFoFo'; 
        else if (idLower.includes('pead')) simpleMatName = 'PEAD'; 
        else if (idLower.includes('pba')) simpleMatName = 'PBA'; 
        else if (idLower.includes('ff') || idLower.includes('ferro')) simpleMatName = 'FoFo'; 
        else simpleMatName = material.name.split(' ')[0];
    }
    const pipeLabel = reportMode ? `${simpleMatName}` : `${pipe.name || `T${pipe.id.replace(/^p/i, '')}`} - ${simpleMatName} - DN${pipe.nominalDiameter || pipe.diameter}`; 
    const lenUnit = unitSystem === UnitSystem.SI ? 'm' : 'ft';
    
    let displayFlow = "0";
    if (showDemandValues && pipe.distributedDemand && pipe.distributedDemand > 0) {
        displayFlow = format(pipe.distributedDemand, 'flow');
    } else if (hasFlow && result) {
        displayFlow = format(Math.abs(convertFlowFromSI(result.flowRate, flowUnit)), 'flow');
    } else if (pipe.distributedDemand && pipe.distributedDemand > 0) {
        displayFlow = format(pipe.distributedDemand, 'flow');
    }

    const showFlowValue = parseFloat(displayFlow) > 1e-6;
    const lenDisplay = (pipe.length !== undefined && pipe.length !== null) ? format(pipe.length, 'meters') : "0";

    const pipeColor = getPipeColor(pipe.nominalDiameter, isSelected);

    const fontSize = Math.min(24, (reportMode ? 14 : 10) * globalScale);
    const effectiveScale = Math.min(globalScale, 5);

    const strokeWidth = (isSelected ? 4 : 2) * effectiveScale; 
    const hitAreaWidth = 30 * effectiveScale; 
    const showText = globalScale > 0.4; 

    return (
        <g 
            onMouseDown={(e) => handlers.onPipeMouseDown(e, pipe.id)}
            onTouchStart={(e) => handlers.onPipeMouseDown(e, pipe.id)}
            onClick={(e) => handlers.onClick(e, pipe.id)} 
            onDoubleClick={(e) => handlers.onDoubleClick(e, pipe.id)} 
            onDragStart={(e) => e.preventDefault()}
            className="cursor-pointer group pointer-events-auto"
        >
            <polyline points={pointsStr} fill="none" stroke="transparent" strokeWidth={hitAreaWidth} strokeLinejoin="round" />
            <polyline points={pointsStr} fill="none" stroke={pipeColor} strokeWidth={strokeWidth} strokeLinejoin="round" className="transition-colors" strokeOpacity={isSelected ? 1 : 0.9} />
            {isSelected && safeVertices.map((v, idx) => ( 
                <circle key={idx} cx={v.x} cy={v.y} r={7 * effectiveScale} fill="white" stroke={pipeColor} strokeWidth={2 * effectiveScale} className="cursor-move" onMouseDown={(e) => handlers.onVertexMouseDown(e, pipe.id, idx)} onTouchStart={(e) => handlers.onVertexMouseDown(e, pipe.id, idx)} /> 
            ))}
            {hasFlow && !showDemandValues && showText && ( 
                <polygon 
                    points={`${-5*effectiveScale},${-5*effectiveScale} ${5*effectiveScale},0 ${-5*effectiveScale},${5*effectiveScale}`} 
                    fill={pipeColor} 
                    transform={`translate(${labelX}, ${labelY}) rotate(${arrowAngle})`} 
                /> 
            )}
            {showText && (
                <g transform={`translate(${labelX}, ${labelY}) rotate(${textAngle})`}>
                    <text y={-12 * effectiveScale} textAnchor="middle" className="fill-slate-800 font-bold font-mono select-none pointer-events-none" style={{textShadow: '0px 0px 4px rgba(255,255,255,0.8)', fontSize: `${fontSize}px`}}>
                         {pipeLabel}
                    </text>
                    <text y={16 * effectiveScale} textAnchor="middle" className="fill-slate-600 font-mono select-none pointer-events-none" style={{textShadow: '0px 0px 4px rgba(255,255,255,0.8)', fontSize: `${fontSize}px`}}>
                        {(!reportMode && showFlowValue) ? `${displayFlow} ${flowUnit} - ` : ''}{lenDisplay}{lenUnit}
                    </text>
                </g>
            )}
        </g>
    );
};

export const NetworkJunction: React.FC<NetworkNodeProps> = ({ 
  node, isSelected, isDrawStart, resultDisplay, globalLabelPos, globalLabelOffset, handlers, globalScale = 1, reportMode = false, unitSettings
}) => {
    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };
    // FIX: NodeResult use 'head' and 'pressure', NOT 'cp' and 'p'
    const cpVal = resultDisplay ? resultDisplay.head : (node.elevation + (node.pressureHead || 0));
    const pVal = resultDisplay ? resultDisplay.pressure : (node.pressureHead || 0);
    const ctVal = node.elevation;
    const pos = node.labelPosition || globalLabelPos;
    const isRight = pos.includes('right');
    const isBottom = pos.includes('bottom');
    let angle = -45;
    if (!isBottom && isRight) angle = -45;
    if (!isBottom && !isRight) angle = -135;
    if (isBottom && isRight) angle = 45;
    if (isBottom && !isRight) angle = 135;
    const rad = angle * (Math.PI / 180);

    const effectiveScale = Math.min(globalScale, 5);
    const r = 10 * effectiveScale; 
    const diagLen = Math.max(10 * effectiveScale, globalLabelOffset * effectiveScale); 
    const shelfLen = (reportMode ? 40 : 60) * effectiveScale;
    const x1 = Math.cos(rad) * r;
    const y1 = Math.sin(rad) * r;
    const x2 = Math.cos(rad) * (r + diagLen);
    const y2 = Math.sin(rad) * (r + diagLen);
    const x3 = isRight ? x2 + shelfLen : x2 - shelfLen;
    const y3 = y2;
    const shelfMidX = (x2 + x3) / 2;
    const pX = x3 + (isRight ? 5 * effectiveScale : -5 * effectiveScale);
    const pAnchor = isRight ? "start" : "end";
    const yCP = y2 - (6 * effectiveScale); 
    const yCT = y2 + (13 * effectiveScale);
    const yP = y2 + (2 * effectiveScale);  
    const strokeColor = isSelected ? '#3b82f6' : '#dc2626';
    const showFlow = node.showFlowLabel && node.baseDemand;
    const flowLabel = showFlow ? `Q=${node.baseDemand}` : null;
    const nodeStrokeWidth = (isSelected ? 2.5 : 1.5) * effectiveScale;
    const connectorWidth = 1 * effectiveScale;
    const cpDisp = (typeof cpVal === 'number') ? format(cpVal, 'meters') : "0";
    const ctDisp = (typeof ctVal === 'number') ? format(ctVal, 'meters') : "0";
    const pDisp = (typeof pVal === 'number') ? format(pVal, 'pressure') : "0";
    const showText = globalScale > 0.4;
    const fontSizeMain = Math.min(18, 10 * globalScale);
    const fontSizeLarge = Math.min(24, (reportMode ? 14 : 11) * globalScale);
    const fontSizeSmall = Math.min(16, 9 * globalScale);

    return (
        <g 
            onMouseDown={(e) => handlers.onMouseDown(e, node.id)}
            onClick={(e) => handlers.onClick(e, node.id)}
            onDoubleClick={(e) => handlers.onDoubleClick(e, node.id)}
            onTouchStart={(e) => handlers.onMouseDown(e, node.id)}
            onDragStart={(e) => e.preventDefault()}
            className="cursor-move pointer-events-auto" 
            style={{transform: `translate(${node.x}px, ${node.y}px)`}}
        >
            {showText && (
                <>
                <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="none" stroke="#dc2626" strokeWidth={connectorWidth} />
                <g>
                    {!reportMode && (
                        <>
                            <text x={shelfMidX} y={yCP} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#dc2626" fontWeight="bold">CP={cpDisp}</text>
                            <text x={shelfMidX} y={yCT} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#64748b">CT={ctDisp}</text>
                        </>
                    )}
                    <text x={pX} y={yP} textAnchor={pAnchor} fontSize={fontSizeLarge} fontFamily="monospace" fontWeight="bold" fill="#dc2626" dominantBaseline="middle">P={pDisp}</text>
                </g>
                </>
            )}
            <circle r={r} fill="white" stroke={strokeColor} strokeWidth={nodeStrokeWidth} />
            {isDrawStart && <circle r={14 * effectiveScale} fill="none" stroke="#f97316" strokeWidth={2 * effectiveScale} strokeDasharray="4 2" className="animate-spin-slow" />}
            {globalScale > 0.3 && (
                 <text x={0} y={3 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontWeight="bold" fill="#1e293b" className="select-none font-sans">{node.id.replace(/\D/g, '')}</text>
            )}
            {flowLabel && showText && (
                <text x={0} y={20 * effectiveScale} textAnchor="middle" fontSize={fontSizeSmall} fontWeight="bold" fill="#059669" className="select-none font-mono bg-white">{flowLabel}</text>
            )}
        </g>
    );
};

export const NetworkReservoir: React.FC<NetworkNodeProps> = ({ 
  node, isSelected, resultDisplay, globalLabelPos, globalLabelOffset, handlers, globalScale = 1, unitSettings
}) => {
    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };
    const cpVal = resultDisplay ? resultDisplay.head : (node.elevation + (node.pressureHead || 0));
    const pVal = resultDisplay ? resultDisplay.pressure : (node.pressureHead || 0);
    const ctVal = node.elevation;
    const pos = node.labelPosition || globalLabelPos;
    const isRight = pos.includes('right');
    const isBottom = pos.includes('bottom');
    let angle = -45;
    if (!isBottom && isRight) angle = -45;
    if (!isBottom && !isRight) angle = -135;
    if (isBottom && isRight) angle = 45;
    if (isBottom && !isRight) angle = 135;
    const rad = angle * (Math.PI / 180);

    const effectiveScale = Math.min(globalScale, 5);
    const r = 12 * effectiveScale; 
    const diagLen = Math.max(10 * effectiveScale, globalLabelOffset * effectiveScale); 
    const shelfLen = 60 * effectiveScale;
    const x1 = Math.cos(rad) * r;
    const y1 = Math.sin(rad) * r;
    const x2 = Math.cos(rad) * (r + diagLen);
    const y2 = Math.sin(rad) * (r + diagLen);
    const x3 = isRight ? x2 + shelfLen : x2 - shelfLen;
    const y3 = y2;
    const shelfMidX = (x2 + x3) / 2;
    const pX = x3 + (isRight ? 5 * effectiveScale : -5 * effectiveScale);
    const pAnchor = isRight ? "start" : "end";
    const yCP = y2 - (6 * effectiveScale);
    const yCT = y2 + (13 * effectiveScale);
    const yP = y2 + (2 * effectiveScale);
    const strokeColor = isSelected ? '#3b82f6' : '#0ea5e9';
    const nodeStrokeWidth = (isSelected ? 2.5 : 1.5) * effectiveScale;
    const connectorWidth = 1 * effectiveScale;
    const cpDisp = (typeof cpVal === 'number') ? format(cpVal, 'meters') : "0";
    const ctDisp = (typeof ctVal === 'number') ? format(ctVal, 'meters') : "0";
    const pDisp = (typeof pVal === 'number') ? format(pVal, 'pressure') : "0";
    const showText = globalScale > 0.4;
    const fontSizeMain = Math.min(18, 10 * globalScale);
    const fontSizeLarge = Math.min(24, 11 * globalScale);
    const rectSize = 24 * effectiveScale;
    const halfRect = rectSize / 2;

    return (
        <g 
            onMouseDown={(e) => handlers.onMouseDown(e, node.id)}
            onClick={(e) => handlers.onClick(e, node.id)}
            onDoubleClick={(e) => handlers.onDoubleClick(e, node.id)}
            onTouchStart={(e) => handlers.onMouseDown(e, node.id)}
            onDragStart={(e) => e.preventDefault()}
            className="cursor-move pointer-events-auto" 
            style={{transform: `translate(${node.x}px, ${node.y}px)`}}
        >
            {showText && (
                <>
                <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="none" stroke="#dc2626" strokeWidth={connectorWidth} />
                <g>
                    <text x={shelfMidX} y={yCP} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#2563eb" fontWeight="bold">CP={cpDisp}</text>
                    <text x={shelfMidX} y={yCT} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#64748b">CT={ctDisp}</text>
                    <text x={pX} y={yP} textAnchor={pAnchor} fontSize={fontSizeLarge} fontFamily="monospace" fontWeight="bold" fill="#0891b2" dominantBaseline="middle">P={pDisp}</text>
                </g>
                </>
            )}
            <rect x={-halfRect} y={-halfRect} width={rectSize} height={rectSize} rx={2} fill="white" stroke={strokeColor} strokeWidth={nodeStrokeWidth} />
            <line x1={-9 * effectiveScale} y1={3 * effectiveScale} x2={9 * effectiveScale} y2={3 * effectiveScale} stroke={strokeColor} strokeWidth={1.5 * effectiveScale} strokeDasharray="3 2" />
            {showText && (
                <text x={0} y={-16 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontWeight="bold" fill={strokeColor} className="select-none font-sans">{node.name}</text>
            )}
        </g>
    );
};

export const NetworkWell: React.FC<NetworkNodeProps> = ({ 
  node, isSelected, resultDisplay, globalLabelPos, globalLabelOffset, handlers, globalScale = 1, unitSettings
}) => {
    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };
    const ctVal = node.elevation || 0;
    const neVal = node.staticLevel || 0;
    const ndVal = node.dynamicLevel || 0;
    const dnVal = node.wellDiameter || 0;
    const qVal = node.maxFlow || 0;
    const pVal = resultDisplay ? resultDisplay.pressure : undefined;
    const pos = node.labelPosition || globalLabelPos;
    const isRight = pos.includes('right');
    const isBottom = pos.includes('bottom');
    let angle = -45;
    if (!isBottom && isRight) angle = -45;
    if (!isBottom && !isRight) angle = -135;
    if (isBottom && isRight) angle = 45;
    if (isBottom && !isRight) angle = 135;
    const rad = angle * (Math.PI / 180);

    const effectiveScale = Math.min(globalScale, 5);
    const r = 12 * effectiveScale; 
    const diagLen = Math.max(10 * effectiveScale, globalLabelOffset * effectiveScale); 
    const shelfLen = 85 * effectiveScale; 
    const x1 = Math.cos(rad) * r;
    const y1 = Math.sin(rad) * r;
    const x2 = Math.cos(rad) * (r + diagLen);
    const y2 = Math.sin(rad) * (r + diagLen);
    const x3 = isRight ? x2 + shelfLen : x2 - shelfLen;
    const y3 = y2;
    const shelfMidX = (x2 + x3) / 2;
    const yAboveLine = y2 - (6 * effectiveScale);
    const yBelowL1 = y2 + (12 * effectiveScale);
    const yBelowL2 = y2 + (22 * effectiveScale);
    const pX = x3 + (isRight ? 5 * effectiveScale : -5 * effectiveScale);
    const pAnchor = isRight ? "start" : "end";
    const pY = y2 + (2 * effectiveScale); 
    const strokeColor = isSelected ? '#3b82f6' : '#6366f1'; 
    const nodeStrokeWidth = (isSelected ? 2.5 : 1.5) * effectiveScale;
    const connectorWidth = 1 * effectiveScale;
    const showText = globalScale > 0.4;
    const fontSizeMain = Math.min(16, 9 * globalScale);
    const fontSizeLarge = Math.min(24, 11 * globalScale);
    const iconSize = 24 * effectiveScale;
    const halfIcon = iconSize / 2;
    const yIconLabel1 = halfIcon + (12 * effectiveScale);
    const yIconLabel2 = halfIcon + (22 * effectiveScale);

    return (
        <g 
            onMouseDown={(e) => handlers.onMouseDown(e, node.id)}
            onClick={(e) => handlers.onClick(e, node.id)}
            onDoubleClick={(e) => handlers.onDoubleClick(e, node.id)}
            onTouchStart={(e) => handlers.onMouseDown(e, node.id)}
            onDragStart={(e) => e.preventDefault()}
            className="cursor-pointer pointer-events-auto" 
            style={{transform: `translate(${node.x}px, ${node.y}px)`}}
        >
            {showText && (
                <>
                <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill="none" stroke="#ef4444" strokeWidth={connectorWidth} />
                <g>
                    <text x={shelfMidX} y={yAboveLine} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#334155" fontWeight="bold">CT={format(ctVal, 'meters')}</text>
                    <text x={shelfMidX} y={yBelowL1} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#0284c7" fontWeight="bold">NE={format(neVal, 'meters')}</text>
                    <text x={shelfMidX} y={yBelowL2} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#2563eb" fontWeight="bold">ND={format(ndVal, 'meters')}</text>
                    {pVal !== undefined && (
                        <text x={pX} y={pY} textAnchor={pAnchor} fontSize={fontSizeLarge} fontFamily="monospace" fontWeight="bold" fill="#dc2626" dominantBaseline="middle">P={format(pVal, 'pressure')}</text>
                    )}
                </g>
                <g>
                    <text x={0} y={yIconLabel1} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#475569">DN={dnVal.toFixed(0)}mm</text>
                    <text x={0} y={yIconLabel2} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#16a34a" fontWeight="bold">Q={format(qVal, 'flow')}</text>
                </g>
                </>
            )}
            <rect x={-halfIcon} y={-halfIcon} width={iconSize} height={iconSize} fill="white" stroke={strokeColor} strokeWidth={nodeStrokeWidth} />
            <circle r={4 * effectiveScale} fill={strokeColor} />
            <line x1={0} y1={-halfIcon} x2={0} y2={halfIcon} stroke={strokeColor} strokeWidth={1} />
            <line x1={-halfIcon} y1={0} x2={halfIcon} y2={0} stroke={strokeColor} strokeWidth={1} />
            {showText && (
                <text x={0} y={-16 * effectiveScale} textAnchor="middle" fontSize={10 * effectiveScale} fontWeight="bold" fill={strokeColor} className="select-none font-sans">{node.name}</text>
            )}
        </g>
    );
};

export const NetworkPump: React.FC<NetworkNodeProps> = ({ 
  node, isSelected, resultDisplay, globalLabelPos, globalLabelOffset, handlers, globalScale = 1, suctionNodeId, nodesContext = [], pumpExtraData, unitSettings
}) => {
    const format = (val: number, type: 'meters' | 'pressure' | 'flow') => {
        if (!unitSettings) return val.toFixed(2);
        const s = unitSettings[type];
        return val.toFixed(s.decimals);
    };
    const cpjVal = resultDisplay ? resultDisplay.head : node.elevation;
    const pjVal = resultDisplay ? resultDisplay.pressure : 0;
    const ctVal = node.elevation;
    const pmVal = pumpExtraData?.Pm || 0;
    const hVal = pumpExtraData?.H || 0;
    const qVal = pumpExtraData?.Q || 0;

    const pos = node.labelPosition || globalLabelPos;
    const isRight = pos.includes('right');
    const isBottom = pos.includes('bottom');
    
    let angle2 = -45;
    if (!isBottom && isRight) angle2 = -45;
    if (!isBottom && !isRight) angle2 = -135;
    if (isBottom && isRight) angle2 = 45;
    if (isBottom && !isRight) angle2 = 135;
    
    const angle1 = angle2 + 180;

    const effectiveScale = Math.min(globalScale, 5);
    const r = 12 * effectiveScale; 
    const diagLen = Math.max(12 * effectiveScale, globalLabelOffset * effectiveScale); 
    const shelfLen = 80 * effectiveScale;
    const showText = globalScale > 0.4;
    const fontSizeMain = Math.min(16, 9 * globalScale);
    const fontSizeLarge = Math.min(24, 11 * globalScale);
    const strokeColor = isSelected ? '#3b82f6' : '#7c3aed';

    const renderShelf = (angleDeg: number, contents: React.ReactNode, type: 'hid' | 'mec') => {
        const rad = angleDeg * (Math.PI / 180);
        const sideRight = Math.cos(rad) >= 0;
        
        const x1 = Math.cos(rad) * r;
        const y1 = Math.sin(rad) * r;
        const x2 = Math.cos(rad) * (r + diagLen);
        const y2 = Math.sin(rad) * (r + diagLen);
        const x3 = sideRight ? x2 + shelfLen : x2 - shelfLen;
        const shelfMidX = (x2 + x3) / 2;
        
        return (
            <g>
                <polyline points={`${x1},${y1} ${x2},${y2} ${x3},${y2}`} fill="none" stroke={type === 'mec' ? '#7c3aed' : '#dc2626'} strokeWidth={1 * effectiveScale} opacity={0.8} />
                <g transform={`translate(${shelfMidX}, ${y2})`}>
                    {contents}
                </g>
            </g>
        );
    };

    let pumpRotation = 0;
    if (suctionNodeId) {
        const suctionNode = nodesContext.find(n => n.id === suctionNodeId);
        if (suctionNode) {
            const dx = node.x - suctionNode.x;
            const dy = node.y - suctionNode.y;
            pumpRotation = Math.atan2(dy, dx) * (180 / Math.PI);
        }
    }

    return (
        <g 
            onMouseDown={(e) => handlers.onMouseDown(e, node.id)}
            onClick={(e) => handlers.onClick(e, node.id)}
            onDoubleClick={(e) => handlers.onDoubleClick(e, node.id)}
            onTouchStart={(e) => handlers.onMouseDown(e, node.id)}
            onDragStart={(e) => e.preventDefault()}
            className="cursor-move pointer-events-auto" 
            style={{transform: `translate(${node.x}px, ${node.y}px)`}}
        >
            {showText && (
                <>
                    {/* BLOCO 2: Hidráulica (Seguindo labelPosition) */}
                    {renderShelf(angle2, (
                        <g>
                            <text y={-24 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#7c3aed" fontWeight="black" style={{textShadow: '0 0 2px white'}}>CPj={format(cpjVal, 'meters')}</text>
                            <text y={-14 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#0891b2" fontWeight="black" style={{textShadow: '0 0 2px white'}}>Pj={format(pjVal, 'pressure')}</text>
                            <text y={-4 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#475569" fontWeight="black" style={{textShadow: '0 0 2px white'}}>Pm={format(pmVal, 'pressure')}</text>
                            <text y={10 * effectiveScale} textAnchor="middle" fontSize={fontSizeMain} fontFamily="monospace" fill="#64748b" fontWeight="black" style={{textShadow: '0 0 2px white'}}>CT={format(ctVal, 'meters')}</text>
                        </g>
                    ), 'hid')}

                    {/* BLOCO 1: Performance (Oposto) */}
                    {renderShelf(angle1, (
                        <g>
                            <text y={-14 * effectiveScale} textAnchor="middle" fontSize={fontSizeLarge} fontFamily="monospace" fill="#7c3aed" fontWeight="black" style={{textShadow: '0 0 2px white'}}>H={format(hVal, 'meters')}m</text>
                            <text y={10 * effectiveScale} textAnchor="middle" fontSize={fontSizeLarge} fontFamily="monospace" fill="#16a34a" fontWeight="black" style={{textShadow: '0 0 2px white'}}>Q={format(qVal, 'flow')}</text>
                        </g>
                    ), 'mec')}
                </>
            )}

            <g transform={`rotate(${pumpRotation})`}>
                <circle r={r} fill="white" stroke={strokeColor} strokeWidth={(isSelected ? 2 : 1) * effectiveScale} />
                
                <g transform="translate(0, 0)">
                    <line x1={-r * 0.4} y1={0} x2={r * 0.6} y2={0} stroke={strokeColor} strokeWidth={1 * effectiveScale} />
                    <polyline points={`${r*0.3},${-r*0.2} ${r*0.6},0 ${r*0.3},${r*0.2}`} fill="none" stroke={strokeColor} strokeWidth={1 * effectiveScale} strokeLinecap="round" strokeLinejoin="round" />
                </g>

                <rect x={-r * 0.8} y={-r * 0.4} width={r * 0.6} height={r * 0.8} fill="white" stroke={strokeColor} strokeWidth={(isSelected ? 2 : 1) * effectiveScale} rx={1} />
                <line x1={-r * 0.65} y1={-r * 0.2} x2={-r * 0.35} y2={-r * 0.2} stroke={strokeColor} strokeWidth={0.5 * effectiveScale} />
                <line x1={-r * 0.65} y1={0} x2={-r * 0.35} y2={0} stroke={strokeColor} strokeWidth={0.5 * effectiveScale} />
                <line x1={-r * 0.65} y1={r * 0.2} x2={-r * 0.35} y2={r * 0.2} stroke={strokeColor} strokeWidth={0.5 * effectiveScale} />

                {globalScale > 0.6 && (
                    <g transform={`rotate(${-pumpRotation})`}>
                         <text x={-r * 1.6} y={0} textAnchor="middle" fontSize={9 * effectiveScale} fontWeight="black" fill={strokeColor} dominantBaseline="middle" style={{textShadow: '0 0 2px white'}}>M</text>
                         <text x={r * 1.6} y={0} textAnchor="middle" fontSize={9 * effectiveScale} fontWeight="black" fill={strokeColor} dominantBaseline="middle" style={{textShadow: '0 0 2px white'}}>J</text>
                    </g>
                )}
            </g>
            
            {showText && (
                <text x={0} y={-40 * effectiveScale} textAnchor="middle" fontSize={Math.min(24, 10 * globalScale)} fontWeight="black" fill={strokeColor} className="select-none font-sans uppercase tracking-tight" style={{textShadow: '0 0 3px white'}}>{node.name}</text>
            )}
        </g>
    );
};
