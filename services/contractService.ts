
import { ProjectMetadata, ContractData, ContractClause, BudgetData } from '../types';

const ordinal = (n: number) => {
    const s = ["PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA", "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA"];
    return s[n] || `${n + 1}ª`;
};

/**
 * Lógica Central para determinar o nome da CONTRATADA (Empresa de Engenharia/Software)
 */
export const resolveContractorName = (metadata: ProjectMetadata, userOrgName?: string): string => {
    if (userOrgName && userOrgName !== 'Administração Geral') return userOrgName;
    if (metadata.consultant) return metadata.consultant;
    if (!metadata.organizationId || metadata.organizationId === 'legacy' || metadata.organizationId === 'MASTER_ACCESS') {
        return 'OLIMPO SOFTWARE LTDA';
    }
    return 'OLIMPO SOFTWARE LTDA';
};

export const getDefaultContractData = (metadata: ProjectMetadata, userOrgName?: string): ContractData => {
    const contratada = resolveContractorName(metadata, userOrgName);
    const contratante = metadata.company || 'CLIENTE NÃO IDENTIFICADO';
    const project = metadata.name || 'Empreendimento';
    const city = metadata.city || 'Cidade - UF';
    const date = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

    const lHab = metadata.lotsHab || 0;
    const lCom = metadata.lotsCom || 0;
    const lInst = metadata.lotsInst || 0;
    const totalLotes = lHab + lCom + lInst;

    let descLotes = `composto por um total de ${totalLotes} lotes`;
    const parts = [];
    if (lHab > 0) parts.push(`${lHab} lotes residenciais`);
    if (lCom > 0) parts.push(`${lCom} lotes comerciais`);
    if (lInst > 0) parts.push(`${lInst} lotes institucionais`);
    
    if (parts.length > 0) {
        descLotes += `, sendo ${parts.join(', ')}`;
    }

    const clauses: ContractClause[] = [
        {
            id: 'c1',
            title: 'DO OBJETO',
            text: `O presente contrato tem por objeto a prestação de serviços técnicos especializados de engenharia para o desenvolvimento dos Projetos de Saneamento Básico referentes ao empreendimento <strong>"${project}"</strong>, situado na cidade de ${city}, ${descLotes}.`
        },
        {
            id: 'c2',
            title: 'DO ESCOPO',
            text: `Os serviços técnicos especializados compreenderão:
            <br>a) Dimensionamento hidráulico da Rede de Abastecimento de Água Tratada;
            <br>b) Dimensionamento da Rede de Coleção e Transporte de Saneamento;
            <br>c) Elaboração de Memorial Descritivo e de Cálculo conforme normas da ABNT;
            <br>d) Geração de plantas, perfis e detalhes técnicos em formato digital;
            <br>e) Emissão de Anotação de Responsabilidade Técnica (ART) de projeto.`
        },
        {
            id: 'c3',
            title: 'DAS OBRIGAÇÕES DA CONTRATANTE',
            text: `Caberá à CONTRATANTE fornecer:
            <br>- Levantamento planialtimétrico cadastral atualizado;
            <br>- Projeto urbanístico aprovado contendo o arruamento e quadras;
            <br>- Diretrizes de saneamento emitidas pelo órgão competente;
            <br>- Sondagens de solo, quando necessárias.`
        },
        {
            id: 'c4',
            title: 'DOS PRAZOS',
            text: `O prazo para execução dos serviços será definido conforme cronograma físico-financeiro a ser aprovado pelas partes.`
        },
        {
            id: 'c5',
            title: 'DO PREÇO E PAGAMENTO',
            text: `Pelos serviços descritos na Cláusula Primeira e Segunda, a CONTRATANTE pagará à CONTRATADA o valor ajustado na Proposta Comercial anexa a este instrumento.`
        },
        {
            id: 'c6',
            title: 'DAS DISPOSIÇÕES GERAIS',
            text: `Fica eleito o foro da comarca de ${city.split('-')[0].trim()} para dirimir quaisquer dúvidas oriundas deste contrato.`
        }
    ];

    return {
        title: 'CONTRATAÇÃO DE SERVIÇOS TÉCNICOS ESPECIALIZADOS PARA ELABORAÇÃO DE PROJETOS DE SANEAMENTO BÁSICO.',
        header: `Pelo presente instrumento particular de prestação de serviços, de um lado, <strong>${contratada}</strong>, doravante denominada simplesmente <strong>CONTRATADA</strong>, e de outro lado, <strong>${contratante}</strong>, doravante denominada simplesmente <strong>CONTRANTE</strong>, têm entre si justo e contratado o quanto segue:`,
        clauses,
        footer: `E por estarem assim justos e contratados, assinam o presente instrumento em 02 (duas) vias de igual teor e forma.`,
        city,
        date,
        companyName: contratada,
        clientName: contratante
    };
};

