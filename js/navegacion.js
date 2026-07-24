const Navegacion = {

    modulos: [
        {
            id: "menu",
            permiso: "pagina.menu",
            texto: "Inicio",
            icono: "bi-house",
            archivo: "menu.html"
        },
        {
            id: "pos",
            permiso: "pagina.pos",
            texto: "Punto de venta",
            icono: "bi-cart4",
            archivo: "pos.html"
        },
        {
            id: "ventas",
            permiso: "pagina.ventas",
            texto: "Ventas",
            icono: "bi-receipt",
            archivo: "ventas.html"
        },
        { id: "cambios", permiso: "pagina.cambios", texto: "Cambios", icono: "bi-arrow-left-right", archivo: "cambios.html" },
        { id: "devoluciones", permiso: "pagina.devoluciones", texto: "Devoluciones", icono: "bi-arrow-counterclockwise", archivo: "devoluciones.html" },
        { id: "devolucionesConsulta", permiso: "pagina.devolucionesConsulta", texto: "Consultar devoluciones", icono: "bi-search", archivo: "devoluciones-consulta.html" },
        {
            id: "productos",
            permiso: "pagina.productos",
            texto: "Productos",
            icono: "bi-box-seam",
            archivo: "productos.html"
        },
        {
            id: "cargaMasivaProductos",
            permiso: "pagina.cargaMasivaProductos",
            texto: "Carga masiva",
            icono: "bi-table",
            archivo: "carga-masiva-productos.html"
        },
        {
            id: "maestros",
            permiso: "pagina.maestros",
            texto: "Maestros de productos",
            icono: "bi-card-list",
            archivo: "maestros-productos.html"
        },
        {
            id: "mediosPago",
            permiso: "pagina.mediosPago",
            texto: "Medios de pago",
            icono: "bi-credit-card",
            archivo: "medios-pago.html"
        },
        {
            id: "inventario",
            permiso: "pagina.inventario",
            texto: "Inventario",
            icono: "bi-boxes",
            archivo: "inventario.html"
        },
        {
            id: "conteo",
            permiso: "pagina.conteo",
            texto: "Conteo físico",
            icono: "bi-clipboard-check",
            archivo: "conteo-inventario.html"
        },
        {
            id: "reportesInventario",
            permiso: "pagina.reportesInventario",
            texto: "Reportes de inventario",
            icono: "bi-bar-chart-line",
            archivo: "reportes-inventario.html"
        },
        {
            id: "caja",
            permiso: "pagina.caja",
            texto: "Caja",
            icono: "bi-cash-register",
            archivo: "caja.html"
        },
        { id: "usuarios", permiso: "pagina.usuarios", texto: "Usuarios", icono: "bi-people", archivo: "usuarios.html" },
        { id: "auditoria", permiso: "pagina.auditoria", texto: "Auditoría", icono: "bi-journal-check", archivo: "auditoria.html" },
        {
            id: "herramientas",
            permiso: "pagina.herramientas",
            texto: "Herramientas",
            icono: "bi-tools",
            archivo: "herramientas.html"
        }
    ],


    configuracion: {},


    async inicializar() {

        const contenedor =
            document.getElementById(
                "navegacionPrincipal"
            );

        if (!contenedor) {
            return;
        }

        if (!window.SeguridadUI || !SeguridadUI.usuario) return;

        contenedor.innerHTML =
            Navegacion.generarHtml();

        Navegacion.marcarModuloActual();
        Navegacion.registrarAtajosGlobales();

        await Navegacion.cargarConfiguracion();
        await Navegacion.actualizarEstadoCaja();
    },


    generarHtml() {

        return `
            <nav
                class="navbar navbar-expand-lg navbar-dark bg-dark pos-global-nav">

                <div class="container-fluid">

                    <a
                        class="navbar-brand"
                        href="menu.html">

                        <i class="bi bi-shop"></i>

                        <span class="pos-brand-text">

                            <span id="navNombreSistema">
                                POS Local
                            </span>

                            <small id="navNombreNegocio"></small>

                        </span>
                    </a>

                    <button
                        class="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navPrincipalContenido"
                        aria-controls="navPrincipalContenido"
                        aria-expanded="false"
                        aria-label="Mostrar navegación">

                        <span class="navbar-toggler-icon"></span>
                    </button>

                    <div
                        id="navPrincipalContenido"
                        class="collapse navbar-collapse">

                        <ul class="navbar-nav me-auto mb-2 mb-lg-0">

                            ${Navegacion.generarEnlacePrincipal("menu", "Inicio", "bi-house", "menu.html", "pagina.menu")}

                            ${Navegacion.generarEnlacePrincipal("pos", "POS", "bi-cart4", "pos.html", "pagina.pos")}

                            ${Navegacion.generarDesplegable(
                                "Comercial",
                                "bi-bag",
                                ["ventas", "cambios", "devoluciones", "devolucionesConsulta"]
                            )}

                            ${Navegacion.generarDesplegable(
                                "Inventario",
                                "bi-boxes",
                                [
                                    "productos",
                                    "maestros",
                                    "inventario",
                                    "cargaMasivaProductos",
                                    "conteo",
                                    "reportesInventario"
                                ]
                            )}

                            ${Navegacion.generarDesplegable(
                                "Administración",
                                "bi-gear",
                                [
                                    "caja",
                                    "mediosPago",
                                    "auditoria",
                                    "usuarios",
                                    "herramientas"
                                ]
                            )}

                        </ul>

                        <div class="pos-global-context">

                            <span
                                id="navEstadoCaja"
                                class="badge text-bg-secondary">

                                Caja sin verificar
                            </span>

                            <span>
                                Caja:
                                <strong id="navNumeroCaja">
                                    1
                                </strong>
                            </span>

                            <span>
                                Usuario:
                                <strong id="navUsuario">
                                    ADMIN
                                </strong>
                            </span>

                            <span
                                id="navAmbiente"
                                class="badge pos-environment-badge text-bg-secondary"
                                title="Ambiente de ejecución">
                                PRUEBA
                            </span>

                            <button type="button" class="btn btn-sm btn-outline-light" onclick="SeguridadUI.salir()" title="Cerrar sesión"><i class="bi bi-box-arrow-right"></i></button>

                            <span>
                                Versión:
                                <strong id="navVersion">
                                    -
                                </strong>
                            </span>

                        </div>

                    </div>

                </div>

            </nav>

            <div class="pos-breadcrumb-bar">

                <div
                    id="navBreadcrumb"
                    class="container-fluid">
                </div>

                <div class="pos-shortcuts-help">
                    F1 Inicio · F7 Caja · F8 Productos
                </div>

            </div>
        `;
    },


    generarEnlacePrincipal(
        id,
        texto,
        icono,
        archivo,
        permiso
    ) {

        if (permiso && window.SeguridadUI && !SeguridadUI.puede(permiso)) return "";

        return `
            <li class="nav-item">

                <a
                    class="nav-link"
                    data-modulo="${id}"
                    href="${archivo}">

                    <i class="bi ${icono}"></i>

                    ${texto}
                </a>

            </li>
        `;
    },


    generarDesplegable(
        texto,
        icono,
        idsModulos
    ) {

        const items =
            idsModulos
                .map(function(idModulo) {

                    const modulo =
                        Navegacion.modulos.find(
                            function(item) {
                                return item.id === idModulo;
                            }
                        );

                    if (!modulo || (modulo.permiso && window.SeguridadUI && !SeguridadUI.puede(modulo.permiso))) {
                        return "";
                    }

                    return `
                        <li>

                            <a
                                class="dropdown-item"
                                data-modulo="${modulo.id}"
                                href="${modulo.archivo}">

                                <i class="bi ${modulo.icono}"></i>

                                ${modulo.texto}
                            </a>

                        </li>
                    `;
                })
                .join("");

        if (!items.trim()) return "";

        return `
            <li class="nav-item dropdown">

                <a
                    class="nav-link dropdown-toggle"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false">

                    <i class="bi ${icono}"></i>

                    ${texto}
                </a>

                <ul class="dropdown-menu">
                    ${items}
                </ul>

            </li>
        `;
    },


    marcarModuloActual() {

        const archivoActual =
            Navegacion.obtenerArchivoActual();

        const moduloActual =
            Navegacion.modulos.find(
                function(modulo) {
                    return (
                        modulo.archivo.toLowerCase() ===
                        archivoActual
                    );
                }
            );

        if (!moduloActual) {
            return;
        }

        document
            .querySelectorAll("[data-modulo]")
            .forEach(function(enlace) {

                enlace.classList.toggle(
                    "active",
                    enlace.dataset.modulo ===
                    moduloActual.id
                );
            });

        Navegacion.mostrarBreadcrumb(
            moduloActual
        );
    },


    mostrarBreadcrumb(moduloActual) {

        const contenedor =
            document.getElementById(
                "navBreadcrumb"
            );

        if (!contenedor) {
            return;
        }

        if (moduloActual.id === "menu") {

            contenedor.innerHTML = `
                <span class="pos-breadcrumb-current">
                    <i class="bi bi-house"></i>
                    Inicio
                </span>
            `;

            return;
        }

        contenedor.innerHTML = `
            <a href="menu.html">
                <i class="bi bi-house"></i>
                Inicio
            </a>

            <i class="bi bi-chevron-right"></i>

            <span class="pos-breadcrumb-current">
                <i class="bi ${moduloActual.icono}"></i>
                ${moduloActual.texto}
            </span>
        `;
    },


    async cargarConfiguracion() {

        try {

            if (
                typeof api === "undefined" ||
                typeof api.obtenerConfiguracion !==
                "function"
            ) {
                return;
            }

            const resultado =
                await api.obtenerConfiguracion();

            if (!resultado.ok) {
                return;
            }

            Navegacion.configuracion =
                resultado.configuracion || {};

            Navegacion.actualizar(
                Navegacion.configuracion
            );

        } catch (error) {

            console.error(
                "No fue posible cargar la configuración de navegación.",
                error
            );
        }
    },


    actualizar(configuracion) {

        configuracion =
            configuracion || {};

        Navegacion.establecerTexto(
            "navNombreSistema",
            configuracion.NombreSistema ||
            "POS Local"
        );

        Navegacion.establecerTexto(
            "navNombreNegocio",
            configuracion.NombreNegocio ||
            ""
        );

        Navegacion.establecerTexto(
            "navNumeroCaja",
            configuracion.NumeroCaja ||
            "1"
        );

        if (window.POS_USUARIO) {
            Navegacion.establecerTexto("navUsuario", window.POS_USUARIO.nombre + " (" + window.POS_USUARIO.rol + ")");
        }

        const version =
            (window.CONFIG && CONFIG.VERSION) ||
            configuracion.Version ||
            "-";

        Navegacion.establecerTexto(
            "navVersion",
            version
        );

        Navegacion.actualizarAmbiente(
            configuracion.Ambiente ||
            configuracion.AMBIENTE ||
            (window.CONFIG && CONFIG.AMBIENTE) ||
            "PRUEBA"
        );
    },


    actualizarAmbiente(ambiente) {

        const elemento =
            document.getElementById("navAmbiente");

        if (!elemento) {
            return;
        }

        const normalizado = String(ambiente || "PRUEBA")
            .trim()
            .toUpperCase();

        const ambientesPermitidos = [
            "DESARROLLO",
            "PRUEBA",
            "PRODUCCIÓN"
        ];

        const valor = ambientesPermitidos.includes(normalizado)
            ? normalizado
            : normalizado === "PRODUCCION"
                ? "PRODUCCIÓN"
                : "PRUEBA";

        elemento.textContent = valor;
        elemento.classList.remove(
            "text-bg-secondary",
            "text-bg-info",
            "text-bg-warning",
            "text-bg-success"
        );

        const clase = {
            DESARROLLO: "text-bg-info",
            PRUEBA: "text-bg-warning",
            "PRODUCCIÓN": "text-bg-success"
        }[valor];

        elemento.classList.add(clase);
    },

    async actualizarEstadoCaja() {

        if (
            typeof api === "undefined" ||
            typeof api.obtenerCajaAbierta !==
            "function"
        ) {
            return;
        }

        const numeroCaja =
            Navegacion.configuracion.NumeroCaja ||
            document
                .getElementById("navNumeroCaja")
                ?.textContent
                .trim() ||
            "1";

        try {

            const resultado =
                await api.obtenerCajaAbierta(
                    numeroCaja
                );

            const abierta =
                Boolean(
                    resultado.ok &&
                    resultado.caja
                );

            const elemento =
                document.getElementById(
                    "navEstadoCaja"
                );

            if (!elemento) {
                return;
            }

            elemento.textContent =
                abierta
                    ? "Caja abierta"
                    : "Caja cerrada";

            elemento.className =
                abierta
                    ? "badge text-bg-success"
                    : "badge text-bg-danger";

        } catch (error) {

            console.error(
                "No fue posible consultar el estado de caja.",
                error
            );
        }
    },


    registrarAtajosGlobales() {

        document.addEventListener(
            "keydown",
            function(evento) {

                if (
                    Navegacion.esCampoEditable(
                        evento.target
                    ) &&
                    ![
                        "F1",
                        "F7",
                        "F8"
                    ].includes(evento.key)
                ) {
                    return;
                }

                if (evento.key === "F1") {
                    evento.preventDefault();
                    window.location.href =
                        "menu.html";
                    return;
                }

                if (evento.key === "F7") {
                    evento.preventDefault();
                    window.location.href =
                        "caja.html";
                    return;
                }

                if (evento.key === "F8") {
                    evento.preventDefault();
                    window.location.href =
                        "productos.html";
                }
            }
        );
    },


    esCampoEditable(elemento) {

        if (!elemento) {
            return false;
        }

        const etiqueta =
            String(
                elemento.tagName || ""
            ).toUpperCase();

        return (
            etiqueta === "INPUT" ||
            etiqueta === "TEXTAREA" ||
            etiqueta === "SELECT" ||
            elemento.isContentEditable
        );
    },


    obtenerArchivoActual() {

        return (
            window.location.pathname
                .split("/")
                .pop()
                .toLowerCase() ||
            "menu.html"
        );
    },


    establecerTexto(id, valor) {

        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = valor;
        }
    }
};


document.addEventListener("pos:sesion-lista", () => Navegacion.inicializar());
document.addEventListener("DOMContentLoaded", function() { if (window.SeguridadUI && SeguridadUI.usuario) Navegacion.inicializar(); });
