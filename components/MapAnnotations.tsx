
import React, { useEffect, useRef } from 'react';
import { MapAnnotation, AnnotationGroup } from '../types';
import L from 'leaflet';

interface MapAnnotationsProps {
    annotations: MapAnnotation[];
    groups: AnnotationGroup[];
    mapInstance: L.Map | null;
    globalScale?: number;
    activeAnnotationId?: string | null;
    selectedAnnotationId?: string | null;
    handlers: {
        onAnnotationClick: (id: string) => void;
        onVertexMouseDown: (e: React.MouseEvent | React.TouchEvent, annId: string, idx: number) => void;
        onLabelMouseDown: (e: React.MouseEvent | React.TouchEvent, annId: string) => void;
    }
}

export const MapCanvasLayer: React.FC<Omit<MapAnnotationsProps, 'handlers' | 'activeAnnotationId' | 'selectedAnnotationId'> & { handlers?: any }> = ({ 
    annotations, 
    groups,
    mapInstance, 
    globalScale = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!mapInstance || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // State for zoom optimization
        let isZooming = false;
        let startZoom = 0;

        const renderCanvas = () => {
            // Optimization: Skip rendering loop during zoom to allow GPU scaling
            if (isZooming) return;

            const size = mapInstance.getSize();
            const pixelRatio = window.devicePixelRatio || 1;
            
            if (canvas.width !== size.x * pixelRatio || canvas.height !== size.y * pixelRatio) {
                canvas.width = size.x * pixelRatio;
                canvas.height = size.y * pixelRatio;
                canvas.style.width = `${size.x}px`;
                canvas.style.height = `${size.y}px`;
                ctx.scale(pixelRatio, pixelRatio);
            } else {
                ctx.clearRect(0, 0, size.x, size.y);
            }

            const bounds = mapInstance.getBounds();
            const north = bounds.getNorth();
            const south = bounds.getSouth();
            const east = bounds.getEast();
            const west = bounds.getWest();

            groups.forEach(group => {
                if (!group.visible || !group.locked) return; 

                ctx.globalAlpha = group.opacity;
                
                const groupAnns = annotations.filter(a => a.groupId === group.id);

                groupAnns.forEach(ann => {
                    // Spatial Culling
                    if (ann.points && ann.points.length > 0) {
                        let isVisible = false;
                        let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
                        for (const p of ann.points) {
                            if (p.lat < minLat) minLat = p.lat;
                            if (p.lat > maxLat) maxLat = p.lat;
                            if (p.lng < minLng) minLng = p.lng;
                            if (p.lng > maxLng) maxLng = p.lng;
                        }
                        if (minLat <= north && maxLat >= south && minLng <= east && maxLng >= west) {
                            isVisible = true;
                        }
                        if (!isVisible) return;
                    }

                    ctx.strokeStyle = ann.color;
                    ctx.fillStyle = ann.color;
                    ctx.lineWidth = (ann.strokeWidth || 1.5) * globalScale;
                    ctx.setLineDash(ann.dashArray ? ann.dashArray.split(',').map(Number) : []);

                    if ((ann.type === 'line' || ann.type === 'polyline' || ann.type === 'area') && ann.points && ann.points.length >= 2) {
                        ctx.beginPath();
                        let first = true;
                        for (const p of ann.points) {
                            const pt = mapInstance.latLngToContainerPoint([p.lat, p.lng]);
                            if (first) {
                                ctx.moveTo(pt.x, pt.y);
                                first = false;
                            } else {
                                ctx.lineTo(pt.x, pt.y);
                            }
                        }
                        if (ann.type === 'area') {
                            ctx.closePath();
                            if (ann.hatch) {
                                ctx.fillStyle = ann.color; 
                                ctx.globalAlpha = group.opacity * 0.1;
                                ctx.fill();
                                ctx.globalAlpha = group.opacity;
                            }
                        }
                        ctx.stroke();
                    }

                    if (ann.content) {
                        let textPos;
                        if (ann.position) {
                            textPos = mapInstance.latLngToContainerPoint([ann.position.lat, ann.position.lng]);
                        } else if (ann.points && ann.points.length > 0) {
                            textPos = mapInstance.latLngToContainerPoint([ann.points[0].lat, ann.points[0].lng]);
                        }

                        if (textPos) {
                            if (textPos.x >= -50 && textPos.y >= -50 && textPos.x <= size.x + 50 && textPos.y <= size.y + 50) {
                                ctx.save();
                                ctx.translate(textPos.x, textPos.y);
                                
                                if (ann.labelMode === 'aligned' && ann.points && ann.points.length >= 2) {
                                    const p1 = mapInstance.latLngToContainerPoint([ann.points[0].lat, ann.points[0].lng]);
                                    const p2 = mapInstance.latLngToContainerPoint([ann.points[1].lat, ann.points[1].lng]);
                                    let angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                                    if (angleRad > Math.PI/2 || angleRad < -Math.PI/2) angleRad += Math.PI;
                                    ctx.rotate(angleRad);
                                }

                                ctx.font = `bold ${10 * globalScale}px sans-serif`;
                                ctx.textAlign = "center";
                                ctx.textBaseline = "bottom";
                                
                                ctx.strokeStyle = "rgba(255,255,255,0.8)";
                                ctx.lineWidth = 3;
                                ctx.strokeText(ann.content, 0, -5);
                                
                                ctx.fillStyle = ann.color;
                                ctx.fillText(ann.content, 0, -5);
                                ctx.restore();
                            }
                        }
                    }
                });
            });
        };

        const handleMove = () => {
            if (!isZooming) {
                requestAnimationFrame(renderCanvas);
            }
        };

        const handleZoomStart = () => {
            isZooming = true;
            startZoom = mapInstance.getZoom();
        };

        const handleZoom = () => {
            if (isZooming && canvasRef.current) {
                const currentZoom = mapInstance.getZoom();
                const scale = mapInstance.getZoomScale(currentZoom, startZoom);
                // "Freeze & Scale": Apply GPU scaling to the static canvas image
                canvasRef.current.style.transformOrigin = 'center center';
                canvasRef.current.style.transform = `scale(${scale})`;
            }
        };

        const handleZoomEnd = () => {
            isZooming = false;
            if (canvasRef.current) {
                canvasRef.current.style.transform = 'none';
                canvasRef.current.style.transformOrigin = 'top left';
            }
            requestAnimationFrame(renderCanvas);
        };

        // Standard events
        mapInstance.on('move', handleMove);
        mapInstance.on('resize', handleMove);
        
        // Zoom optimization events
        mapInstance.on('zoomstart', handleZoomStart);
        mapInstance.on('zoom', handleZoom);
        mapInstance.on('zoomend', handleZoomEnd);
        
        renderCanvas();

        return () => {
            if (mapInstance) {
                try {
                    mapInstance.off('move', handleMove);
                    mapInstance.off('resize', handleMove);
                    mapInstance.off('zoomstart', handleZoomStart);
                    mapInstance.off('zoom', handleZoom);
                    mapInstance.off('zoomend', handleZoomEnd);
                } catch (e) {}
            }
        };
    }, [mapInstance, annotations, groups, globalScale]);

    if (!mapInstance) return null;

    return (
        <canvas 
            ref={canvasRef}
            className="absolute inset-0 z-[4] pointer-events-none transition-transform duration-75 ease-linear will-change-transform" 
        />
    );
};

