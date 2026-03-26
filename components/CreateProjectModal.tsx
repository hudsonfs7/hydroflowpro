
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectMetadata, User, Organization } from '../types';
import { ModalContainer, InputGroup, SmartNumberInput } from './CommonUI';
import { CloseIcon, PlusIcon, TrashIcon, CheckIcon, BuildingIcon, SearchIcon, SaveIcon } from './Icons';
import { getOrganizations, addOrganization } from '../services/firebaseService';

interface CreateProjectModalProps {
  onClose: () => void;
  onSave: (data: ProjectMetadata) => void;
  onDelete?: () => void; 
  initialData?: ProjectMetadata | null;
  userOrgName?: string; 
  currentUser?: User | null;
}

// Estilo de fonte padronizado para informações cadastradas
const UNIFORM_INPUT_STYLE = "w-full bg-white border border-slate-300 rounded-lg p-3 text-sm outline-none focus:border-blue-500 shadow-sm font-black uppercase text-slate-800 tracking-tight placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 transition-all";

/**
 * Modal interno para seleção e CADASTRO de Organização/Empresa
 */
const OrganizationSelectorModal = ({ organizations, onClose, onSelect, onRefresh }: { organizations: Organization[], onClose: () => void, onSelect: (org: Organization) => void, onRefresh: () => void }) => {
    const [search, setSearch] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form de Cadastro
    const [newOrg, setNewOrg] = useState({ name: '', fantasyName: '', cnpj: '' });

    const filtered = organizations.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase()) || 
        (o.fantasyName && o.fantasyName.toLowerCase().includes(search.toLowerCase())) ||
        (o.cnpj && o.cnpj.includes(search))
    );

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOrg.name) return alert("O nome da empresa é obrigatório.");
        setLoading(true);
        try {
            const id = await addOrganization({
                ...newOrg,
                primaryColor: '#10b981',
                secondaryColor: '#f0fdf4'
            });
            alert("Empresa cadastrada com sucesso!");
            onRefresh();
            onSelect({ id, ...newOrg }); // Seleciona automaticamente a criada
    } catch (err: unknown) {
        console.error(err);
        alert("Erro ao cadastrar empresa.");
    } finally {
            setLoading(false);
        }
    };

    return (
        <ModalContainer onClose={onClose} zIndex="z-[8500]" backdropClass="bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                    <h4 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                        <BuildingIcon /> {isRegistering ? 'Cadastrar Nova Empresa' : 'Selecionar Empresa Cadastrada'}
                    </h4>
                    <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><CloseIcon /></button>
                </div>
                
                {!isRegistering ? (
                    <>
                        <div className="p-4 border-b border-slate-100 bg-white flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold uppercase tracking-tight text-slate-700"
                                    placeholder="Filtrar por nome, fantasia ou CNPJ..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    autoFocus
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <SearchIcon />
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsRegistering(true)}
                                className="bg-emerald-600 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                                <PlusIcon /> Cadastrar
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-50/30">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white/80 backdrop-blur-sm z-10">
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-4 py-3">Empresa</th>
                                        <th className="px-4 py-3">CNPJ</th>
                                        <th className="px-4 py-3 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={3} className="p-12 text-center text-xs text-slate-400 italic font-medium">Nenhuma empresa encontrada com este filtro.</td></tr>
                                    ) : (
                                        filtered.map(org => (
                                            <tr key={org.id} className="hover:bg-blue-50 transition-colors group">
                                                <td className="px-4 py-4">
                                                    <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{org.name}</div>
                                                    {org.fantasyName && <div className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">{org.fantasyName}</div>}
                                                </td>
                                                <td className="px-4 py-4 text-xs font-mono font-bold text-slate-500">{org.cnpj || '---'}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <button 
                                                        onClick={() => onSelect(org)}
                                                        className="bg-blue-600 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-700 shadow-md transform hover:scale-105"
                                                    >
                                                        Selecionar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <form onSubmit={handleRegister} className="p-8 space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 gap-6">
                            <InputGroup label="Razão Social (Nome Completo)">
                                <input 
                                    type="text" 
                                    required 
                                    className={UNIFORM_INPUT_STYLE}
                                    value={newOrg.name}
                                    onChange={e => setNewOrg({...newOrg, name: e.target.value})}
                                    placeholder="Ex: Empresa de Engenharia Ltda"
                                />
                            </InputGroup>
                            <InputGroup label="Nome Fantasia">
                                <input 
                                    type="text" 
                                    className={UNIFORM_INPUT_STYLE}
                                    value={newOrg.fantasyName}
                                    onChange={e => setNewOrg({...newOrg, fantasyName: e.target.value})}
                                    placeholder="Ex: Projetos Rápidos"
                                />
                            </InputGroup>
                            <InputGroup label="CNPJ">
                                <input 
                                    type="text" 
                                    className={UNIFORM_INPUT_STYLE}
                                    value={newOrg.cnpj}
                                    onChange={e => setNewOrg({...newOrg, cnpj: e.target.value})}
                                    placeholder="00.000.000/0000-00"
                                />
                            </InputGroup>
                        </div>
                        
                        <div className="flex gap-3 pt-4">
                            <button 
                                type="button" 
                                onClick={() => setIsRegistering(false)}
                                className="flex-1 py-3 bg-slate-100 text-slate-600 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="flex-1 py-3 bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:opacity-50"
                            >
                                {loading ? 'Salvando...' : <><CheckIcon /> Salvar e Selecionar</>}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </ModalContainer>
    );
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onSave, onDelete, initialData, userOrgName, currentUser }) => {
  const [formData, setFormData] = useState<ProjectMetadata>(() => initialData || {
    name: '',
    studyName: '',
    company: '',
    companyCnpj: '',
    consultant: '',
    city: '',
    organizationId: currentUser?.role !== 'master' ? currentUser?.organizationId : '',
    lotsHab: 0,
    lotsCom: 0,
    lotsInst: 0,
    habDomRate: 2.8,
    perCapita: 120,
    consumptionCom: 500,
    consumptionInst: 500,
    attendanceRate: 100,
    supplyHours: 24,
    useK1: false,
    useK2: false,
    eventNumber: '',
    hasEvte: false,
    evteNumber: '',
    evteDate: '',
    hasConstraints: false,
    constraintsText: ''
  });

  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [showOrgSelector, setShowOrgSelector] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const isMaster = currentUser?.role === 'master';

  const refreshOrgs = () => {
      getOrganizations().then(orgs => setAllOrganizations(orgs));
  };

  useEffect(() => {
      refreshOrgs();
  }, []);

  useEffect(() => {
      if (!isMaster && userOrgName && !formData.consultant) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setFormData(prev => ({ ...prev, consultant: userOrgName, organizationId: currentUser?.organizationId }));
      }
  }, [userOrgName, isMaster, currentUser, formData.consultant]);

  const evteExpiration = useMemo(() => {
    if (!formData.evteDate || !formData.hasEvte) return '---';
    try {
        const date = new Date(formData.evteDate);
        if (isNaN(date.getTime())) return 'Inválida';
        date.setFullYear(date.getFullYear() + 1);
        return date.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Erro';
    }
  }, [formData.evteDate, formData.hasEvte]);

  const currentK = useMemo(() => {
      let k = 1.0;
      if (formData.useK1) k *= 1.2;
      if (formData.useK2) k *= 1.5;
      return k;
  }, [formData.useK1, formData.useK2]);

  const results = useMemo(() => {
      const hours = formData.supplyHours || 24;
      const seconds = hours * 3600;
      if (seconds === 0) return { res: 0, com: 0, inst: 0, total: 0 };

      const popRes = (formData.lotsHab || 0) * (formData.habDomRate || 0);
      const volRes = popRes * (formData.perCapita || 0); 
      const qRes = (volRes / seconds) * currentK;

      const volCom = (formData.lotsCom || 0) * (formData.consumptionCom || 0); 
      const qCom = (volCom / seconds) * currentK;

      const popAtendida = popRes * ((formData.attendanceRate || 0) / 100);
      const qInst = (formData.lotsInst > 0) ? ((popAtendida * (formData.consumptionInst || 0)) / seconds) * currentK : 0;

      const total = qRes + qCom + qInst;

      return {
          res: qRes,
          com: qCom,
          inst: qInst,
          total: total
      };
  }, [formData, currentK]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert("O nome do projeto é obrigatório.");
    if (isMaster && !formData.organizationId) return alert("Selecione uma Organização para vincular o projeto.");
    onSave(formData);
  };

  const handleDeleteClick = () => {
      if (window.confirm("ATENÇÃO: Tem certeza que deseja DELETAR este projeto?\nEssa ação não pode ser desfeita.")) {
          if (onDelete) onDelete();
      }
  };

  const handleSelectOrg = (org: Organization) => {
      setFormData({
          ...formData,
          company: org.name,
          companyCnpj: org.cnpj || ''
      });
      setShowOrgSelector(false);
      setIsDropdownOpen(false);
  };

  const quickFilteredOrgs = useMemo(() => {
      if (!formData.company || isDropdownOpen === false) return [];
      return allOrganizations.filter(o => 
          o.name.toLowerCase().includes(formData.company.toLowerCase()) ||
          (o.fantasyName && o.fantasyName.toLowerCase().includes(formData.company.toLowerCase()))
      ).slice(0, 5);
  }, [formData.company, allOrganizations, isDropdownOpen]);

  return (
    <ModalContainer onClose={onClose} zIndex="z-[7000]" closeOnBackdropClick={false}>
      <div className="bg-white rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.4)] w-full max-w-4xl overflow-hidden border border-slate-200 animate-slide-up flex flex-col max-h-[95vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-black text-slate-700 flex items-center gap-3 uppercase text-xs tracking-widest">
              <span className="bg-blue-600 text-white p-1.5 rounded-lg shadow-md shadow-blue-100"><PlusIcon /></span> 
              {initialData ? 'Editar Empreendimento' : 'Novo Empreendimento'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors"><CloseIcon /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="flex flex-col gap-4">
                  <InputGroup label="Nome do Empreendimento">
                    <input 
                      type="text" 
                      required
                      className={UNIFORM_INPUT_STYLE}
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: Condomínio Solar das Águas"
                    />
                  </InputGroup>
                  <InputGroup label="Identificação do Estudo">
                    <input 
                      type="text" 
                      required
                      className={UNIFORM_INPUT_STYLE}
                      value={formData.studyName || ''}
                      onChange={e => setFormData({...formData, studyName: e.target.value})}
                      placeholder="Ex: Estudo de dimensionamento de abastecimento Palhinha"
                    />
                  </InputGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <InputGroup label="Empresa Contratante">
                        <div className="flex gap-1 relative">
                            <input 
                                type="text" 
                                autoComplete="off"
                                className={UNIFORM_INPUT_STYLE}
                                style={{ paddingRight: '2.5rem' }}
                                value={formData.company}
                                onChange={e => {
                                    setFormData({...formData, company: e.target.value});
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Digite ou pesquise..."
                            />
                            <button 
                                type="button"
                                onClick={() => setShowOrgSelector(true)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 p-1.5 rounded-lg transition-colors bg-white/80"
                                title="Ver todas as empresas"
                            >
                                <SearchIcon />
                            </button>
                        </div>
                    </InputGroup>
                    
                    {isDropdownOpen && quickFilteredOrgs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden animate-fade-in ring-1 ring-black/5">
                            {quickFilteredOrgs.map(org => (
                                <button 
                                    key={org.id} 
                                    type="button"
                                    onClick={() => handleSelectOrg(org)}
                                    className="w-full p-4 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                                >
                                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight">{org.name}</div>
                                    <div className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">{org.cnpj || 'Sem CNPJ'}</div>
                                </button>
                            ))}
                            <button 
                                type="button"
                                onClick={() => setShowOrgSelector(true)}
                                className="w-full p-3 bg-slate-50 text-[10px] font-black text-blue-600 uppercase tracking-widest text-center hover:bg-slate-100"
                            >
                                Ver Todas / Cadastrar Nova
                            </button>
                        </div>
                    )}
                </div>

                <InputGroup label="CNPJ da Empresa">
                    <input 
                        type="text" 
                        className={UNIFORM_INPUT_STYLE + " font-mono text-xs"}
                        value={formData.companyCnpj || ''}
                        onChange={e => setFormData({...formData, companyCnpj: e.target.value})}
                        placeholder="00.000.000/0000-00"
                    />
                </InputGroup>
              </div>
              
              <div className="col-span-1">
                <InputGroup label="Cidade">
                    <input 
                        type="text" 
                        className={UNIFORM_INPUT_STYLE}
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                        placeholder="CIDADE - UF"
                    />
                </InputGroup>
              </div>

              <div className="col-span-1">
                  <InputGroup label="Organização Responsável (Vínculo)">
                        {isMaster ? (
                            <div className="relative">
                                <select 
                                    className={UNIFORM_INPUT_STYLE + " appearance-none pl-10 cursor-pointer pr-10"}
                                    value={formData.organizationId || ''}
                                    onChange={(e) => {
                                        const selectedOrg = allOrganizations.find(o => o.id === e.target.value);
                                        setFormData({
                                            ...formData, 
                                            organizationId: e.target.value,
                                            consultant: selectedOrg ? selectedOrg.name : formData.consultant
                                        });
                                    }}
                                >
                                    <option value="" disabled>Selecione a Organização...</option>
                                    {allOrganizations.filter(o => o.id !== 'MASTER_ACCESS').map(org => (
                                        <option key={org.id} value={org.id}>{org.name}</option>
                                    ))}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                                    <BuildingIcon />
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        ) : (
                            <input 
                                type="text" 
                                className={UNIFORM_INPUT_STYLE + " bg-slate-50 text-slate-400 cursor-not-allowed border-dashed"}
                                value={userOrgName || formData.consultant || ''}
                                readOnly
                            />
                        )}
                  </InputGroup>
              </div>
          </div>

          <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 space-y-6 mb-8 transition-all">
            <div className="flex justify-between items-center border-b border-indigo-200 pb-3">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div> Dados do EVTE
                </h4>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-indigo-200 shadow-sm transition-all hover:scale-105 active:scale-95">
                    <input 
                        type="checkbox" 
                        checked={formData.hasEvte || false}
                        onChange={e => setFormData({...formData, hasEvte: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Possui EVTE</span>
                </label>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-300 ${!formData.hasEvte ? 'opacity-30 pointer-events-none grayscale blur-[1px]' : ''}`}>
                <InputGroup label="Número do EVTE">
                    <input 
                        type="text" 
                        disabled={!formData.hasEvte}
                        className={UNIFORM_INPUT_STYLE + " font-mono"}
                        value={formData.evteNumber || ''}
                        onChange={e => setFormData({...formData, evteNumber: e.target.value})}
                        placeholder="000/AAAA"
                    />
                </InputGroup>
                <InputGroup label="Data de Emissão">
                    <input 
                        type="date" 
                        disabled={!formData.hasEvte}
                        className={UNIFORM_INPUT_STYLE + " font-bold text-slate-600"}
                        value={formData.evteDate || ''}
                        onChange={e => setFormData({...formData, evteDate: e.target.value})}
                    />
                </InputGroup>
                <div className="bg-white border border-indigo-200 rounded-2xl p-4 flex flex-col justify-center shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Vencimento (1 Ano)</span>
                    <span className={`text-lg font-black ${evteExpiration === 'Inválida' || evteExpiration === 'Erro' ? 'text-red-500' : 'text-indigo-700'}`}>
                        {evteExpiration}
                    </span>
                </div>
            </div>

            <div className={`pt-2 transition-all duration-300 ${!formData.hasEvte ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                <label className="flex items-center gap-2 cursor-pointer mb-3 group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all ${formData.hasConstraints ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                         <input 
                            type="checkbox" 
                            disabled={!formData.hasEvte}
                            checked={formData.hasConstraints || false}
                            onChange={e => setFormData({...formData, hasConstraints: e.target.checked})}
                            className="sr-only"
                        />
                        {formData.hasConstraints && <CheckIcon />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-800 transition-colors">Possui Condicionantes de Projeto?</span>
                </label>
                
                {formData.hasConstraints && (
                    <textarea 
                        disabled={!formData.hasEvte}
                        value={formData.constraintsText || ''}
                        onChange={e => setFormData({...formData, constraintsText: e.target.value})}
                        className="w-full h-32 bg-white border border-orange-200 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight text-slate-700 outline-none focus:border-orange-500 shadow-inner resize-none transition-all"
                        placeholder="Descreva as condicionantes do EVTE aqui..."
                    />
                )}
            </div>
          </div>

          <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 mb-8 shadow-inner">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                <div className="flex items-center gap-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div> Composição de Lotes
                    </h4>
                </div>
                
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo Abast.</label>
                        <div className="relative">
                            <select 
                                value={formData.supplyHours || 24}
                                onChange={(e) => setFormData({...formData, supplyHours: parseInt(e.target.value)})}
                                className="bg-white border border-slate-300 text-xs rounded-xl px-4 py-2 outline-none focus:border-blue-500 text-slate-800 font-black appearance-none h-10 w-24 pr-8 shadow-sm"
                            >
                                {Array.from({length: 24}, (_, i) => i + 1).map(h => (
                                    <option key={h} value={h}>{h}h</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="6 9 12 15 18 9"/></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 px-3 shadow-sm">
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, useK1: !formData.useK1})}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${formData.useK1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                title="Fator K1 (1.2)"
                            >
                                K1
                            </button>
                            <button 
                                type="button"
                                onClick={() => setFormData({...formData, useK2: !formData.useK2})}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all ${formData.useK2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-105' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                title="Fator K2 (1.5)"
                            >
                                K2
                            </button>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5">Fator Σ</span>
                            <span className="text-xs font-mono font-black text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                                {currentK.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="flex flex-col h-full group">
                    <div className="space-y-5 flex-1">
                        <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div> Residencial
                        </h5>
                        <InputGroup label="Habitações">
                            <SmartNumberInput value={formData.lotsHab} onChange={(v: number) => setFormData({...formData, lotsHab: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                        <InputGroup label="Consumo Per Capita">
                            <SmartNumberInput value={formData.perCapita} onChange={(v: number) => setFormData({...formData, perCapita: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                        <InputGroup label="Taxa Hab/Domic">
                            <SmartNumberInput value={formData.habDomRate} onChange={(v: number) => setFormData({...formData, habDomRate: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                    </div>
                    <div className="mt-8 bg-blue-600 rounded-2xl p-5 shadow-xl shadow-blue-100 group-hover:scale-105 transition-transform">
                        <span className="text-[9px] font-black text-blue-100 uppercase block mb-1 tracking-widest opacity-80">Vazão Estimada</span>
                        <div className="text-2xl font-black text-white tracking-tighter flex items-end gap-1.5">
                            {results.res.toFixed(2)} <span className="text-xs font-bold opacity-60 mb-1 tracking-normal uppercase">L/s</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full group">
                    <div className="space-y-5 flex-1">
                        <h5 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-600"></div> Comercial
                        </h5>
                        <InputGroup label="Unidades Com.">
                            <SmartNumberInput value={formData.lotsCom} onChange={(v: number) => setFormData({...formData, lotsCom: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                        <InputGroup label="Consumo (L/Unid/Dia)">
                            <SmartNumberInput value={formData.consumptionCom || 0} onChange={(v: number) => setFormData({...formData, consumptionCom: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                    </div>
                    <div className="mt-8 bg-orange-600 rounded-2xl p-5 shadow-xl shadow-orange-100 group-hover:scale-105 transition-transform">
                        <span className="text-[9px] font-black text-orange-100 uppercase block mb-1 tracking-widest opacity-80">Vazão Estimada</span>
                        <div className="text-2xl font-black text-white tracking-tighter flex items-end gap-1.5">
                            {results.com.toFixed(2)} <span className="text-xs font-bold opacity-60 mb-1 tracking-normal uppercase">L/s</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full group">
                    <div className="space-y-5 flex-1">
                        <h5 className="text-[10px] font-black text-purple-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-600"></div> Institucional
                        </h5>
                        <InputGroup label="Unidades Inst.">
                            <SmartNumberInput value={formData.lotsInst} onChange={(v: number) => setFormData({...formData, lotsInst: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                        <InputGroup label="Consumo (L/hab.dia)">
                            <SmartNumberInput value={formData.consumptionInst || 0} onChange={(v: number) => setFormData({...formData, consumptionInst: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                        <InputGroup label="% de Atendimento">
                            <SmartNumberInput value={formData.attendanceRate || 100} onChange={(v: number) => setFormData({...formData, attendanceRate: v})} className={UNIFORM_INPUT_STYLE + " text-center"} />
                        </InputGroup>
                    </div>
                    <div className="mt-8 bg-purple-600 rounded-2xl p-5 shadow-xl shadow-purple-100 group-hover:scale-105 transition-transform">
                        <span className="text-[9px] font-black text-purple-100 uppercase block mb-1 tracking-widest opacity-80">Vazão Estimada</span>
                        <div className="text-2xl font-black text-white tracking-tighter flex items-end gap-1.5">
                            {results.inst.toFixed(2)} <span className="text-xs font-bold opacity-60 mb-1 tracking-normal uppercase">L/s</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-200 flex justify-center">
                <div className="bg-slate-900 text-white px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl transition-all hover:scale-105">
                    <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_12px_rgba(74,222,128,0.8)]"></div>
                    Σ VAZÃO TOTAL: {results.total.toFixed(2)} L/s
                </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex gap-4">
                <button 
                    type="button"
                    onClick={onClose}
                    className="px-8 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-black py-4 rounded-2xl transition-all shadow-sm text-xs uppercase tracking-widest"
                >
                    Cancelar
                </button>
                
                {initialData && onDelete && (
                    <button 
                        type="button"
                        onClick={handleDeleteClick}
                        className="px-8 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-black py-4 rounded-2xl transition-all shadow-sm flex items-center gap-2 text-xs uppercase tracking-widest"
                    >
                        <TrashIcon /> Deletar
                    </button>
                )}
            </div>

            <button 
                onClick={handleSubmit}
                className="px-12 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
            >
                <SaveIcon /> {initialData ? 'Atualizar Dados' : 'Salvar Novo Projeto'}
            </button>
        </div>
      </div>

      {showOrgSelector && (
          <OrganizationSelectorModal 
              organizations={allOrganizations.filter(o => o.id !== 'MASTER_ACCESS')} 
              onClose={() => setShowOrgSelector(false)} 
              onSelect={handleSelectOrg}
              onRefresh={refreshOrgs}
          />
      )}
    </ModalContainer>
  );
};
