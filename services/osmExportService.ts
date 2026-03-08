import L from 'leaflet';
import { toUTM } from './geoUtils';
import { DxfWriter } from './dxfService';

interface Point { x: number; y: number; }

export const exportOsmViewportToDxf = async (map: L.Map) => {
    const zoom = map.getZoom();
    if (zoom < 15) throw new Error("Aproxime mais o mapa (Zoom > 15) para obter dados.");

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    // Query mais leve e robusta
    const query = `
      [out:json][timeout:25];
      (
        way["highway"]
           ["highway"!~"footway|path|steps|pedestrian|cycleway|track"]
           (${sw.lat},${sw.lng},${ne.lat},${ne.lng});
      );
      out body;
      >;
      out skel qt;
    `;

    // Tentar endpoint principal, fallback se falhar
    let data;
    try {
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("API Ocupada");
        data = await response.json();
    } catch (err) {
        // Fallback endpoint
        try {
            const response = await fetch(`https://lz4.overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error("Erro na conexão com OSM.");
            data = await response.json();
        } catch (e2) {
            throw new Error("Não foi possível conectar ao OSM. Tente novamente em instantes.");
        }
    }

    const osmNodes = new Map<number, Point>();
    const roadWays: any[] = [];

    data.elements.forEach((el: any) => {
        if (el.type === 'node') {
            const u = toUTM(el.lat, el.lon);
            osmNodes.set(el.id, { x: u.x, y: u.y });
        } else if (el.type === 'way') {
            if (el.tags.highway) roadWays.push(el);
        }
    });

    const writer = new DxfWriter();
    writer.header();
    
    // Definição de Cores do Layer para ficar bonito (Visual "Dark" ou "Blueprint")
    writer.tables([
        { name: 'OSM_VIAS_CAIXA', color: 9 }, // Cinza Claro (Visual da rua cheia)
        { name: 'OSM_VIAS_EIXO', color: 7 },  // Branco/Preto (Linha de centro técnica)
        { name: 'OSM_NOMES', color: 2 }       // Amarelo
    ]);
    
    writer.beginEntities();

    // Processar Vias
    roadWays.forEach(way => {
        // Determinar largura visual baseada no tipo (metros)
        let width = 7.0; // Padrão residencial
        const h = way.tags.highway;
        
        if (h === 'primary' || h === 'trunk') width = 14.0;
        else if (h === 'secondary') width = 10.0;
        else if (h === 'tertiary') width = 9.0;
        else if (h === 'service') width = 5.0;
        
        // Coletar pontos
        const pts: Point[] = [];
        way.nodes.forEach((nodeId: number) => {
            const p = osmNodes.get(nodeId);
            if (p) pts.push(p);
        });

        if (pts.length < 2) return;

        // 1. Desenhar a "Caixa" da rua (LWPOLYLINE com Width)
        // Isso cria o visual sólido e limpo automaticamente no CAD
        writer.lwPolyline(pts, 'OSM_VIAS_CAIXA', width, 253); // Cor 253 = Cinza muito claro

        // 2. Desenhar o Eixo Técnico (Linha fina)
        writer.lwPolyline(pts, 'OSM_VIAS_EIXO', 0, 7);

        // 3. Texto do Nome (No meio do segmento mais longo)
        if (way.tags.name) {
            let maxLen = 0;
            let midPoint = pts[0];
            let angle = 0;

            for(let i=0; i<pts.length-1; i++) {
                const p1 = pts[i];
                const p2 = pts[i+1];
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > maxLen) {
                    maxLen = dist;
                    midPoint = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
                    angle = Math.atan2(dy, dx) * (180 / Math.PI);
                }
            }
            
            // Corrigir leitura do texto
            if (angle > 90) angle -= 180;
            else if (angle < -90) angle += 180;

            writer.text(midPoint.x, midPoint.y, width * 0.4, way.tags.name, 'OSM_NOMES', angle, 2);
        }
    });

    writer.endEntities();
    return writer.toString();
};