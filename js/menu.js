const MenuPrincipal = {

    configuracion: {},


    async inicializar() {

        await MenuPrincipal.cargarConfiguracion();

        await Promise.all([
            MenuPrincipal.cargarCaja(),
            MenuPrincipal.cargarVentasHoy(),
            MenuPrincipal.cargarProductos()
        ]);

        MenuPrincipal.establecerTexto(
            "lblUltimaActualizacion",
            new Date().toLocaleString("es-AR")
        );
    },


    async cargarConfiguracion() {

        try {

            const resultado =
                await api.obtenerConfiguracion();

            if (!resultado.ok) {

                mostrarMensaje(
                    resultado.mensaje ||
                    "No fue posible cargar la configuración.",
                    "warning",
                    5000
                );

                return;
            }

            MenuPrincipal.configuracion =
                resultado.configuracion || {};

            MenuPrincipal.aplicarConfiguracion();

        } catch (error) {

            console.error(error);

            mostrarMensaje(
                "No fue posible cargar la configuración.",
                "warning",
                5000
            );
        }
    },


    async cargarCaja() {

        try {

            const resultado =
                await api.obtenerCajaAbierta(
                    MenuPrincipal.configuracion.NumeroCaja ||
                    "1"
                );

            const abierta =
                Boolean(
                    resultado.ok &&
                    resultado.caja
                );

            const elemento =
                document.getElementById(
                    "lblDashboardCaja"
                );

            elemento.textContent =
                abierta
                    ? "ABIERTA"
                    : "CERRADA";

            elemento.className =
                abierta
                    ? "text-success"
                    : "text-danger";

        } catch (error) {

            console.error(error);

            MenuPrincipal.establecerTexto(
                "lblDashboardCaja",
                "Sin datos"
            );
        }
    },


    async cargarVentasHoy() {

        try {

            const hoy =
                MenuPrincipal.formatearFechaInput(
                    new Date()
                );

            const resultado =
                await api.buscarVentas({
                    fechaDesde: hoy,
                    fechaHasta: hoy,
                    estado: ""
                });

            if (!resultado.ok) {
                return;
            }

            const ventas =
                (resultado.ventas || [])
                    .filter(
                        function(venta) {

                            return (
                                String(
                                    venta.Estado ||
                                    "COBRADA"
                                )
                                    .trim()
                                    .toUpperCase() !==
                                "ANULADA"
                            );
                        }
                    );

            const total =
                ventas.reduce(
                    function(acumulado, venta) {

                        return (
                            acumulado +
                            Number(
                                venta.Total || 0
                            )
                        );
                    },
                    0
                );

            MenuPrincipal.establecerTexto(
                "lblVentasHoy",
                MenuPrincipal.formatearMoneda(
                    total
                )
            );

            MenuPrincipal.establecerTexto(
                "lblTicketsHoy",
                ventas.length +
                (
                    ventas.length === 1
                        ? " ticket"
                        : " tickets"
                )
            );

        } catch (error) {

            console.error(error);
        }
    },


    async cargarProductos() {

        try {

            const resultado =
                await api.buscar("");

            if (!resultado.ok) {
                return;
            }

            const productos =
                (resultado.productos || [])
                    .filter(
                        function(producto) {

                            return (
                                MenuPrincipal.esActivo(
                                    producto
                                )
                            );
                        }
                    );

            const stockBajo =
                productos.filter(
                    function(producto) {

                        const stock =
                            Number(
                                producto.Stock || 0
                            );

                        const minimo =
                            Number(
                                producto.StockMinimo || 0
                            );

                        return (
                            stock > 0 &&
                            minimo > 0 &&
                            stock <= minimo
                        );
                    }
                ).length;

            const sinStock =
                productos.filter(
                    function(producto) {

                        return (
                            Number(
                                producto.Stock || 0
                            ) <= 0
                        );
                    }
                ).length;

            MenuPrincipal.establecerTexto(
                "lblProductosActivos",
                productos.length
            );

            MenuPrincipal.establecerTexto(
                "lblStockBajo",
                stockBajo
            );

            MenuPrincipal.establecerTexto(
                "lblSinStock",
                sinStock
            );

        } catch (error) {

            console.error(error);
        }
    },


    esActivo(producto) {

        const valor =
            String(
                producto.Activo ??
                "ACTIVO"
            )
                .trim()
                .toUpperCase();

        return ![
            "NO",
            "FALSE",
            "0",
            "INACTIVO"
        ].includes(valor);
    },


    aplicarConfiguracion() {

        const configuracion =
            MenuPrincipal.configuracion;

        MenuPrincipal.establecerTexto(
            "lblNombreSistema",
            configuracion.NombreSistema ||
            "POS Local"
        );

        MenuPrincipal.establecerTexto(
            "lblNombreNegocio",
            configuracion.NombreNegocio ||
            ""
        );

        MenuPrincipal.establecerTexto(
            "lblNumeroCaja",
            configuracion.NumeroCaja ||
            "1"
        );

        MenuPrincipal.establecerTexto(
            "lblUsuario",
            configuracion.UsuarioDefault ||
            "ADMIN"
        );

        MenuPrincipal.establecerTexto(
            "lblVersion",
            configuracion.Version ||
            "-"
        );

        document.title =
            (
                configuracion.NombreSistema ||
                "POS Local"
            ) +
            " - Inicio";
    },


    formatearMoneda(valor) {

        const simbolo =
            MenuPrincipal.configuracion.SimboloMoneda ||
            "$";

        return (
            simbolo +
            " " +
            Number(valor || 0)
                .toLocaleString("es-AR")
        );
    },


    formatearFechaInput(fecha) {

        const anio =
            fecha.getFullYear();

        const mes =
            String(
                fecha.getMonth() + 1
            ).padStart(2, "0");

        const dia =
            String(
                fecha.getDate()
            ).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
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

        MenuPrincipal.inicializar();
    }
);
