/*
 * Configuración central del frontend.
 *
 * Para cambiar de ambiente se modifica únicamente AMBIENTE_ACTIVO.
 * Cada ambiente debe tener una URL de Apps Script válida antes de activarlo.
 */
(function configurarPosLocal(global) {
    "use strict";

    const AMBIENTE_ACTIVO = "PRUEBA";

    const AMBIENTES = Object.freeze({
        DESARROLLO: Object.freeze({
            API: ""
        }),
        PRUEBA: Object.freeze({
            API: "https://script.google.com/macros/s/AKfycbzkHoQd4lbKVUhihqV0dACr5qUrARLwL9fZhTZwCTFeG-87Q_ArC8M8Y_PeVjpf3ZMfJQ/exec"
        }),
        PRODUCCION: Object.freeze({
            API: ""
        })
    });

    const ambiente = AMBIENTES[AMBIENTE_ACTIVO];

    if (!ambiente) {
        throw new Error(`Ambiente no configurado: ${AMBIENTE_ACTIVO}`);
    }

    if (!ambiente.API) {
        throw new Error(`El ambiente ${AMBIENTE_ACTIVO} no tiene una URL de API configurada.`);
    }

    global.CONFIG = Object.freeze({
        EMPRESA: "APRILE",
        VERSION: "0.26.0",
        AMBIENTE: AMBIENTE_ACTIVO,
        NOMBRE_SISTEMA: "POS Local",
        API: ambiente.API
    });
})(window);

// Compatibilidad con los módulos existentes que referencian CONFIG directamente.
var CONFIG = window.CONFIG;
