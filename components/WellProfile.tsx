
import React from 'react';
import { Node } from '../types';

interface WellProfileProps {
  node: Node;
  calculatedNO?: number; // Nível Operacional Calculado (analysis.NO)
}

export const WellProfile: React.FC<WellProfileProps> = ({ node, calculatedNO }) => {
  const depth = node.wellDepth || 0;
  const staticLvl = node.staticLevel || 0;
  const dynamicLvl = node.dynamicLevel || 0;
  const elevation = node.elevation || 0;
  
  // Pump Data
  const pumpDepth = node.pumpDepth || 0;
  const nmo = node.pumpNMO || 0;
  const qPump = node.pumpFlow || 0;
  
  // Nível Operacional: Só exibe se calculado E se houver vazão de bomba definida
  const showNO = (calculatedNO !== undefined && calculatedNO > 0 && qPump > 0);
  const no = showNO ? calculatedNO : 0;
  
  // Layout Constants - OTIMIZADO PARA OCUPAR MAIS ESPAÇO
  const width = 220;
  const height = 500; // Aumentado para crescer verticalmente
  const topMargin = 25; // Reduzido de 40 para 25 (aproveita topo)
  const bottomMargin = 10; // Reduzido de 20 para 10 (aproveita fundo)
  
  const maxDepth = depth > 0 ? depth : 100;
  const scale = (height - topMargin - bottomMargin) / maxDepth; 
  
  const groundY = topMargin;
  
  const wellWidthPx = 50; 
  const wellX = width / 2 - wellWidthPx / 2; 
  const centerX = width / 2;

  const hoseWidthPx = 6; 
  const pumpWidthPx = 18;

  const yStatic = groundY + (staticLvl * scale);
  const yDynamic = groundY + (dynamicLvl * scale);
  const yBottom = groundY + (depth * scale);
  const yPump = groundY + (pumpDepth * scale);
  const yNMO = groundY + (nmo * scale);
  const yNO = groundY + (no * scale);

  // Absolute elevations (Z)
  const zStatic = (elevation - staticLvl).toFixed(2);
  const zDynamic = (elevation - dynamicLvl).toFixed(2);
  const zNO = (elevation - no).toFixed(2);
  const zBottom = (elevation - depth).toFixed(2);

  // Generate scale ticks
  const ticks = [];
  const tickStep = maxDepth > 200 ? 50 : 20;
  for (let i = 0; i <= maxDepth; i += tickStep) {
      ticks.push(i);
  }

  const hasPump = pumpDepth > 0;
  const labelOffsetV = 4; 
  const lineExt = 55; 

  return (
    <div className="bg-white rounded-xl flex flex-col items-center select-none w-full h-full justify-center">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible" preserveAspectRatio="xMidYMid meet">
        <defs>
           <linearGradient id="wellGradient" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#334155" />
             <stop offset="50%" stopColor="#94a3b8" />
             <stop offset="100%" stopColor="#334155" />
           </linearGradient>

           <linearGradient id="waterActive" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#1e40af" />
             <stop offset="50%" stopColor="#60a5fa" />
             <stop offset="100%" stopColor="#1e40af" />
           </linearGradient>

           <linearGradient id="waterStatic" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
             <stop offset="50%" stopColor="#bfdbfe" stopOpacity="0.6" />
             <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6" />
           </linearGradient>

           <pattern id="soilPattern" patternUnits="userSpaceOnUse" width="40" height="40">
             <rect width="40" height="40" fill="#fdf6ec" />
             <line x1="0" y1="40" x2="40" y2="0" stroke="#f3e9dc" strokeWidth="1" />
             <path d="M5,5 L8,2 L11,5 Z" fill="#94a3b8" opacity="0.4" />
             <path d="M25,18 L28,15 L31,18 Z" fill="#94a3b8" opacity="0.4" />
           </pattern>

           <linearGradient id="pumpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="30%" stopColor="#94a3b8" />
              <stop offset="70%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
           </linearGradient>
        </defs>

        {/* 1. Background Soil */}
        <rect x={0} y={groundY} width={width} height={height - groundY} fill="url(#soilPattern)" />

        {/* 2. Scale / Ruler (Left Side, faded) */}
        <g opacity="0.2">
            {ticks.map(t => (
                <g key={t} transform={`translate(0, ${groundY + (t * scale)})`}>
                    <line x1={wellX - 5} y1={0} x2={wellX} y2={0} stroke="#94a3b8" strokeWidth="1" />
                    <text x={wellX - 8} y={3} fontSize="8" textAnchor="end" fill="#94a3b8">{t}</text>
                </g>
            ))}
        </g>

        {/* 3. The Well Cylinder Background (Inside) */}
        <rect x={wellX} y={groundY - 5} width={wellWidthPx} height={(yBottom - groundY) + 5} fill="#f8fafc" />
        
        {/* 4. Water Layers */}
        {depth > 0 && (
            <>
                {/* Static Water */}
                {dynamicLvl > staticLvl && (
                    <rect x={wellX} y={yStatic} width={wellWidthPx} height={Math.max(0, yDynamic - yStatic)} fill="url(#waterStatic)" />
                )}
                
                {/* Active Water */}
                {depth > dynamicLvl && (
                    <rect x={wellX} y={yDynamic} width={wellWidthPx} height={Math.max(0, yBottom - yDynamic)} fill="url(#waterActive)" />
                )}
            </>
        )}

        {/* 5. Pump System (Fixed Widths) */}
        {hasPump && (
            <g>
               {/* Hose / Edutora - Blue Pipe */}
               <rect 
                  x={centerX - (hoseWidthPx/2)} 
                  y={groundY - 10} 
                  width={hoseWidthPx} 
                  height={(yPump - groundY) + 10} 
                  fill="#3b82f6" 
                  stroke="#1d4ed8" 
                  strokeWidth="0.5" 
               />

               {/* Pump Body */}
               <rect 
                  x={centerX - (pumpWidthPx/2)} 
                  y={yPump} 
                  width={pumpWidthPx} 
                  height={Math.min(30, (yBottom - yPump))} 
                  rx={2} 
                  fill="url(#pumpGradient)" 
                  stroke="#334155" 
                  strokeWidth="1" 
               />
               
               {/* Label: CMB - Right Side */}
               <text x={wellX + wellWidthPx + 5} y={yPump + 5} fontSize="9" fill="#1e293b" fontWeight="bold" dominantBaseline="middle">CMB {pumpDepth.toFixed(1)}m</text>
            </g>
        )}

        {/* 6. NMO Line - Optional */}
        {nmo > 0 && (
             <g>
                 <line x1={wellX + 2} y1={yNMO} x2={wellX + wellWidthPx - 2} y2={yNMO} stroke="#ef4444" strokeWidth="2" strokeDasharray="3 2" />
                 <text x={wellX - 3} y={yNMO + 3} textAnchor="end" fontSize="9" fill="#ef4444" fontWeight="bold">NMO</text>
             </g>
        )}

        {/* 7. Cylinder Walls */}
        <line x1={wellX} y1={groundY - 5} x2={wellX} y2={yBottom} stroke="#334155" strokeWidth={1.5} />
        <line x1={wellX + wellWidthPx} y1={groundY - 5} x2={wellX + wellWidthPx} y2={yBottom} stroke="#334155" strokeWidth={1.5} />
        <ellipse cx={centerX} cy={yBottom} rx={wellWidthPx/2} ry={5} fill="#334155" />
        <ellipse cx={centerX} cy={groundY - 5} rx={wellWidthPx/2} ry={5} fill="url(#wellGradient)" stroke="#1e293b" strokeWidth={1} />

        {/* 8. Soil Surface Line (CT) - SPLIT */}
        <line x1={0} y1={groundY} x2={wellX} y2={groundY} stroke="#0f172a" strokeWidth="2" />
        <line x1={wellX + wellWidthPx} y1={groundY} x2={width} y2={groundY} stroke="#0f172a" strokeWidth="2" />
        
        {/* CT Label on Ground Line */}
        <text x={10} y={groundY - 5} textAnchor="start" fontSize="11" fill="#0f172a" fontWeight="bold" className="font-mono">
            CT: {elevation.toFixed(2)}m
        </text>

        {/* 9. Levels Labels (NE / ND / Bottom / NO) - Optimized for Visibility */}
        {depth > 0 && (
            <>
                {/* --- NE (Static Level) --- */}
                <line x1={wellX} y1={yStatic} x2={wellX + wellWidthPx} y2={yStatic} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="4 2" />
                <line x1={wellX - lineExt} y1={yStatic} x2={wellX} y2={yStatic} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="4 2" />
                <line x1={wellX + wellWidthPx} y1={yStatic} x2={wellX + wellWidthPx + lineExt} y2={yStatic} stroke="#0ea5e9" strokeWidth={1} strokeDasharray="4 2" />
                
                <text x={wellX - 2} y={yStatic - labelOffsetV} fontSize="9" fill="#0ea5e9" textAnchor="end" className="font-mono">Z:{zStatic}</text>
                <text x={wellX + wellWidthPx + 2} y={yStatic - labelOffsetV} fontSize="9" fill="#0ea5e9" fontWeight="bold" textAnchor="start">NE: {staticLvl.toFixed(1)}m</text>

                {/* --- ND (Dynamic Level) --- */}
                <line x1={wellX} y1={yDynamic} x2={wellX + wellWidthPx} y2={yDynamic} stroke="#dc2626" strokeWidth={1.5} />
                <line x1={wellX - lineExt} y1={yDynamic} x2={wellX} y2={yDynamic} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="2 2" />
                <line x1={wellX + wellWidthPx} y1={yDynamic} x2={wellX + wellWidthPx + lineExt} y2={yDynamic} stroke="#dc2626" strokeWidth={1.5} strokeDasharray="2 2" />

                <text x={wellX - 2} y={yDynamic - labelOffsetV} fontSize="9" fill="#dc2626" textAnchor="end" className="font-mono">Z:{zDynamic}</text>
                <text x={wellX + wellWidthPx + 2} y={yDynamic - labelOffsetV} fontSize="9" fill="#dc2626" fontWeight="bold" textAnchor="start">ND: {dynamicLvl.toFixed(1)}m</text>

                {/* --- NO (Operational Level) - Conditional --- */}
                {showNO && (
                    <g>
                        <line x1={wellX} y1={yNO} x2={wellX + wellWidthPx} y2={yNO} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 2" />
                        <line x1={wellX - lineExt} y1={yNO} x2={wellX} y2={yNO} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 2" />
                        <line x1={wellX + wellWidthPx} y1={yNO} x2={wellX + wellWidthPx + lineExt} y2={yNO} stroke="#16a34a" strokeWidth={1.5} strokeDasharray="4 2" />
                        
                        <text x={wellX - 2} y={yNO - labelOffsetV} textAnchor="end" fontSize="9" fill="#16a34a" className="font-mono" fontWeight="bold">Z:{zNO}</text>
                        <text x={wellX + wellWidthPx + 2} y={yNO - labelOffsetV} textAnchor="start" fontSize="9" fill="#16a34a" fontWeight="bold">NO: {no.toFixed(1)}m</text>
                    </g>
                )}

                {/* --- Bottom (Fundo) --- */}
                <line x1={wellX - lineExt} y1={yBottom} x2={wellX} y2={yBottom} stroke="#64748b" strokeWidth={1} />
                <line x1={wellX + wellWidthPx} y1={yBottom} x2={wellX + wellWidthPx + lineExt} y2={yBottom} stroke="#64748b" strokeWidth={1} />

                <text x={wellX - 2} y={yBottom - labelOffsetV} fontSize="9" fill="#64748b" textAnchor="end" className="font-mono">Z:{zBottom}</text>
                <text x={wellX + wellWidthPx + 2} y={yBottom - labelOffsetV} fontSize="9" fill="#64748b" fontWeight="bold" textAnchor="start">Fundo: {depth.toFixed(1)}m</text>
            </>
        )}
      </svg>
    </div>
  );
};
