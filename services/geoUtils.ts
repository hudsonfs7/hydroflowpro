
// Simple conversion logic for WGS84 Lat/Lon to UTM
// This avoids heavy external libraries

export const toUTM = (lat: number, lon: number) => {
    if (Math.abs(lat) > 80) return { x: 0, y: 0, zone: 0, band: 'X' }; // UTM not defined > 80 deg

    const zone = Math.floor((lon + 180) / 6) + 1;
    const isNorth = lat >= 0;
    
    // WGS84 Ellipsoid
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const k0 = 0.9996;

    const phi = lat * (Math.PI / 180);
    const lambda = lon * (Math.PI / 180);
    const lambda0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);

    const e2 = 2 * f - f * f;
    const N = a / Math.sqrt(1 - e2 * Math.sin(phi) * Math.sin(phi));
    const T = Math.tan(phi) * Math.tan(phi);
    const C = (e2 / (1 - e2)) * Math.cos(phi) * Math.cos(phi);
    const A = (lambda - lambda0) * Math.cos(phi);

    const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * phi
        - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * phi)
        + (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * phi)
        - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * phi));

    const easting = k0 * N * (A + (1 - T + C) * A * A * A / 6
        + (5 - 18 * T + T * T + 72 * C - 58 * e2) * A * A * A * A * A / 120) + 500000.0;

    let northing = k0 * (M + N * Math.tan(phi) * (A * A / 2
        + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
        + (61 - 58 * T + T * T + 600 * C - 330 * e2) * A * A * A * A * A * A / 720));

    if (!isNorth) {
        northing += 10000000.0;
    }

    // Determine Band
    const bands = "CDEFGHJKLMNPQRSTUVWXX";
    const bandIndex = Math.floor((lat + 80) / 8);
    const band = (bandIndex >= 0 && bandIndex < bands.length) ? bands[bandIndex] : '?';

    return {
        x: Math.round(easting),
        y: Math.round(northing),
        zone: zone,
        band: band
    };
};

export const fromUTM = (easting: number, northing: number, zone: number, isNorth: boolean = false) => {
    const k0 = 0.9996;
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const e2 = 2 * f - f * f;
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

    const x = easting - 500000.0;
    let y = northing;
    if (!isNorth) {
        y -= 10000000.0;
    }

    const M = y / k0;
    const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

    const phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
        + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
        + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

    const N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad));
    const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
    const C1 = e2 * Math.cos(phi1Rad) * Math.cos(phi1Rad) / (1 - e2);
    const R1 = a * (1 - e2) / Math.pow(1 - e2 * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
    const D = x / (N1 * k0);

    let lat = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) * (D * D / 2
        - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2) * D * D * D * D / 24
        + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2 - 3 * C1 * C1) * D * D * D * D * D * D / 720);
    
    let lng = (D - (1 + 2 * T1 + C1) * D * D * D / 6
        + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2 + 24 * T1 * T1) * D * D * D * D * D / 120) / Math.cos(phi1Rad);

    const lambda0 = ((zone - 1) * 6 - 180 + 3) * (Math.PI / 180);
    lng = lambda0 + lng;

    return {
        lat: lat * (180 / Math.PI),
        lng: lng * (180 / Math.PI)
    };
};
