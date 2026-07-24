const ReportesInventario = {

    productos: [],
    productosFiltrados: [],
    configuracion: {},

    async inicializar() {
        ReportesInventario.registrarEventos();
        await ReportesInventario.cargarConfiguracion();
        await ReportesInventario.cargarProductos();
    },

    registrarEventos() {
        document
            .getElementById("txtBuscarReporte")
            ?.addEventListener("input", function() {
                ReportesInventario.aplicarFiltros();
            });

        document
            .getElementById("cmbEstadoStock")
            ?.addEventListener("change", function() {
                ReportesInventario.aplicarFiltros();
            });

        document
            .getElementById("btnLimpiarReporte")
            ?.addEventListener("click", function() {
                ReportesInventario.limpiarFiltros();
            });

        document
            .getElementById("btnExportarReporte")
            ?.addEventListener("click", function() {
                ReportesInventario.exportarCsv();
            });
    },

    async cargarConfiguracion() {
        try {
            const resultado = await api.obtenerConfiguracion();

            if (resultado.ok) {
                ReportesInventario.configuracion =
                    resultado.configuracion || {};
            }

        } catch (error) {
            console.error(error);
        }
    },

    async cargarProductos() {
        ReportesInventario.establecerTexto(
            "lblEstadoReporte",
            "Consultando productos..."
        );

        try {
            const resultado = await api.buscar("");

            if (!resultado.ok) {
                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible cargar los productos.",
                    "danger",
                    5000
                );
                return;
            }

            ReportesInventario.productos =
                (resultado.productos || [])
                    .filter(function(producto) {
                        return ReportesInventario.esActivo(producto);
                    })
                    .map(function(producto) {
                        return {
                            ...producto,
                            Stock: Number(producto.Stock || 0),
                            StockMinimo: Number(producto.StockMinimo || 0),
                            PrecioCosto:
                                ReportesInventario.obtenerCosto(producto),
                            PrecioVenta:
                                Number(producto.PrecioVenta || 0)
                        };
                    });

            ReportesInventario.aplicarFiltros();

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {
            ReportesInventario.establecerTexto(
                "lblEstadoReporte",
                "Listo"
            );
        }
    },

    aplicarFiltros() {
        const texto =
            ReportesInventario.normalizar(
                document.getElementById("txtBuscarReporte")?.value || ""
            );

        const estado =
            document.getElementById("cmbEstadoStock")?.value || "";

        ReportesInventario.productosFiltrados =
            ReportesInventario.productos.filter(function(producto) {
                const coincideTexto =
                    texto === "" ||
                    ReportesInventario
                        .textoProducto(producto)
                        .includes(texto);

                const estadoProducto =
                    ReportesInventario.obtenerEstadoStock(producto);

                const coincideEstado =
                    estado === "" ||
                    estadoProducto === estado;

                return coincideTexto && coincideEstado;
            });

        ReportesInventario.mostrarProductos(
            ReportesInventario.productosFiltrados
        );

        ReportesInventario.actualizarResumen(
            ReportesInventario.productosFiltrados
        );
    },

    mostrarProductos(lista) {
        const tbody =
            document.getElementById("tablaReporteInventario");

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

        lista.forEach(function(producto) {
            const valorCosto =
                producto.Stock * producto.PrecioCosto;

            const valorVenta =
                producto.Stock * producto.PrecioVenta;

            const estado =
                ReportesInventario.obtenerEstadoStock(producto);

            tbody.insertAdjacentHTML("beforeend", `
                <tr>
                    <td>${ReportesInventario.escapar(producto.SKU || "")}</td>
                    <td><strong>${ReportesInventario.escapar(producto.Descripcion || "")}</strong></td>
                    <td>${ReportesInventario.escapar(producto.Marca || "")}</td>
                    <td>${ReportesInventario.escapar(producto.Color || "")}</td>
                    <td>${ReportesInventario.escapar(producto.Talle || "")}</td>
                    <td class="text-end">${producto.Stock}</td>
                    <td class="text-end">${producto.StockMinimo}</td>
                    <td class="text-end">${ReportesInventario.formatearMoneda(producto.PrecioCosto)}</td>
                    <td class="text-end">${ReportesInventario.formatearMoneda(producto.PrecioVenta)}</td>
                    <td class="text-end">${ReportesInventario.formatearMoneda(valorCosto)}</td>
                    <td class="text-end">${ReportesInventario.formatearMoneda(valorVenta)}</td>
                    <td>${ReportesInventario.generarBadgeEstado(estado)}</td>
                </tr>
            `);
        });
    },

    actualizarResumen(lista) {
        const unidades =
            lista.reduce(function(total, producto) {
                return total + Number(producto.Stock || 0);
            }, 0);

        const sinStock =
            lista.filter(function(producto) {
                return (
                    ReportesInventario.obtenerEstadoStock(producto) ===
                    "SIN_STOCK"
                );
            }).length;

        const stockBajo =
            lista.filter(function(producto) {
                return (
                    ReportesInventario.obtenerEstadoStock(producto) ===
                    "STOCK_BAJO"
                );
            }).length;

        const valorCosto =
            lista.reduce(function(total, producto) {
                return total + producto.Stock * producto.PrecioCosto;
            }, 0);

        const valorVenta =
            lista.reduce(function(total, producto) {
                return total + producto.Stock * producto.PrecioVenta;
            }, 0);

        ReportesInventario.establecerTexto(
            "lblReporteProductos",
            lista.length
        );

        ReportesInventario.establecerTexto(
            "lblReporteUnidades",
            unidades
        );

        ReportesInventario.establecerTexto(
            "lblReporteSinStock",
            sinStock
        );

        ReportesInventario.establecerTexto(
            "lblReporteStockBajo",
            stockBajo
        );

        ReportesInventario.establecerTexto(
            "lblReporteValorCosto",
            ReportesInventario.formatearMoneda(valorCosto)
        );

        ReportesInventario.establecerTexto(
            "lblReporteValorVenta",
            ReportesInventario.formatearMoneda(valorVenta)
        );
    },

    exportarCsv() {
        if (!ReportesInventario.productosFiltrados.length) {
            mostrarMensaje(
                "No hay productos para exportar.",
                "warning"
            );
            return;
        }

        const filas = [[
            "IdProducto",
            "SKU",
            "CodigoBarras",
            "Descripcion",
            "Marca",
            "Color",
            "Talle",
            "Stock",
            "StockMinimo",
            "PrecioCosto",
            "PrecioVenta",
            "ValorCosto",
            "ValorVenta",
            "EstadoStock"
        ]];

        ReportesInventario.productosFiltrados.forEach(function(producto) {
            filas.push([
                producto.IdProducto,
                producto.SKU || "",
                producto.CodigoBarras || "",
                producto.Descripcion || "",
                producto.Marca || "",
                producto.Color || "",
                producto.Talle || "",
                producto.Stock,
                producto.StockMinimo,
                producto.PrecioCosto,
                producto.PrecioVenta,
                producto.Stock * producto.PrecioCosto,
                producto.Stock * producto.PrecioVenta,
                ReportesInventario.obtenerEstadoStock(producto)
            ]);
        });

        const contenido =
            "\uFEFF" +
            filas
                .map(function(fila) {
                    return fila
                        .map(function(valor) {
                            return (
                                '"' +
                                String(valor ?? "")
                                    .replaceAll('"', '""') +
                                '"'
                            );
                        })
                        .join(";");
                })
                .join("\r\n");

        const blob =
            new Blob(
                [contenido],
                { type: "text/csv;charset=utf-8" }
            );

        const enlace =
            document.createElement("a");

        enlace.href =
            URL.createObjectURL(blob);

        enlace.download =
            "inventario-" +
            ReportesInventario.fechaArchivo() +
            ".csv";

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        URL.revokeObjectURL(enlace.href);

        mostrarMensaje(
            "Reporte exportado correctamente.",
            "success"
        );
    },

    obtenerCosto(producto) {
        const valores = [
            producto.PrecioCosto,
            producto.PrecioCompra,
            producto.Costo
        ];

        for (
            let indice = 0;
            indice < valores.length;
            indice++
        ) {
            const numero = Number(valores[indice]);

            if (
                Number.isFinite(numero) &&
                numero >= 0
            ) {
                return numero;
            }
        }

        return 0;
    },

    obtenerEstadoStock(producto) {
        const stock = Number(producto.Stock || 0);
        const minimo = Number(producto.StockMinimo || 0);

        if (stock <= 0) {
            return "SIN_STOCK";
        }

        if (
            minimo > 0 &&
            stock <= minimo
        ) {
            return "STOCK_BAJO";
        }

        return "STOCK_NORMAL";
    },

    generarBadgeEstado(estado) {
        if (estado === "SIN_STOCK") {
            return `
                <span class="badge bg-danger estado-stock">
                    <i class="bi bi-x-circle"></i>
                    Sin stock
                </span>
            `;
        }

        if (estado === "STOCK_BAJO") {
            return `
                <span class="badge bg-warning text-dark estado-stock">
                    <i class="bi bi-exclamation-triangle"></i>
                    Stock bajo
                </span>
            `;
        }

        return `
            <span class="badge bg-success estado-stock">
                <i class="bi bi-check-circle"></i>
                Normal
            </span>
        `;
    },

    limpiarFiltros() {
        document.getElementById("txtBuscarReporte").value = "";
        document.getElementById("cmbEstadoStock").value = "";
        ReportesInventario.aplicarFiltros();
    },

    esActivo(producto) {
        const valor =
            String(producto.Activo ?? "ACTIVO")
                .trim()
                .toUpperCase();

        return ![
            "NO",
            "FALSE",
            "0",
            "INACTIVO"
        ].includes(valor);
    },

    textoProducto(producto) {
        return ReportesInventario.normalizar([
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

    normalizar(valor) {
        return String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    },

    formatearMoneda(valor) {
        const simbolo =
            ReportesInventario.configuracion.SimboloMoneda ||
            "$";

        return (
            simbolo +
            " " +
            Number(valor || 0)
                .toLocaleString(
                    "es-AR",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                )
        );
    },

    fechaArchivo() {
        const fecha = new Date();

        const anio =
            fecha.getFullYear();

        const mes =
            String(fecha.getMonth() + 1)
                .padStart(2, "0");

        const dia =
            String(fecha.getDate())
                .padStart(2, "0");

        return `${anio}${mes}${dia}`;
    },

    escapar(valor) {
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
    }
};

const api = new Api();

document.addEventListener(
    "DOMContentLoaded",
    function() {
        ReportesInventario.inicializar();
    }
);
