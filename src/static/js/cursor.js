/**
 * cursor.js - Cursor module for Dungeon PvP
 * Handles custom cursor styling and functionality
 */

// Custom cursor in base64 (converted from SVG)
const cursorBase64 = `data:image/svg+xml;base64,${btoa(`<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs/>
  <g>
    <path stroke="none" fill="#000000" d="M7 6.2 Q6.95 4.95 7.95 4.1 8.65 3.15 9.9 3 11.35 2.85 12.4 3.9 L12.25 3.8 24.85 14.3 24.9 14.35 Q25.6 14.85 25.9 16 26.15 16.9 25.9 17.75 L25.7 18.2 24.75 19.35 24.35 19.6 22.8 19.95 21.75 19.95 23.5 23.4 Q24.05 24.25 24 25.1 L24 25.4 23.55 26.75 23.35 26.95 22.85 27.6 22.35 27.95 20.45 28.95 20.2 29.05 18.25 29.15 17.85 29.05 Q16.7 28.5 16.3 27.55 L16.25 27.4 14.15 23.35 12.6 25 12.4 25.2 11.15 25.9 10.75 26 9.15 25.85 8.65 25.65 7.7 24.7 Q7 23.8 7 22.8 L7 6.2 M18.05 26.6 Q18.2 27 18.65 27.2 L19.5 27.15 21.4 26.15 21.8 25.7 22 25.1 21.8 24.5 18.5 17.95 22.8 17.95 23.45 17.8 23.95 17.2 23.95 16.45 23.6 15.85 10.95 5.3 Q10.6 4.95 10.1 5 9.65 5.05 9.4 5.45 9 5.75 9 6.2 L9 22.8 9.25 23.45 9.75 23.95 10.5 24 11.1 23.65 14.6 19.9 18.05 26.6"/>
    <path stroke="none" fill="#FFFFFF" d="M18.05 26.6 L14.6 19.9 11.1 23.65 10.5 24 9.75 23.95 9.25 23.45 9 22.8 9 6.2 Q9 5.75 9.4 5.45 9.65 5.05 10.1 5 10.6 4.95 10.95 5.3 L23.6 15.85 23.95 16.45 23.95 17.2 23.45 17.8 22.8 17.95 18.5 17.95 21.8 24.5 22 25.1 21.8 25.7 21.4 26.15 19.5 27.15 18.65 27.2 Q18.2 27 18.05 26.6"/>
  </g>
</svg>`)}`;

// Click version - slightly darker
const cursorClickBase64 = `data:image/svg+xml;base64,${btoa(`<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs/>
  <g transform="translate(1,1) scale(0.94)">
    <path stroke="none" fill="#000000" d="M7 6.2 Q6.95 4.95 7.95 4.1 8.65 3.15 9.9 3 11.35 2.85 12.4 3.9 L12.25 3.8 24.85 14.3 24.9 14.35 Q25.6 14.85 25.9 16 26.15 16.9 25.9 17.75 L25.7 18.2 24.75 19.35 24.35 19.6 22.8 19.95 21.75 19.95 23.5 23.4 Q24.05 24.25 24 25.1 L24 25.4 23.55 26.75 23.35 26.95 22.85 27.6 22.35 27.95 20.45 28.95 20.2 29.05 18.25 29.15 17.85 29.05 Q16.7 28.5 16.3 27.55 L16.25 27.4 14.15 23.35 12.6 25 12.4 25.2 11.15 25.9 10.75 26 9.15 25.85 8.65 25.65 7.7 24.7 Q7 23.8 7 22.8 L7 6.2 M18.05 26.6 Q18.2 27 18.65 27.2 L19.5 27.15 21.4 26.15 21.8 25.7 22 25.1 21.8 24.5 18.5 17.95 22.8 17.95 23.45 17.8 23.95 17.2 23.95 16.45 23.6 15.85 10.95 5.3 Q10.6 4.95 10.1 5 9.65 5.05 9.4 5.45 9 5.75 9 6.2 L9 22.8 9.25 23.45 9.75 23.95 10.5 24 11.1 23.65 14.6 19.9 18.05 26.6"/>
    <path stroke="none" fill="#EEEEEE" d="M18.05 26.6 L14.6 19.9 11.1 23.65 10.5 24 9.75 23.95 9.25 23.45 9 22.8 9 6.2 Q9 5.75 9.4 5.45 9.65 5.05 10.1 5 10.6 4.95 10.95 5.3 L23.6 15.85 23.95 16.45 23.95 17.2 23.45 17.8 22.8 17.95 18.5 17.95 21.8 24.5 22 25.1 21.8 25.7 21.4 26.15 19.5 27.15 18.65 27.2 Q18.2 27 18.05 26.6"/>
  </g>
</svg>`)}`;

/**
 * Apply custom cursor styles to the canvas element
 * @param {HTMLElement} targetElement - The element to apply the cursor to (usually the renderer's domElement)
 */
function applyCustomCursor(targetElement) {
    // Create style element
    const cursorStyle = document.createElement('style');
    cursorStyle.textContent = `
        canvas {
            cursor: url('${cursorBase64}') 8 8, auto !important;
        }
        canvas:active {
            cursor: url('${cursorClickBase64}') 8 8, auto !important;
        }
    `;
    document.head.appendChild(cursorStyle);
    
    // Prevent context menu on right-click
    targetElement.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });
}

// Export cursor module functions
export {
    cursorBase64,
    cursorClickBase64,
    applyCustomCursor
};
