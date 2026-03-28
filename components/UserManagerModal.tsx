
import React, { useState, useEffect } from 'react';
import { ModalContainer, InputGroup } from './CommonUI';
import { UsersIcon, CloseIcon, PlusIcon, BuildingIcon, UserIcon, CheckIcon, TrashIcon, SettingsIcon, SearchIcon, UploadIcon } from './Icons';
import { 
    getOrganizations, addOrganization, addUser, getUsers, 
    updateUser, deleteUser, updateOrganization, deleteOrganization,
    deleteProjectsByUser, transferProjects 
} from '../services/firebaseService';
import { Organization, User } from '../types';

interface UserManagerModalProps {
    onClose: () => void;
}

type ViewMode = 'list_users' | 'list_orgs' | 'edit_user' | 'edit_org';

export const UserManagerModal: React.FC<UserManagerModalProps> = ({ onClose }) => {
    const [view, setView] = useState<ViewMode>('list_users');
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // State para Edição/Criação
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // User Form
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [selectedOrgId, setSelectedOrgId] = useState("");
    
    // Org Form
    const [orgName, setOrgName] = useState("");
    const [fantasyName, setFantasyName] = useState("");
    const [cnpj, setCnpj] = useState("");
    const [logoUrl, setLogoUrl] = useState("");
    const [primaryColor, setPrimaryColor] = useState("#10b981"); // Default Emerald
    const [secondaryColor, setSecondaryColor] = useState("#f0fdf4"); // Default Light Emerald

    // Delete User State
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteAction, setDeleteAction] = useState<'delete_all' | 'transfer'>('delete_all');
    const [transferToId, setTransferToId] = useState("");

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        const [orgList, userList] = await Promise.all([getOrganizations(), getUsers()]);
        setOrganizations(orgList);
        setUsers(userList);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // --- HANDLERS ORG ---

    const handlePrepareEditOrg = (org?: Organization) => {
        if (org) {
            setEditingId(org.id);
            setOrgName(org.name);
            setFantasyName(org.fantasyName || "");
            setCnpj(org.cnpj || "");
            setLogoUrl(org.logoUrl || "");
            setPrimaryColor(org.primaryColor || "#10b981");
            setSecondaryColor(org.secondaryColor || "#f0fdf4");
        } else {
            setEditingId(null);
            setOrgName("");
            setFantasyName("");
            setCnpj("");
            setLogoUrl("");
            setPrimaryColor("#10b981");
            setSecondaryColor("#f0fdf4");
        }
        setView('edit_org');
    };

    const handleSaveOrg = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const orgData = {
                name: orgName,
                fantasyName,
                cnpj,
                logoUrl,
                primaryColor,
                secondaryColor
            };

            if (editingId) {
                await updateOrganization(editingId, orgData);
            } else {
                await addOrganization(orgData);
            }
            await fetchData();
            setView('list_orgs');
        } catch (err) {
            const error = err as Error;
            alert("Erro: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrg = async (id: string) => {
        if (!confirm("Tem certeza? Isso pode afetar usuários vinculados.")) return;
        setLoading(true);
        try {
            await deleteOrganization(id);
            await fetchData();
        } catch (err) {
            const error = err as Error;
            alert("Erro: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS USER ---

    const handlePrepareEditUser = (user?: User) => {
        if (user) {
            setEditingId(user.id);
            setUsername(user.username);
            setPassword(""); // Don't show password
            setSelectedOrgId(user.organizationId);
        } else {
            setEditingId(null);
            setUsername("");
            setPassword("");
            setSelectedOrgId(organizations.length > 0 ? organizations[0].id : "");
        }
        setView('edit_user');
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userData: Partial<User> & { password?: string } = { username, organizationId: selectedOrgId };
            if (password) userData.password = password; // Only update/set password if provided

            if (editingId) {
                await updateUser(editingId, userData);
            } else {
                if (!password) throw new Error("Senha é obrigatória para novos usuários.");
                await addUser({ 
                    username, 
                    organizationId: selectedOrgId, 
                    role: 'user', 
                    password 
                } as any);
            }
            await fetchData();
            setView('list_users');
        } catch (err) {
            const error = err as Error;
            alert("Erro: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;
        setLoading(true);
        try {
            if (deleteAction === 'delete_all') {
                await deleteProjectsByUser(userToDelete.id, userToDelete.organizationId);
            } else if (deleteAction === 'transfer') {
                if (!transferToId) throw new Error("Selecione um usuário para transferir.");
                await transferProjects(userToDelete.id, transferToId, userToDelete.organizationId);
            }
            
            await deleteUser(userToDelete.id);
            await fetchData();
            setUserToDelete(null);
        } catch (err) {
            const error = err as Error;
            alert("Erro ao excluir: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getOrgName = (id: string) => organizations.find(o => o.id === id)?.name || "---";

    // Filtering
    const filteredUsers = users.filter((u: User) => u.username.toLowerCase().includes(searchTerm.toLowerCase()) || getOrgName(u.organizationId).toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredOrgs = organizations.filter((o: Organization) => o.name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Available users for transfer (excluding the one being deleted)
    const transferOptions = users.filter((u: User) => userToDelete && u.id !== userToDelete.id && u.organizationId === userToDelete.organizationId);

    return (
        <ModalContainer onClose={onClose} zIndex="z-[6000]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up border border-slate-200 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><UsersIcon /></div>
                        <div>
                            <h3 className="font-bold text-slate-800">Painel Administrativo Master</h3>
                            <p className="text-xs text-slate-500">Controle total de Usuários e Organizações</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><CloseIcon/></button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-48 bg-slate-50 border-r border-slate-200 p-2 flex flex-col gap-1">
                        <button onClick={() => setView('list_users')} className={`p-3 text-xs font-bold rounded-lg text-left flex items-center gap-2 ${view.includes('user') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <UserIcon /> Usuários
                        </button>
                        <button onClick={() => setView('list_orgs')} className={`p-3 text-xs font-bold rounded-lg text-left flex items-center gap-2 ${view.includes('org') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
                            <BuildingIcon /> Organizações
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col min-w-0 bg-white relative">
                        
                        {/* List Views */}
                        {(view === 'list_users' || view === 'list_orgs') && (
                            <>
                                <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4">
                                    <div className="relative flex-1 max-w-xs">
                                        <input type="text" placeholder="Pesquisar..." className="w-full pl-8 pr-3 py-2 bg-slate-100 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        <div className="absolute left-2.5 top-2 text-slate-400"><SearchIcon/></div>
                                    </div>
                                    <button 
                                        onClick={() => view === 'list_users' ? handlePrepareEditUser() : handlePrepareEditOrg()}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
                                    >
                                        <PlusIcon /> {view === 'list_users' ? 'Novo Usuário' : 'Nova Organização'}
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                    {view === 'list_users' ? (
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-500 uppercase">
                                                    <th className="py-2 px-2">Usuário</th>
                                                    <th className="py-2 px-2">Organização</th>
                                                    <th className="py-2 px-2 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredUsers.map(user => (
                                                    <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-3 px-2 font-bold text-slate-700">{user.username} {user.role === 'master' && <span className="bg-purple-100 text-purple-700 px-1 rounded text-[9px]">MASTER</span>}</td>
                                                        <td className="py-3 px-2 text-slate-600">{getOrgName(user.organizationId)}</td>
                                                        <td className="py-3 px-2 text-right flex justify-end gap-1">
                                                            {user.role !== 'master' && (
                                                                <>
                                                                    <button onClick={() => handlePrepareEditUser(user)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><SettingsIcon /></button>
                                                                    <button onClick={() => setUserToDelete(user)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><TrashIcon /></button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-500 uppercase">
                                                    <th className="py-2 px-2">Nome da Organização</th>
                                                    <th className="py-2 px-2">CNPJ</th>
                                                    <th className="py-2 px-2 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredOrgs.map(org => (
                                                    <tr key={org.id} className="border-b border-slate-50 hover:bg-slate-50">
                                                        <td className="py-3 px-2 font-bold text-slate-700">
                                                            {org.name}
                                                            {org.fantasyName && <div className="text-[10px] text-slate-400 font-normal">{org.fantasyName}</div>}
                                                        </td>
                                                        <td className="py-3 px-2 text-slate-500 font-mono text-[10px]">{org.cnpj || '-'}</td>
                                                        <td className="py-3 px-2 text-right flex justify-end gap-1">
                                                            {org.id !== 'MASTER_ACCESS' && (
                                                                <>
                                                                    <button onClick={() => handlePrepareEditOrg(org)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><SettingsIcon /></button>
                                                                    <button onClick={() => handleDeleteOrg(org.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><TrashIcon /></button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Edit User Form */}
                        {view === 'edit_user' && (
                            <div className="flex-1 p-8 flex flex-col">
                                <div className="flex items-center gap-2 mb-6">
                                    <button onClick={() => setView('list_users')} className="text-slate-400 hover:text-slate-600 text-xs font-bold">← Voltar</button>
                                    <h4 className="text-lg font-bold text-slate-800">{editingId ? 'Editar' : 'Criar Novo'} Usuário</h4>
                                </div>

                                <div className="max-w-md w-full mx-auto space-y-4">
                                    <form onSubmit={handleSaveUser} className="space-y-4">
                                        <InputGroup label="Nome de Usuário">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={username} onChange={e => setUsername(e.target.value)} required />
                                        </InputGroup>
                                        <InputGroup label="Senha">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={password} onChange={e => setPassword(e.target.value)} placeholder={editingId ? "Deixe em branco para manter" : "Obrigatória"} required={!editingId} />
                                        </InputGroup>
                                        <InputGroup label="Organização">
                                            <select className="w-full border border-slate-300 rounded p-2 text-sm bg-white" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)} required>
                                                <option value="" disabled>Selecione...</option>
                                                {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                                            </select>
                                        </InputGroup>
                                        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg mt-4">{loading ? 'Salvando...' : <><CheckIcon /> Salvar Usuário</>}</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Edit Org Form */}
                        {view === 'edit_org' && (
                            <div className="flex-1 p-8 flex flex-col overflow-y-auto">
                                <div className="flex items-center gap-2 mb-6">
                                    <button onClick={() => setView('list_orgs')} className="text-slate-400 hover:text-slate-600 text-xs font-bold">← Voltar</button>
                                    <h4 className="text-lg font-bold text-slate-800">{editingId ? 'Editar' : 'Criar Nova'} Organização</h4>
                                </div>

                                <div className="max-w-lg w-full mx-auto space-y-4">
                                    <form onSubmit={handleSaveOrg} className="space-y-4">
                                        <InputGroup label="Razão Social (Nome Legal)">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={orgName} onChange={e => setOrgName(e.target.value)} required />
                                        </InputGroup>
                                        
                                        <InputGroup label="Nome Fantasia (Aparece no Orçamento)">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={fantasyName} onChange={e => setFantasyName(e.target.value)} placeholder="Ex: Engenharia Avançada" />
                                        </InputGroup>

                                        <InputGroup label="CNPJ">
                                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm font-mono" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                                        </InputGroup>

                                        <InputGroup label="URL do Logotipo">
                                            <div className="flex gap-2">
                                                <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                                                {logoUrl && <img src={logoUrl} alt="Logo Preview" className="h-9 w-9 object-contain bg-slate-50 border rounded" />}
                                            </div>
                                        </InputGroup>

                                        <div className="grid grid-cols-2 gap-4">
                                            <InputGroup label="Cor Principal">
                                                <div className="flex gap-2 items-center">
                                                    <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-9 w-16 p-0 border border-slate-300 rounded cursor-pointer" />
                                                    <span className="text-xs font-mono">{primaryColor}</span>
                                                </div>
                                            </InputGroup>
                                            <InputGroup label="Cor Secundária">
                                                <div className="flex gap-2 items-center">
                                                    <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-9 w-16 p-0 border border-slate-300 rounded cursor-pointer" />
                                                    <span className="text-xs font-mono">{secondaryColor}</span>
                                                </div>
                                            </InputGroup>
                                        </div>

                                        <button disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg mt-4">{loading ? 'Salvando...' : <><CheckIcon /> Salvar Organização</>}</button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* DELETE CONFIRMATION OVERLAY */}
                        {userToDelete && (
                            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
                                <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full">
                                    <h4 className="text-lg font-bold text-slate-800 mb-2">Excluir Usuário?</h4>
                                    <p className="text-sm text-slate-500 mb-4">O usuário <strong>{userToDelete.username}</strong> será removido permanentemente.</p>
                                    
                                    <div className="space-y-3 mb-6">
                                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input type="radio" name="del_action" checked={deleteAction === 'delete_all'} onChange={() => setDeleteAction('delete_all')} className="accent-red-600" />
                                            <div className="text-sm">
                                                <div className="font-bold text-slate-700">Deletar Tudo</div>
                                                <div className="text-xs text-slate-400">Apagar todos os projetos deste usuário.</div>
                                            </div>
                                        </label>
                                        
                                        <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50 transition-colors">
                                            <input type="radio" name="del_action" checked={deleteAction === 'transfer'} onChange={() => setDeleteAction('transfer')} className="accent-blue-600" />
                                            <div className="text-sm w-full">
                                                <div className="font-bold text-slate-700">Transferir Projetos</div>
                                                <div className="text-xs text-slate-400 mb-1">Manter projetos em nome de outro usuário.</div>
                                                {deleteAction === 'transfer' && (
                                                    <select 
                                                        value={transferToId} 
                                                        onChange={e => setTransferToId(e.target.value)} 
                                                        className="w-full mt-2 text-xs p-1 border rounded bg-white"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <option value="">Selecione o destino...</option>
                                                        {transferOptions.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                                    </select>
                                                )}
                                            </div>
                                        </label>
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setUserToDelete(null)} className="flex-1 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded">Cancelar</button>
                                        <button 
                                            onClick={handleConfirmDeleteUser} 
                                            disabled={loading || (deleteAction === 'transfer' && !transferToId)}
                                            className="flex-1 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50"
                                        >
                                            {loading ? 'Processando...' : 'Confirmar'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ModalContainer>
    );
};
