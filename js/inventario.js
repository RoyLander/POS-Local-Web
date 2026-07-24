const Inventario = {

    productos: [],
    productosFiltrados: [],
    configuracion: {},
    modal: null,
    modalKardex: null,

    async inicializar() {
        Inventario.modal =
            new bootstrap.Modal(
                document.getElementById(
                    "modalMovimientoInventario"
                )
            );

        Inventario.modalKardex =
            new bootstrap.Modal(
                document.getElementById(
                    "modalKardex"
                )
            );

        Inventario.registrarEventos();
        await Inventario.cargarConfiguracion();
        await Inventario.cargarProductos();
    },

    registrarEventos() {
        document
            .getElementById("txtBuscarInventario")
            ?.addEventListener(
                "input",
                () => Inventario.aplicarFiltros()
            );

        document
            .getElementById("cmbFiltroInventario")
            ?.addEventListener(
                "change",
                () => Inventario.aplicarFiltros()
            );

        document
            .getElementById("btnLimpiarInventario")
            ?.addEventListener(
                "click",
                () => Inventario.limpiarFiltros()
            );

        document
            .getElementById("movimientoTipo")
            ?.addEventListener(
                "change",
                () => Inventario.actualizarAyudaMovimiento()
            );

        document
            .getElementById("btnGuardarMovimiento")
            ?.addEventListener(
                "click",
                () => Inventario.guardarMovimiento()
            );
    },

    async cargarConfiguracion() {
        try {
            const resultado =
                await api.obtenerConfiguracion();

            if (!resultado.ok) return;

            Inventario.configuracion =
                resultado.configuracion || {};

            Inventario.texto(
                "lblNombreSistema",
                Inventario.configuracion.NombreSistema ||
                "POS Local"
            );

            Inventario.texto(
                "lblNombreNegocio",
                Inventario.configuracion.NombreNegocio ||
                ""
            );

            document.title =
                `${Inventario.configuracion.NombreSistema || "POS Local"} - Inventario`;

        } catch (error) {
            console.error(error);
        }
    },

    async cargarProductos() {
        Inventario.texto(
            "lblEstadoInventario",
            "Consultando productos..."
        );

        try {
            const resultado =
                await api.buscar("");

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible cargar el inventario.",
                    "danger",
                    5000
                );
                return;
            }

            Inventario.productos =
                (resultado.productos || [])
                    .filter(producto =>
                        Inventario.obtenerEstado(producto) === "ACTIVO"
                    );

            Inventario.aplicarFiltros();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {
            Inventario.texto(
                "lblEstadoInventario",
                "Listo"
            );
        }
    },

    aplicarFiltros() {
        const texto =
            Inventario.normalizar(
                document
                    .getElementById("txtBuscarInventario")
                    ?.value || ""
            );

        const filtro =
            document
                .getElementById("cmbFiltroInventario")
                ?.value || "";

        Inventario.productosFiltrados =
            Inventario.productos.filter(producto => {

                const coincideTexto =
                    texto === "" ||
                    Inventario.textoProducto(producto)
                        .includes(texto);

                const stock =
                    Number(producto.Stock || 0);

                const minimo =
                    Number(producto.StockMinimo || 0);

                let coincideStock = true;

                if (filtro === "CON_STOCK") {
                    coincideStock = stock > 0;
                }

                if (filtro === "BAJO") {
                    coincideStock =
                        stock > 0 &&
                        minimo > 0 &&
                        stock <= minimo;
                }

                if (filtro === "SIN_STOCK") {
                    coincideStock = stock <= 0;
                }

                return coincideTexto && coincideStock;
            });

        Inventario.mostrarProductos(
            Inventario.productosFiltrados
        );

        Inventario.actualizarResumen(
            Inventario.productosFiltrados
        );
    },

    mostrarProductos(lista) {
        const tbody =
            document.getElementById("tablaInventario");

        if (!tbody) return;

        tbody.innerHTML = "";

        if (!lista.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">
                        No se encontraron productos
                    </td>
                </tr>
            `;
            return;
        }

        lista.forEach(producto => {

            const stock =
                Number(producto.Stock || 0);

            const minimo =
                Number(producto.StockMinimo || 0);

            let badgeStock = "";

            if (stock <= 0) {
                badgeStock =
                    `<span class="badge bg-danger">Sin stock</span>`;
            } else if (
                minimo > 0 &&
                stock <= minimo
            ) {
                badgeStock =
                    `<span class="badge bg-warning text-dark">${stock}</span>`;
            } else {
                badgeStock =
                    `<span class="badge bg-success">${stock}</span>`;
            }

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>
                    <td>${Inventario.escapar(producto.IdProducto || "")}</td>
                    <td>${Inventario.escapar(producto.SKU || "")}</td>
                    <td>
                        <strong>
                            ${Inventario.escapar(producto.Descripcion || "")}
                        </strong>
                    </td>
                    <td>${Inventario.escapar(producto.Marca || "")}</td>
                    <td>${Inventario.escapar(producto.Color || "")}</td>
                    <td>${Inventario.escapar(producto.Talle || "")}</td>
                    <td class="text-center">${minimo}</td>
                    <td class="text-center">${badgeStock}</td>
                    <td class="text-end text-nowrap">
                        <button
                            type="button"
                            class="btn btn-outline-secondary btn-sm"
                            onclick="Inventario.abrirKardex(${producto.IdProducto})">
                            <i class="bi bi-clock-history"></i>
                            Kardex
                        </button>

                        <button
                            type="button"
                            class="btn btn-primary btn-sm"
                            onclick="Inventario.abrirMovimiento(${producto.IdProducto})">
                            <i class="bi bi-arrow-left-right"></i>
                            Movimiento
                        </button>
                    </td>
                </tr>
                `
            );
        });
    },

    async abrirKardex(idProducto) {
        const producto =
            Inventario.productos.find(
                item => item.IdProducto == idProducto
            );

        if (!producto) {
            mostrarMensaje(
                "Producto no encontrado.",
                "danger"
            );
            return;
        }

        Inventario.texto(
            "kardexProductoDescripcion",
            [
                producto.Descripcion || "",
                producto.Color || "",
                producto.Talle
                    ? `Talle ${producto.Talle}`
                    : ""
            ]
                .filter(Boolean)
                .join(" · ")
        );

        const tbody =
            document.getElementById("tablaKardex");

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    Cargando historial...
                </td>
            </tr>
        `;

        Inventario.modalKardex.show();

        try {
            const resultado =
                await api.obtenerKardex(
                    idProducto
                );

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible obtener el historial.",
                    "danger",
                    5000
                );
                return;
            }

            Inventario.mostrarKardex(
                resultado.movimientos || []
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

    mostrarKardex(movimientos) {
        const tbody =
            document.getElementById("tablaKardex");

        tbody.innerHTML = "";

        if (!movimientos.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        El producto todavía no tiene movimientos registrados.
                    </td>
                </tr>
            `;
            return;
        }

        movimientos.forEach(movimiento => {

            const cantidad =
                Number(movimiento.Cantidad || 0);

            const claseCantidad =
                cantidad > 0
                    ? "text-success"
                    : cantidad < 0
                        ? "text-danger"
                        : "text-muted";

            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>
                    <td>${Inventario.formatearFecha(movimiento.FechaHora || movimiento.Fecha)}</td>
                    <td>${Inventario.escapar(movimiento.Tipo || "")}</td>
                    <td class="text-end ${claseCantidad}">
                        ${cantidad > 0 ? "+" : ""}${cantidad}
                    </td>
                    <td class="text-end">${Inventario.escapar(movimiento.StockAnterior ?? "")}</td>
                    <td class="text-end">${Inventario.escapar(movimiento.StockNuevo ?? "")}</td>
                    <td>${Inventario.escapar(movimiento.Observacion || "")}</td>
                    <td>${Inventario.escapar(movimiento.Usuario || "")}</td>
                </tr>
                `
            );
        });
    },

    abrirMovimiento(idProducto) {
        const producto =
            Inventario.productos.find(
                item => item.IdProducto == idProducto
            );

        if (!producto) {
            mostrarMensaje("Producto no encontrado.", "danger");
            return;
        }

        const form =
            document.getElementById("formMovimientoInventario");

        form.reset();
        form.classList.remove("was-validated");

        Inventario.valor("movimientoIdProducto", producto.IdProducto);

        Inventario.texto(
            "movimientoProductoDescripcion",
            [
                producto.Descripcion || "",
                producto.Color || "",
                producto.Talle ? `Talle ${producto.Talle}` : ""
            ]
                .filter(Boolean)
                .join(" · ")
        );

        Inventario.texto(
            "movimientoStockActual",
            Number(producto.Stock || 0)
        );

        Inventario.valor("movimientoTipo", "INGRESO");
        Inventario.valor("movimientoCantidad", "");
        Inventario.valor("movimientoObservacion", "");

        Inventario.actualizarAyudaMovimiento();
        Inventario.modal.show();

        window.setTimeout(() => {
            document
                .getElementById("movimientoCantidad")
                ?.focus();
        }, 250);
    },

    actualizarAyudaMovimiento() {
        const tipo =
            Inventario.campo("movimientoTipo");

        if (tipo === "AJUSTE") {
            Inventario.texto(
                "lblMovimientoCantidad",
                "Stock contado"
            );

            Inventario.texto(
                "ayudaMovimientoCantidad",
                "Ingrese el stock físico contado. El sistema calculará la diferencia."
            );

            return;
        }

        Inventario.texto(
            "lblMovimientoCantidad",
            "Cantidad"
        );

        Inventario.texto(
            "ayudaMovimientoCantidad",
            tipo === "EGRESO"
                ? "La cantidad se descontará del stock actual."
                : "La cantidad se sumará al stock actual."
        );
    },

    async guardarMovimiento() {
        const form =
            document.getElementById("formMovimientoInventario");

        form.classList.add("was-validated");

        if (!form.checkValidity()) return;

        const movimiento = {
            IdProducto:
                Inventario.campo("movimientoIdProducto"),
            Tipo:
                Inventario.campo("movimientoTipo"),
            Cantidad:
                Inventario.numero("movimientoCantidad"),
            Observacion:
                Inventario.campo("movimientoObservacion"),
            Usuario:
                Inventario.configuracion.UsuarioDefault || "ADMIN"
        };

        const boton =
            document.getElementById("btnGuardarMovimiento");

        boton.disabled = true;
        boton.innerHTML =
            `<span class="spinner-border spinner-border-sm"></span> Registrando...`;

        try {
            const resultado =
                await api.registrarMovimientoInventario(movimiento);

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible registrar el movimiento.",
                    "danger",
                    6000
                );
                return;
            }

            mostrarMensaje(
                `Movimiento registrado. Stock anterior: ${resultado.stockAnterior}. Stock actual: ${resultado.stockNuevo}.`,
                "success",
                5000
            );

            Inventario.modal.hide();
            await Inventario.cargarProductos();

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
                `<i class="bi bi-save"></i> Registrar movimiento`;
        }
    },

    actualizarResumen(lista) {
        const unidades =
            lista.reduce(
                (total, producto) =>
                    total + Number(producto.Stock || 0),
                0
            );

        const stockBajo =
            lista.filter(producto => {
                const stock = Number(producto.Stock || 0);
                const minimo = Number(producto.StockMinimo || 0);

                return (
                    stock > 0 &&
                    minimo > 0 &&
                    stock <= minimo
                );
            }).length;

        const sinStock =
            lista.filter(
                producto => Number(producto.Stock || 0) <= 0
            ).length;

        Inventario.texto("lblInventarioProductos", lista.length);
        Inventario.texto("lblInventarioUnidades", unidades);
        Inventario.texto("lblInventarioStockBajo", stockBajo);
        Inventario.texto("lblInventarioSinStock", sinStock);
    },

    limpiarFiltros() {
        Inventario.valor("txtBuscarInventario", "");
        Inventario.valor("cmbFiltroInventario", "");
        Inventario.aplicarFiltros();

        document
            .getElementById("txtBuscarInventario")
            ?.focus();
    },

    obtenerEstado(producto) {
        const valor =
            String(producto.Activo ?? "ACTIVO")
                .trim()
                .toUpperCase();

        return ["NO", "FALSE", "0", "INACTIVO"].includes(valor)
            ? "INACTIVO"
            : "ACTIVO";
    },

    textoProducto(producto) {
        return Inventario.normalizar([
            producto.IdProducto,
            producto.SKU,
            producto.CodigoBarras,
            producto.Descripcion,
            producto.Marca,
            producto.Categoria,
            producto.Color,
            producto.Talle
        ].join(" "));
    },

    formatearFecha(valor) {
        if (!valor) return "";

        const fecha =
            new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return String(valor);
        }

        return fecha.toLocaleString("es-AR");
    },

    normalizar(valor) {
        return String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
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
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    },

    valor(id, valor) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.value = valor;
        }
    },

    campo(id) {
        return (
            document.getElementById(id)?.value || ""
        ).trim();
    },

    numero(id) {
        const valor =
            document.getElementById(id)?.value;

        return valor === "" || valor == null
            ? 0
            : Number(valor);
    }
};

const api = new Api();

document.addEventListener(
    "DOMContentLoaded",
    () => Inventario.inicializar()
);
