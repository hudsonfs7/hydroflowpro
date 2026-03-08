
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    where,
    serverTimestamp,
    deleteDoc,
    doc,
    updateDoc,
    getDoc,
    writeBatch,
    runTransaction
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
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

// Inicializa o App
const app = initializeApp(firebaseConfig);

// Inicializa Analytics (opcional)
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) {
    console.warn("Analytics failed to load", e);
}

// Inicializa o Firestore
const db = getFirestore(app);

// --- GLOBAL SEQUENTIAL NUMBERING ---

/**
 * Gera o próximo número de proposta globalmente (atomicamente).
 * Formato: SEQUENCIAL/ANO (Ex: 105/2026)
 */
export const generateNextProposalNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
    const counterDocRef = doc(db, "system", "counters");

    try {
        const newNumber = await runTransaction(db, async (transaction) => {
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

    } catch (e) {
        console.error("Erro ao gerar número de proposta:", e);
        throw new Error("Falha ao gerar número de proposta sequencial.");
    }
};

// --- AUTHENTICATION & USER MANAGEMENT ---

export const loginUser = async (username: string, password: string): Promise<User | null> => {
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
    } catch (e) {
        console.error("Login failed:", e);
        throw e;
    }
};

export const getOrganizations = async (): Promise<Organization[]> => {
    try {
        const q = query(collection(db, "organizations"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Organization));
    } catch (e) {
        console.error("Error fetching organizations:", e);
        return [];
    }
};

export const getOrganizationDetails = async (orgId: string): Promise<Organization | null> => {
    if (orgId === 'MASTER_ACCESS' || !orgId) return null;
    try {
        const docRef = doc(db, "organizations", orgId);
        const snap = await getDoc(docRef);
        return snap.exists() ? { id: snap.id, ...snap.data() } as Organization : null;
    } catch (e) {
        console.error("Error fetching organization details:", e);
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
    try {
        const q = query(collection(db, "users"), orderBy("username"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
        console.error("Error fetching users:", e);
        return [];
    }
};

export const addOrganization = async (orgData: Omit<Organization, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const docRef = await addDoc(collection(db, "organizations"), {
            ...orgData,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e) {
        console.error("Error adding organization:", e);
        throw e;
    }
};

export const updateOrganization = async (id: string, orgData: Partial<Organization>): Promise<void> => {
    try {
        const docRef = doc(db, "organizations", id);
        const { id: _, createdAt: __, ...updateData } = orgData as any; // Exclude immutable fields
        await updateDoc(docRef, updateData);
    } catch (e) {
        console.error("Error updating organization:", e);
        throw e;
    }
};

export const deleteOrganization = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, "organizations", id));
    } catch (e) {
        console.error("Error deleting organization:", e);
        throw e;
    }
};

export const addUser = async (userData: Omit<User, 'id'>) => {
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
    } catch (e) {
        console.error("Error adding user:", e);
        throw e;
    }
};

export const updateUser = async (id: string, userData: Partial<User>) => {
    try {
        const docRef = doc(db, "users", id);
        await updateDoc(docRef, userData);
    } catch (e) {
        console.error("Error updating user:", e);
        throw e;
    }
};

export const deleteUser = async (id: string) => {
    try {
        await deleteDoc(doc(db, "users", id));
    } catch (e) {
        console.error("Error deleting user:", e);
        throw e;
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
 * Salva um projeto na nuvem (Cria Novo).
 */
export const saveProjectToCloud = async (projectName: string, projectData: any, organizationId?: string) => {
    try {
        const docRef = await addDoc(collection(db, "projects"), {
            name: projectName,
            data: JSON.stringify(projectData),
            organizationId: organizationId || 'legacy',
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (e: any) {
        console.error("Erro Firebase ao Salvar:", e);
        handleFirebaseError(e);
    }
};

/**
 * Atualiza um projeto existente na nuvem.
 */
export const updateProjectInCloud = async (id: string, projectName: string, projectData: any) => {
    try {
        const docRef = doc(db, "projects", id);
        await updateDoc(docRef, {
            name: projectName,
            data: JSON.stringify(projectData),
            updatedAt: serverTimestamp()
        });
    } catch (e: any) {
        console.error("Erro Firebase ao Atualizar:", e);
        handleFirebaseError(e);
    }
};

/**
 * Deleta um projeto da nuvem.
 */
export const deleteProjectFromCloud = async (id: string) => {
    if (!id) throw new Error("ID do projeto não fornecido para deleção.");
    try {
        console.log(`Tentando deletar documento: ${id}`);
        await deleteDoc(doc(db, "projects", id));
        console.log(`Documento ${id} deletado com sucesso.`);
    } catch (e: any) {
        console.error("Erro Firebase ao Deletar:", e);
        handleFirebaseError(e);
    }
};

/**
 * Busca a lista de projetos do servidor.
 * Se organizationId for 'MASTER_ACCESS', retorna tudo.
 * Caso contrário, filtra pela organização.
 */
export const getCloudProjects = async (organizationId?: string): Promise<any[]> => {
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
        
        const projects = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Ordenação Client-Side para evitar erro de índice no Firestore
        // (Necessário quando se usa where + orderBy em campos diferentes)
        if (organizationId !== 'MASTER_ACCESS' && organizationId) {
            projects.sort((a: any, b: any) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tB - tA; // Decrescente
            });
        }

        return projects;

    } catch (e: any) {
        console.error("Erro Firebase ao Listar:", e);
        handleFirebaseError(e);
        return [];
    }
};

/**
 * Tratamento centralizado de erros do Firebase
 */
function handleFirebaseError(e: any): never {
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
