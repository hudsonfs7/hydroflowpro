import { User, Organization } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyB8Zy474NuHKlIhR4s4C_MwmHOJVsz0p0s",
  authDomain: "hydroflow-b6c4e.firebaseapp.com",
  projectId: "hydroflow-b6c4e",
  storageBucket: "hydroflow-b6c4e.firebasestorage.app",
  messagingSenderId: "418195572817",
  appId: "1:418195572817:web:0a0c319d4ddd1de7ef1070",
  measurementId: "G-W669PK82WY"
};

let lazyFirebase: any = null;

const getFirebaseDb = async () => {
    if (lazyFirebase) return lazyFirebase;
    
    // Lazy load the SDK
    const { initializeApp } = await import("firebase/app");
    const firestore = await import("firebase/firestore");
    
    const app = initializeApp(firebaseConfig);
    const db = firestore.getFirestore(app);
    
    try {
        const { getAnalytics } = await import("firebase/analytics");
        getAnalytics(app);
    } catch (e) {
        console.warn("Analytics failed to load", e);
    }
    
    lazyFirebase = { db, ...firestore };
    return lazyFirebase;
};

// --- GLOBAL SEQUENTIAL NUMBERING ---

/**
 * Gera o próximo número de proposta globalmente (atomicamente).
 * Formato: SEQUENCIAL/ANO (Ex: 105/2026)
 */
export const generateNextProposalNumber = async (): Promise<string> => {
    const { db, doc, runTransaction } = await getFirebaseDb();
    
    const year = new Date().getFullYear();
    const counterDocRef = doc(db, "system", "counters");

    try {
        const newNumber = await runTransaction(db, async (transaction: any) => {
            const sfDoc = await transaction.get(counterDocRef);
            
            let currentCount = 0;
            if (sfDoc.exists()) {
                const data = sfDoc.data();
                // Verifica se o contador é do ano atual, senão reseta (ou mantém se preferir sequencial infinito)
                // A regra do cliente é "+1 a cada proposta lançada no sistema".
                // Assumindo sequencial absoluto ou anual. Vou implementar Sequencial Global Infinito para robustez,
                // mas vou guardar o ano para referência.
                currentCount = data.proposalCount || 0;
            } else {
                // Cria o documento se não existir
                transaction.set(counterDocRef, { proposalCount: 0 });
            }

            const nextCount = currentCount + 1;
            
            // Atualiza o contador
            transaction.update(counterDocRef, { proposalCount: nextCount });
            
            return nextCount;
        });

        // Retorna formatado. Ajuste zeros à esquerda se desejar (ex: 001/2026)
        // O cliente pediu "crescente", não especificou padding, mas padrão comercial geralmente tem 2 ou 3 digitos.
        return `${newNumber.toString().padStart(2, '0')}/${year}`;

    } catch (err) {
        const error = err as Error;
        console.error("Erro ao gerar número de proposta:", error);
        throw new Error("Falha ao gerar número de proposta sequencial.");
    }
};

// --- AUTHENTICATION & USER MANAGEMENT ---

export const loginUser = async (username: string, password: string): Promise<User | null> => {
    const { db, collection, query, where, getDocs } = await getFirebaseDb();

    // Master Access Hardcoded
    if (username === 'hudsonfs7' && password === 'hercules21') {
        return {
            id: 'master-001',
            username: 'hudsonfs7',
            organizationId: 'MASTER_ACCESS',
            role: 'master'
        };
    }

    try {
        const q = query(collection(db, "users"), where("username", "==", username), where("password", "==", password));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            return { id: userDoc.id, ...userDoc.data() } as User;
        }
        return null;
    } catch (err) {
        const error = err as Error;
        console.error("Login failed:", error);
        throw error;
    }
};

export const getOrganizations = async (): Promise<Organization[]> => {
    const { db, collection, query, orderBy, getDocs } = await getFirebaseDb();
    try {
        const q = query(collection(db, "organizations"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as Organization));
    } catch (err) {
        const error = err as Error;
        console.error("Error fetching organizations:", error);
        return [];
    }
};

