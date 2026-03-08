
import { MapAnnotation, AnnotationType, GeoPosition } from '../types';
import { fromUTM } from './geoUtils';

// Tabela de Cores padrão AutoCAD (ACI 0-255)
const ACAD_COLORS = [
    "#000000", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#000000", "#808080", "#c0c0c0",
    "#ff0000", "#ff7f7f", "#a50000", "#a55252", "#7f0000", "#7f3f3f", "#4c0000", "#4c2626", "#260000", "#261313",
    "#ff3f00", "#ff9f7f", "#a52900", "#a56652", "#7f1f00", "#7f4e3f", "#4c1300", "#4c2f26", "#260900", "#261713",
    "#ff7f00", "#ffbf7f", "#a55200", "#a57a52", "#7f3f00", "#7f5d3f", "#4c2600", "#4c3826", "#261300", "#261c13",
    "#ffbf00", "#ffdf7f", "#a57a00", "#a58e52", "#7f5d00", "#7f6d3f", "#4c3800", "#4c4126", "#261c00", "#262013",
    "#ffff00", "#ffff7f", "#a5a500", "#a5a552", "#7f7f00", "#7f7f3f", "#4c4c00", "#4c4c26", "#262600", "#262613",
    "#bfff00", "#dfff7f", "#7aa500", "#8ea552", "#5d7f00", "#6d7f3f", "#384c00", "#414c26", "#1c2600", "#202613",
    "#7fff00", "#bfff7f", "#52a500", "#7aa552", "#3f7f00", "#5d7f3f", "#264c00", "#384c26", "#132600", "#1c2613",
    "#3fff00", "#9fff7f", "#29a500", "#66a552", "#1f7f00", "#4e7f3f", "#134c00", "#2f4c26", "#092600", "#172613",
    "#00ff00", "#7fff7f", "#00a500", "#52a552", "#007f00", "#3f7f3f", "#004c00", "#264c26", "#002600", "#132613",
    "#00ff3f", "#7fff9f", "#00a529", "#52a566", "#007f1f", "#3f7f4e", "#004c13", "#264c2f", "#002609", "#132617",
    "#00ff7f", "#7fffbf", "#00a552", "#52a57a", "#007f3f", "#3f7f5d", "#004c26", "#264c38", "#002613", "#13261c",
    "#00ffbf", "#7fffdf", "#00a57a", "#52a58e", "#007f5d", "#3f7f6d", "#004c38", "#264c41", "#00261c", "#132620",
    "#00ffff", "#7fffff", "#00a5a5", "#52a5a5", "#007f7f", "#3f7f7f", "#004c4c", "#264c4c", "#002626", "#132626",
    "#00bfff", "#7fdfff", "#007aa5", "#528ea5", "#005d7f", "#3f6d7f", "#00384c", "#26414c", "#001c26", "#132026",
    "#007fff", "#7fbfff", "#0052a5", "#527aa5", "#003f7f", "#3f5d7f", "#00264c", "#26384c", "#001326", "#131c26",
    "#003fff", "#7f9fff", "#0029a5", "#5266a5", "#001f7f", "#3f4e7f", "#00134c", "#262f4c", "#000926", "#131726",
    "#0000ff", "#7f7fff", "#0000a5", "#5252a5", "#00007f", "#3f3f7f", "#00004c", "#26264c", "#000026", "#131326",
    "#3f00ff", "#9f7fff", "#2900a5", "#6652a5", "#1f007f", "#4e3f7f", "#13004c", "#2f264c", "#090026", "#171326",
    "#7f00ff", "#bf7fff", "#5200a5", "#7a52a5", "#3f007f", "#5d3f7f", "#26004c", "#38264c", "#130026", "#1c1326",
    "#bf00ff", "#df7fff", "#7a00a5", "#8e52a5", "#5d007f", "#6d3f7f", "#38004c", "#41264c", "#1c0026", "#201326",
    "#ff00ff", "#ff7fff", "#a500a5", "#a552a5", "#7f007f", "#7f3f7f", "#4c004c", "#4c264c", "#260026", "#261326",
    "#ff00bf", "#ff7fdf", "#a5007a", "#a5528e", "#7f005d", "#7f3f6d", "#4c0038", "#4c2641", "#26001c", "#261320",
    "#ff007f", "#ff7fbf", "#a50052", "#a5527a", "#7f003f", "#7f3f5d", "#4c0026", "#4c2638", "#260013", "#26131c",
    "#ff003f", "#ff7f9f", "#a50029", "#a55266", "#7f001f", "#7f3f4e", "#4c0013", "#4c262f", "#260009", "#261317",
    "#333333", "#505050", "#696969", "#828282", "#bebebe", "#ffffff"
];

