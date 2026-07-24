const Ventas = {
    ultimoComprobante: null,
    mediosPago: [],
    pagos: [],
    secuenciaPago: 0,
    eventosPagosInicializados: false,

    async inicializarPagos() {
        this.inicializarEventosPagos();
        try {
            const respuesta = await api.obtenerMediosPago(false);
            this.mediosPago = respuesta?.mediosPago || respuesta?.datos || [];
            if (!this.mediosPago.length) {
                mostrarMensaje("No hay medios de pago activos. Configúrelos en Administración > Medios de pago.", "warning", 6000);
            }
            this.pagos = [];
            this.agregarPago({ sugerirSaldo: false });
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible cargar los medios de pago.", "danger");
        }
    },

    inicializarEventosPagos() {
        if (this.eventosPagosInicializados) return;
        const contenedor = document.getElementById("listaPagos");
        if (!contenedor) return;

        contenedor.addEventListener("change", event => {
            const control = event.target.closest("[data-pago-clave][data-pago-campo]");
            if (!control) return;
            const valor = control.type === "checkbox" ? control.checked : control.value;
            this.actualizarPago(Number(control.dataset.pagoClave), control.dataset.pagoCampo, valor, { origenUsuario: true });
        });

        contenedor.addEventListener("input", event => {
            const control = event.target.closest('[data-pago-campo="importeBase"]');
            if (!control) return;
            this.actualizarPago(Number(control.dataset.pagoClave), "importeBase", control.value, { origenUsuario: true });
        });

        contenedor.addEventListener("click", event => {
            const quitar = event.target.closest("[data-quitar-pago]");
            if (quitar) {
                this.quitarPago(Number(quitar.dataset.quitarPago));
                return;
            }
            const completar = event.target.closest("[data-completar-saldo]");
            if (completar) this.completarSaldo(Number(completar.dataset.completarSaldo));
        });

        this.eventosPagosInicializados = true;
    },

    actualizarCarrito() {
        const tbody = document.getElementById("tablaCarrito");
        if (!tbody) return;
        tbody.innerHTML = "";
        const items = carrito.getItems();
        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">Carrito vacío</td></tr>`;
        } else {
            items.forEach(item => tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td><strong>${Comprobante.escaparHtml(item.Descripcion)}</strong><br><small>${Comprobante.escaparHtml(item.Color || "")}${item.Talle ? " | Talle " + Comprobante.escaparHtml(item.Talle) : ""}</small></td>
                    <td class="text-center"><button type="button" class="btn btn-outline-secondary btn-sm" onclick="Ventas.disminuirCantidad(${item.IdProducto})">-</button><span class="mx-2 fw-bold">${item.Cantidad}</span><button type="button" class="btn btn-outline-secondary btn-sm" onclick="Ventas.aumentarCantidad(${item.IdProducto})">+</button></td>
                    <td class="text-end">${formatearMoneda(item.Subtotal)}</td>
                    <td class="text-center"><button type="button" class="btn btn-danger btn-sm" onclick="Ventas.eliminarProducto(${item.IdProducto})">🗑</button></td>
                </tr>`));
        }
        actualizarDashboard();
        this.ajustarPagosAlTotalBruto();
        this.renderizarPagos();
    },

    aumentarCantidad(idProducto) {
        const resultado = carrito.aumentar(idProducto);
        if (!resultado.ok) {
            mostrarMensaje(resultado.mensaje, "warning");
            return;
        }
        this.actualizarCarrito();
        Productos.enfocar();
    },

    disminuirCantidad(idProducto) {
        carrito.disminuir(idProducto);
        this.actualizarCarrito();
        Productos.enfocar();
    },

    eliminarProducto(idProducto) {
        if (!confirm("¿Eliminar este artículo del carrito?")) return;
        carrito.eliminar(idProducto);
        this.actualizarCarrito();
        Productos.enfocar();
    },

    agregarPago({ sugerirSaldo = true } = {}) {
        const claveNueva = ++this.secuenciaPago;
        this.pagos.push({
            clave: claveNueva,
            idMedioPago: "",
            importeBase: 0,
            aplicarDescuento: false,
            importeEditado: !sugerirSaldo,
            sugerirSaldo
        });
        this.renderizarPagos();
        requestAnimationFrame(() => {
            const medio = document.querySelector(`[data-pago-clave="${claveNueva}"][data-pago-campo="idMedioPago"]`);
            if (medio) {
                medio.focus();
                medio.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    },

    quitarPago(clave) {
        if (this.pagos.length <= 1) {
            mostrarMensaje("Debe existir al menos una fila de pago.", "warning");
            return;
        }
        this.pagos = this.pagos.filter(pago => pago.clave !== clave);
        this.recalcularVenta({ renderizar: true });
    },

    actualizarPago(clave, campo, valor, { origenUsuario = false } = {}) {
        const pago = this.pagos.find(item => item.clave === clave);
        if (!pago) return;

        if (campo === "idMedioPago") {
            pago.idMedioPago = valor;
            pago.aplicarDescuento = false;
            if (valor && !pago.importeEditado) {
                pago.importeBase = this.obtenerSaldoBruto(clave);
                pago.sugerirSaldo = true;
            }
            this.renderizarPagos();
            requestAnimationFrame(() => {
                const importe = document.querySelector(`[data-pago-clave="${clave}"][data-pago-campo="importeBase"]`);
                if (importe && valor) {
                    importe.focus();
                    importe.select();
                }
            });
            return;
        }

        if (campo === "importeBase") {
            const disponible = this.obtenerSaldoBruto(clave);
            const solicitado = Math.max(0, Number(valor || 0));
            pago.importeBase = this.redondear(Math.min(solicitado, disponible));
            if (origenUsuario) {
                pago.importeEditado = true;
                pago.sugerirSaldo = false;
            }
            const control = document.querySelector(`[data-pago-clave="${clave}"][data-pago-campo="importeBase"]`);
            if (control && this.redondear(solicitado) !== pago.importeBase) {
                control.value = pago.importeBase || "";
                mostrarMensaje(`El importe fue limitado al saldo bruto disponible: ${formatearMoneda(disponible)}.`, "warning", 3500);
            }
            this.recalcularVenta();
            return;
        }

        if (campo === "aplicarDescuento") {
            pago.aplicarDescuento = valor === true || String(valor).toUpperCase() === "TRUE" || String(valor).toUpperCase() === "SI";
            this.recalcularVenta();
        }
    },

    completarSaldo(clave) {
        const pago = this.pagos.find(item => item.clave === clave);
        if (!pago) return;
        pago.importeBase = this.obtenerSaldoBruto(clave);
        pago.importeEditado = false;
        pago.sugerirSaldo = true;
        this.renderizarPagos();
        requestAnimationFrame(() => {
            const importe = document.querySelector(`[data-pago-clave="${clave}"][data-pago-campo="importeBase"]`);
            importe?.focus();
            importe?.select();
        });
    },

    obtenerMedio(id) {
        return this.mediosPago.find(medio => String(medio.IdMedioPago) === String(id));
    },

    opcionesMedios(seleccionado) {
        return `<option value="">Seleccione...</option>` + this.mediosPago.map(medio =>
            `<option value="${Comprobante.escaparHtml(medio.IdMedioPago)}" ${String(medio.IdMedioPago) === String(seleccionado) ? "selected" : ""}>${Comprobante.escaparHtml(medio.Nombre)}${Number(medio.DescuentoPorcentaje || 0) > 0 ? ` (${Number(medio.DescuentoPorcentaje)}%)` : ""}</option>`
        ).join("");
    },

    renderizarPagos() {
        const contenedor = document.getElementById("listaPagos");
        if (!contenedor) return;
        contenedor.innerHTML = this.pagos.map(pago => {
            const medio = this.obtenerMedio(pago.idMedioPago);
            const descuento = Number(medio?.DescuentoPorcentaje || 0);
            return `<div class="pago-fila border rounded">
                <div class="row align-items-end">
                    <div class="col-md-4 pago-col-medio">
                        <label class="form-label">Medio</label>
                        <select class="form-select form-select-sm" data-pago-clave="${pago.clave}" data-pago-campo="idMedioPago">${this.opcionesMedios(pago.idMedioPago)}</select>
                    </div>
                    <div class="col-md-3 pago-col-importe">
                        <label class="form-label">Importe bruto</label>
                        <div class="input-group input-group-sm">
                            <input type="number" min="0" max="${this.redondear(carrito.getTotal())}" step="0.01" class="form-control" value="${pago.importeBase || ""}" data-pago-clave="${pago.clave}" data-pago-campo="importeBase">
                            <button type="button" class="btn btn-outline-secondary btn-completar-saldo" data-completar-saldo="${pago.clave}" title="Completar con el saldo pendiente" aria-label="Completar saldo"><i class="bi bi-arrow-down-circle"></i></button>
                        </div>
                    </div>
                    <div class="col-md-4 pago-col-descuento">
                        <label class="form-label d-block">Descuento</label>
                        <div class="form-check pago-descuento-check">
                            <input class="form-check-input" type="checkbox" id="pagoDescuento${pago.clave}" data-pago-clave="${pago.clave}" data-pago-campo="aplicarDescuento" ${pago.aplicarDescuento ? "checked" : ""} ${descuento <= 0 ? "disabled" : ""}>
                            <label class="form-check-label" for="pagoDescuento${pago.clave}">${descuento > 0 ? `Aplicar ${descuento}%` : "No aplica"}</label>
                        </div>
                    </div>
                    <div class="col-md-1 pago-col-acciones text-end">
                        <button type="button" class="btn btn-sm btn-outline-danger" data-quitar-pago="${pago.clave}" aria-label="Quitar pago"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>`;
        }).join("");
        this.recalcularVenta();
    },

    redondear(valor) {
        return Math.round(Number(valor || 0) * 100) / 100;
    },

    obtenerSaldoBruto(excluirClave = null) {
        const bruto = this.redondear(carrito.getTotal());
        const asignado = this.redondear(this.pagos
            .filter(pago => pago.clave !== excluirClave)
            .reduce((total, pago) => total + Math.max(0, Number(pago.importeBase || 0)), 0));
        return this.redondear(Math.max(0, bruto - asignado));
    },

    ajustarPagosAlTotalBruto() {
        let disponible = this.redondear(carrito.getTotal());
        this.pagos.forEach(pago => {
            pago.importeBase = this.redondear(Math.min(Math.max(0, Number(pago.importeBase || 0)), disponible));
            disponible = this.redondear(Math.max(0, disponible - pago.importeBase));
        });
        this.actualizarSugerenciasAutomaticas();
    },

    actualizarSugerenciasAutomaticas() {
        const sugeridos = this.pagos.filter(pago => pago.sugerirSaldo && !pago.importeEditado && pago.idMedioPago);
        if (!sugeridos.length) return;
        sugeridos.forEach(pago => {
            pago.importeBase = this.obtenerSaldoBruto(pago.clave);
        });
    },

    calcularPagos() {
        return this.pagos.map(pago => {
            const medio = this.obtenerMedio(pago.idMedioPago);
            const importeBase = this.redondear(Math.max(0, Number(pago.importeBase || 0)));
            const descuentoPorcentaje = pago.aplicarDescuento ? Math.max(0, Number(medio?.DescuentoPorcentaje || 0)) : 0;
            const descuento = this.redondear(importeBase * descuentoPorcentaje / 100);
            const importeCobrado = this.redondear(importeBase - descuento);
            return { ...pago, nombre: medio?.Nombre || "", descuentoPorcentaje, descuento, importeCobrado };
        });
    },

    recalcularVenta({ renderizar = false } = {}) {
        this.actualizarSugerenciasAutomaticas();
        const bruto = this.redondear(carrito.getTotal());
        const pagos = this.calcularPagos();
        const brutoAsignado = this.redondear(pagos.reduce((total, pago) => total + pago.importeBase, 0));
        const descuento = this.redondear(pagos.reduce((total, pago) => total + pago.descuento, 0));
        const neto = this.redondear(Math.max(0, bruto - descuento));
        const saldoBruto = this.redondear(Math.max(0, bruto - brutoAsignado));
        const distribuida = bruto > 0 && Math.abs(saldoBruto) <= 0.01 && pagos.every(pago => pago.idMedioPago && pago.importeBase > 0);

        establecerTexto("lblSubtotalCobro", formatearMoneda(bruto));
        establecerTexto("lblDescuentoCobro", descuento > 0 ? `-${formatearMoneda(descuento)}` : formatearMoneda(0));
        establecerTexto("lblTotalCobro", formatearMoneda(neto));
        establecerTexto("lblTotal", formatearMoneda(neto));
        establecerTexto("lblTotalMini", formatearMoneda(bruto));
        establecerTexto("lblPendientePago", formatearMoneda(saldoBruto));

        const estado = document.getElementById("estadoDistribucionPago");
        if (estado) {
            estado.className = `pos-payment-status ${distribuida ? "is-complete" : "is-pending"}`;
            estado.innerHTML = distribuida
                ? `<i class="bi bi-check-circle-fill"></i> Venta completamente distribuida`
                : `<i class="bi bi-exclamation-circle"></i> Saldo Venta: <strong>${formatearMoneda(saldoBruto)}</strong>`;
        }

        const botonFinalizar = document.getElementById("btnFinalizarVenta");
        if (botonFinalizar) {
            botonFinalizar.disabled = !distribuida;
            botonFinalizar.title = distribuida ? "Finalizar venta" : "Distribuya el total bruto entre los medios de pago";
        }

        if (renderizar) this.renderizarPagos();
        return { bruto, brutoAsignado, descuento, neto, saldoBruto, distribuida, pagos };
    },

    validarPagos() {
        const resultado = this.recalcularVenta();
        if (!resultado.bruto) return { ok: false, mensaje: "No hay productos en el carrito." };
        if (resultado.pagos.some(pago => !pago.idMedioPago || pago.importeBase <= 0)) {
            return { ok: false, mensaje: "Complete el medio y el importe de cada pago." };
        }
        if (!resultado.distribuida) {
            return { ok: false, mensaje: `Las partes de pago deben sumar ${formatearMoneda(resultado.bruto)}. Saldo Venta: ${formatearMoneda(resultado.saldoBruto)}.` };
        }
        return { ok: true, ...resultado };
    },

    async finalizar() {
        if (!carrito.getItems().length) {
            mostrarMensaje("No hay productos en el carrito.", "warning");
            return;
        }
        const validacion = this.validarPagos();
        if (!validacion.ok) {
            mostrarMensaje(validacion.mensaje, "warning", 5000);
            return;
        }

        const itemsComprobante = carrito.getItems().map(item => ({ ...item }));
        const itemsVendidos = itemsComprobante.map(item => ({ IdProducto: item.IdProducto, Cantidad: item.Cantidad }));
        const pagos = validacion.pagos.map(pago => ({
            IdMedioPago: pago.idMedioPago,
            MedioPago: pago.nombre,
            ImporteBase: pago.importeBase,
            AplicaDescuento: pago.aplicarDescuento === true,
            DescuentoPorcentaje: pago.descuentoPorcentaje,
            ImporteDescuento: pago.descuento,
            ImporteCobrado: pago.importeCobrado
        }));

        this.mostrarProceso(true, "Registrando venta y generando comprobante...");
        try {
            const respuesta = await api.registrarVenta({
                items: itemsComprobante,
                total: validacion.neto,
                medioPago: pagos.length > 1 ? "MIXTO" : pagos[0].MedioPago,
                pagos,
                numeroCaja: AppState.configuracion.NumeroCaja || "1",
                usuario: AppState.configuracion.UsuarioDefault || "ADMIN"
            });
            if (!respuesta.ok) {
                mostrarMensaje(respuesta.mensaje || "No fue posible registrar la venta.", "danger", 5000);
                return;
            }

            Productos.actualizarStockEnMemoria(itemsVendidos);
            const pagosConfirmados = Array.isArray(respuesta.pagos) && respuesta.pagos.length ? respuesta.pagos : pagos;
            const descuentoConfirmado = this.redondear(pagosConfirmados.reduce((suma, pago) => suma + Number(pago.ImporteDescuento || 0), 0));
            const totalConfirmado = this.redondear(pagosConfirmados.reduce((suma, pago) => suma + Number(pago.ImporteCobrado || 0), 0));
            const subtotalConfirmado = this.redondear(pagosConfirmados.reduce((suma, pago) => suma + Number(pago.ImporteBase || 0), 0));

            this.ultimoComprobante = Comprobante.crear({
                numero: respuesta.numeroComprobante || respuesta.idVenta,
                fechaHora: respuesta.fechaHora || new Date(),
                medioPago: pagosConfirmados.length > 1 ? "MIXTO" : pagosConfirmados[0].MedioPago,
                pagos: pagosConfirmados,
                items: itemsComprobante,
                subtotal: subtotalConfirmado,
                descuento: descuentoConfirmado,
                total: totalConfirmado,
                idVenta: respuesta.idVenta
            });

            const htmlComprobante = Comprobante.generarHtml(this.ultimoComprobante);
            mostrarMensaje(`Venta N° ${respuesta.idVenta} registrada correctamente.`, "success");
            carrito.vaciar();
            this.pagos = [];
            this.agregarPago({ sugerirSaldo: false });
            this.actualizarCarrito();
            Productos.limpiarResultados();
            Productos.enfocar();
            Impresion.mostrarComprobante(htmlComprobante, {
                titulo: "Venta registrada",
                subtitulo: `Comprobante ${this.ultimoComprobante.numero}`
            });
        } catch (error) {
            console.error(error);
            mostrarMensaje(error?.message || "No fue posible comunicarse con el servidor.", "danger", 5000);
        } finally {
            this.mostrarProceso(false);
        }
    },

    mostrarProceso(activo, mensaje = "Procesando...") {
        const panel = document.getElementById("posEstadoProceso");
        const texto = document.getElementById("posEstadoProcesoTexto");
        if (texto) texto.textContent = mensaje;
        panel?.classList.toggle("d-none", !activo);
        panel?.setAttribute("aria-hidden", activo ? "false" : "true");
        const boton = document.getElementById("btnFinalizarVenta");
        if (boton) boton.disabled = activo || !this.validarPagos().ok;
    },

    reimprimirUltimoComprobante() {
        if (!this.ultimoComprobante) {
            mostrarMensaje("Todavía no hay un comprobante disponible para reimprimir.", "warning");
            return;
        }
        Impresion.mostrarComprobante(Comprobante.generarHtml(this.ultimoComprobante), {
            titulo: "Comprobante de venta",
            subtitulo: `Comprobante ${this.ultimoComprobante.numero}`
        });
    },

    cancelar() {
        if (carrito.getItems().length && !confirm("¿Desea cancelar la venta actual?")) return;
        carrito.vaciar();
        this.pagos = [];
        this.agregarPago({ sugerirSaldo: false });
        this.actualizarCarrito();
        Productos.limpiarResultados();
        Productos.enfocar();
        mostrarMensaje("La venta actual fue cancelada.", "warning");
    }
};

window.finalizarVenta = () => Ventas.finalizar();
window.cancelarVenta = () => Ventas.cancelar();
window.reimprimirUltimoComprobante = () => Ventas.reimprimirUltimoComprobante();

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("btnAgregarPago")?.addEventListener("click", () => Ventas.agregarPago());
    Ventas.inicializarPagos();
});