export const generateContractHtml = (data: ContractData) => {
    const ordinal = (n: number) => {
        const s = ["PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA", "SEXTA", "SÉTIMA", "OITAVA", "NONA", "DÉCIMA", "DÉCIMA PRIMEIRA", "DÉCIMA SEGUNDA"];
        return s[n] || `${n + 1}ª`;
    };

    const css = `
      @page { size: A4; margin: 2.5cm; }
      body { font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.6; text-align: justify; }
      .title { font-weight: bold; text-align: center; margin-bottom: 2cm; text-transform: uppercase; font-size: 14pt; }
      .header { margin-bottom: 1cm; text-indent: 1.5cm; }
      .clause-title { font-weight: bold; margin-top: 1cm; margin-bottom: 0.5cm; text-transform: uppercase; }
      .clause-text { margin-bottom: 0.5cm; text-indent: 1.5cm; }
      .footer { margin-top: 1cm; text-indent: 1.5cm; }
      .date-city { text-align: center; margin-top: 2cm; margin-bottom: 3cm; }
      .signature-container { display: flex; justify-content: space-between; margin-top: 1cm; }
      .signature-box { width: 45%; text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 10pt; }
    `;

    const clausesHtml = data.clauses.map((c, i) => `
        <div class="clause-title">CLÁUSULA ${ordinal(i)} - ${c.title}</div>
        <div class="clause-text">${c.text.replace(/\n/g, '<br/>')}</div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Contrato - ${data.clientName}</title>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        <div class="title">${data.title}</div>
        <div class="header">${data.header}</div>
        ${clausesHtml}
        <div class="footer">${data.footer}</div>
        <div class="date-city">${data.city}, ${data.date}.</div>
        <div class="signature-container">
            <div class="signature-box">
                <strong>${data.companyName}</strong><br>CONTRATADA
            </div>
            <div class="signature-box">
                <strong>${data.clientName}</strong><br>CONTRATANTE
            </div>
        </div>
        <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;
};

export const generateBudgetHtml = (data: BudgetData) => {
    const org = data.organization;
    const primaryColor = org?.primaryColor || '#10b981';
    const secondaryColor = org?.secondaryColor || '#f0fdf4';
    const logoHtml = org?.logoUrl ? `<img src="${org.logoUrl}" class="logo" />` : '';
    const watermarkHtml = org?.logoUrl ? `<img src="${org.logoUrl}" class="watermark" />` : '';
    
    const mainTitle = org?.fantasyName ? org.fantasyName : (data.companyName || 'HYDROFLOW');
    const quotingCompany = org?.name || data.companyName;
    const cnpjDisplay = org?.cnpj ? `CNPJ: ${org.cnpj}` : '';

    const visibleItems = data.items.filter(item => item.totalPrice > 0);
    const isSubdivision = !data.category || data.category === 'subdivision';

    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      
      @page { size: A4; margin: 0; }
      
      body { 
          font-family: 'Inter', sans-serif; 
          color: #1e293b; 
          line-height: 1.5; 
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
      }
      
      .page-wrapper {
          width: 210mm;
          min-height: 297mm;
          display: flex;
          flex-direction: column;
          position: relative;
          padding: 18px;
          padding-top: 25px;
          padding-bottom: 30px;
          box-sizing: border-box;
          background: white;
      }

      .content-flex { flex: 1; position: relative; z-index: 10; }
      
      .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          opacity: 0.05;
          z-index: 0;
          pointer-events: none;
      }

      .header-wrapper { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-end; 
          border-bottom: 3px solid ${primaryColor}; 
          padding-bottom: 16px; 
          margin-bottom: 32px;
          width: 100%;
      }

      .company-info { text-align: left; flex: 1; }
      .logo { height: 96px; display: block; margin-bottom: 8px; }
      .fantasy-name { font-size: 20px; font-weight: 900; color: #1e293b; text-transform: uppercase; letter-spacing: -0.025em; line-height: 1; margin-bottom: 4px; }
      .legal-name { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; }
      .cnpj { font-size: 9px; color: #94a3b8; margin-top: 2px; }

      .proposal-info { text-align: right; width: 30%; }
      .prop-number { font-size: 14px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .prop-date { font-size: 10px; font-weight: 700; color: #334155; }
      .prop-author { font-size: 8px; color: #94a3b8; text-transform: uppercase; margin-top: 4px; font-weight: 700; }
      
      .main-title-container { text-align: center; margin-bottom: 32px; }
      .main-title { font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #1e293b; }
      .sub-header { font-size: 9px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 0.2em; margin-top: 4px; }

      .client-info { width: 100%; margin-bottom: 32px; }
      .client-row { display: flex; gap: 16px; width: 100%; }
      .client-col-left { flex: 1; border-left: 4px solid ${primaryColor}; padding-left: 12px; }
      .client-col-right { flex: 1; border-left: 4px solid #e2e8f0; padding-left: 12px; }
      
      .label-sm { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; display: block; margin-bottom: 2px; }
      .val-contratante { font-size: 12px; font-weight: 900; text-transform: uppercase; color: #1e293b; line-height: 1.375; }
      .val-projeto { font-size: 12px; font-weight: 700; color: #334155; line-height: 1.375; }
      
      .base-calculo { text-align: center; margin-top: 32px; padding: 8px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 4px; }
      .base-label { font-size: 8px; font-weight: 900; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
      .base-val { font-size: 14px; font-weight: 900; color: #1e293b; display: block; }

      table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 32px; }
      th { background: ${primaryColor}; color: white; padding: 8px 16px; text-align: left; font-size: 9px; text-transform: uppercase; font-weight: 900; letter-spacing: 0.05em; }
      th:first-child { border-top-left-radius: 6px; }
      th:last-child { border-top-right-radius: 6px; }
      td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 10px; font-weight: 700; color: #334155; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .font-mono { font-family: monospace; }
      
      .total-row td { border-bottom: none; padding-top: 16px; padding-bottom: 16px; }
      .total-label { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.2em; }
      .total-val { font-size: 18px; font-weight: 900; color: ${primaryColor}; letter-spacing: -0.05em; }
      
      .grid-footer { display: grid; grid-cols: 2; gap: 32px; margin-bottom: 48px; }
      .footer-box { background: rgba(248, 250, 252, 0.5); padding: 16px; border-radius: 12px; border: 1px solid #f1f5f9; }
      .footer-title { font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
      .footer-title::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: ${primaryColor}; }
      .stage-item { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; font-size: 10px; color: #475569; }
      .stage-val { font-weight: 700; color: #1e293b; }
      
      .obs-box { padding: 16px; }
      .obs-title { font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 8px; }
      .obs-list { list-style: disc; padding-left: 16px; font-size: 9px; color: #475569; }
      .obs-list li { margin-bottom: 4px; }

      .footer-sign { 
          position: fixed;
          bottom: 48px;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 20;
      }
      .sign-wrapper { display: inline-block; width: 50%; border-top: 1px solid #cbd5e1; pt: 8px; }
      .sign-name { font-size: 9px; font-weight: 900; color: #1e293b; text-transform: uppercase; line-height: 1.2; margin-top: 8px; }
      .sign-label { font-size: 8px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

      .footer-stripes {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 16px;
          display: flex;
          flex-direction: column;
          z-index: 30;
      }
      .stripe-p { height: 8px; width: 100%; background-color: ${primaryColor}; }
      .stripe-s { height: 8px; width: 100%; background-color: ${secondaryColor}; }
    `;

    const itemsHtml = visibleItems.map(item => `
        <tr>
            <td>${item.description}</td>
            <td class="text-center">${item.quantity}</td>
            <td class="text-right font-mono">${item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
    `).join('');

    const stagesHtml = data.paymentStages.map(s => `
        <div class="stage-item">
            <span>${s.description}</span>
            <span class="stage-val">${s.percentage}%</span>
        </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proposta - ${data.projectName}</title>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        ${watermarkHtml}
        
        <div class="page-wrapper">
            <div class="content-flex">
                <div class="header-wrapper">
                    <div class="company-info">
                        ${logoHtml}
                        <div class="fantasy-name">${mainTitle}</div>
                        <div class="legal-name">${quotingCompany}</div>
                        <div class="cnpj">${cnpjDisplay}</div>
                    </div>
                    
                    <div class="proposal-info">
                        <div class="prop-number">PROPOSTA Nº ${data.proposalNumber || '---'}</div>
                        <div class="prop-date">DATA: ${data.date}</div>
                        <div class="prop-author">POR: ${data.generatedBy || 'HydroFlow'}</div>
                    </div>
                </div>

                <div class="main-title-container">
                    <div class="main-title">PROPOSTA COMERCIAL</div>
                    <div class="sub-header">INFRAESTRUTURA E SANEAMENTO</div>
                </div>

                <div class="client-info">
                    <div class="client-row">
                        <div class="client-col-left">
                            <span class="label-sm">Contratante</span>
                            <div class="val-contratante">${data.clientName}</div>
                        </div>
                        <div class="client-col-right">
                            <span class="label-sm">Empreendimento</span>
                            <div class="val-projeto">${data.projectName} - ${data.city}</div>
                        </div>
                    </div>
                    ${isSubdivision ? `
                    <div class="base-calculo">
                        <span class="base-label">Base de Cálculo</span>
                        <span class="base-val">${data.totalLots} Lotes Projetados</span>
                    </div>` : ''}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th width="70%">Descrição dos Serviços</th>
                            <th width="10%" class="text-center">Qtd</th>
                            <th width="20%" class="text-right">Total (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                        <tr class="total-row">
                            <td colspan="2" class="text-right total-label">TOTAL</td>
                            <td class="text-right total-val font-mono">R$ ${data.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="display: flex; gap: 32px; margin-bottom: 48px;">
                    <div class="footer-box" style="flex: 1;">
                        <div class="footer-title">Cronograma de Pagamento</div>
                        <div class="space-y-1">
                            ${stagesHtml}
                        </div>
                        <p style="margin-top: 12px; font-size: 9px; color: #64748b;"><strong>Validade:</strong> ${data.validityDays} dias corridos.</p>
                    </div>
                    <div class="obs-box" style="flex: 1;">
                        <div class="obs-title">Observações Técnicas</div>
                        <ul class="obs-list">
                            ${isSubdivision ? 
                                `<li>Projetos conforme normas NBR/ABNT.</li><li>Incluso emissão de ART de Projeto.</li><li>Prazo de execução conforme cronograma físico.</li>` : 
                                `<li>Serviços executados conforme normas técnicas vigentes.</li><li>Incluso emissão de ART ou RRT.</li><li>Materiais e mão-de-obra conforme especificado.</li>`
                            }
                        </ul>
                    </div>
                </div>
            </div>

            <div class="footer-sign">
                <div class="sign-wrapper">
                    <div class="sign-name">${org?.name || data.companyName}</div>
                    <div class="sign-label">CONTRATADA</div>
                </div>
            </div>
        </div>

        <div class="footer-stripes">
            <div class="stripe-p"></div>
            <div class="stripe-s"></div>
        </div>

        <script>
            window.onload = () => { setTimeout(() => { window.print(); }, 500); };
        </script>
      </body>
      </html>
    `;
};
