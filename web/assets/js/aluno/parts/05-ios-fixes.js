// ====================== 05-ios-fixes.js ======================
// Fixes específicos para iOS Safari / PWA

console.log("✅ iOS Fixes carregados");

// Função global para abrir links externos sem tela branca
window.openExternal = function(url) {
    if (!url) return;
    console.log("🔗 Abrindo externo:", url);
    
    window.open(url, '_blank');
    
    // Mitigação de tela branca ao voltar
    setTimeout(() => {
        const handler = (e) => {
            if (e.persisted) {
                console.log("↩️ Retorno de app externo detectado");
            }
        };
        window.addEventListener('pageshow', handler, { once: true });
    }, 500);
};

// Função específica para vídeos (YouTube, etc)
window.abrirVideo = function(url) {
    if (!url) return;
    
    let finalUrl = url;
    
    // Converte YouTube normal para embed (melhor no iOS)
    if (url.includes("youtube.com/watch") || url.includes("youtu.be")) {
        const match = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
        if (match && match[1]) {
            finalUrl = `https://www.youtube.com/embed/${match[1]}?autoplay=1&playsinline=1&rel=0`;
        }
    }
    
    window.openExternal(finalUrl);
};

// Melhoria no PDF Viewer
document.addEventListener('DOMContentLoaded', () => {
    const pdfFrame = document.getElementById('pdfFrame');
    if (pdfFrame) {
        // Força reload do iframe quando voltar (ajuda com zoom)
        pdfFrame.addEventListener('load', () => {
            console.log("📄 PDF carregado");
        });
    }
});