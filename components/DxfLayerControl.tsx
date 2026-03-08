import React, { useState } from 'react';
import { LayersIcon, TrashIcon, EyeIcon } from './Icons';

interface DxfLayerControlProps {
  fileName: string;
  opacity: number;
  setOpacity: (val: number) => void;
  onRemove: () => void;
}

export const DxfLayerControl: React.FC<DxfLayerControlProps> = ({ 
  fileName, 
  opacity, 
  setOpacity, 
  onRemove 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(parseFloat(e.target.value));
  };

  const toggleVisibility = () => {
    const newVis = !isVisible;
    setIsVisible(newVis);
    if (!newVis) setOpacity(0);
    else setOpacity(0.5); 
  };

  if (!fileName) return null;

  return (
    <div className="border-t border-slate-200 bg-white p-4 shrink-0">
      <div className="flex items-center gap-2 mb-3 text-slate-700">
         <LayersIcon />
         <span className="text-xs font-bold uppercase tracking-wide">Camada DXF (Fundo)</span>
      </div>

      <div className="p-3 bg-slate-50 rounded border border-slate-200 hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 overflow-hidden">
                   <div className="w-3 h-3 rounded-sm bg-cyan-500 shrink-0"></div>
                   <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]" title={fileName}>{fileName}</span>
               </div>
               <div className="flex items-center gap-1">
                   <button 
                     onClick={toggleVisibility}
                     className={`p-1 rounded hover:bg-slate-200 ${isVisible ? 'text-slate-600' : 'text-slate-300'}`}
                     title={isVisible ? "Ocultar" : "Mostrar"}
                   >
                       <EyeIcon />
                   </button>
                   <button 
                     onClick={onRemove}
                     className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
                     title="Remover Camada"
                   >
                       <TrashIcon />
                   </button>
               </div>
           </div>
           
           <div className="flex items-center gap-2">
               <span className="text-[9px] text-slate-400 uppercase font-bold">Opacidade</span>
               <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={opacity}
                  onChange={handleOpacityChange}
                  disabled={!isVisible}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none disabled:opacity-50"
               />
           </div>
      </div>
    </div>
  );
};
