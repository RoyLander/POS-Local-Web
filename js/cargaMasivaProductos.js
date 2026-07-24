const CargaMasivaProductos = {
    columnas: [
        "CodigoBarras", "Descripcion", "Marca", "Categoria",
        "Temporada", "Color", "Talle", "PrecioCompra", "PrecioVenta",
        "StockMinimo", "StockInicial", "Activo"
    ],

    async inicializar() {
        this.registrarEventos();
        await MaestrosCombos.cargar();
        this.agregarFilas(5);
        await this.cargarConfiguracion();
    },

    registrarEventos() {
        document.getElementById("btnAgregarFila")?.addEventListener("click", () => this.agregarFilas(1));
        document.getElementById("btnAgregarCinco")?.addEventListener("click", () => this.agregarFilas(5));
        document.getElementById("btnGuardarTodo")?.addEventListener("click", () => this.guardarTodo());
        document.getElementById("btnLimpiarGrilla")?.addEventListener("click", () => this.limpiarGrilla());

        const tabla = document.getElementById("tablaCargaProductos");
        tabla?.addEventListener("input", evento => {
            const fila = evento.target.closest("tr");
            if (fila) this.validarFila(fila, false);
            this.actualizarResumen();
        });
        tabla?.addEventListener("focusin", evento => {
            const select = evento.target.closest("select[data-tipo-maestro]");
            if (select && select.value !== "__NUEVO__") select.dataset.valorPrevio = select.value;
        });
        tabla?.addEventListener("change", async evento => {
            const select = evento.target.closest("select[data-tipo-maestro]");
            if (select && select.value === "__NUEVO__") await MaestrosCombos.solicitarAlta(select);
            this.actualizarResumen();
        });
        tabla?.addEventListener("paste", evento => this.pegarDatos(evento));
    },

    async cargarConfiguracion() {
        try {
            const resultado = await api.obtenerConfiguracion();
            if (!resultado.ok) return;
            const configuracion = resultado.configuracion || {};
            document.title = `${configuracion.NombreSistema || "POS Local"} - Carga masiva de productos`;
        } catch (error) {
            console.error(error);
        }
    },

    agregarFilas(cantidad, datos = []) {
        const tbody = document.getElementById("tablaCargaProductos");
        for (let i = 0; i < cantidad; i++) {
            const fila = document.createElement("tr");
            fila.innerHTML = this.generarFilaHtml(datos[i] || {});
            tbody.appendChild(fila);
        }
        this.renumerarFilas();
        this.actualizarResumen();
        if (cantidad === 1) tbody.lastElementChild?.querySelector('[data-campo="Descripcion"]')?.focus();
    },

    generarFilaHtml(datos) {
        const valor = campo => this.escapar(datos[campo] ?? "");
        return `
            <td class="numero-fila text-center text-muted"></td>
            <td><input data-campo="CodigoBarras" class="form-control" maxlength="80" value="${valor("CodigoBarras")}"></td>
            <td><input data-campo="Descripcion" class="form-control campo-descripcion" maxlength="200" required value="${valor("Descripcion")}"></td>
            <td><select data-campo="Marca" class="form-select" data-tipo-maestro="MARCA">${MaestrosCombos.opciones("MARCA", datos.Marca || "")}</select></td>
            <td><select data-campo="Categoria" class="form-select" data-tipo-maestro="CATEGORIA">${MaestrosCombos.opciones("CATEGORIA", datos.Categoria || "")}</select></td>
            <td><input data-campo="Temporada" class="form-control" maxlength="100" value="${valor("Temporada")}"></td>
            <td><select data-campo="Color" class="form-select" data-tipo-maestro="COLOR">${MaestrosCombos.opciones("COLOR", datos.Color || "")}</select></td>
            <td><select data-campo="Talle" class="form-select" data-tipo-maestro="TALLE">${MaestrosCombos.opciones("TALLE", datos.Talle || "")}</select></td>
            <td><input data-campo="PrecioCompra" type="number" class="form-control campo-numero" min="0" step="0.01" value="${valor("PrecioCompra")}"></td>
            <td><input data-campo="PrecioVenta" type="number" class="form-control campo-numero" min="0" step="0.01" required value="${valor("PrecioVenta")}"></td>
            <td><input data-campo="StockMinimo" type="number" class="form-control campo-numero" min="0" step="1" value="${valor("StockMinimo") || 0}"></td>
            <td><input data-campo="StockInicial" type="number" class="form-control campo-numero" min="0" step="1" value="${valor("StockInicial") || 0}"></td>
            <td><select data-campo="Activo" class="form-select"><option value="ACTIVO" ${valor("Activo") !== "INACTIVO" ? "selected" : ""}>Activo</option><option value="INACTIVO" ${valor("Activo") === "INACTIVO" ? "selected" : ""}>Inactivo</option></select></td>
            <td><div class="resultado-fila text-muted">Pendiente</div></td>
            <td class="text-nowrap">
              <button type="button" class="btn btn-outline-secondary btn-sm" title="Duplicar fila" onclick="CargaMasivaProductos.duplicarFila(this)"><i class="bi bi-copy"></i></button>
              <button type="button" class="btn btn-outline-danger btn-sm" title="Eliminar fila" onclick="CargaMasivaProductos.eliminarFila(this)"><i class="bi bi-x-lg"></i></button>
            </td>`;
    },

    obtenerProducto(fila) {
        const obtener = campo => (fila.querySelector(`[data-campo="${campo}"]`)?.value || "").trim();
        const numero = campo => {
            const valor = obtener(campo);
            return valor === "" ? 0 : Number(valor);
        };
        return {
            IdProducto: "",
            SKU: "", CodigoBarras: obtener("CodigoBarras"),
            Descripcion: obtener("Descripcion"), Marca: obtener("Marca"),
            Categoria: obtener("Categoria"), Temporada: obtener("Temporada"),
            Color: obtener("Color"), Talle: obtener("Talle"),
            PrecioCompra: numero("PrecioCompra"), PrecioVenta: numero("PrecioVenta"),
            StockMinimo: numero("StockMinimo"), StockInicial: numero("StockInicial"),
            Activo: obtener("Activo") || "ACTIVO"
        };
    },

    filaVacia(fila) {
        const producto = this.obtenerProducto(fila);
        return [producto.CodigoBarras, producto.Descripcion, producto.Marca,
            producto.Categoria, producto.Temporada, producto.Color, producto.Talle,
            producto.PrecioCompra, producto.PrecioVenta, producto.StockMinimo,
            producto.StockInicial].every(valor => valor === "" || Number(valor) === 0);
    },

    validarFila(fila, mostrarResultado = true) {
        fila.querySelectorAll(".celda-invalida").forEach(c => c.classList.remove("celda-invalida"));
        fila.classList.remove("fila-error", "fila-ok");
        if (this.filaVacia(fila)) {
            this.resultado(fila, "Pendiente", "muted");
            return { valida: false, vacia: true, errores: [] };
        }

        const producto = this.obtenerProducto(fila);
        const errores = [];
        if (!producto.Descripcion) {
            errores.push("Descripción obligatoria");
            fila.querySelector('[data-campo="Descripcion"]')?.classList.add("celda-invalida");
        }
        ["PrecioCompra", "PrecioVenta", "StockMinimo", "StockInicial"].forEach(campo => {
            const input = fila.querySelector(`[data-campo="${campo}"]`);
            const valor = input?.value;
            if (valor !== "" && (!Number.isFinite(Number(valor)) || Number(valor) < 0)) {
                errores.push(`${campo} inválido`);
                input?.classList.add("celda-invalida");
            }
        });
        const precioVenta = fila.querySelector('[data-campo="PrecioVenta"]')?.value;
        if (precioVenta === "") {
            errores.push("Precio de venta obligatorio");
            fila.querySelector('[data-campo="PrecioVenta"]')?.classList.add("celda-invalida");
        }

        if (errores.length) {
            fila.classList.add("fila-error");
            if (mostrarResultado) this.resultado(fila, errores.join(" · "), "danger");
            return { valida: false, vacia: false, errores };
        }
        fila.classList.add("fila-ok");
        if (mostrarResultado) this.resultado(fila, "Lista para guardar", "success");
        return { valida: true, vacia: false, errores: [] };
    },

    validarDuplicadosEnGrilla(filas) {
        const vistosCodigo = new Map();
        filas.forEach((fila, indice) => {
            const producto = this.obtenerProducto(fila);
            [[producto.CodigoBarras, vistosCodigo, "Código de barras duplicado en la grilla"]]
            .forEach(([clave, mapa, mensaje]) => {
                if (!clave) return;
                if (mapa.has(clave)) {
                    [fila, filas[mapa.get(clave)]].forEach(f => {
                        f.classList.add("fila-error"); f.classList.remove("fila-ok");
                        this.resultado(f, mensaje, "danger");
                    });
                } else mapa.set(clave, indice);
            });
        });
    },

    async guardarTodo() {
        const filas = [...document.querySelectorAll("#tablaCargaProductos tr")]
            .filter(fila => !this.filaVacia(fila) && !fila.dataset.guardada);
        if (!filas.length) {
            mostrarMensaje("No hay filas pendientes para guardar.", "warning");
            return;
        }

        let validas = true;
        filas.forEach(fila => { if (!this.validarFila(fila).valida) validas = false; });
        this.validarDuplicadosEnGrilla(filas);
        if (filas.some(f => f.classList.contains("fila-error"))) validas = false;
        this.actualizarResumen();
        if (!validas) {
            mostrarMensaje("Corrija las filas marcadas antes de guardar.", "danger", 6000);
            return;
        }

        const boton = document.getElementById("btnGuardarTodo");
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        this.texto("lblEstadoCarga", "Guardando productos...");

        try {
            const resultado = await api.guardarProductosMasivo(filas.map(f => this.obtenerProducto(f)));
            const resultados = resultado.resultados || [];
            resultados.forEach((item, indice) => {
                const fila = filas[indice];
                if (item.ok) {
                    fila.dataset.guardada = "true";
                    fila.classList.remove("fila-ok", "fila-error");
                    fila.classList.add("fila-guardada");
                    fila.querySelectorAll("input,select,button").forEach(c => c.disabled = true);
                    this.resultado(fila, `Guardado · ID ${item.idProducto} · SKU ${item.sku}`, "primary");
                } else {
                    fila.classList.remove("fila-ok");
                    fila.classList.add("fila-error");
                    this.resultado(fila, item.mensaje || "Error al guardar", "danger");
                }
            });
            this.actualizarResumen();
            const guardados = resultados.filter(r => r.ok).length;
            const errores = resultados.length - guardados;
            mostrarMensaje(`${guardados} producto(s) guardado(s)${errores ? ` y ${errores} con error` : " correctamente"}.`, errores ? "warning" : "success", 7000);
            if (!errores) this.agregarFilas(1);
        } catch (error) {
            console.error(error);
            mostrarMensaje("No fue posible comunicarse con el servidor.", "danger", 6000);
        } finally {
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Guardar productos';
            this.texto("lblEstadoCarga", "Listo");
        }
    },

    pegarDatos(evento) {
        const objetivo = evento.target.closest("input,select");
        if (!objetivo) return;
        const texto = evento.clipboardData?.getData("text/plain") || "";
        if (!texto.includes("\t") && !texto.includes("\n")) return;
        evento.preventDefault();
        const filasPegadas = texto.replace(/\r/g, "").split("\n").filter((f, i, a) => f !== "" || i < a.length - 1).map(f => f.split("\t"));
        const filaInicial = objetivo.closest("tr");
        let filas = [...document.querySelectorAll("#tablaCargaProductos tr")];
        let indiceFila = filas.indexOf(filaInicial);
        const indiceColumna = this.columnas.indexOf(objetivo.dataset.campo);
        while (filas.length < indiceFila + filasPegadas.length) {
            this.agregarFilas(1); filas = [...document.querySelectorAll("#tablaCargaProductos tr")];
        }
        filasPegadas.forEach((valores, desplazamientoFila) => {
            const fila = filas[indiceFila + desplazamientoFila];
            valores.forEach((valor, desplazamientoColumna) => {
                const campo = this.columnas[indiceColumna + desplazamientoColumna];
                if (!campo) return;
                const control = fila.querySelector(`[data-campo="${campo}"]`);
                if (control) control.value = valor.trim();
            });
            this.validarFila(fila, false);
        });
        this.actualizarResumen();
    },

    duplicarFila(boton) {
        const producto = this.obtenerProducto(boton.closest("tr"));
        producto.CodigoBarras = "";
        const nueva = document.createElement("tr");
        nueva.innerHTML = this.generarFilaHtml(producto);
        boton.closest("tr").after(nueva);
        this.renumerarFilas(); this.actualizarResumen();
        nueva.querySelector('[data-campo="Talle"]')?.focus();
    },

    eliminarFila(boton) {
        const fila = boton.closest("tr");
        if (fila?.dataset.guardada) return;
        fila?.remove();
        if (!document.querySelector("#tablaCargaProductos tr")) this.agregarFilas(1);
        this.renumerarFilas(); this.actualizarResumen();
    },

    limpiarGrilla() {
        const pendientes = [...document.querySelectorAll("#tablaCargaProductos tr")].filter(f => !f.dataset.guardada && !this.filaVacia(f));
        if (pendientes.length && !confirm("¿Desea eliminar todas las filas pendientes?")) return;
        document.getElementById("tablaCargaProductos").innerHTML = "";
        this.agregarFilas(5);
    },

    actualizarResumen() {
        const filas = [...document.querySelectorAll("#tablaCargaProductos tr")];
        const conDatos = filas.filter(f => !this.filaVacia(f));
        const guardadas = filas.filter(f => f.dataset.guardada).length;
        let validas = 0, invalidas = 0;
        conDatos.filter(f => !f.dataset.guardada).forEach(f => {
            const resultado = this.validarFila(f, false);
            resultado.valida ? validas++ : invalidas++;
        });
        this.texto("lblTotalFilas", conDatos.length);
        this.texto("lblFilasValidas", validas);
        this.texto("lblFilasInvalidas", invalidas);
        this.texto("lblFilasGuardadas", guardadas);
    },

    renumerarFilas() {
        document.querySelectorAll("#tablaCargaProductos tr").forEach((fila, indice) => {
            const celda = fila.querySelector(".numero-fila"); if (celda) celda.textContent = indice + 1;
        });
    },

    resultado(fila, mensaje, tipo) {
        const elemento = fila.querySelector(".resultado-fila");
        if (elemento) { elemento.textContent = mensaje; elemento.className = `resultado-fila text-${tipo}`; }
    },

    texto(id, valor) { const elemento = document.getElementById(id); if (elemento) elemento.textContent = valor; },
    escapar(valor) { return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
};

const api = new Api();
document.addEventListener("DOMContentLoaded", () => CargaMasivaProductos.inicializar());
