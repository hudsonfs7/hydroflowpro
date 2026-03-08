
import React from 'react';
import L from 'leaflet';

interface DxfBackgroundLayerProps {
  mapInstance: L.Map | null;
  dxfString: string | null;
  opacity: number;
}

export const DxfBackgroundLayer: React.FC<DxfBackgroundLayerProps> = ({ 
  mapInstance, 
  dxfString, 
  opacity 
}) => {
  // NOTE: This component is currently a placeholder.
  // The original implementation used a CDN injection which has been removed for cleanup.
  // Future implementation should use a bundled parser.

  React.useEffect(() => {
    if (dxfString) {
        console.warn("DXF parsing is currently disabled in this version.");
    }
  }, [dxfString]);

  return null;
};
