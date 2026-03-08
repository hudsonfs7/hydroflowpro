
import React, { useState } from 'react';
import { MapIcon, SettingsIcon, SearchIcon } from './Icons';
import { MapStyle, CoordinateFormat } from '../types';
import { useClickOutside } from './CommonUI';

interface MapControlsProps {
    mapStyle: MapStyle;
    setMapStyle: (s: MapStyle) => void;
    mapOpacity: number;
    setMapOpacity: (n: number) => void;
    coordFormat: CoordinateFormat;
    setCoordFormat: (f: CoordinateFormat) => void;
    searchQuery: string;
    setSearchQuery: (s: string) => void;
    handleSearch: () => void;
}

export const MapControls = ({
    mapStyle, setMapStyle, mapOpacity, setMapOpacity,
    coordFormat, setCoordFormat, searchQuery, setSearchQuery, handleSearch
}: MapControlsProps) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const menuRef = useClickOutside(() => setIsOpen(false));

    return (
        <div ref={menuRef} className="flex flex-col gap-1 w-full max-w-sm pointer-events-auto">
            <div className="flex gap-1 items-center h-10">
                <div className="flex-1 relative h-full">
                    <input 
                        type="text" 
                        className="w-full h-full pl-3 pr-10 rounded-lg border border-slate-300 bg-white/95 backdrop-blur text-sm focus:outline-none focus:ring-2 focus:ring-accent shadow-sm select-text" 
                        placeholder="Pesquisar local..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                    />
                    <button 
                        onClick={handleSearch} 
                        className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-slate-500 hover:text-accent"
                    >
                        <SearchIcon/>
                    </button>
                </div>
                
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className={`h-full w-10 rounded-lg flex items-center justify-center border transition-colors shadow-sm ${isOpen ? 'bg-accent text-white border-accent' : 'bg-white/95 backdrop-blur text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                >
                    <SettingsIcon/>
                </button>
            </div>

            {isOpen && (
                <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 animate-fade-in flex flex-col gap-4 mt-1">
                    
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2 tracking-wide">Fundo do Mapa</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => setMapStyle('satellite')}
                                className={`py-2 px-1 rounded border text-[11px] font-bold transition-all ${mapStyle === 'satellite' ? 'border-accent bg-blue-50 text-accent shadow-inner' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Satélite
                            </button>
                            <button 
                                onClick={() => setMapStyle('street')}
                                className={`py-2 px-1 rounded border text-[11px] font-bold transition-all ${mapStyle === 'street' ? 'border-accent bg-blue-50 text-accent shadow-inner' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Mapa
                            </button>
                            <button 
                                onClick={() => setMapStyle('none')}
                                className={`py-2 px-1 rounded border text-[11px] font-bold transition-all ${mapStyle === 'none' ? 'border-accent bg-blue-50 text-accent shadow-inner' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                Desativar
                            </button>
                        </div>
                    </div>

                    {mapStyle !== 'none' && (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opacidade do Mapa</label>
                                <span className="text-[11px] font-mono font-bold text-slate-600">{(mapOpacity * 100).toFixed(0)}%</span>
                            </div>
                            <input 
                                type="range" min="0.1" max="1" step="0.05" 
                                value={mapOpacity} 
                                onChange={(e) => setMapOpacity(parseFloat(e.target.value))} 
                                className="w-full accent-accent h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" 
                            />
                            <p className="text-[9px] text-slate-400 mt-1 italic">Dica: Reduza para destacar o projeto sobre a imagem.</p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase block mb-2 tracking-wide">Coordenadas</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setCoordFormat('decimal')}
                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${coordFormat === 'decimal' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                            >
                                Lat/Lon
                            </button>
                            <button 
                                onClick={() => setCoordFormat('utm')}
                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${coordFormat === 'utm' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}
                            >
                                UTM
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
