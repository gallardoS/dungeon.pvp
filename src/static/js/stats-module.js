/**
 * stats-module.js - Módulo para monitorización de rendimiento
 * Utiliza Stats.js para mostrar FPS, MS y MB
 */

// Importar Stats.js desde CDN
import Stats from 'https://cdnjs.cloudflare.com/ajax/libs/stats.js/r17/Stats.min.js';

let stats = {
    fps: null,
    ms: null,
    mb: null
};

/**
 * Inicializa los paneles de estadísticas
 */
function initStats() {
    // Panel de FPS (cuadros por segundo)
    stats.fps = new Stats();
    stats.fps.showPanel(0); // 0: fps
    stats.fps.dom.style.cssText = 'position:absolute;top:0px;left:0px;';
    document.body.appendChild(stats.fps.dom);
    
    // Panel de MS (milisegundos por cuadro)
    stats.ms = new Stats();
    stats.ms.showPanel(1); // 1: ms
    stats.ms.dom.style.cssText = 'position:absolute;top:0px;left:80px;';
    document.body.appendChild(stats.ms.dom);
    
    // Panel de MB (memoria utilizada)
    stats.mb = new Stats();
    stats.mb.showPanel(2); // 2: mb
    stats.mb.dom.style.cssText = 'position:absolute;top:0px;left:160px;';
    document.body.appendChild(stats.mb.dom);
}

/**
 * Comienza a medir el rendimiento del cuadro actual
 */
function beginStats() {
    if (stats.fps) stats.fps.begin();
    if (stats.ms) stats.ms.begin();
    if (stats.mb) stats.mb.begin();
}

/**
 * Finaliza la medición del cuadro actual
 */
function endStats() {
    if (stats.fps) stats.fps.end();
    if (stats.ms) stats.ms.end();
    if (stats.mb) stats.mb.end();
}

/**
 * Muestra u oculta los paneles de estadísticas
 * @param {boolean} visible - Si los paneles deben ser visibles
 */
function setStatsVisibility(visible) {
    const display = visible ? 'block' : 'none';
    if (stats.fps) stats.fps.dom.style.display = display;
    if (stats.ms) stats.ms.dom.style.display = display;
    if (stats.mb) stats.mb.dom.style.display = display;
}

export {
    initStats,
    beginStats,
    endStats,
    setStatsVisibility
};
