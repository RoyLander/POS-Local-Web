const Caja = {

    configuracion: {},
    cajaActual: null,
    resumen: null,

    modalApertura: null,
    modalMovimiento: null,
    modalCierre: null,


    async inicializar() {

        Caja.modalApertura =
            new bootstrap.Modal(
                document.getElementById(
                    "modalApertura"
                )
            );

        Caja.modalMovimiento =
            new bootstrap.Modal(
                document.getElementById(
                    "modalMovimiento"
                )
            );

        Caja.modalCierre =
            new bootstrap.Modal(
                document.getElementById(
                    "modalCierre"
                )
            );

        Caja.registrarEventos();

        await Caja.cargarConfiguracion();
        await Caja.cargarEstado();
    },


    registrarEventos() {

        document
            .getElementById("btnAbrir")
            ?.addEventListener(
                "click",
                () => Caja.abrirModalApertura()
            );

        document
            .getElementById("btnIngreso")
            ?.addEventListener(
                "click",
                () =>
                    Caja.abrirModalMovimiento(
                        "INGRESO"
                    )
            );

        document
            .getElementById("btnEgreso")
            ?.addEventListener(
                "click",
                () =>
                    Caja.abrirModalMovimiento(
                        "EGRESO"
                    )
            );

        document
            .getElementById("btnCerrar")
            ?.addEventListener(
                "click",
                () => Caja.abrirModalCierre()
            );

        document
            .getElementById(
                "confirmarApertura"
            )
            ?.addEventListener(
                "click",
                () => Caja.confirmarApertura()
            );

        document
            .getElementById(
                "confirmarMovimiento"
            )
            ?.addEventListener(
                "click",
                () => Caja.confirmarMovimiento()
            );

        document
            .getElementById(
                "confirmarCierre"
            )
            ?.addEventListener(
                "click",
                () => Caja.confirmarCierre()
            );
    },


    async cargarConfiguracion() {

        try {

            const resultado =
                await api.obtenerConfiguracion();

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible obtener la configuración.",
                    "danger",
                    5000
                );

                return;
            }

            Caja.configuracion =
                resultado.configuracion || {};

            Caja.establecerTexto(
                "lblNombreSistema",
                Caja.configuracion.NombreSistema ||
                "POS Local"
            );

            Caja.establecerTexto(
                "lblNombreNegocio",
                Caja.configuracion.NombreNegocio ||
                ""
            );

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );
        }
    },


    async cargarEstado() {

        try {

            const numeroCaja =
                Caja.configuracion.NumeroCaja ||
                "1";

            const resultado =
                await api.obtenerCajaAbierta(
                    numeroCaja
                );

            if (!resultado.ok) {

                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible consultar la caja.",
                    "danger",
                    5000
                );

                return;
            }

            Caja.cajaActual =
                resultado.caja || null;

            Caja.actualizarEstadoVisual();

            if (Caja.cajaActual) {

                await Caja.cargarResumen();

            } else {

                Caja.limpiarResumen();
            }

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible obtener el estado de la caja.",
                "danger",
                5000
            );
        }
    },


    async cargarResumen() {

        if (!Caja.cajaActual) {
            return;
        }

        const resultado =
            await api.obtenerResumenCaja(
                Caja.cajaActual.IdCaja
            );

        if (!resultado.ok) {

            mostrarMensaje(
                resultado.mensaje ||
                "No fue posible obtener el resumen de caja.",
                "danger",
                5000
            );

            return;
        }

        Caja.resumen = resultado;

        Caja.mostrarResumen(resultado);
    },


    actualizarEstadoVisual() {

        const abierta =
            Boolean(Caja.cajaActual);

        Caja.establecerTexto(
            "lblEstado",
            abierta
                ? "Abierta"
                : "Cerrada"
        );

        const estado =
            document.getElementById(
                "lblEstado"
            );

        if (estado) {

            estado.className =
                abierta
                    ? "mb-0 text-success"
                    : "mb-0 text-secondary";
        }

        Caja.establecerDeshabilitado(
            "btnAbrir",
            abierta
        );

        Caja.establecerDeshabilitado(
            "btnIngreso",
            !abierta
        );

        Caja.establecerDeshabilitado(
            "btnEgreso",
            !abierta
        );

        Caja.establecerDeshabilitado(
            "btnCerrar",
            !abierta
        );

        if (window.Navegacion && typeof Navegacion.actualizarEstadoCaja === "function") {
            Navegacion.actualizarEstadoCaja();
        }
        document.dispatchEvent(new CustomEvent("pos:caja-cambio", { detail: { abierta } }));
    },


    mostrarResumen(resultado) {

        Caja.establecerTexto(
            "lblInicial",
            Caja.formatearMoneda(
                resultado.caja.MontoInicial
            )
        );

        Caja.establecerTexto(
            "lblVentasEfectivo",
            Caja.formatearMoneda(
                resultado.ventasEfectivo
            )
        );

        Caja.establecerTexto(
            "lblTeorico",
            Caja.formatearMoneda(
                resultado.efectivoTeorico
            )
        );

        Caja.mostrarMediosPago(
            resultado.mediosPago || []
        );

        Caja.mostrarMovimientos(
            resultado.movimientos || []
        );
    },


    mostrarMediosPago(lista) {

        const tbody =
            document.getElementById(
                "tablaMedios"
            );

        tbody.innerHTML = "";

        if (!lista.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        class="text-center text-muted">

                        Sin ventas registradas

                    </td>
                </tr>
            `;

            return;
        }

        lista.forEach(item => {

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>
                    <td>
                        ${Caja.escaparHtml(
                            item.medioPago
                        )}
                    </td>

                    <td class="text-end">
                        ${Number(
                            item.cantidad || 0
                        )}
                    </td>

                    <td class="text-end">
                        ${Caja.formatearMoneda(
                            item.total
                        )}
                    </td>
                </tr>
                `
            );
        });
    },


    mostrarMovimientos(lista) {

        const tbody =
            document.getElementById(
                "tablaMovimientos"
            );

        tbody.innerHTML = "";

        if (!lista.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="text-center text-muted">

                        Sin movimientos manuales

                    </td>
                </tr>
            `;

            return;
        }

        lista.forEach(item => {

            const esEgreso =
                String(item.Tipo || "")
                    .trim()
                    .toUpperCase() ===
                "EGRESO";

            const clase =
                esEgreso
                    ? "text-danger"
                    : "text-success";

            const signo =
                esEgreso
                    ? "-"
                    : "+";

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>
                    <td>
                        ${Caja.formatearFecha(
                            item.FechaHora
                        )}
                    </td>

                    <td>
                        ${Caja.escaparHtml(
                            item.Tipo
                        )}
                    </td>

                    <td>
                        ${Caja.escaparHtml(
                            item.Concepto
                        )}
                    </td>

                    <td class="text-end ${clase}">
                        ${signo}${Caja.formatearMoneda(
                            item.Importe
                        )}
                    </td>
                </tr>
                `
            );
        });
    },


    limpiarResumen() {

        Caja.resumen = null;

        Caja.establecerTexto(
            "lblInicial",
            Caja.formatearMoneda(0)
        );

        Caja.establecerTexto(
            "lblVentasEfectivo",
            Caja.formatearMoneda(0)
        );

        Caja.establecerTexto(
            "lblTeorico",
            Caja.formatearMoneda(0)
        );

        Caja.mostrarMediosPago([]);
        Caja.mostrarMovimientos([]);
    },


    abrirModalApertura() {

        const formulario =
            document.getElementById(
                "formApertura"
            );

        formulario.reset();

        Caja.modalApertura.show();

        window.setTimeout(() => {

            document
                .getElementById(
                    "montoInicial"
                )
                ?.focus();

        }, 250);
    },


    async confirmarApertura() {

        const formulario =
            document.getElementById(
                "formApertura"
            );

        if (!formulario.reportValidity()) {
            return;
        }

        const resultado =
            await api.abrirCaja({
                numeroCaja:
                    Caja.configuracion.NumeroCaja ||
                    "1",

                usuario:
                    Caja.configuracion.UsuarioDefault ||
                    "ADMIN",

                montoInicial:
                    Caja.obtenerNumero(
                        "montoInicial"
                    ),

                observacion:
                    Caja.obtenerCampo(
                        "obsApertura"
                    )
            });

        if (!resultado.ok) {

            mostrarMensaje(
                resultado.mensaje ||
                "No fue posible abrir la caja.",
                "danger",
                5000
            );

            return;
        }

        Caja.modalApertura.hide();

        mostrarMensaje(
            "Caja abierta correctamente.",
            "success"
        );

        await Caja.cargarEstado();
    },


    abrirModalMovimiento(tipo) {

        const formulario =
            document.getElementById(
                "formMovimiento"
            );

        formulario.reset();

        Caja.establecerValor(
            "tipoMovimiento",
            tipo
        );

        Caja.establecerTexto(
            "tituloMovimiento",
            tipo === "INGRESO"
                ? "Ingreso manual"
                : "Egreso manual"
        );

        Caja.modalMovimiento.show();

        window.setTimeout(() => {

            document
                .getElementById(
                    "conceptoMovimiento"
                )
                ?.focus();

        }, 250);
    },


    async confirmarMovimiento() {

        const formulario =
            document.getElementById(
                "formMovimiento"
            );

        if (!formulario.reportValidity()) {
            return;
        }

        if (!Caja.cajaActual) {

            mostrarMensaje(
                "No hay una caja abierta.",
                "warning"
            );

            return;
        }

        const resultado =
            await api.registrarMovimientoCaja({
                idCaja:
                    Caja.cajaActual.IdCaja,

                tipo:
                    Caja.obtenerCampo(
                        "tipoMovimiento"
                    ),

                concepto:
                    Caja.obtenerCampo(
                        "conceptoMovimiento"
                    ),

                importe:
                    Caja.obtenerNumero(
                        "importeMovimiento"
                    ),

                observacion:
                    Caja.obtenerCampo(
                        "obsMovimiento"
                    ),

                usuario:
                    Caja.configuracion.UsuarioDefault ||
                    "ADMIN"
            });

        if (!resultado.ok) {

            mostrarMensaje(
                resultado.mensaje ||
                "No fue posible registrar el movimiento.",
                "danger",
                5000
            );

            return;
        }

        Caja.modalMovimiento.hide();

        mostrarMensaje(
            "Movimiento registrado correctamente.",
            "success"
        );

        await Caja.cargarResumen();
    },


    abrirModalCierre() {

        Caja.establecerTexto(
            "teoricoCierre",
            Caja.formatearMoneda(
                Caja.resumen?.efectivoTeorico ||
                0
            )
        );

        const formulario =
            document.getElementById(
                "formCierre"
            );

        formulario.reset();

        Caja.modalCierre.show();

        window.setTimeout(() => {

            document
                .getElementById(
                    "efectivoContado"
                )
                ?.focus();

        }, 250);
    },


    async confirmarCierre() {

        const formulario =
            document.getElementById(
                "formCierre"
            );

        if (!formulario.reportValidity()) {
            return;
        }

        if (!Caja.cajaActual) {

            mostrarMensaje(
                "No hay una caja abierta.",
                "warning"
            );

            return;
        }

        const resultado =
            await api.cerrarCaja({
                idCaja:
                    Caja.cajaActual.IdCaja,

                efectivoContado:
                    Caja.obtenerNumero(
                        "efectivoContado"
                    ),

                observacion:
                    Caja.obtenerCampo(
                        "obsCierre"
                    ),

                usuario:
                    Caja.configuracion.UsuarioDefault ||
                    "ADMIN"
            });

        if (!resultado.ok) {

            mostrarMensaje(
                resultado.mensaje ||
                "No fue posible cerrar la caja.",
                "danger",
                5000
            );

            return;
        }

        Caja.modalCierre.hide();

        mostrarMensaje(
            "Caja cerrada. Diferencia: " +
            Caja.formatearMoneda(
                resultado.diferencia
            ),
            Number(resultado.diferencia) === 0
                ? "success"
                : "warning",
            6000
        );

        await Caja.cargarEstado();
    },


    formatearMoneda(valor) {

        const simbolo =
            Caja.configuracion.SimboloMoneda ||
            "$";

        return (
            simbolo +
            " " +
            Number(valor || 0)
                .toLocaleString("es-AR")
        );
    },


    formatearFecha(valor) {

        if (!valor) {
            return "";
        }

        const fecha =
            new Date(valor);

        if (
            Number.isNaN(
                fecha.getTime()
            )
        ) {
            return String(valor);
        }

        return fecha.toLocaleString(
            "es-AR"
        );
    },


    escaparHtml(valor) {

        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },


    establecerTexto(id, valor) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    },


    establecerValor(id, valor) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.value = valor;
        }
    },


    establecerDeshabilitado(
        id,
        deshabilitado
    ) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.disabled =
                deshabilitado;
        }
    },


    obtenerCampo(id) {

        return (
            document.getElementById(id)
                ?.value ||
            ""
        ).trim();
    },


    obtenerNumero(id) {

        const valor =
            document.getElementById(id)
                ?.value;

        return (
            valor === "" ||
            valor == null
        )
            ? 0
            : Number(valor);
    }
};


const api =
    new Api();


document.addEventListener(
    "DOMContentLoaded",
    () => Caja.inicializar()
);
