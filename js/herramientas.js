const Herramientas = {

    configuracion: {},

    async inicializar() {
        document
            .getElementById(
                "btnVerificarEstructura"
            )
            ?.addEventListener(
                "click",
                () => Herramientas.verificarEstructura()
            );

        await Herramientas.cargarConfiguracion();
    },

    async cargarConfiguracion() {
        try {
            const resultado =
                await api.obtenerConfiguracion();

            if (!resultado.ok) {
                return;
            }

            Herramientas.configuracion =
                resultado.configuracion || {};

            Herramientas.texto(
                "lblNombreSistema",
                Herramientas.configuracion.NombreSistema ||
                "POS Local"
            );

            Herramientas.texto(
                "lblNombreNegocio",
                Herramientas.configuracion.NombreNegocio ||
                ""
            );

        } catch (error) {
            console.error(error);
        }
    },

    async verificarEstructura() {
        const boton =
            document.getElementById(
                "btnVerificarEstructura"
            );

        boton.disabled = true;
        boton.innerHTML =
            `<span class="spinner-border spinner-border-sm"></span> Verificando...`;

        try {
            const resultado =
                await api.verificarEstructura();

            Herramientas.mostrarResultado(
                resultado
            );

        } catch (error) {
            console.error(error);

            mostrarMensaje(
                "No fue posible ejecutar la verificación.",
                "danger",
                5000
            );

        } finally {
            boton.disabled = false;
            boton.innerHTML =
                `<i class="bi bi-play-circle"></i> Ejecutar verificación`;
        }
    },

    mostrarResultado(resultado) {
        const errores =
            resultado.errores || [];

        const advertencias =
            resultado.advertencias || [];

        Herramientas.texto(
            "lblCantidadErrores",
            errores.length
        );

        Herramientas.texto(
            "lblCantidadAdvertencias",
            advertencias.length
        );

        Herramientas.texto(
            "lblEstadoGeneral",
            resultado.ok
                ? "Correcto"
                : "Requiere atención"
        );

        const estado =
            document.getElementById(
                "lblEstadoGeneral"
            );

        estado.className =
            resultado.ok
                ? "mb-0 text-success"
                : "mb-0 text-danger";

        const contenedor =
            document.getElementById(
                "resultadoVerificacion"
            );

        const bloques = [];

        if (errores.length) {
            bloques.push(`
                <div class="alert alert-danger">
                    <h6>Errores</h6>
                    <ul class="mb-0">
                        ${errores
                            .map(error =>
                                `<li>${Herramientas.escapar(error)}</li>`
                            )
                            .join("")}
                    </ul>
                </div>
            `);
        }

        if (advertencias.length) {
            bloques.push(`
                <div class="alert alert-warning">
                    <h6>Advertencias</h6>
                    <ul class="mb-0">
                        ${advertencias
                            .map(advertencia =>
                                `<li>${Herramientas.escapar(advertencia)}</li>`
                            )
                            .join("")}
                    </ul>
                </div>
            `);
        }

        if (!errores.length && !advertencias.length) {
            bloques.push(`
                <div class="alert alert-success">
                    La estructura obligatoria es correcta.
                </div>
            `);
        }

        const filas =
            (resultado.hojas || [])
                .map(hoja => `
                    <tr>
                        <td>${Herramientas.escapar(hoja.hoja)}</td>
                        <td>
                            ${hoja.existe
                                ? `<span class="badge bg-success">Sí</span>`
                                : `<span class="badge bg-danger">No</span>`}
                        </td>
                        <td>
                            ${Herramientas.lista(hoja.columnasFaltantes)}
                        </td>
                        <td>
                            ${Herramientas.lista(hoja.columnasDuplicadas)}
                        </td>
                        <td>
                            ${Herramientas.lista(hoja.clavesDuplicadas)}
                        </td>
                    </tr>
                `)
                .join("");

        bloques.push(`
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Hoja</th>
                            <th>Existe</th>
                            <th>Columnas faltantes</th>
                            <th>Columnas duplicadas</th>
                            <th>Claves duplicadas</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>
            </div>
        `);

        contenedor.innerHTML =
            bloques.join("");
    },

    lista(valores) {
        if (!valores || !valores.length) {
            return `<span class="text-muted">—</span>`;
        }

        return valores
            .map(valor =>
                `<span class="badge bg-secondary me-1">
                    ${Herramientas.escapar(valor)}
                 </span>`
            )
            .join("");
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
    }
};

const api = new Api();

document.addEventListener(
    "DOMContentLoaded",
    () => Herramientas.inicializar()
);
