<div align="center" style="background-color: #020617; padding: 60px 20px; border-radius: 16px; margin-bottom: 24px;">
  <table width="100%" style="border: none; background-color: transparent;">
    <tr>
      <td align="center" style="border: none; background-color: transparent;">
        <div style="width: 96px; height: 96px; background-color: #3b82f6; background-image: linear-gradient(to bottom right, #3b82f6, #4f46e5); border-radius: 24px; margin: 0 auto 24px auto; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 25px rgba(59, 130, 246, 0.5);">
          <h1 style="font-size: 36px; font-weight: 900; font-style: italic; color: white; margin: 0; line-height: 96px; letter-spacing: -2px;">HF</h1>
        </div>
        <h1 style="font-size: 48px; font-weight: 900; margin: 0 0 16px 0; color: white; font-family: system-ui, sans-serif; letter-spacing: -1px;">
          HydroFlow Pro
        </h1>
        <hr style="width: 48px; border: 1px solid #475569; margin: 0 auto 16px auto;" />
        <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.3em; color: #94a3b8; font-family: system-ui, sans-serif; margin: 0; font-weight: 600;">
          by Hudson Souza
        </p>
      </td>
    </tr>
  </table>
</div>

Plataforma web para simulação, dimensionamento e gestão de projetos de redes hidráulicas.

## 🚀 Funcionalidades

- **Modelagem Visual:** Desenho de redes de abastecimento direto no mapa (Leaflet).
- **Cálculo Hidráulico:** Métodos Darcy-Weisbach e Hazen-Williams, com solver GGA para redes malhadas.
- **Automação de Documentos:** Geração de memoriais descritivos, orçamentos e contratos em PDF.
- **Nuvem:** Sincronização em tempo real e gestão de projetos via Firebase.

## 🛠️ Tecnologias

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Mapas:** Leaflet, React-Leaflet
- **Backend:** Firebase (Firestore, Auth)

## ⚙️ Como Executar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o `.env` com suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   ```

3. Inicie o servidor local:
   ```bash
   npm run dev
   ```

---
*Uso restrito e proprietário. Todos os direitos reservados.*
