const Impresion = {
    ultimaVentana: null,
    ultimoHtml: "",
    modalComprobante: null,

    inicializarModal() {
        const elemento = document.getElementById("modalComprobanteVenta");
        if (!elemento || typeof bootstrap === "undefined") return null;

        if (!this.modalComprobante) {
            this.modalComprobante = bootstrap.Modal.getOrCreateInstance(elemento);
        }
        return this.modalComprobante;
    },

    mostrarComprobante(html, opciones = {}) {
        this.ultimoHtml = String(html || "");

        const modal = this.inicializarModal();
        const marco = document.getElementById("iframeComprobanteVenta");
        const titulo = document.getElementById("modalComprobanteVentaTitulo");
        const subtitulo = document.getElementById("modalComprobanteVentaSubtitulo");

        if (!modal || !marco) {
            return this.abrirVistaPrevia(this.ultimoHtml);
        }

        if (titulo) titulo.textContent = opciones.titulo || "Comprobante de venta";
        if (subtitulo) subtitulo.textContent = opciones.subtitulo || "Revise el comprobante antes de imprimir.";

        marco.srcdoc = this.ultimoHtml;
        modal.show();
        return marco;
    },

    imprimirModal() {
        const marco = document.getElementById("iframeComprobanteVenta");
        const ventana = marco?.contentWindow;

        if (!ventana) {
            mostrarMensaje("No hay un comprobante disponible para imprimir.", "warning");
            return;
        }

        ventana.focus();
        ventana.print();
    },

    abrirVistaPrevia(html) {
        const ventana = window.open(
            "",
            "pos-local-comprobante",
            "width=900,height=760,scrollbars=yes,resizable=yes"
        );

        if (!ventana) {
            mostrarMensaje(
                "El navegador bloqueó la ventana del comprobante. Habilite las ventanas emergentes.",
                "warning",
                6000
            );
            return null;
        }

        ventana.document.open();
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();

        this.ultimaVentana = ventana;
        return ventana;
    },

    imprimir(html) {
        if (document.getElementById("modalComprobanteVenta")) {
            this.mostrarComprobante(html);
            window.setTimeout(() => this.imprimirModal(), 250);
            return;
        }

        const ventana = this.abrirVistaPrevia(html);
        if (!ventana) return;

        ventana.addEventListener("load", () => {
            window.setTimeout(() => {
                ventana.focus();
                ventana.print();
            }, 250);
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    Impresion.inicializarModal();
    document.getElementById("btnImprimirComprobanteVenta")?.addEventListener("click", () => {
        Impresion.imprimirModal();
    });
});
