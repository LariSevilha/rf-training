/* ============================================================================
   >>> INÍCIO ALTERAÇÃO (02/07/2026) — CORREÇÃO: PÁGINA RECARREGA AO DAR
       ZOOM NO PDF NO IPHONE (iOS)

   ARQUIVO NOVO: salvar como  /assets/js/ios-pdf-fix.js  no servidor.

   O PROBLEMA:
   - No iPhone o devicePixelRatio é 3 (no Android costuma ser 2).
   - Cada zoom no PDF re-renderiza a página num <canvas> cujo tamanho é
     (página × zoom × devicePixelRatio). A memória cresce com o QUADRADO
     do devicePixelRatio.
   - O iOS tem um limite rígido de memória por aba. Quando o canvas do PDF
     estoura esse limite, o iOS MATA o processo da página e a recarrega
     sozinho, sem mostrar erro nenhum. É o "refresh" que você vê.
   - No Android o limite é bem maior, por isso lá não acontece.

   A CORREÇÃO:
   - Somente no iOS, limita o devicePixelRatio visto pelos scripts a 2
     (mesmo valor dos Androids onde o app funciona sem travar).
   - Isso reduz a memória usada pelo canvas em ~2,25× (3² ÷ 2² = 9/4),
     ficando dentro do limite do iOS. A perda de nitidez é imperceptível.
   - No Android e no computador este script NÃO muda absolutamente nada.

   COMO INSTALAR (2 passos):
   1) Suba este arquivo para  /assets/js/ios-pdf-fix.js
   2) No HTML que abre o PDF (ex.: /pages/aluno.html), adicione a linha
      abaixo ANTES de todos os outros <script> (antes do pdf.js):

        <script src="/assets/js/ios-pdf-fix.js"></script>

   (Também já adicionei este arquivo no service-worker.js — veja lá.)
   ============================================================================ */

   (function () {
    "use strict";
  
    /* --------------------------------------------------------------
       [PASSO 1] Detectar se o aparelho é iPhone/iPad.
       A segunda condição pega iPad novo, que se disfarça de Mac.
       -------------------------------------------------------------- */
    var isIOS =
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  
    /* Se NÃO for iOS (Android, PC...), sai sem alterar nada. */
    if (!isIOS) return;
  
    /* --------------------------------------------------------------
       [PASSO 2] Limitar o devicePixelRatio a no máximo 2 no iOS.
       Todo código que ler window.devicePixelRatio (inclusive o pdf.js)
       passa a enxergar 2 em vez de 3, e cria canvases 2,25× menores.
       -------------------------------------------------------------- */
    var dprReal = window.devicePixelRatio || 1; // guarda o valor original (3 no iPhone)
    var DPR_MAXIMO = 2;                          // teto seguro (igual ao Android)
  
    try {
      Object.defineProperty(window, "devicePixelRatio", {
        get: function () {
          return Math.min(dprReal, DPR_MAXIMO);
        },
        configurable: true
      });
    } catch (e) {
      /* Se o navegador não permitir a substituição, apenas segue em
         frente — o app continua funcionando como antes. */
    }
  })();
  
  /* ============================================================================
     <<< FIM ALTERAÇÃO (02/07/2026) — correção do zoom de PDF no iOS
     ============================================================================ */