const getColorFromDxf = (code: number): string => {
    // 256 = ByLayer, 0 = ByBlock
    if (code === 256 || code === 0) return '#334155';
    // 7 = White/Black (Adaptamos para escuro no mapa claro)
    if (code === 7) return '#334155';
    
    if (code >= 1 && code < ACAD_COLORS.length) {
        return ACAD_COLORS[code];
    }
    return '#334155';
};

/**
 * Parser de DXF Robusto
 * Suporta: LINE, LWPOLYLINE, POLYLINE (com VERTEX), TEXT
 * Lê Tabela de Layers para cores
 */
export const parseDxfToAnnotations = (dxfContent: string): MapAnnotation[] => {
    const lines = dxfContent.split(/\r?\n/);
    const annotations: MapAnnotation[] = [];
    const layerColors = new Map<string, number>();
    
    // Iterator de Pares (Código, Valor)
    let lineIdx = 0;
    const getNextPair = (): { code: number, value: string } | null => {
        while (lineIdx < lines.length) {
            const codeLine = lines[lineIdx].trim();
            const valLine = lines[lineIdx + 1]?.trim();
            
            if (!codeLine && lineIdx < lines.length) {
                lineIdx++; // Pular linhas em branco
                continue;
            }
            
            if (codeLine && valLine !== undefined) {
                lineIdx += 2;
                return { code: parseInt(codeLine), value: valLine };
            }
            break; 
        }
        return null;
    };

    // --- State Machine ---
    let section = '';
    let entityType = '';
    
    // Buffers de Entidade Atual
    let eLayer = '0';
    let eColor: number | null = null;
    let ePoints: { x: number, y: number }[] = [];
    let eText = '';
    
    // Buffers específicos para LINE (ponto inicial e final são códigos separados)
    let lineStart: { x: number, y: number } | null = null;
    let lineEnd: { x: number, y: number } | null = null;
    
    // Buffer para POLYLINE antiga (acumula VERTEX)
    let polylineBuffer: { points: {x:number, y:number}[], layer: string, color: number | null } | null = null;

    // Helper para criar anotação final
    const createAnnotation = (type: 'line' | 'polyline' | 'text' | 'area', layer: string, colorCode: number | null, points: {x:number, y:number}[], content: string) => {
        const id = `cad-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        
        let finalColor = 7;
        if (colorCode !== null && colorCode !== 0 && colorCode !== 256) finalColor = colorCode;
        else if (layerColors.has(layer)) finalColor = layerColors.get(layer) || 7;
        
        const hexColor = getColorFromDxf(Math.abs(finalColor));

        const geoPoints: GeoPosition[] = points.map(p => {
             // Heurística: Coordenadas pequenas = LatLng, Grandes = UTM (Assume Zona 24S se for grande)
             if (Math.abs(p.x) < 180 && Math.abs(p.y) < 90) return { lat: p.y, lng: p.x };
             return fromUTM(p.x, p.y, 24, false);
        });

        // Filtrar pontos inválidos ou vazios
        if (geoPoints.length === 0) return;

        // Fix: Added missing groupId property as required by MapAnnotation interface
        if (type === 'text') {
            annotations.push({
                id, groupId: "", type, content, position: geoPoints[0], color: hexColor, hatch: false, layer
            });
        } else {
             // Evitar polilinhas de 1 ponto
             if (geoPoints.length < 2) return;
             // Fix: Added missing groupId property as required by MapAnnotation interface
             annotations.push({
                id, groupId: "", type, content: content || `${type} (${layer})`, points: geoPoints, color: hexColor, hatch: false, layer
            });
        }
    };

    const flushPolylineBuffer = () => {
        if (polylineBuffer && polylineBuffer.points.length >= 2) {
             createAnnotation('polyline', polylineBuffer.layer, polylineBuffer.color, polylineBuffer.points, "");
        }
        polylineBuffer = null;
    };

    // --- Loop Principal ---
    let pair = getNextPair();
    while (pair) {
        const { code, value } = pair;

        if (code === 0) {
            // FIM DA ENTIDADE ANTERIOR / INÍCIO DE NOVA
            
            if (section === 'ENTITIES') {
                if (entityType === 'LINE') {
                    if (lineStart && lineEnd) createAnnotation('line', eLayer, eColor, [lineStart, lineEnd], "");
                } else if (entityType === 'LWPOLYLINE') {
                    if (ePoints.length >= 2) createAnnotation('polyline', eLayer, eColor, ePoints, "");
                } else if (entityType === 'TEXT' || entityType === 'MTEXT') {
                    if (ePoints.length > 0 && eText) createAnnotation('text', eLayer, eColor, [ePoints[0]], eText);
                } else if (entityType === 'VERTEX') {
                    if (polylineBuffer && ePoints.length > 0) {
                        polylineBuffer.points.push(ePoints[0]);
                    }
                } else if (entityType === 'SEQEND') {
                    flushPolylineBuffer();
                } else if (entityType === 'POLYLINE') {
                    // Início de Polyline antiga - apenas inicializa
                }
            }

            // INÍCIO DE NOVA SEÇÃO OU ENTIDADE
            if (value === 'SECTION') {
                section = ''; // Aguardando nome da seção (código 2)
            } else if (value === 'ENDSEC' || value === 'EOF') {
                section = '';
            } else if (section === 'HEADER' || section === 'BLOCKS') {
                 // Ignorar
            } else if (section === 'TABLES') {
                 // Tables processadas abaixo
            } else if (section === 'ENTITIES') {
                entityType = value;
                // Resetar buffers de entidade
                eLayer = '0';
                eColor = null;
                ePoints = [];
                eText = '';
                lineStart = null;
                lineEnd = null;
                
                if (entityType === 'POLYLINE') {
                    flushPolylineBuffer(); // Segurança
                    polylineBuffer = { points: [], layer: '0', color: null };
                }
            }

        } else if (code === 2 && section === '') {
             section = value; // HEADER, TABLES, ENTITIES
        } else {
            // PROCESSAMENTO DE DADOS
            if (section === 'TABLES') {
                 if (value === 'LAYER') entityType = 'LAYER_TABLE_ENTRY';
                 if (entityType === 'LAYER_TABLE_ENTRY') {
                     if (code === 2) eLayer = value; // Nome do layer temporário
                     if (code === 62) {
                         layerColors.set(eLayer, parseInt(value));
                     }
                 }
            } else if (section === 'ENTITIES') {
                // Propriedades Comuns
                if (code === 8) {
                    eLayer = value;
                    if (polylineBuffer && entityType === 'POLYLINE') polylineBuffer.layer = value;
                }
                if (code === 62) {
                    eColor = parseInt(value);
                    if (polylineBuffer && entityType === 'POLYLINE') polylineBuffer.color = eColor;
                }

                // Coordenadas
                if (code === 10) {
                     if (entityType === 'LINE') lineStart = { ...lineStart || {x:0, y:0}, x: parseFloat(value) };
                     else ePoints.push({ x: parseFloat(value), y: 0 }); // Y vem no código 20
                }
                if (code === 20) {
                     if (entityType === 'LINE') lineStart = { ...lineStart || {x:0, y:0}, y: parseFloat(value) };
                     else if (ePoints.length > 0) ePoints[ePoints.length - 1].y = parseFloat(value);
                }
                
                // Endpoints para LINE
                if (code === 11 && entityType === 'LINE') lineEnd = { ...lineEnd || {x:0, y:0}, x: parseFloat(value) };
                if (code === 21 && entityType === 'LINE') lineEnd = { ...lineEnd || {x:0, y:0}, y: parseFloat(value) };

                // Texto
                if (code === 1 && (entityType === 'TEXT' || entityType === 'MTEXT')) eText = value;
            }
        }

        pair = getNextPair();
    }
    
    // Flush da última entidade se o arquivo acabar abruptamente
    if (section === 'ENTITIES') {
         if (entityType === 'LINE' && lineStart && lineEnd) createAnnotation('line', eLayer, eColor, [lineStart, lineEnd], "");
         if (entityType === 'LWPOLYLINE' && ePoints.length >= 2) createAnnotation('polyline', eLayer, eColor, ePoints, "");
         if ((entityType === 'TEXT' || entityType === 'MTEXT') && ePoints.length > 0) createAnnotation('text', eLayer, eColor, [ePoints[0]], eText);
         if (entityType === 'SEQEND') flushPolylineBuffer();
    }
    
    return annotations;
};
