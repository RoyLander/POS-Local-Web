const ConteoInventario = {

    productos: [],
    productosFiltrados: [],
    configuracion: {},
    modalConfirmacion: null,


    async inicializar() {

        ConteoInventario.modalConfirmacion =
            new bootstrap.Modal(
                document.getElementById(
                    "modalConfirmarConteo"
                )
            );

        ConteoInventario.registrarEventos();

        await ConteoInventario.cargarConfiguracion();
        await ConteoInventario.cargarProductos();
    },


    registrarEventos() {

        document
            .getElementById("txtBuscarConteo")
            ?.addEventListener(
                "input",
                function() {
                    ConteoInventario.aplicarFiltros();
                }
            );

        document
            .getElementById("cmbFiltroConteo")
            ?.addEventListener(
                "change",
                function() {
                    ConteoInventario.aplicarFiltros();
                }
            );

        document
            .getElementById("btnLimpiarConteo")
            ?.addEventListener(
                "click",
                function() {
                    ConteoInventario.limpiarFiltros();
                }
            );

        document
            .getElementById("btnAplicarConteo")
            ?.addEventListener(
                "click",
                function() {
                    ConteoInventario.abrirConfirmacion();
                }
            );

        document
            .getElementById("btnConfirmarConteo")
            ?.addEventListener(
                "click",
                function() {
                    ConteoInventario.aplicarConteo();
                }
            );
    },


    async cargarConfiguracion() {

        try {

            const resultado =
                await api.obtenerConfiguracion();

            if (resultado.ok) {

                ConteoInventario.configuracion =
                    resultado.configuracion || {};
            }

        } catch (error) {

            console.error(error);
        }
    },


    async cargarProductos() {

        ConteoInventario.establecerTexto(
            "lblEstadoConteo",
            "Consultando productos..."
        );

        try {

            const resultado =
                await api.obtenerProductosConteo();

            if (!resultado.ok) {

                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible cargar los productos.",
                    "danger",
                    5000
                );

                return;
            }

            ConteoInventario.productos =
                (resultado.productos || [])
                    .map(
                        function(producto) {

                            return {
                                ...producto,
                                StockContado: null
                            };
                        }
                    );

            ConteoInventario.aplicarFiltros();

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {

            ConteoInventario.establecerTexto(
                "lblEstadoConteo",
                "Listo"
            );
        }
    },


    aplicarFiltros() {

        const texto =
            ConteoInventario.normalizar(
                document
                    .getElementById(
                        "txtBuscarConteo"
                    )
                    ?.value ||
                ""
            );

        const filtro =
            document
                .getElementById(
                    "cmbFiltroConteo"
                )
                ?.value ||
            "";

        ConteoInventario.productosFiltrados =
            ConteoInventario.productos
                .filter(
                    function(producto) {

                        const coincideTexto =
                            texto === "" ||
                            ConteoInventario
                                .textoProducto(producto)
                                .includes(texto);

                        const contado =
                            producto.StockContado;

                        const diferencia =
                            contado === null
                                ? null
                                : Number(contado) -
                                  Number(
                                      producto.Stock || 0
                                  );

                        let coincideFiltro = true;

                        if (
                            filtro ===
                            "CON_DIFERENCIA"
                        ) {

                            coincideFiltro =
                                diferencia !== null &&
                                diferencia !== 0;
                        }

                        if (
                            filtro ===
                            "SIN_CONTAR"
                        ) {

                            coincideFiltro =
                                contado === null;
                        }

                        return (
                            coincideTexto &&
                            coincideFiltro
                        );
                    }
                );

        ConteoInventario.mostrarProductos(
            ConteoInventario.productosFiltrados
        );

        ConteoInventario.actualizarResumen();
    },


    mostrarProductos(lista) {

        const tbody =
            document.getElementById(
                "tablaConteo"
            );

        tbody.innerHTML = "";

        if (!lista.length) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="text-center text-muted">

                        No se encontraron productos
                    </td>
                </tr>
            `;

            return;
        }

        lista.forEach(
            function(producto) {

                const contado =
                    producto.StockContado;

                const diferencia =
                    contado === null
                        ? null
                        : Number(contado) -
                          Number(producto.Stock || 0);

                const claseDiferencia =
                    diferencia === null ||
                    diferencia === 0
                        ? "conteo-diferencia-cero"
                        : diferencia > 0
                            ? "conteo-diferencia-positiva"
                            : "conteo-diferencia-negativa";

                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>
                        <td>
                            ${ConteoInventario.escapar(
                                producto.SKU || ""
                            )}
                        </td>

                        <td>
                            <strong>
                                ${ConteoInventario.escapar(
                                    producto.Descripcion || ""
                                )}
                            </strong>
                        </td>

                        <td>
                            ${ConteoInventario.escapar(
                                producto.Color || ""
                            )}
                        </td>

                        <td>
                            ${ConteoInventario.escapar(
                                producto.Talle || ""
                            )}
                        </td>

                        <td class="text-end">
                            ${Number(
                                producto.Stock || 0
                            )}
                        </td>

                        <td class="text-end">

                            <input
                                type="number"
                                min="0"
                                step="1"
                                class="form-control form-control-sm conteo-input"
                                value="${contado === null ? "" : contado}"
                                data-id-producto="${producto.IdProducto}"
                                oninput="ConteoInventario.actualizarContado(
                                    '${producto.IdProducto}',
                                    this.value
                                )">

                        </td>

                        <td class="text-end ${claseDiferencia}">
                            ${diferencia === null ? "—" : diferencia}
                        </td>
                    </tr>
                    `
                );
            }
        );
    },


    actualizarContado(
        idProducto,
        valor
    ) {

        const producto =
            ConteoInventario.productos
                .find(
                    function(item) {

                        return (
                            String(item.IdProducto) ===
                            String(idProducto)
                        );
                    }
                );

        if (!producto) {
            return;
        }

        producto.StockContado =
            valor === ""
                ? null
                : Number(valor);

        ConteoInventario.aplicarFiltros();
    },


    actualizarResumen() {

        const contados =
            ConteoInventario.productos
                .filter(
                    function(producto) {

                        return (
                            producto.StockContado !== null
                        );
                    }
                );

        const conDiferencia =
            contados.filter(
                function(producto) {

                    return (
                        Number(
                            producto.StockContado
                        ) !==
                        Number(
                            producto.Stock || 0
                        )
                    );
                }
            );

        const diferenciaNeta =
            conDiferencia.reduce(
                function(total, producto) {

                    return (
                        total +
                        Number(
                            producto.StockContado
                        ) -
                        Number(
                            producto.Stock || 0
                        )
                    );
                },
                0
            );

        ConteoInventario.establecerTexto(
            "lblConteoProductos",
            ConteoInventario.productos.length
        );

        ConteoInventario.establecerTexto(
            "lblConteoContados",
            contados.length
        );

        ConteoInventario.establecerTexto(
            "lblConteoDiferencias",
            conDiferencia.length
        );

        ConteoInventario.establecerTexto(
            "lblConteoNeto",
            diferenciaNeta > 0
                ? "+" + diferenciaNeta
                : diferenciaNeta
        );
    },


    abrirConfirmacion() {

        const diferencias =
            ConteoInventario.obtenerDiferencias();

        if (!diferencias.length) {

            mostrarMensaje(
                "No hay diferencias para aplicar.",
                "warning"
            );

            return;
        }

        document
            .getElementById(
                "txtObservacionConteo"
            )
            .value = "";

        ConteoInventario
            .modalConfirmacion
            .show();
    },


    obtenerDiferencias() {

        return ConteoInventario.productos
            .filter(
                function(producto) {

                    return (
                        producto.StockContado !== null &&
                        Number(
                            producto.StockContado
                        ) !==
                        Number(
                            producto.Stock || 0
                        )
                    );
                }
            )
            .map(
                function(producto) {

                    return {
                        IdProducto:
                            producto.IdProducto,
                        StockContado:
                            Number(
                                producto.StockContado
                            )
                    };
                }
            );
    },


    async aplicarConteo() {

        const observacion =
            document
                .getElementById(
                    "txtObservacionConteo"
                )
                .value
                .trim();

        if (observacion === "") {

            mostrarMensaje(
                "La observación es obligatoria.",
                "warning"
            );

            return;
        }

        const conteo =
            ConteoInventario.obtenerDiferencias();

        const boton =
            document.getElementById(
                "btnConfirmarConteo"
            );

        boton.disabled = true;

        try {

            const resultado =
                await api.aplicarConteoInventario({
                    conteo: conteo,
                    observacion: observacion,
                    usuario:
                        ConteoInventario
                            .configuracion
                            .UsuarioDefault ||
                        "ADMIN"
                });

            if (!resultado.ok) {

                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible aplicar el conteo.",
                    "danger",
                    6000
                );

                return;
            }

            ConteoInventario
                .modalConfirmacion
                .hide();

            mostrarMensaje(
                "Conteo aplicado. " +
                resultado.productosAjustados +
                " productos actualizados.",
                "success",
                6000
            );

            await ConteoInventario.cargarProductos();

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible comunicarse con el servidor.",
                "danger",
                5000
            );

        } finally {

            boton.disabled = false;
        }
    },


    limpiarFiltros() {

        document
            .getElementById(
                "txtBuscarConteo"
            )
            .value = "";

        document
            .getElementById(
                "cmbFiltroConteo"
            )
            .value = "";

        ConteoInventario.aplicarFiltros();
    },


    textoProducto(producto) {

        return ConteoInventario.normalizar([
            producto.IdProducto,
            producto.SKU,
            producto.CodigoBarras,
            producto.Descripcion,
            producto.Marca,
            producto.Color,
            producto.Talle
        ].join(" "));
    },


    normalizar(valor) {

        return String(valor || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
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


    establecerTexto(
        id,
        valor
    ) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    }
};


const api =
    new Api();


document.addEventListener(
    "DOMContentLoaded",
    function() {

        ConteoInventario.inicializar();
    }
);