export const MapSvgLayer: React.FC<MapAnnotationsProps> = ({ 
    annotations, 
    groups,
    mapInstance, 
    globalScale = 1,
    activeAnnotationId,
    selectedAnnotationId,
    handlers
}) => {
    if (!mapInstance) return null;

    return (
        <g className="map-annotations-interactive-layer">
            <defs>
                {annotations.map(ann => ann.type === 'area' && (
                    <pattern 
                        key={`hatch-${ann.id}`}
                        id={`hatch-${ann.id}`} 
                        patternUnits="userSpaceOnUse" 
                        width={8 * globalScale} 
                        height={8 * globalScale} 
                        patternTransform="rotate(45)"
                    >
                        <line 
                            x1="0" y1="0" x2="0" y2={8 * globalScale} 
                            stroke={ann.color} 
                            strokeWidth={1 * globalScale} 
                            opacity={0.4} 
                        />
                    </pattern>
                ))}
            </defs>

            {groups.map(group => {
                if (!group.visible || group.locked) return null; 

                const groupAnns = annotations.filter(a => a.groupId === group.id);
                
                return (
                    <g 
                        key={group.id} 
                        opacity={group.opacity} 
                    >
                        {groupAnns.map(ann => {
                            const isActive = ann.id === activeAnnotationId;
                            const isSelected = ann.id === selectedAnnotationId;
                            const showEditingUI = (isActive || isSelected);

                            if ((ann.type === 'area' || ann.type === 'polyline' || ann.type === 'line') && ann.points && ann.points.length > 0) {
                                const validPoints = ann.points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
                                if (validPoints.length === 0) return null;
                                
                                const screenPoints = validPoints.map(p => mapInstance.latLngToContainerPoint([p.lat, p.lng]));
                                const pointsStr = screenPoints.map(pt => `${pt.x},${pt.y}`).join(' ');

                                let labelX, labelY, labelRotation = 0;
                                
                                if (ann.position) {
                                    const lp = mapInstance.latLngToContainerPoint([ann.position.lat, ann.position.lng]);
                                    labelX = lp.x;
                                    labelY = lp.y;
                                } else {
                                    labelX = screenPoints[0].x;
                                    labelY = screenPoints[0].y - (15 * globalScale);
                                }

                                if (ann.labelMode === 'aligned' && screenPoints.length >= 2) {
                                    const p1 = screenPoints[0];
                                    const p2 = screenPoints[1];
                                    const angleRad = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                                    labelRotation = angleRad * (180 / Math.PI);
                                    if (labelRotation > 90 || labelRotation < -90) labelRotation += 180;
                                }

                                return (
                                    <g 
                                        key={ann.id} 
                                        className={`${isActive ? '' : 'cursor-pointer'}`}
                                        onClick={(e) => { e.stopPropagation(); if(!isActive) handlers.onAnnotationClick(ann.id); }}
                                    >
                                        {ann.type === 'area' && ann.points.length >= 3 ? (
                                            <polygon 
                                                points={pointsStr} 
                                                fill={ann.hatch ? `url(#hatch-${ann.id})` : isSelected ? `${ann.color}15` : 'transparent'}
                                                stroke={ann.color}
                                                strokeWidth={(showEditingUI ? 2.5 : 1.5) * globalScale}
                                                strokeDasharray={ann.dashArray || (showEditingUI ? "5,5" : "")}
                                            />
                                        ) : (
                                            <polyline 
                                                points={pointsStr} 
                                                fill="none"
                                                stroke={ann.color}
                                                strokeWidth={(showEditingUI ? 3 : ann.strokeWidth || 2) * globalScale}
                                                strokeDasharray={ann.dashArray || (showEditingUI ? "5,5" : "")}
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                        )}

                                        {ann.content && (
                                            <g transform={`translate(${labelX}, ${labelY}) rotate(${labelRotation})`}>
                                                <text 
                                                    fontSize={12 * globalScale}
                                                    fontWeight="bold"
                                                    fill={ann.color}
                                                    textAnchor="middle"
                                                    className="font-sans select-none pointer-events-none"
                                                    style={{ textShadow: '0 0 4px white, 0 0 2px white' }}
                                                >
                                                    {ann.content}
                                                </text>
                                                
                                                {showEditingUI && (
                                                    <circle 
                                                        cx={0} cy={0} 
                                                        r={4 * globalScale} 
                                                        fill="#3b82f6" 
                                                        stroke="white" 
                                                        strokeWidth={1 * globalScale}
                                                        className="cursor-move pointer-events-auto shadow-sm"
                                                        onMouseDown={(e) => { e.stopPropagation(); handlers.onLabelMouseDown(e, ann.id); }}
                                                        onTouchStart={(e) => { e.stopPropagation(); handlers.onLabelMouseDown(e, ann.id); }}
                                                    />
                                                )}
                                            </g>
                                        )}

                                        {showEditingUI && screenPoints.map((pt, idx) => (
                                            <circle 
                                                key={`${ann.id}-v-${idx}`} 
                                                cx={pt.x} cy={pt.y} 
                                                r={6 * globalScale} 
                                                fill="white" 
                                                stroke={ann.color} 
                                                strokeWidth={2 * globalScale} 
                                                className="cursor-move pointer-events-auto"
                                                onMouseDown={(e) => { e.stopPropagation(); handlers.onVertexMouseDown(e, ann.id, idx); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handlers.onVertexMouseDown(e, ann.id, idx); }}
                                            />
                                        ))}
                                    </g>
                                );
                            }

                            if (ann.type === 'text' && (ann.position || (ann.points && ann.points[0]))) {
                                const pos = ann.position || ann.points![0];
                                const pt = mapInstance.latLngToContainerPoint([pos.lat, pos.lng]);
                                return (
                                    <g 
                                        key={ann.id} 
                                        transform={`translate(${pt.x}, ${pt.y})`}
                                        className="cursor-pointer"
                                        onClick={(e) => { e.stopPropagation(); if(!isActive) handlers.onAnnotationClick(ann.id); }}
                                    >
                                        <rect 
                                            x={-4} y={-16 * globalScale} 
                                            width={(ann.content.length * 7.5 + 8) * globalScale} 
                                            height={20 * globalScale} 
                                            fill="white" 
                                            fillOpacity={isSelected ? 1 : 0.8}
                                            stroke={isSelected ? ann.color : 'transparent'}
                                            strokeWidth={1}
                                            rx={4} 
                                        />
                                        <text 
                                            fontSize={12 * globalScale} 
                                            fontWeight="bold" 
                                            fill={ann.color}
                                            className="font-mono select-none"
                                        >
                                            {ann.content}
                                        </text>
                                        <circle 
                                            r={isSelected ? 5 * globalScale : 3 * globalScale} 
                                            fill={isSelected ? "#3b82f6" : ann.color} 
                                            className="cursor-move"
                                            onMouseDown={(e) => { e.stopPropagation(); handlers.onLabelMouseDown(e, ann.id); }}
                                        />
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </g>
                );
            })}
        </g>
    );
};
