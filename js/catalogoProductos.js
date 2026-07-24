const CatalogoProductos = {

    productos: [],
    productosFiltrados: [],
    configuracion: {},
    modal: null,

    async inicializar() {
        this.modal = new bootstrap.Modal(
            document.getElementById("modalProducto")
        );

        this.registrarEventos();
        await MaestrosCombos.cargar();
        ["Marca","Categoria","Color","Talle"].forEach(campo => MaestrosCombos.aplicarSelect(document.getElementById(`producto${campo}`), MaestrosCombos.mapaCampos[campo]));
        await this.cargarConfiguracion();
        await this.cargarProductos();
    },

    registrarEventos() {
        document.getElementById("btnBuscarCatalogo")
            ?.addEventListener("click", () => this.aplicarFiltros());

        document.getElementById("txtBuscarCatalogo")
            ?.addEventListener("keydown", evento => {
                if (evento.key === "Enter") {
                    evento.preventDefault();
                    this.aplicarFiltros();
                }
            });

        document.getElementById("txtBuscarCatalogo")
            ?.addEventListener("input", () => this.aplicarFiltros());

        document.getElementById("cmbEstadoCatalogo")
            ?.addEventListener("change", () => this.aplicarFiltros());

        document.getElementById("cmbStockCatalogo")
            ?.addEventListener("change", () => this.aplicarFiltros());

        document.getElementById("btnLimpiarFiltros")
            ?.addEventListener("click", () => this.limpiarFiltros());

        document.getElementById("btnNuevoProducto")
            ?.addEventListener("click", () => this.nuevoProducto());

        document.getElementById("btnGuardarProducto")
            ?.addEventListener("click", () => this.guardarProducto());
    },

    async cargarConfiguracion() {
        try {
            const resultado = await api.obtenerConfiguracion();

            if (!resultado.ok) return;

            this.configuracion = resultado.configuracion || {};

            this.texto(
                "lblNombreSistema",
                this.configuracion.NombreSistema || "POS Local"
            );

            this.texto(
                "lblNombreNegocio",
                this.configuracion.NombreNegocio || ""
            );

            document.title =
                `${this.configuracion.NombreSistema || "POS Local"} - Productos`;

        } catch (error) {
            console.error(error);
        }
    },

    async cargarProductos() {
        this.texto("lblEstadoCarga", "Consultando productos...");

        try {
            const resultado = await api.buscar("");

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje || "No fue posible cargar los productos.",
                    "danger",
                    5000
                );
                return;
            }

            this.productos =
                Array.isArray(resultado.productos)
                    ? resultado.productos
                    : [];

            this.aplicarFiltros();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {
            this.texto("lblEstadoCarga", "Listo");
        }
    },

    aplicarFiltros() {
        const texto = this.normalizar(
            document.getElementById("txtBuscarCatalogo")?.value || ""
        );

        const estado =
            document.getElementById("cmbEstadoCatalogo")?.value || "";

        const filtroStock =
            document.getElementById("cmbStockCatalogo")?.value || "";

        this.productosFiltrados = this.productos.filter(producto => {
            const coincideTexto =
                texto === "" ||
                this.textoProducto(producto).includes(texto);

            const coincideEstado =
                estado === "" ||
                this.obtenerEstado(producto) === estado;

            const stock = Number(producto.Stock || 0);
            const minimo = Number(producto.StockMinimo || 0);

            let coincideStock = true;

            if (filtroStock === "CON_STOCK") {
                coincideStock = stock > 0;
            }

            if (filtroStock === "BAJO") {
                coincideStock =
                    stock > 0 &&
                    minimo > 0 &&
                    stock <= minimo;
            }

            if (filtroStock === "SIN_STOCK") {
                coincideStock = stock <= 0;
            }

            return coincideTexto && coincideEstado && coincideStock;
        });

        this.mostrarProductos(this.productosFiltrados);
        this.actualizarResumen(this.productosFiltrados);
    },

    mostrarProductos(lista) {
        const tbody =
            document.getElementById("tablaCatalogoProductos");

        if (!tbody) return;

        tbody.innerHTML = "";

        if (!lista.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" class="text-center text-muted">
                        No se encontraron productos
                    </td>
                </tr>
            `;
            return;
        }

        const simbolo =
            this.configuracion.SimboloMoneda || "$";

        lista.forEach(producto => {
            const stock = Number(producto.Stock || 0);
            const minimo = Number(producto.StockMinimo || 0);
            const estado = this.obtenerEstado(producto);

            const badgeStock = stock <= 0
                ? `<span class="badge bg-danger">Sin stock</span>`
                : (minimo > 0 && stock <= minimo)
                    ? `<span class="badge bg-warning text-dark">${stock}</span>`
                    : `<span class="badge bg-success">${stock}</span>`;

            const badgeEstado = estado === "ACTIVO"
                ? `<span class="badge bg-primary">Activo</span>`
                : `<span class="badge bg-secondary">Inactivo</span>`;

            const botonEstado = estado === "ACTIVO"
                ? `
                    <button
                        type="button"
                        class="btn btn-outline-danger btn-sm"
                        onclick="CatalogoProductos.cambiarEstado(${producto.IdProducto}, 'INACTIVO')"
                        title="Inactivar producto">
                        <i class="bi bi-eye-slash"></i>
                    </button>
                `
                : `
                    <button
                        type="button"
                        class="btn btn-outline-success btn-sm"
                        onclick="CatalogoProductos.cambiarEstado(${producto.IdProducto}, 'ACTIVO')"
                        title="Reactivar producto">
                        <i class="bi bi-eye"></i>
                    </button>
                `;

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${this.escapar(producto.IdProducto || "")}</td>
                    <td>${this.escapar(producto.SKU || "")}</td>
                    <td>${this.escapar(producto.CodigoBarras || "")}</td>
                    <td><strong>${this.escapar(producto.Descripcion || "")}</strong></td>
                    <td>${this.escapar(producto.Marca || "")}</td>
                    <td>${this.escapar(producto.Categoria || "")}</td>
                    <td>${this.escapar(producto.Color || "")}</td>
                    <td>${this.escapar(producto.Talle || "")}</td>
                    <td class="text-end">
                        ${simbolo}
                        ${Number(producto.PrecioVenta || 0).toLocaleString("es-AR")}
                    </td>
                    <td class="text-center">${badgeStock}</td>
                    <td>${badgeEstado}</td>
                    <td class="text-end text-nowrap">
                        <button
                            type="button"
                            class="btn btn-outline-primary btn-sm"
                            onclick="CatalogoProductos.editarProducto(${producto.IdProducto})"
                            title="Editar producto">
                            <i class="bi bi-pencil"></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-outline-secondary btn-sm"
                            onclick="CatalogoProductos.duplicarProducto(${producto.IdProducto})"
                            title="Duplicar producto">
                            <i class="bi bi-copy"></i>
                        </button>

                        ${botonEstado}
                    </td>
                </tr>
            `);
        });
    },

    nuevoProducto() {
        this.limpiarFormulario();

        this.texto("tituloModalProducto", "Nuevo producto");

        document.getElementById("productoStockInicial").disabled = false;
        document.getElementById("ayudaStockInicial").textContent =
            "Se utilizará como stock inicial del producto.";

        this.modal.show();

        setTimeout(() => {
            document.getElementById("productoDescripcion")?.focus();
        }, 250);
    },

    editarProducto(idProducto) {
        const producto = this.buscarProductoPorId(idProducto);

        if (!producto) {
            mostrarMensaje("Producto no encontrado.", "danger");
            return;
        }

        this.cargarFormulario(producto, false);

        this.texto(
            "tituloModalProducto",
            `Editar producto #${producto.IdProducto}`
        );

        document.getElementById("productoStockInicial").disabled = true;
        document.getElementById("ayudaStockInicial").textContent =
            "El stock se modificará desde el módulo Inventario.";

        this.modal.show();
    },

    duplicarProducto(idProducto) {
        const producto = this.buscarProductoPorId(idProducto);

        if (!producto) {
            mostrarMensaje("Producto no encontrado.", "danger");
            return;
        }

        this.cargarFormulario(producto, true);

        this.texto(
            "tituloModalProducto",
            `Duplicar producto #${producto.IdProducto}`
        );

        document.getElementById("productoStockInicial").disabled = false;
        document.getElementById("ayudaStockInicial").textContent =
            "Indique el stock inicial de la nueva variante.";

        this.modal.show();

        setTimeout(() => {
            const campo =
                document.getElementById("productoTalle");

            if (campo) {
                campo.focus();
                campo.select();
            }
        }, 250);
    },

    cargarFormulario(producto, duplicar) {
        this.limpiarFormulario();

        this.valor(
            "productoId",
            duplicar ? "" : (producto.IdProducto || "")
        );

        this.valor(
            "productoSKU",
            duplicar ? "" : (producto.SKU || "")
        );

        this.valor(
            "productoCodigoBarras",
            duplicar ? "" : (producto.CodigoBarras || "")
        );

        this.valor("productoDescripcion", producto.Descripcion || "");
        MaestrosCombos.aplicarSelect(document.getElementById("productoMarca"), "MARCA", producto.Marca || "");
        MaestrosCombos.aplicarSelect(document.getElementById("productoCategoria"), "CATEGORIA", producto.Categoria || "");
        this.valor("productoTemporada", producto.Temporada || "");
        MaestrosCombos.aplicarSelect(document.getElementById("productoColor"), "COLOR", producto.Color || "");
        MaestrosCombos.aplicarSelect(document.getElementById("productoTalle"), "TALLE", producto.Talle || "");
        this.valor(
            "productoPrecioCompra",
            producto.PrecioCompra ??
            producto.PrecioCosto ??
            ""
        );
        this.valor("productoPrecioVenta", producto.PrecioVenta || 0);
        this.valor("productoStockMinimo", producto.StockMinimo || 0);
        this.valor(
            "productoStockInicial",
            duplicar ? 0 : (producto.Stock || 0)
        );
        this.valor("productoActivo", "ACTIVO");
    },

    async guardarProducto() {
        const form =
            document.getElementById("formProducto");

        form.classList.add("was-validated");

        if (!form.checkValidity()) {
            return;
        }

        const producto = {
            IdProducto: this.numeroOTexto("productoId"),
            SKU: this.campo("productoSKU"),
            CodigoBarras: this.campo("productoCodigoBarras"),
            Descripcion: this.campo("productoDescripcion"),
            Marca: this.campo("productoMarca"),
            Categoria: this.campo("productoCategoria"),
            Temporada: this.campo("productoTemporada"),
            Color: this.campo("productoColor"),
            Talle: this.campo("productoTalle"),
            PrecioCompra: this.numero("productoPrecioCompra"),
            PrecioVenta: this.numero("productoPrecioVenta"),
            StockMinimo: this.numero("productoStockMinimo"),
            StockInicial: this.numero("productoStockInicial"),
            Activo: this.campo("productoActivo")
        };

        const boton =
            document.getElementById("btnGuardarProducto");

        boton.disabled = true;
        boton.innerHTML =
            `<span class="spinner-border spinner-border-sm"></span> Guardando...`;

        try {
            const resultado =
                await api.guardarProducto(producto);

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible guardar el producto.",
                    "danger",
                    6000
                );
                return;
            }

            mostrarMensaje(
                `${resultado.mensaje} SKU: ${resultado.sku || producto.SKU || "-"}`,
                "success"
            );

            this.modal.hide();
            await this.cargarProductos();

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
                `<i class="bi bi-save"></i> Guardar producto`;
        }
    },

    async cambiarEstado(idProducto, nuevoEstado) {
        const accion =
            nuevoEstado === "ACTIVO"
                ? "reactivar"
                : "inactivar";

        if (!confirm(
            `¿Desea ${accion} el producto ${idProducto}?`
        )) {
            return;
        }

        try {
            const resultado =
                await api.cambiarEstadoProducto(
                    idProducto,
                    nuevoEstado
                );

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible cambiar el estado.",
                    "danger",
                    5000
                );
                return;
            }

            mostrarMensaje(
                resultado.mensaje,
                "success"
            );

            await this.cargarProductos();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );
        }
    },

    buscarProductoPorId(idProducto) {
        return this.productos.find(
            item => item.IdProducto == idProducto
        );
    },

    limpiarFormulario() {
        const form =
            document.getElementById("formProducto");

        form.reset();
        form.classList.remove("was-validated");

        this.valor("productoId", "");
        this.valor("productoActivo", "ACTIVO");
        this.valor("productoStockMinimo", 0);
        this.valor("productoStockInicial", 0);
    },

    actualizarResumen(lista) {
        const conStock =
            lista.filter(
                producto => Number(producto.Stock || 0) > 0
            ).length;

        const stockBajo =
            lista.filter(producto => {
                const stock =
                    Number(producto.Stock || 0);

                const minimo =
                    Number(producto.StockMinimo || 0);

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

        this.texto("lblCantidadProductos", lista.length);
        this.texto("lblProductosConStock", conStock);
        this.texto("lblProductosStockBajo", stockBajo);
        this.texto("lblProductosSinStock", sinStock);
    },

    limpiarFiltros() {
        this.valor("txtBuscarCatalogo", "");
        this.valor("cmbEstadoCatalogo", "");
        this.valor("cmbStockCatalogo", "");

        this.aplicarFiltros();
        document.getElementById("txtBuscarCatalogo")?.focus();
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
        return this.normalizar([
            producto.IdProducto,
            producto.SKU,
            producto.CodigoBarras,
            producto.Descripcion,
            producto.Marca,
            producto.Categoria,
            producto.Color,
            producto.Talle,
            producto.Temporada
        ].join(" "));
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
    },

    numeroOTexto(id) {
        const valor = this.campo(id);

        return valor === ""
            ? ""
            : valor;
    }
};

const api = new Api();

document.addEventListener(
    "DOMContentLoaded",
    () => CatalogoProductos.inicializar()
);
