# 💧 HF HydroFlow

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/firebase-ffca28?style=for-the-badge&logo=firebase&logoColor=black)

**HF HydroFlow** é uma plataforma web avançada para simulação, dimensionamento e gestão de projetos de redes hidráulicas. Desenvolvida para engenheiros e projetistas, a ferramenta une cálculos rigorosos a uma interface interativa baseada em mapas.

---

## ✨ Principais Funcionalidades

### 🗺️ Modelagem Interativa
* **Design no Mapa:** Desenhe redes de abastecimento diretamente sobre mapas interativos (Leaflet).
* **Elementos Hidráulicos:** Suporte completo para Nós de Demanda, Reservatórios, Poços e Bombas.
* **Elevação Automática:** Integração com APIs de topografia para captura automática de cotas de terreno.
* **Importação CAD:** Suporte para leitura de arquivos DXF para agilizar o traçado da rede.

### 🧮 Motor de Cálculo Avançado
* **Métodos de Perda de Carga:** Darcy-Weisbach e Hazen-Williams.
* **Cálculo de Atrito:** Colebrook-White, Swamee-Jain.
* **Solver:** Algoritmo Global Gradient Algorithm (GGA) para simulação de redes malhadas e ramificadas.
* **Análise de Bombas:** Curvas características e determinação do ponto de operação.

### 📄 Geração Automática de Documentos
* **Memorial Descritivo:** Geração de relatórios técnicos completos nos padrões da ABNT, incluindo tabelas de resultados e premissas de cálculo.
* **Orçamentos:** Criação de propostas comerciais detalhadas com base no quantitativo de materiais (tubulações, conexões, etc.).
* **Contratos:** Geração e edição de minutas contratuais vinculadas aos dados do empreendimento.

### ☁️ Gestão na Nuvem
* **Projetos Salvos:** Sincronização em tempo real com o Firebase.
* **Gestão de Organizações:** Controle de acesso e compartilhamento de projetos entre membros da mesma equipe.
* **Versionamento:** Mantenha o histórico e os metadados dos seus projetos seguros na nuvem.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React 18, TypeScript, Vite
* **Estilização:** Tailwind CSS, Lucide Icons
* **Mapas:** Leaflet, React-Leaflet
* **Backend/BaaS:** Firebase (Firestore, Auth)
* **Geração de Documentos:** React-Markdown, HTML-to-PDF (via impressão nativa)

---

## 🚀 Como Executar o Projeto

1. **Clone o repositório**
   ```bash
   git clone https://github.com/seu-usuario/hf-hydroflow.git
   cd hf-hydroflow
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz do projeto com as suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=sua_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
   VITE_FIREBASE_PROJECT_ID=seu_project_id
   VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

4. **Inicie o Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```
   O aplicativo estará disponível em `http://localhost:3000`.

---

## 📝 Licença

Este projeto é de uso restrito e proprietário. Todos os direitos reservados.

---
*Desenvolvido com 💙 para revolucionar a engenharia hidráulica.*
