const VentasAdmin = {

    ventas: [],
    ventaSeleccionada: null,
    configuracion: {},
    modal: null,
    modalAnulacion: null,

    async inicializar() {
        VentasAdmin.modal =
            new bootstrap.Modal(
                document.getElementById("modalDetalleVenta")
            );

        VentasAdmin.modalAnulacion =
            new bootstrap.Modal(
                document.getElementById("modalAnularVenta")
            );

        VentasAdmin.registrarEventos();
        VentasAdmin.establecerFechasIniciales();

        await VentasAdmin.cargarConfiguracion();
        await VentasAdmin.buscarVentas();
    },

    registrarEventos() {
        document.getElementById("btnBuscarVentas")
            ?.addEventListener("click", () => VentasAdmin.buscarVentas());

        document.getElementById("btnLimpiarVentas")
            ?.addEventListener("click", () => VentasAdmin.limpiarFiltros());

        document.getElementById("btnReimprimirVenta")
            ?.addEventListener("click", () => VentasAdmin.reimprimirVenta());

        document.getElementById("btnAnularVenta")
            ?.addEventListener("click", () => VentasAdmin.abrirAnulacion());

        document.getElementById("btnConfirmarAnulacion")
            ?.addEventListener("click", () => VentasAdmin.confirmarAnulacion());
    },

    establecerFechasIniciales() {
        const hoy = new Date();

        const inicio = new Date(
            hoy.getFullYear(),
            hoy.getMonth(),
            1
        );

        VentasAdmin.valor(
            "ventaFechaDesde",
            VentasAdmin.fechaInput(inicio)
        );

        VentasAdmin.valor(
            "ventaFechaHasta",
            VentasAdmin.fechaInput(hoy)
        );
    },

    async cargarConfiguracion() {
        try {
            const resultado = await api.obtenerConfiguracion();

            if (!resultado.ok) return;

            VentasAdmin.configuracion =
                resultado.configuracion || {};

            AppState.configuracion =
                VentasAdmin.configuracion;

            VentasAdmin.texto(
                "lblNombreSistema",
                VentasAdmin.configuracion.NombreSistema || "POS Local"
            );

            VentasAdmin.texto(
                "lblNombreNegocio",
                VentasAdmin.configuracion.NombreNegocio || ""
            );

            document.title =
                `${VentasAdmin.configuracion.NombreSistema || "POS Local"} - Ventas`;

        } catch (error) {
            console.error(error);
        }
    },

    async buscarVentas() {
        VentasAdmin.texto(
            "lblEstadoVentas",
            "Consultando ventas..."
        );

        try {
            const resultado = await api.buscarVentas({
                fechaDesde: VentasAdmin.campo("ventaFechaDesde"),
                fechaHasta: VentasAdmin.campo("ventaFechaHasta"),
                numeroComprobante: VentasAdmin.campo("ventaNumeroComprobante"),
                medioPago: VentasAdmin.campo("ventaMedioPago"),
                estado: VentasAdmin.campo("ventaEstado")
            });

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje || "No fue posible consultar las ventas.",
                    "danger",
                    5000
                );
                return;
            }

            VentasAdmin.ventas = resultado.ventas || [];
            VentasAdmin.mostrarVentas(VentasAdmin.ventas);
            VentasAdmin.actualizarResumen(VentasAdmin.ventas);

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {
            VentasAdmin.texto("lblEstadoVentas", "Listo");
        }
    },

    mostrarVentas(lista) {
        const tbody = document.getElementById("tablaVentas");
        tbody.innerHTML = "";

        if (!lista.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        No se encontraron ventas
                    </td>
                </tr>
            `;
            return;
        }

        lista.forEach(venta => {
            const estado =
                String(venta.Estado || "COBRADA")
                    .trim()
                    .toUpperCase();

            const badgeEstado =
                estado === "ANULADA"
                    ? `<span class="badge bg-danger">Anulada</span>`
                    : `<span class="badge bg-success">Cobrada</span>`;

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${VentasAdmin.escapar(venta.IdVenta || "")}</td>
                    <td>${VentasAdmin.escapar(venta.NumeroComprobante || "")}</td>
                    <td>${VentasAdmin.formatearFecha(venta.FechaHora || venta.Fecha)}</td>
                    <td>${VentasAdmin.escapar(venta.Caja || "")}</td>
                    <td>${VentasAdmin.escapar(venta.Usuario || "")}</td>
                    <td>${VentasAdmin.escapar(venta.MedioPago || "")}</td>
                    <td>${badgeEstado}</td>
                    <td class="text-end">${VentasAdmin.formatearMoneda(venta.Total)}</td>
                    <td class="text-end">
                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm"
                            onclick="VentasAdmin.abrirDetalle(${venta.IdVenta})">
                            <i class="bi bi-eye"></i> Ver
                        </button>
                    </td>
                </tr>
            `);
        });
    },

    async abrirDetalle(idVenta) {
        VentasAdmin.ventaSeleccionada = null;

        VentasAdmin.texto(
            "detalleVentaComprobante",
            "Cargando..."
        );

        document.getElementById("tablaDetalleVenta").innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    Cargando detalle...
                </td>
            </tr>
        `;

        VentasAdmin.modal.show();

        try {
            const resultado = await api.obtenerVenta(idVenta);

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje || "No fue posible obtener la venta.",
                    "danger",
                    5000
                );
                return;
            }

            VentasAdmin.ventaSeleccionada = resultado;

            VentasAdmin.mostrarDetalle(
                resultado.venta,
                resultado.detalle || []
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

    mostrarDetalle(venta, detalle) {
        VentasAdmin.texto(
            "detalleVentaComprobante",
            venta.NumeroComprobante || ""
        );

        VentasAdmin.texto("detalleVentaId", venta.IdVenta || "");
        VentasAdmin.texto(
            "detalleVentaFecha",
            VentasAdmin.formatearFecha(venta.FechaHora || venta.Fecha)
        );
        VentasAdmin.texto("detalleVentaCaja", venta.Caja || "");
        VentasAdmin.texto("detalleVentaUsuario", venta.Usuario || "");
        VentasAdmin.texto("detalleVentaMedioPago", venta.MedioPago || "");
        VentasAdmin.texto("detalleVentaEstado", venta.Estado || "COBRADA");
        VentasAdmin.texto(
            "detalleVentaTotal",
            VentasAdmin.formatearMoneda(venta.Total)
        );

        const estado =
            String(venta.Estado || "COBRADA")
                .trim()
                .toUpperCase();

        const btnAnular =
            document.getElementById("btnAnularVenta");

        btnAnular.classList.toggle(
            "d-none",
            estado === "ANULADA" || !SeguridadUI.puede("ventas.anular")
        );

        const bloqueAnulacion =
            document.getElementById("bloqueDatosAnulacion");

        bloqueAnulacion.classList.toggle(
            "d-none",
            estado !== "ANULADA"
        );

        VentasAdmin.texto(
            "detalleVentaMotivoAnulacion",
            estado === "ANULADA"
                ? ` Motivo: ${venta.MotivoAnulacion || "Sin detalle"}`
                : ""
        );

        const tbody =
            document.getElementById("tablaDetalleVenta");

        tbody.innerHTML = "";

        if (!detalle.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        La venta no contiene detalle.
                    </td>
                </tr>
            `;
            return;
        }

        detalle.forEach(item => {
            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>
                        <strong>
                            ${VentasAdmin.escapar(item.Descripcion || "")}
                        </strong>
                    </td>
                    <td>${VentasAdmin.escapar(item.SKU || "")}</td>
                    <td class="text-end">${Number(item.Cantidad || 0)}</td>
                    <td class="text-end">${VentasAdmin.formatearMoneda(item.PrecioUnitario)}</td>
                    <td class="text-end">${VentasAdmin.formatearMoneda(item.Subtotal)}</td>
                </tr>
            `);
        });
    },

    abrirAnulacion() {
        if (!SeguridadUI.puede("ventas.anular")) { mostrarMensaje("No tenés permisos para anular ventas.", "warning"); return; }
        if (!VentasAdmin.ventaSeleccionada) {
            mostrarMensaje(
                "No hay una venta seleccionada.",
                "warning"
            );
            return;
        }

        const venta =
            VentasAdmin.ventaSeleccionada.venta;

        if (
            String(venta.Estado || "")
                .trim()
                .toUpperCase() === "ANULADA"
        ) {
            mostrarMensaje(
                "La venta ya está anulada.",
                "warning"
            );
            return;
        }

        const form =
            document.getElementById("formAnularVenta");

        form.reset();
        form.classList.remove("was-validated");

        VentasAdmin.modalAnulacion.show();

        setTimeout(() => {
            document.getElementById("motivoAnulacion")?.focus();
        }, 250);
    },

    async confirmarAnulacion() {
        const form =
            document.getElementById("formAnularVenta");

        form.classList.add("was-validated");

        if (!form.checkValidity()) {
            return;
        }

        if (!VentasAdmin.ventaSeleccionada) {
            mostrarMensaje(
                "No hay una venta seleccionada.",
                "warning"
            );
            return;
        }

        const venta =
            VentasAdmin.ventaSeleccionada.venta;

        const boton =
            document.getElementById("btnConfirmarAnulacion");

        boton.disabled = true;
        boton.innerHTML =
            `<span class="spinner-border spinner-border-sm"></span> Anulando...`;

        try {
            const resultado = await api.anularVenta(
                venta.IdVenta,
                VentasAdmin.campo("motivoAnulacion"),
                VentasAdmin.configuracion.UsuarioDefault || "ADMIN"
            );

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible anular la venta.",
                    "danger",
                    6000
                );
                return;
            }

            mostrarMensaje(
                `Venta ${resultado.numeroComprobante} anulada. Se reintegraron ${resultado.unidadesReintegradas} unidades.`,
                "success",
                6000
            );

            VentasAdmin.modalAnulacion.hide();
            VentasAdmin.modal.hide();

            await VentasAdmin.buscarVentas();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {
            boton.disabled = false;
            boton.innerHTML =
                `<i class="bi bi-x-octagon"></i> Confirmar anulación`;
        }
    },

    reimprimirVenta() {
        if (!VentasAdmin.ventaSeleccionada) {
            mostrarMensaje(
                "No hay una venta seleccionada.",
                "warning"
            );
            return;
        }

        const venta =
            VentasAdmin.ventaSeleccionada.venta;

        const detalle =
            VentasAdmin.ventaSeleccionada.detalle || [];

        const comprobante = Comprobante.crear({
            numero: venta.NumeroComprobante || venta.IdVenta,
            fechaHora: venta.FechaHora || venta.Fecha || new Date(),
            medioPago: venta.MedioPago || "",
            items: detalle.map(item => ({
                IdProducto: item.IdProducto,
                SKU: item.SKU || "",
                CodigoBarras: item.CodigoBarras || "",
                Descripcion: item.Descripcion || "",
                Color: item.Color || "",
                Talle: item.Talle || "",
                Cantidad: Number(item.Cantidad || 0),
                PrecioVenta: Number(item.PrecioUnitario || 0),
                Subtotal: Number(item.Subtotal || 0)
            })),
            total: Number(venta.Total || 0)
        });

        Impresion.abrirVistaPrevia(
            Comprobante.generarHtml(comprobante)
        );
    },

    actualizarResumen(lista) {
        const anuladas =
            lista.filter(
                venta =>
                    String(venta.Estado || "")
                        .trim()
                        .toUpperCase() === "ANULADA"
            ).length;

        const total =
            lista
                .filter(
                    venta =>
                        String(venta.Estado || "COBRADA")
                            .trim()
                            .toUpperCase() !== "ANULADA"
                )
                .reduce(
                    (acumulado, venta) =>
                        acumulado + Number(venta.Total || 0),
                    0
                );

        VentasAdmin.texto("lblCantidadVentas", lista.length);
        VentasAdmin.texto(
            "lblTotalVentas",
            VentasAdmin.formatearMoneda(total)
        );
        VentasAdmin.texto("lblVentasAnuladas", anuladas);
    },

    limpiarFiltros() {
        VentasAdmin.establecerFechasIniciales();
        VentasAdmin.valor("ventaNumeroComprobante", "");
        VentasAdmin.valor("ventaMedioPago", "");
        VentasAdmin.valor("ventaEstado", "");
        VentasAdmin.buscarVentas();
    },

    formatearMoneda(valor) {
        const simbolo =
            VentasAdmin.configuracion.SimboloMoneda || "$";

        return (
            simbolo +
            " " +
            Number(valor || 0).toLocaleString("es-AR")
        );
    },

    formatearFecha(valor) {
        if (!valor) return "";

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleString("es-AR");
    },

    fechaInput(fecha) {
        const anio = fecha.getFullYear();

        const mes =
            String(fecha.getMonth() + 1)
                .padStart(2, "0");

        const dia =
            String(fecha.getDate())
                .padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    },

    escapar(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    },

    texto(id, valor) {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    },

    valor(id, valor) {
        const elemento = document.getElementById(id);

        if (elemento) {
            elemento.value = valor;
        }
    },

    campo(id) {
        return (
            document.getElementById(id)?.value || ""
        ).trim();
    }
};

const api = new Api();

const AppState = {
    configuracion: {}
};

document.addEventListener(
    "DOMContentLoaded",
    () => VentasAdmin.inicializar()
);


document.addEventListener("pos:sesion-lista",()=>{ const b=document.getElementById("btnAnularVenta"); if(b)b.classList.toggle("d-none",!SeguridadUI.puede("ventas.anular")); });
