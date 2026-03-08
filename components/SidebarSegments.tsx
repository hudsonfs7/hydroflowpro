
import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from './Icons';

interface SidebarSegmentProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
    badge?: string | number;
}

export const SidebarSegment: React.FC<SidebarSegmentProps> = ({ 
    title, icon, children, defaultOpen = true, badge 
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`border-b border-slate-200 transition-all flex flex-col ${isOpen ? 'flex-none' : 'flex-none'}`}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
            >
                <div className="flex items-center gap-2">
                    <span className="text-slate-500">{icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">{title}</span>
                    {badge !== undefined && (
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="text-slate-400">
                    {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </div>
            </button>
            <div className={`overflow-hidden transition-all ${isOpen ? 'h-auto opacity-100 p-4' : 'h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    );
};
