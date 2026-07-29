const MercadoLibreUI = {
    registros: [],
    actual: null,
    modal: null,
    modalResultado: null,
    importando: false,
    ventanaOAuth: null,
    temporizadorOAuth: null,
    temporizadorProgreso: null,
    progreso: null,
    paginaOffset: 0,
    paginaLimite: 200,
    totalFiltrado: 0,
    manejadorTecladoBloqueado: null,
    manejadorSalidaBloqueada: null,
    focoPrevioImportacion: null,
    cargandoVista: false,
    temporizadorBusqueda: null,
    manejadorTecladoCarga: null,
    focoPrevioCarga: null,
    publicacionesExpandidas: new Set(),

    async init() {
        this.modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalVincular"));
        this.modalResultado = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalResultadoImportacionMl"));
        document.getElementById("btnConectar").onclick = () => this.conectar();
        document.getElementById("btnDesconectar").onclick = () => this.desconectar();
        document.getElementById("btnImportar").onclick = () => this.importar();
        document.getElementById("btnActualizar").onclick = () => this.cargarTodo("Actualizando vista…");
        document.getElementById("txtBuscarMl").oninput = () => {
            clearTimeout(this.temporizadorBusqueda);
            this.temporizadorBusqueda = setTimeout(() => this.reiniciarYCargar("Aplicando búsqueda…"), 400);
        };
        ["cmbEstadoMl", "cmbStockMl", "cmbEstadoPublicacionMl", "cmbVariantesMl"].forEach(id => {
            document.getElementById(id).onchange = () => this.reiniciarYCargar("Aplicando filtros…");
        });
        document.getElementById("btnPaginaAnteriorMl").onclick = () => this.cambiarPagina(-1);
        document.getElementById("btnPaginaSiguienteMl").onclick = () => this.cambiarPagina(1);
        document.getElementById("btnBuscarProductoMl").onclick = () => this.buscarProductos();
        document.getElementById("txtBuscarProductoMl").onkeydown = event => {
            if (event.key === "Enter") {
                event.preventDefault();
                this.buscarProductos();
            }
        };
        window.addEventListener("message", event => this.recibirOAuth(event));
        await this.cargarTodo();
    },

    async cargarTodo(mensaje = "Cargando inventario…") {
        if (this.importando || this.cargandoVista) return;
        this.mostrarCargaVista(true, mensaje);
        try {
            await this.estado();
            await this.cargar(false, mensaje, false);
        } finally {
            this.mostrarCargaVista(false);
        }
    },

    async estado() {
        try {
            const respuesta = await api.obtenerEstadoMercadoLibre();
            if (!respuesta.ok) throw new Error(respuesta.mensaje);

            document.getElementById("lblConfiguracion").textContent = respuesta.configurada ? "Completa" : "Pendiente";
            document.getElementById("lblCuenta").textContent = respuesta.conectada
                ? `${respuesta.nickname || "Cuenta Mercado Libre"} (${respuesta.userId})`
                : "No conectada";
            document.getElementById("lblUltima").textContent = respuesta.ultimaImportacion
                ? new Date(respuesta.ultimaImportacion).toLocaleString("es-AR")
                : "Nunca";
            document.getElementById("avisoConfig").classList.toggle("d-none", respuesta.configurada);

            const conectar = document.getElementById("btnConectar");
            conectar.disabled = !respuesta.configurada || this.importando;
            conectar.className = respuesta.conectada ? "btn btn-success btn-sm" : "btn btn-warning btn-sm";
            conectar.innerHTML = respuesta.conectada
                ? '<i class="bi bi-check-circle"></i> Conectado con Mercado Libre'
                : '<i class="bi bi-link-45deg"></i> Conectar Mercado Libre';

            document.getElementById("btnDesconectar").classList.toggle("d-none", !respuesta.conectada);
            document.getElementById("btnDesconectar").disabled = this.importando;
            document.getElementById("btnImportar").disabled = !respuesta.conectada || this.importando;
        } catch (error) {
            mostrarMensaje(error.message, "danger", 5000);
        }
    },

    async conectar() {
        try {
            const respuesta = await api.obtenerUrlAutorizacionMercadoLibre();
            if (!respuesta.ok) throw new Error(respuesta.mensaje);
            this.ventanaOAuth = window.open(respuesta.url, "ml_oauth", "width=760,height=720");
            if (!this.ventanaOAuth) throw new Error("El navegador bloqueó la ventana de autorización.");

            clearInterval(this.temporizadorOAuth);
            this.temporizadorOAuth = setInterval(async () => {
                if (!this.ventanaOAuth || this.ventanaOAuth.closed) {
                    clearInterval(this.temporizadorOAuth);
                    this.temporizadorOAuth = null;
                    await this.estado();
                }
            }, 1200);
            mostrarMensaje("Autorizá la cuenta en la ventana de Mercado Libre.", "info", 5000);
        } catch (error) {
            mostrarMensaje(error.message, "danger", 6000);
        }
    },

    async recibirOAuth(event) {
        if (!event.data || event.data.tipo !== "POS_ML_OAUTH") return;
        clearInterval(this.temporizadorOAuth);
        this.temporizadorOAuth = null;
        if (event.data.ok) {
            await this.estado();
            mostrarMensaje(`Mercado Libre conectado${event.data.nickname ? `: ${event.data.nickname}` : ""}.`, "success", 4000);
        } else {
            mostrarMensaje(event.data.mensaje || "No se pudo conectar Mercado Libre.", "danger", 6000);
        }
    },

    async desconectar() {
        if (!confirm("Se desconectará la cuenta actual de Mercado Libre. Los datos importados no se eliminarán. ¿Continuar?")) return;
        try {
            const respuesta = await api.desconectarMercadoLibre();
            if (!respuesta.ok) throw new Error(respuesta.mensaje);
            mostrarMensaje(respuesta.mensaje, "success", 3500);
            await this.estado();
        } catch (error) {
            mostrarMensaje(error.message, "danger", 6000);
        }
    },

    crearIdImportacion() {
        return `ML-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    },

    async importar() {
        if (this.importando) return;
        let scrollId = "";
        let completo = false;
        let total = 0;
        let publicacionesProcesadas = 0;
        let registrosProcesados = 0;
        let erroresLote = 0;
        const inicio = Date.now();
        const importacionId = this.crearIdImportacion();
        this.importando = true;
        this.progreso = { publicacionesProcesadas, total, registrosProcesados, inicio, etapa: "Preparando importación…" };
        this.mostrarProgreso(true);
        this.bloquearPantalla(true);
        this.iniciarRelojProgreso();

        try {
            do {
                this.actualizarProgreso(publicacionesProcesadas, total, registrosProcesados, inicio, "Descargando publicaciones y variantes…");
                const respuesta = await api.importarInventarioMercadoLibre({
                    scrollId,
                    limite: 50,
                    importacionId
                });
                if (!respuesta.ok) throw new Error(respuesta.mensaje);

                scrollId = String(respuesta.scrollId || "");
                completo = Boolean(respuesta.completo);
                total = Math.max(Number(respuesta.totalPublicaciones || 0), Number(respuesta.publicacionesAcumuladas || 0));
                publicacionesProcesadas += Number(respuesta.publicacionesProcesadas || 0);
                registrosProcesados += Number(respuesta.variantesProcesadas || 0);
                erroresLote += Number(respuesta.erroresProcesados || 0);
                this.actualizarProgreso(publicacionesProcesadas, total, registrosProcesados, inicio, "Lote guardado en la planilla");
                await new Promise(resolve => setTimeout(resolve, 80));
            } while (!completo);

            this.actualizarProgreso(total, total, registrosProcesados, inicio, "Finalizando y verificando totales…");
            const resumen = await api.obtenerResumenImportacionMercadoLibre(importacionId);
            if (!resumen.ok) throw new Error(resumen.mensaje);
            this.actualizarProgreso(total, total, resumen.registrosInventario, inicio, "Actualizando la grilla…");
            this.paginaOffset = 0;
            await this.cargar(true);
            await this.estado();
            this.actualizarProgreso(total, total, resumen.registrosInventario, inicio, "Importación finalizada");
            await new Promise(resolve => setTimeout(resolve, 350));
            this.mostrarResultadoImportacion({ ...resumen, erroresProcesados: Math.max(Number(resumen.errores || 0), erroresLote) });
        } catch (error) {
            let resumenError = null;
            try {
                await api.marcarImportacionMercadoLibreConError(importacionId, error.message);
                resumenError = await api.obtenerResumenImportacionMercadoLibre(importacionId);
            } catch (registroError) {
                console.warn("No se pudo registrar o resumir el cierre con error de la importación", registroError);
            }

            // Incluso ante un error parcial, la grilla debe reflejar inmediatamente lo ya guardado.
            try {
                this.paginaOffset = 0;
                await this.cargar(true);
            } catch (cargaError) {
                console.warn("No se pudo actualizar la grilla luego del error", cargaError);
            }

            this.mostrarResultadoImportacion(resumenError || {
                estado: "ERROR",
                mensaje: error.message,
                publicaciones: publicacionesProcesadas,
                registrosInventario: registrosProcesados,
                conStock: 0,
                sinStock: 0,
                stockNoInformado: registrosProcesados,
                errores: erroresLote,
                duracionSegundos: Math.floor((Date.now() - inicio) / 1000)
            });
        } finally {
            this.importando = false;
            this.detenerRelojProgreso();
            document.getElementById("btnImportar").innerHTML = '<i class="bi bi-cloud-download"></i> Importar inventario';
            this.bloquearPantalla(false);
            this.mostrarProgreso(false);
            await this.estado();
        }
    },

    iniciarRelojProgreso() {
        this.detenerRelojProgreso();
        this.temporizadorProgreso = setInterval(() => {
            if (!this.progreso) return;
            const p = this.progreso;
            this.pintarProgreso(p.publicacionesProcesadas, p.total, p.registrosProcesados, p.inicio, p.etapa);
        }, 1000);
    },

    detenerRelojProgreso() {
        clearInterval(this.temporizadorProgreso);
        this.temporizadorProgreso = null;
    },

    bloquearPantalla(bloquear) {
        document.body.classList.toggle("ml-importando", bloquear);
        ["btnConectar", "btnDesconectar", "btnImportar", "btnActualizar", "txtBuscarMl", "cmbEstadoMl", "cmbStockMl", "cmbEstadoPublicacionMl", "cmbVariantesMl"].forEach(id => {
            const control = document.getElementById(id);
            if (control) control.disabled = bloquear;
        });

        if (bloquear) {
            this.focoPrevioImportacion = document.activeElement;
            this.manejadorTecladoBloqueado = event => {
                if (!this.importando) return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                const overlay = document.getElementById("overlayImportacionMl");
                if (overlay && document.activeElement !== overlay) overlay.focus({ preventScroll: true });
            };
            this.manejadorSalidaBloqueada = event => {
                if (!this.importando) return;
                event.preventDefault();
                event.returnValue = "Hay una importación de Mercado Libre en curso.";
                return event.returnValue;
            };
            document.addEventListener("keydown", this.manejadorTecladoBloqueado, true);
            document.addEventListener("keyup", this.manejadorTecladoBloqueado, true);
            window.addEventListener("beforeunload", this.manejadorSalidaBloqueada);
            const overlay = document.getElementById("overlayImportacionMl");
            if (overlay) setTimeout(() => overlay.focus({ preventScroll: true }), 0);
        } else {
            if (this.manejadorTecladoBloqueado) {
                document.removeEventListener("keydown", this.manejadorTecladoBloqueado, true);
                document.removeEventListener("keyup", this.manejadorTecladoBloqueado, true);
            }
            if (this.manejadorSalidaBloqueada) window.removeEventListener("beforeunload", this.manejadorSalidaBloqueada);
            this.manejadorTecladoBloqueado = null;
            this.manejadorSalidaBloqueada = null;
            if (this.focoPrevioImportacion && typeof this.focoPrevioImportacion.focus === "function") {
                setTimeout(() => this.focoPrevioImportacion.focus({ preventScroll: true }), 0);
            }
            this.focoPrevioImportacion = null;
        }
    },

    mostrarProgreso(mostrar) {
        document.getElementById("overlayImportacionMl").classList.toggle("d-none", !mostrar);
    },

    actualizarProgreso(procesadas, total, registros, inicio, etapa) {
        this.progreso = { publicacionesProcesadas: procesadas, total, registrosProcesados: registros, inicio, etapa };
        this.pintarProgreso(procesadas, total, registros, inicio, etapa);
    },

    pintarProgreso(procesadas, total, registros, inicio, etapa) {
        const porcentaje = total ? Math.min(100, Math.round((procesadas / total) * 100)) : 0;
        const transcurrido = Math.max(0, Math.floor((Date.now() - inicio) / 1000));
        const tiempo = this.formatearDuracion(transcurrido);
        let restante = "Calculando…";
        if (procesadas > 0 && total > procesadas) {
            restante = this.formatearDuracion(Math.round((transcurrido / procesadas) * (total - procesadas)));
        } else if (total && procesadas >= total) {
            restante = "0:00";
        }
        document.getElementById("barraImportacionMl").style.width = `${porcentaje}%`;
        document.getElementById("barraImportacionMl").setAttribute("aria-valuenow", String(porcentaje));
        document.getElementById("porcentajeImportacionMl").textContent = `${porcentaje}%`;
        document.getElementById("detalleImportacionMl").textContent = `${procesadas.toLocaleString("es-AR")} de ${(total || 0).toLocaleString("es-AR")} publicaciones · ${registros.toLocaleString("es-AR")} registros procesados`;
        document.getElementById("etapaImportacionMl").textContent = etapa;
        document.getElementById("tiempoImportacionMl").textContent = `Transcurrido: ${tiempo} · Restante estimado: ${restante}`;
        document.getElementById("btnImportar").innerHTML = `<span class="spinner-border spinner-border-sm"></span> Importando ${procesadas.toLocaleString("es-AR")}/${total ? total.toLocaleString("es-AR") : "…"}`;
    },

    mostrarResultadoImportacion(resultado) {
        const estado = String(resultado.estado || "ERROR").toUpperCase();
        const ok = estado === "OK" || estado === "FINALIZADA";
        const parcial = estado === "PARCIAL";
        document.getElementById("iconoResultadoImportacionMl").className = ok
            ? "bi bi-check-circle-fill text-success"
            : parcial ? "bi bi-exclamation-triangle-fill text-warning" : "bi bi-x-circle-fill text-danger";
        document.getElementById("tituloResultadoImportacionMl").textContent = ok
            ? "Importación finalizada correctamente"
            : parcial ? "Importación finalizada parcialmente" : "La importación no pudo finalizar";
        document.getElementById("mensajeResultadoImportacionMl").textContent = resultado.mensaje || (ok ? "El inventario quedó actualizado." : "Revisá el detalle del error.");
        document.getElementById("resultadoPublicacionesMl").textContent = Number(resultado.publicaciones || 0).toLocaleString("es-AR");
        document.getElementById("resultadoRegistrosMl").textContent = Number(resultado.registrosInventario || 0).toLocaleString("es-AR");
        document.getElementById("resultadoConStockMl").textContent = Number(resultado.conStock || 0).toLocaleString("es-AR");
        document.getElementById("resultadoSinStockMl").textContent = Number(resultado.sinStock || 0).toLocaleString("es-AR");
        const stockNoInformado = document.getElementById("resultadoStockNoInformadoMl");
        if (stockNoInformado) stockNoInformado.textContent = Number(resultado.stockNoInformado || 0).toLocaleString("es-AR");
        document.getElementById("resultadoErroresMl").textContent = Number(resultado.erroresProcesados ?? resultado.errores ?? 0).toLocaleString("es-AR");
        document.getElementById("resultadoDuracionMl").textContent = this.formatearDuracion(Number(resultado.duracionSegundos || 0));
        this.modalResultado.show();
    },

    formatearDuracion(segundos) {
        segundos = Math.max(0, Math.round(Number(segundos || 0)));
        const horas = Math.floor(segundos / 3600);
        const minutos = Math.floor((segundos % 3600) / 60);
        const seg = String(segundos % 60).padStart(2, "0");
        return horas ? `${horas}:${String(minutos).padStart(2, "0")}:${seg}` : `${minutos}:${seg}`;
    },

    reiniciarYCargar(mensaje = "Aplicando filtros…") {
        this.paginaOffset = 0;
        return this.cargar(false, mensaje);
    },

    async cambiarPagina(direccion) {
        if (this.cargandoVista) return;
        const nuevo = this.paginaOffset + direccion * this.paginaLimite;
        if (nuevo < 0 || nuevo >= this.totalFiltrado) return;
        const paginaDestino = Math.floor(nuevo / this.paginaLimite) + 1;
        this.paginaOffset = nuevo;
        await this.cargar(false, `Cargando página ${paginaDestino}…`);
    },

    async cargar(forzar = false, mensaje = "Cargando inventario…", gestionarBloqueo = true) {
        // Si el llamador ya mostró el overlay (cargarTodo), debe permitirse la consulta.
        if ((this.importando && !forzar) || (this.cargandoVista && gestionarBloqueo)) return;
        const bloquearVista = gestionarBloqueo && !this.importando;
        if (bloquearVista) this.mostrarCargaVista(true, mensaje);
        try {
            const respuesta = await api.listarInventarioMercadoLibre({
                buscar: document.getElementById("txtBuscarMl").value,
                estado: document.getElementById("cmbEstadoMl").value,
                stock: document.getElementById("cmbStockMl").value,
                estadoPublicacion: document.getElementById("cmbEstadoPublicacionMl").value,
                variantes: document.getElementById("cmbVariantesMl").value,
                offset: this.paginaOffset,
                limite: this.paginaLimite
            });
            if (!respuesta.ok) throw new Error(respuesta.mensaje);
            this.registros = respuesta.registros || [];
            this.totalFiltrado = Number(respuesta.total || this.registros.length);
            this.render();
        } catch (error) {
            mostrarMensaje(error.message, "danger", 6000);
        } finally {
            if (bloquearVista) this.mostrarCargaVista(false);
        }
    },

    mostrarCargaVista(mostrar, mensaje = "Cargando inventario…") {
        const overlay = document.getElementById("overlayCargaVistaMl");
        if (!overlay) return;

        if (mostrar) {
            this.cargandoVista = true;
            document.getElementById("mensajeCargaVistaMl").textContent = mensaje;
            this.focoPrevioCarga = document.activeElement;
            overlay.classList.remove("d-none");
            overlay.setAttribute("aria-hidden", "false");
            document.body.classList.add("ml-cargando-vista");
            this.manejadorTecladoCarga = event => {
                if (!this.cargandoVista) return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                if (document.activeElement !== overlay) overlay.focus({ preventScroll: true });
            };
            document.addEventListener("keydown", this.manejadorTecladoCarga, true);
            document.addEventListener("keyup", this.manejadorTecladoCarga, true);
            setTimeout(() => overlay.focus({ preventScroll: true }), 0);
        } else {
            this.cargandoVista = false;
            overlay.classList.add("d-none");
            overlay.setAttribute("aria-hidden", "true");
            document.body.classList.remove("ml-cargando-vista");
            if (this.manejadorTecladoCarga) {
                document.removeEventListener("keydown", this.manejadorTecladoCarga, true);
                document.removeEventListener("keyup", this.manejadorTecladoCarga, true);
            }
            this.manejadorTecladoCarga = null;
            if (this.focoPrevioCarga && typeof this.focoPrevioCarga.focus === "function") {
                setTimeout(() => this.focoPrevioCarga.focus({ preventScroll: true }), 0);
            }
            this.focoPrevioCarga = null;
        }
    },

    render() {
        const desde = this.totalFiltrado ? this.paginaOffset + 1 : 0;
        const hasta = Math.min(this.paginaOffset + this.registros.length, this.totalFiltrado);
        document.getElementById("lblCantidadMl").textContent = `${desde.toLocaleString("es-AR")}-${hasta.toLocaleString("es-AR")} de ${this.totalFiltrado.toLocaleString("es-AR")} registros`;
        document.getElementById("lblPaginaMl").textContent = this.totalFiltrado ? `Página ${Math.floor(this.paginaOffset / this.paginaLimite) + 1} de ${Math.ceil(this.totalFiltrado / this.paginaLimite)}` : "Sin resultados";
        document.getElementById("btnPaginaAnteriorMl").disabled = this.paginaOffset <= 0;
        document.getElementById("btnPaginaSiguienteMl").disabled = this.paginaOffset + this.registros.length >= this.totalFiltrado;

        if (!this.registros.length) {
            document.getElementById("tablaMl").innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay registros para estos filtros.</td></tr>';
            return;
        }

        const grupos = this.agruparPorPublicacion(this.registros);
        document.getElementById("tablaMl").innerHTML = grupos.map(grupo => this.renderPublicacion(grupo)).join("");
    },

    agruparPorPublicacion(registros) {
        const mapa = new Map();
        registros.forEach((registro, indice) => {
            const itemId = String(registro.ItemID || `SIN-ITEM-${indice}`);
            if (!mapa.has(itemId)) mapa.set(itemId, { itemId, registros: [] });
            mapa.get(itemId).registros.push({ registro, indice });
        });
        return Array.from(mapa.values());
    },

    renderPublicacion(grupo) {
        const filas = grupo.registros;
        const principal = filas[0].registro;
        const tieneVariantes = filas.some(x => Boolean(x.registro.VariationID)) || filas.length > 1;

        if (!tieneVariantes) return this.renderFilaInventario(principal, filas[0].indice, false);

        const expandida = this.publicacionesExpandidas.has(grupo.itemId);
        const stockConfiable = filas.every(x => !(x.registro.StockConfiable === false || String(x.registro.StockConfiable) === "false"));
        const stockTotal = filas.reduce((total, x) => total + Number(x.registro.StockTotal || 0), 0);
        const estadoStock = this.estadoStock(stockTotal, stockConfiable, false);
        const estadoPublicacion = principal.EstadoPublicacion || principal.Status || "—";
        const itemSeguro = this.e(grupo.itemId);

        const padre = `<tr class="ml-publicacion-padre" role="button" tabindex="0" aria-expanded="${expandida}" title="${expandida ? "Contraer" : "Expandir"} variantes" onclick="MercadoLibreUI.alternarPublicacion('${itemSeguro}')" onkeydown="MercadoLibreUI.teclaPublicacion(event, '${itemSeguro}')">
            <td>
                <div class="d-flex align-items-start gap-2">
                    <button type="button" class="btn btn-sm btn-link p-0 ml-arbol-toggle" aria-label="${expandida ? "Contraer" : "Expandir"} publicación" aria-expanded="${expandida}" onclick="event.stopPropagation(); MercadoLibreUI.alternarPublicacion('${itemSeguro}')">
                        <i class="bi ${expandida ? "bi-caret-down-fill" : "bi-caret-right-fill"}"></i>
                    </button>
                    <div class="min-w-0"><strong class="d-block text-truncate" title="${this.e(principal.Titulo)}">${this.e(principal.Titulo)}</strong><small class="text-muted">${itemSeguro}</small></div>
                </div>
            </td>
            <td class="text-end"><strong>${stockTotal.toLocaleString("es-AR")}</strong><br><span class="badge ${estadoStock.clase}">${estadoStock.texto}</span></td>
            <td><small>${filas.length.toLocaleString("es-AR")} variantes</small></td>
            <td><span class="text-muted">Ver variantes</span></td>
            <td><span class="text-muted">—</span></td>
            <td><span class="text-muted">—</span></td>
            <td><span class="badge text-bg-secondary">${this.e(estadoPublicacion)}</span></td>
            <td class="text-nowrap">${principal.Permalink ? `<a class="btn btn-sm btn-outline-secondary" href="${this.e(principal.Permalink)}" target="_blank" rel="noopener" title="Abrir publicación"><i class="bi bi-box-arrow-up-right"></i></a>` : ""}</td>
        </tr>`;

        const hijas = expandida ? filas.map(x => this.renderFilaInventario(x.registro, x.indice, true)).join("") : "";
        return padre + hijas;
    },

    renderFilaInventario(r, indice, esHija) {
        const confiable = !(r.StockConfiable === false || String(r.StockConfiable) === "false");
        const estadoStock = this.estadoStock(Number(r.StockTotal || 0), confiable, Boolean(r.StockBajo));
        const titulo = esHija ? (r.Variante || `Variante ${r.VariationID || ""}`) : r.Titulo;
        const subtitulo = esHija
            ? `Var. ${this.e(r.VariationID || "—")}`
            : `${this.e(r.ItemID)}${r.VariationID ? ` · Var. ${this.e(r.VariationID)}` : ""}`;
        const claseFila = esHija ? "ml-variante-hija" : "";
        const arbol = esHija ? '<span class="ml-arbol-rama" aria-hidden="true">└</span>' : "";

        return `<tr class="${claseFila}">
            <td><div class="d-flex align-items-start">${arbol}<div class="min-w-0"><strong class="d-block text-truncate" title="${this.e(titulo)}">${this.e(titulo || "Sin descripción")}</strong><small class="text-muted">${subtitulo}</small>${!esHija && r.Variante ? `<br><span class="text-muted">${this.e(r.Variante)}</span>` : ""}</div></div></td>
            <td class="text-end"><strong>${Number(r.StockTotal || 0).toLocaleString("es-AR")}</strong><br><span class="badge ${estadoStock.clase}">${estadoStock.texto}</span>${r.StockMinimo !== "" && r.StockMinimo != null ? `<br><small>Mín. POS: ${Number(r.StockMinimo)}</small>` : ""}</td>
            <td><small>Vend.: ${Number(r.StockVendedor || 0).toLocaleString("es-AR")} · Full: ${Number(r.StockFull || 0).toLocaleString("es-AR")}<br>${this.e(r.TipoStock || "")}</small></td>
            <td><code>${this.e(r.SKUMercadoLibre || "—")}</code></td>
            <td>${r.ProductoID ? `<strong>${this.e(r.ProductoID)}</strong>` : '<span class="text-muted">Sin vincular</span>'}</td>
            <td><code>${this.e(r.SKULocal || "—")}</code></td>
            <td><span class="badge ${this.badge(r.EstadoVinculacion)}">${this.e(r.EstadoVinculacion)}</span>${r.UltimoError ? `<br><small class="text-danger">${this.e(r.UltimoError)}</small>` : ""}</td>
            <td class="text-nowrap"><button class="btn btn-sm btn-outline-primary" onclick="MercadoLibreUI.abrirVincular(${indice})"><i class="bi bi-link"></i></button> ${r.VinculacionID && r.EstadoVinculacion !== "SKU_COINCIDENTE" ? `<button class="btn btn-sm btn-success" onclick="MercadoLibreUI.actualizarSku('${this.e(r.VinculacionID)}')" title="Actualizar SKU en Mercado Libre"><i class="bi bi-cloud-upload"></i></button>` : ""} ${r.Permalink ? `<a class="btn btn-sm btn-outline-secondary" href="${this.e(r.Permalink)}" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right"></i></a>` : ""}</td>
        </tr>`;
    },

    estadoStock(stockTotal, confiable, stockBajo) {
        if (stockBajo) return { clase: "text-bg-warning", texto: "Stock bajo" };
        if (!confiable) return { clase: "text-bg-secondary", texto: "No informado" };
        return Number(stockTotal || 0) > 0
            ? { clase: "text-bg-success", texto: "Con stock" }
            : { clase: "text-bg-danger", texto: "Sin stock" };
    },

    alternarPublicacion(itemId) {
        if (this.publicacionesExpandidas.has(itemId)) this.publicacionesExpandidas.delete(itemId);
        else this.publicacionesExpandidas.add(itemId);
        this.render();
    },

    teclaPublicacion(event, itemId) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        this.alternarPublicacion(itemId);
    },

    abrirVincular(i) { this.actual = this.registros[i]; document.getElementById("detalleMl").innerHTML = `<strong>${this.e(this.actual.Titulo)}</strong><br>${this.e(this.actual.Variante || "Sin variante")}<br>Stock ML: ${Number(this.actual.StockTotal || 0)} · SKU ML: ${this.e(this.actual.SKUMercadoLibre || "vacío")}`; document.getElementById("txtBuscarProductoMl").value = [this.actual.ColorML, this.actual.TalleML].filter(Boolean).join(" "); document.getElementById("listaProductosMl").innerHTML = '<div class="text-center text-muted py-3">Presioná Buscar.</div>'; this.modal.show(); setTimeout(() => document.getElementById("txtBuscarProductoMl").focus(), 300); },
    async buscarProductos() { try { const r = await api.buscarProductosVinculacionMercadoLibre(document.getElementById("txtBuscarProductoMl").value); if (!r.ok) throw new Error(r.mensaje); document.getElementById("listaProductosMl").innerHTML = (r.productos || []).map(p => `<button type="button" class="list-group-item list-group-item-action" onclick="MercadoLibreUI.vincular('${this.e(p.IdProducto)}')"><div class="d-flex justify-content-between"><strong>${this.e(p.Descripcion)}</strong><code>${this.e(p.SKU || "SIN SKU")}</code></div><small>${this.e(p.IdProducto)} · ${this.e(p.Marca)} · ${this.e(p.Color)} · ${this.e(p.Talle)} · ${this.e(p.CodigoBarras)}</small>${p.CodigosProveedor ? `<br><small class="text-muted">Proveedor: ${this.e(p.CodigosProveedor)}</small>` : ""}</button>`).join("") || '<div class="text-center text-muted py-3">No se encontraron productos.</div>'; } catch (e) { mostrarMensaje(e.message, "danger", 5000); } },
    async vincular(productoId) { try { const r = await api.guardarVinculacionMercadoLibre({ itemId: this.actual.ItemID, variationId: this.actual.VariationID, userProductId: this.actual.UserProductID, skuMercadoLibre: this.actual.SKUMercadoLibre, productoId }); if (!r.ok) throw new Error(r.mensaje); this.modal.hide(); mostrarMensaje(r.mensaje, "success", 3000); await this.cargar(); } catch (e) { mostrarMensaje(e.message, "danger", 6000); } },
    async actualizarSku(id) { if (!confirm("Se actualizará el atributo SELLER_SKU de esta variante en Mercado Libre. ¿Continuar?")) return; try { const r = await api.actualizarSkuMercadoLibre(id); if (!r.ok) throw new Error(r.mensaje); mostrarMensaje(r.mensaje, "success", 3500); await this.cargar(); } catch (e) { mostrarMensaje(e.message, "danger", 7000); } },
    badge(e) { return e === "SKU_COINCIDENTE" ? "text-bg-success" : e === "ACTUALIZACION_PENDIENTE" ? "text-bg-warning" : e === "ERROR" ? "text-bg-danger" : "text-bg-secondary"; },
    e(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c])); }
};

document.addEventListener("pos:sesion-lista", () => MercadoLibreUI.init(), { once: true });
