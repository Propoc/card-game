/**
 * Convert HSV to RGB
 */
function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    
    if (h < 1/6) {
        r = c; g = x; b = 0;
    } else if (h < 2/6) {
        r = x; g = c; b = 0;
    } else if (h < 3/6) {
        r = 0; g = c; b = x;
    } else if (h < 4/6) {
        r = 0; g = x; b = c;
    } else if (h < 5/6) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

/**
 * Convert RGB to hex format
 */
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

/**
 * Generate colors using golden ratio - EXACT translation of:
 * for (int i = 0; i < n; i++)
 *     colors[i] = HSV(fmod(i * 0.618033988749895, 1.0),
 *                     0.5,
 *                     sqrt(1.0 - fmod(i * 0.618033988749895, 0.5)));
 */
function generateGoldenRatioColors(n) {
    const colors = [];
    const goldenRatio = 0.618033988749895;
    
    for (let i = 0; i < n; i++) {
        const h = (i * goldenRatio) % 1.0;
        const s = 0.5;
        const v = Math.sqrt(1.0 - ((i * goldenRatio) % 0.5));
        
        const rgb = hsvToRgb(h, s, v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        
        colors.push({
            hex: hex,
            rgb: rgb,
            hsv: { h: h * 360, s: s * 100, v: v * 100 }
        });
    }
    
    return colors;
}

export { generateGoldenRatioColors };