export const getOrganizationDetails = async (orgId: string): Promise<Organization | null> => {
    const { db, doc, getDoc } = await getFirebaseDb();
    if (orgId === 'MASTER_ACCESS' || !orgId) return null;
    try {
        const docRef = doc(db, "organizations", orgId);
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as Organization : null;
    } catch (err) {
        const error = err as Error;
        console.error("Error fetching organization details:", error);
        return null;
    }
};

export const getOrganizationName = async (orgId: string): Promise<string> => {
    if (orgId === 'MASTER_ACCESS') return 'Administração Geral';
    if (!orgId) return "";
    const org = await getOrganizationDetails(orgId);
    return org ? org.name : "";
};

export const getUsers = async (): Promise<User[]> => {
    const { db, collection, query, orderBy, getDocs } = await getFirebaseDb();
    try {
        const q = query(collection(db, "users"), orderBy("username"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as User));
    } catch (err) {
        const error = err as Error;
        console.error("Error fetching users:", error);
        return [];
    }
};

export const addOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt'>): Promise<string> => {
    const { db, collection, addDoc, serverTimestamp } = await getFirebaseDb();
    try {
        const docRef = await addDoc(collection(db, "organizations"), {
            ...orgData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (err) {
        const error = err as Error;
        console.error("Error adding organization:", error);
        throw error;
    }
};

export const updateOrganization = async (id: string, orgData: Partial<Organization>): Promise<void> => {
    const { db, doc, updateDoc } = await getFirebaseDb();
    try {
        const docRef = doc(db, "organizations", id);
        const { id: _, createdAt: __, ...updateData } = orgData as any; // Exclude immutable fields
        await updateDoc(docRef, updateData);
    } catch (err) {
        const error = err as Error;
        console.error("Error updating organization:", error);
        throw error;
    }
};

export const deleteOrganization = async (id: string): Promise<void> => {
    const { db, doc, deleteDoc } = await getFirebaseDb();
    try {
        await deleteDoc(doc(db, "organizations", id));
    } catch (err) {
        const error = err as Error;
        console.error("Error deleting organization:", error);
        throw error;
    }
};

export const addUser = async (userData: Omit<User, 'id'>) => {
    const { db, collection, query, where, getDocs, addDoc, serverTimestamp } = await getFirebaseDb();
    try {
        // Verifica duplicidade
        const q = query(collection(db, "users"), where("username", "==", userData.username));
        const check = await getDocs(q);
        if (!check.empty) throw new Error("Usuário já existe.");

        const docRef = await addDoc(collection(db, "users"), {
            ...userData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (err) {
        const error = err as Error;
        console.error("Error adding user:", error);
        throw error;
    }
};

export const updateUser = async (id: string, userData: Partial<User>) => {
    const { db, doc, updateDoc } = await getFirebaseDb();
    try {
        const docRef = doc(db, "users", id);
        await updateDoc(docRef, userData);
    } catch (err) {
        const error = err as Error;
        console.error("Error updating user:", error);
        throw error;
    }
};

export const deleteUser = async (id: string) => {
    const { db, doc, deleteDoc } = await getFirebaseDb();
    try {
        await deleteDoc(doc(db, "users", id));
    } catch (err) {
        const error = err as Error;
        console.error("Error deleting user:", error);
        throw error;
    }
};

// --- PROJECTS MANAGEMENT ---

export const getProjectsByUser = async (username: string) => {
    // Note: Projects currently store createdBy in metadata JSON string or not at all in root level easily searchable.
    // However, they have organizationId. If we want to find projects by a user to delete/transfer, 
    // we might need to rely on organizationId if users are 1:1 with orgs or filter client side.
    // Assuming users share organization projects. 
    // Best effort: Get all projects for user's organization.
    
    // For this implementation, we will fetch projects by OrganizationId of the user.
    // If we need strict per-user ownership, we'd need a root 'userId' field on projects.
    // The current schema uses 'organizationId'.
    return []; 
};

export const transferProjects = async (oldUserId: string, newUserId: string, organizationId: string) => {
    const { db, doc, getDoc, writeBatch } = await getFirebaseDb();
    // Since projects are bound to OrganizationId, simply deleting the user doesn't delete the projects 
    // if other users exist in the same Org. 
    // BUT, the prompt implies "Deleted by User". 
    // If the requirement is to delete EVERYTHING created by that user, we need to know what they created.
    // Current project structure: { name, data: string (json), organizationId, createdAt }
    // The internal JSON metadata has 'createdBy'.
    // To efficiently do this without a 'userId' index, we must query by OrganizationId and filter in JS.
    
    // NOTE: This operation can be heavy if there are thousands of projects.
    
    // 1. Get User to know Org
    const userSnap = await getDoc(doc(db, "users", oldUserId));
    if (!userSnap.exists()) return;
    const oldUserData = userSnap.data() as User;
    
    const projects = await getCloudProjects(organizationId || oldUserData.organizationId);
    
    const batch = writeBatch(db);
    let count = 0;

    for (const proj of projects) {
        // Parse to check ownership
        try {
            const meta = JSON.parse(proj.data).metadata;
            // Check if created by this user (username comparison as stored in metadata)
            if (meta && meta.createdBy === oldUserData.username) {
                // Transfer logic: Update 'createdBy' inside JSON?
                // Or just keep them? The prompt says "Mantém em nome de outro usuário".
                // We'll update the metadata.createdBy to the new User's username.
                
                const newUserSnap = await getDoc(doc(db, "users", newUserId));
                const newUsername = newUserSnap.exists() ? newUserSnap.data().username : "Transferido";

                meta.createdBy = newUsername;
                const newJson = JSON.stringify({ ...JSON.parse(proj.data), metadata: meta });
                
                const projRef = doc(db, "projects", proj.id);
                batch.update(projRef, { data: newJson });
                count++;
            }
        } catch (e) {}
    }
    
    if (count > 0) await batch.commit();
};

export const deleteProjectsByUser = async (userId: string, organizationId: string) => {
    const { db, doc, getDoc, writeBatch } = await getFirebaseDb();
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) return;
    const userData = userSnap.data() as User;

    const projects = await getCloudProjects(organizationId || userData.organizationId);
    const batch = writeBatch(db);
    let count = 0;

    for (const proj of projects) {
        try {
            const meta = JSON.parse(proj.data).metadata;
            if (meta && meta.createdBy === userData.username) {
                const projRef = doc(db, "projects", proj.id);
                batch.delete(projRef);
                count++;
            }
        } catch (e) {}
    }

    if (count > 0) await batch.commit();
};


/**
 * Gera o próximo número de PROJETO globalmente (atomicamente).
 * Formato: EX-001/2026 (3 letras do nome, sequencial 001, ano atual)
 */
export const generateNextProjectCode = async (projectName: string): Promise<string> => {
    const { db, doc, runTransaction } = await getFirebaseDb();
    const year = new Date().getFullYear();
    const counterDocRef = doc(db, "system", "counters");

    // Extrair prefixo (3 primeiras letras)
    const prefix = projectName.substring(0, 3).toUpperCase().padEnd(3, 'X');

    try {
        const nextCount = await runTransaction(db, async (transaction: any) => {
            const sfDoc = await transaction.get(counterDocRef);
            let currentCount = 0;
            if (sfDoc.exists()) {
                currentCount = sfDoc.data().projectCount || 0;
            } else {
                transaction.set(counterDocRef, { projectCount: 0, proposalCount: 0 });
            }
            const nextVal = currentCount + 1;
            transaction.update(counterDocRef, { projectCount: nextVal });
            return nextVal;
        });

        return `${prefix}-${nextCount.toString().padStart(3, '0')}/${year}`;
    } catch (err) {
        console.error("Erro ao gerar código de projeto:", err);
        throw new Error("Falha ao gerar código de projeto.");
    }
};

/**
 * Busca um projeto pelo Protocolo (ID Amigável) - ACESSO PÚBLICO.
 * Retorna apenas metadados básicos para segurança.
 */
export const getProjectByProtocol = async (projectCode: string): Promise<any | null> => {
    const { db, collection, query, where, getDocs } = await getFirebaseDb();
    if (!projectCode) return null;

    try {
        const q = query(collection(db, "projects"), where("projectCode", "==", projectCode.trim().toUpperCase()));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return null;
        
        const docSnap = snapshot.docs[0];
        const fullData = docSnap.data();
        const internalData = JSON.parse(fullData.data);
        const meta = internalData.metadata;

        // Regras de Negócio: Determinar o que exibir no dashboard
        const acceptedProposal = meta.proposals?.find((p: any) => p.id === meta.acceptedProposalId);
        
        const showEvte = meta.portalSettings?.showEvte ?? !!acceptedProposal?.hasEvte;
        const showWater = meta.portalSettings?.showWater ?? (acceptedProposal?.projectType === 'water' || acceptedProposal?.projectType === 'both');
        const showSewage = meta.portalSettings?.showSewage ?? (acceptedProposal?.projectType === 'sewage' || acceptedProposal?.projectType === 'both');
        
        const showBudget = meta.portalSettings?.showBudget ?? !!acceptedProposal;
        const showContract = meta.portalSettings?.showContract ?? !!meta.savedContract;

        return {
            id: docSnap.id,
            name: fullData.name,
            projectCode: fullData.projectCode,
            company: meta.company,
            city: meta.city,
            status: meta.projectStatus || { evte: 'Pendente', water: 'Andamento', sewage: 'Andamento' },
            observations: (meta.observations || []).filter((obs: any) => obs.visibleToPublic),
            
            // Flags de Visibilidade
            visibility: {
                evte: showEvte,
                water: showWater,
                sewage: showSewage,
                budget: showBudget,
                contract: showContract
            },
            
            // Dados Resumidos (Apenas se visível)
            budget: showBudget ? {
                totalValue: acceptedProposal?.totalValue || 0,
                status: acceptedProposal?.status || 'pending',
                date: acceptedProposal?.createdAt || '',
                items: (acceptedProposal?.extraItems || []).map((i: any) => ({ desc: i.description, qty: i.quantity, unit: i.unit }))
            } : null,
            
            contract: showContract ? {
                date: meta.savedContract?.date || '',
                company: meta.savedContract?.companyName || ''
            } : null,

            progress: meta.portalSettings?.developmentProgress || 0
        };
    } catch (err) {
        console.error("Erro ao consultar protocolo:", err);
        return null;
    }
};

/**
 * Atualiza um projeto para dar ciente em uma observação (Público).
 */
export const acknowledgeObservation = async (projectId: string, observationId: string) => {
    const { db, doc, getDoc, updateDoc, serverTimestamp } = await getFirebaseDb();
    try {
        const docRef = doc(db, "projects", projectId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const inner = JSON.parse(data.data);
        const obs = inner.metadata.observations || [];
        
        const target = obs.find((o: any) => o.id === observationId);
        if (target) {
            target.acknowledged = true;
            target.acknowledgedAt = new Date().toISOString();
        }

        await updateDoc(docRef, {
            data: JSON.stringify(inner),
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Erro ao dar ciente:", e);
    }
};

/**
 * Salva um projeto na nuvem (Cria Novo).
 */
export const saveProjectToCloud = async (projectName: string, projectData: any, organizationId?: string) => {
    const { db, collection, addDoc, serverTimestamp } = await getFirebaseDb();
    try {
        // Gerar o código amigável PRIMEIRO
        const projectCode = await generateNextProjectCode(projectName);
        
        // Inserir no JSON (metadata) e no root level para busca rápida
        const enrichedData = { ...projectData };
        if (enrichedData.metadata) {
            enrichedData.metadata.projectCode = projectCode;
            enrichedData.metadata.projectStatus = { evte: 'Pendente', water: 'Andamento', sewage: 'Andamento' };
            enrichedData.metadata.observations = [];
        }

        const docRef = await addDoc(collection(db, "projects"), {
            name: projectName,
            projectCode: projectCode, // Campo root para consulta pública rápida
            data: JSON.stringify(enrichedData),
            organizationId: organizationId || 'legacy',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (err) {
        const error = err as Error;
        console.error("Erro Firebase ao Salvar:", error);
        handleFirebaseError(error);
    }
};

/**
 * Atualiza um projeto existente na nuvem.
 */
export const updateProjectInCloud = async (id: string, projectName: string, projectData: any) => {
    const { db, doc, updateDoc, serverTimestamp } = await getFirebaseDb();
    try {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, {
            name: projectName,
            data: JSON.stringify(projectData),
            updatedAt: serverTimestamp()
        });
    } catch (err) {
        const error = err as Error;
        console.error("Erro Firebase ao Atualizar:", error);
        handleFirebaseError(error);
    }
};

/**
 * Deleta um projeto da nuvem.
 */
export const deleteProjectFromCloud = async (id: string) => {
    const { db, doc, deleteDoc } = await getFirebaseDb();
    if (!id) throw new Error("ID do projeto não fornecido para deleção.");
    try {
        console.log(`Tentando deletar documento: ${id}`);
        await deleteDoc(doc(db, "projects", id));
        console.log(`Documento ${id} deletado com sucesso.`);
    } catch (err) {
        const error = err as Error;
        console.error("Erro Firebase ao Deletar:", error);
        handleFirebaseError(error);
    }
};

/**
 * Busca um único projeto pelo ID.
 */
export const getProjectById = async (id: string): Promise<any | null> => {
    const { db, doc, getDoc } = await getFirebaseDb();
    try {
        const snap = await getDoc(doc(db, "projects", id));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() };
    } catch (e) {
        console.error("Erro ao carregar projeto por ID:", e);
        return null;
    }
};

/**
 * Busca a lista de projetos do servidor.
 */
export const getCloudProjects = async (organizationId?: string): Promise<any[]> => {
    const { db, collection, query, orderBy, where, getDocs } = await getFirebaseDb();
    try {
        let q;
        
        if (organizationId === 'MASTER_ACCESS' || !organizationId) {
            // Master vê tudo (Consulta simples, orderBy funciona com índice padrão)
            q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        } else {
            // Usuário comum: Apenas filtro por igualdade. 
            // REMOVIDO orderBy("createdAt", "desc") para evitar erro de índice composto inexistente.
            // A ordenação será feita no cliente (JavaScript) abaixo.
            q = query(
                collection(db, "projects"), 
                where("organizationId", "==", organizationId)
            );
        }

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) return [];
        
        const projects = querySnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Ordenação Client-Side para evitar erro de índice no Firestore
        // (Necessário quando se usa where + orderBy em campos diferentes)
        if (organizationId !== 'MASTER_ACCESS' && organizationId) {
            projects.sort((a: any, b: any) => {
                const tA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.seconds || 0;
                const tB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.seconds || 0;
                return tB - tA; // Decrescente
            });
        }

        return projects;

    } catch (err) {
        const error = err as Error;
        console.error("Erro Firebase ao Listar:", error);
        handleFirebaseError(error);
        return [];
    }
};

/**
 * MIGRATION: Atualiza projetos antigos que não possuem ProjectCode.
 */
export const migrateProjects = async () => {
    const { db, collection, getDocs, doc, updateDoc, serverTimestamp } = await getFirebaseDb();
    const qSnapshot = await getDocs(collection(db, "projects"));
    
    console.log(`Iniciando migração de ${qSnapshot.size} projetos...`);
    
    for (const docSnap of qSnapshot.docs) {
        const data = docSnap.data();
        if (!data.projectCode) {
            console.log(`Migrando projeto: ${data.name}`);
            const newCode = await generateNextProjectCode(data.name);
            const inner = JSON.parse(data.data);
            
            if (!inner.metadata) inner.metadata = {};
            inner.metadata.projectCode = newCode;
            inner.metadata.projectStatus = inner.metadata.projectStatus || { evte: 'Pendente', water: 'Andamento', sewage: 'Andamento' };
            inner.metadata.observations = inner.metadata.observations || [];
            
            await updateDoc(doc(db, "projects", docSnap.id), {
                projectCode: newCode,
                data: JSON.stringify(inner),
                updatedAt: serverTimestamp()
            });
        }
    }
    console.log("Migração concluída.");
};

/**
 * Tratamento centralizado de erros do Firebase
 */
function handleFirebaseError(err: unknown): never {
    const e = err as { message?: string; code?: string };
    const msg = e.message || "";
    const code = e.code || "";

    console.error(`Firebase Error [${code}]: ${msg}`);

    if (code === 'permission-denied' || msg.includes('Missing or insufficient permissions')) {
        const erroMsg = `ERRO DE PERMISSÃO:
O Firebase está bloqueando o acesso aos dados.`;
        alert(erroMsg);
        throw new Error("Permissão negada.");
    }
    
    if (code === 'unavailable' || code === 'failed-precondition') {
        // failed-precondition geralmente é erro de índice
        throw new Error("Erro de conexão ou modo offline.");
    }

    throw new Error(msg || "Erro desconhecido na comunicação com o Firebase.");
}
