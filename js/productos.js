const Productos = {
    inicializar() {
        document.getElementById("btnBuscar")?.addEventListener("click", () => Productos.buscar());
        document.getElementById("txtBuscar")?.addEventListener("keydown", evento => {
            if (evento.key === "Enter") {
                evento.preventDefault();
                Productos.buscar();
            }
        });
    },

    async buscar() {
        const texto = document.getElementById("txtBuscar")?.value.trim() || "";
        AppState.ultimoTextoBuscado = texto;

        Productos.mostrarEspera(true, "Buscando productos...");
        try {
            const resultado = await api.buscar(texto);
            if (!resultado.ok) {
                mostrarMensaje(resultado.mensaje || "No fue posible buscar productos.", "danger", 5000);
                return;
            }

            AppState.productosEncontrados = resultado.productos || [];
            Productos.mostrar(AppState.productosEncontrados);

            if (AppState.productosEncontrados.length === 1 && texto !== "") {
                Productos.agregar(AppState.productosEncontrados[0].IdProducto);
            }
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible comunicarse con el servidor.", "danger", 5000);
        } finally {
            Productos.mostrarEspera(false);
        }
    },

    mostrarEspera(activo, mensaje = "Procesando...") {
        const panel = document.getElementById("posEstadoProceso");
        const texto = document.getElementById("posEstadoProcesoTexto");
        if (!panel) return;
        if (texto) texto.textContent = mensaje;
        panel.classList.toggle("d-none", !activo);
        panel.setAttribute("aria-hidden", activo ? "false" : "true");
        document.getElementById("btnBuscar")?.toggleAttribute("disabled", activo);
    },

    mostrar(lista) {
        const tbody = document.getElementById("tablaProductos");
        if (!tbody) return;
        tbody.innerHTML = "";

        if (!Array.isArray(lista) || lista.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No se encontraron productos</td></tr>`;
            return;
        }

        lista.forEach(producto => {
            const stock = Number(producto.Stock || 0);
            const stockMinimo = Number(producto.StockMinimo || 0);

            const badgeStock = stock <= 0
                ? `<span class="badge bg-danger">Sin stock</span>`
                : (stockMinimo > 0 && stock <= stockMinimo)
                    ? `<span class="badge bg-warning text-dark">Bajo: ${stock}</span>`
                    : `<span class="badge bg-success">${stock}</span>`;

            const botonAgregar = stock <= 0
                ? `<button type="button" class="btn btn-secondary btn-sm" disabled>Sin stock</button>`
                : `<button type="button" class="btn btn-success btn-sm" onclick="Productos.agregar(${producto.IdProducto})">Agregar</button>`;

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${producto.CodigoBarras || ""}</td>
                    <td>
                        <strong>${producto.Descripcion || ""}</strong><br>
                        <small>${producto.Marca || ""}${producto.Color ? " | " + producto.Color : ""}${producto.Talle ? " | Talle " + producto.Talle : ""}</small>
                    </td>
                    <td>${badgeStock}</td>
                    <td>${formatearMoneda(producto.PrecioVenta)}</td>
                    <td>${botonAgregar}</td>
                </tr>`);
        });
    },

    agregar(idProducto) {
        const producto = AppState.productosEncontrados.find(item => item.IdProducto == idProducto);
        if (!producto) {
            mostrarMensaje("Producto no encontrado.", "danger");
            return;
        }

        const resultado = carrito.agregar(producto);
        if (!resultado.ok) {
            mostrarMensaje(resultado.mensaje, "warning");
            return;
        }

        Ventas.actualizarCarrito();
        Productos.limpiarBusqueda();
    },

    limpiarBusqueda() {
        const campo = document.getElementById("txtBuscar");
        if (campo) campo.value = "";
        Productos.enfocar();
    },

    limpiarResultados() {
        AppState.productosEncontrados = [];
        AppState.ultimoTextoBuscado = "";

        const tabla = document.getElementById("tablaProductos");
        if (tabla) {
            tabla.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Ingrese un código, SKU o descripción</td></tr>`;
        }

        const campo = document.getElementById("txtBuscar");
        if (campo) campo.value = "";
    },

    enfocar() {
        window.setTimeout(() => document.getElementById("txtBuscar")?.focus(), 100);
    },

    actualizarStockEnMemoria(itemsVendidos) {
        itemsVendidos.forEach(itemVendido => {
            const producto = AppState.productosEncontrados.find(item => item.IdProducto == itemVendido.IdProducto);
            if (producto) {
                producto.Stock = Number(producto.Stock || 0) - Number(itemVendido.Cantidad || 0);
            }
        });
    }
};
