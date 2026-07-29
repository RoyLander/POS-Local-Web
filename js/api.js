class Api {

    constructor() {
        this.url = CONFIG.API;
    }


    async get(parametros) {

        const token = localStorage.getItem("pos_token") || "";
        parametros = Object.assign({}, parametros, token ? { token } : {});
        const query =
            new URLSearchParams(parametros);

        const respuesta =
            await fetch(
                `${this.url}?${query.toString()}`
            );

        return await respuesta.json();
    }


    async post(datos) {

        const respuesta =
            await fetch(
                this.url,
                {
                    method: "POST",
                    body: JSON.stringify(Object.assign({}, datos, { token: localStorage.getItem("pos_token") || "" }))
                }
            );

        return await respuesta.json();
    }


    async buscar(texto) {

        return await this.get({
            accion: "buscarProducto",
            buscar: texto
        });
    }


    async registrarVenta(venta) {

        return await this.post({
            accion: "registrarVenta",
            items: venta.items,
            total: venta.total,
            medioPago: venta.medioPago,
            pagos: venta.pagos,
            numeroCaja: venta.numeroCaja,
            usuario: venta.usuario
        });
    }


    async obtenerMediosPago(incluirInactivos = false) {
        return await this.get({
            accion: "obtenerMediosPago",
            incluirInactivos: String(Boolean(incluirInactivos))
        });
    }

    async guardarMedioPago(medioPago) {
        return await this.post({ accion: "guardarMedioPago", medioPago });
    }

    async cambiarEstadoMedioPago(idMedioPago, activo) {
        return await this.post({ accion: "cambiarEstadoMedioPago", idMedioPago, activo });
    }


    async obtenerConfiguracion() {

        return await this.get({
            accion: "obtenerConfiguracion"
        });
    }


    async guardarProducto(producto) {

        return await this.post({
            accion: "guardarProducto",
            producto: producto
        });
    }


    async guardarProductosMasivo(productos) {

        return await this.post({
            accion: "guardarProductosMasivo",
            productos: productos
        });
    }


    async cambiarEstadoProducto(
        idProducto,
        estado
    ) {

        return await this.post({
            accion: "cambiarEstadoProducto",
            idProducto: idProducto,
            estado: estado
        });
    }


    async registrarMovimientoInventario(
        movimiento
    ) {

        return await this.post({
            accion: "registrarMovimientoInventario",
            movimiento: movimiento
        });
    }


    async obtenerKardex(idProducto) {

        return await this.get({
            accion: "obtenerKardex",
            idProducto: idProducto
        });
    }


    async buscarVentas(filtros = {}) {

        return await this.get({
            accion: "buscarVentas",
            fechaDesde:
                filtros.fechaDesde || "",
            fechaHasta:
                filtros.fechaHasta || "",
            numeroComprobante:
                filtros.numeroComprobante || "",
            medioPago:
                filtros.medioPago || "",
            estado:
                filtros.estado || "",
            usuario:
                filtros.usuario || ""
        });
    }


    async obtenerVenta(idVenta) {

        return await this.get({
            accion: "obtenerVenta",
            idVenta: idVenta
        });
    }


    async anularVenta(
        idVenta,
        motivo,
        usuario
    ) {

        return await this.post({
            accion: "anularVenta",
            idVenta: idVenta,
            motivo: motivo,
            usuario: usuario
        });
    }


    async verificarEstructura() {

        return await this.get({
            accion: "verificarEstructura"
        });
    }


    async obtenerCajaAbierta(numeroCaja) {

        return await this.get({
            accion: "obtenerCajaAbierta",
            numeroCaja: numeroCaja
        });
    }


    async obtenerResumenCaja(idCaja) {

        return await this.get({
            accion: "obtenerResumenCaja",
            idCaja: idCaja
        });
    }


    async abrirCaja(datos) {

        return await this.post({
            accion: "abrirCaja",
            numeroCaja: datos.numeroCaja,
            usuario: datos.usuario,
            montoInicial: datos.montoInicial,
            observacion: datos.observacion
        });
    }


    async registrarMovimientoCaja(datos) {

        return await this.post({
            accion: "registrarMovimientoCaja",
            idCaja: datos.idCaja,
            tipo: datos.tipo,
            concepto: datos.concepto,
            importe: datos.importe,
            observacion: datos.observacion,
            usuario: datos.usuario
        });
    }


    async cerrarCaja(datos) {

        return await this.post({
            accion: "cerrarCaja",
            idCaja: datos.idCaja,
            efectivoContado:
                datos.efectivoContado,
            observacion:
                datos.observacion,
            usuario:
                datos.usuario
        });
    }


    async obtenerProductosConteo() {

        return await this.get({
            accion: "obtenerProductosConteo"
        });
    }


    async aplicarConteoInventario(datos) {

        return await this.post({
            accion: "aplicarConteoInventario",
            conteo: datos.conteo,
            observacion: datos.observacion,
            usuario: datos.usuario
        });
    }


    async obtenerMaestros(incluirInactivos = false) {
        return await this.get({ accion: "obtenerMaestros", incluirInactivos: incluirInactivos ? "true" : "false" });
    }

    async guardarMaestro(maestro) {
        return await this.post({ accion: "guardarMaestro", maestro });
    }

    async cambiarEstadoMaestro(idMaestro, activo) {
        return await this.post({ accion: "cambiarEstadoMaestro", idMaestro, activo });
    }

    async iniciarSesion(usuario, pin) { return await this.post({accion:"iniciarSesion", usuario, pin}); }
    async cerrarSesion() { return await this.post({accion:"cerrarSesion"}); }
    async obtenerSesionActual() { return await this.get({accion:"obtenerSesionActual"}); }
    async obtenerUsuarios(incluirInactivos=false) { return await this.get({accion:"obtenerUsuarios", incluirInactivos:String(incluirInactivos)}); }
    async guardarUsuario(usuarioDatos) { return await this.post({accion:"guardarUsuario", usuarioDatos}); }
    async cambiarEstadoUsuario(idUsuario, activo) { return await this.post({accion:"cambiarEstadoUsuario", idUsuario, activo}); }
    async buscarVentasParaDevolucion(filtros={}) { return await this.get(Object.assign({accion:"buscarVentasParaDevolucion"}, filtros)); }
    async buscarVentaParaDevolucion(criterio) { return await this.get({accion:"buscarVentaParaDevolucion", criterio}); }
    async registrarDevolucion(datos) { return await this.post(Object.assign({accion:"registrarDevolucion"}, datos)); }
    async listarDevoluciones(filtros={}) { return await this.get(Object.assign({accion:"listarDevoluciones"}, filtros)); }
    async obtenerDevolucion(idDevolucion) { return await this.get({accion:"obtenerDevolucion", idDevolucion}); }

    async buscarVentasParaCambio(filtros={}) { return await this.get(Object.assign({accion:"buscarVentasParaCambio"}, filtros)); }
    async obtenerVentaParaCambio(idVenta) { return await this.get({accion:"obtenerVentaParaCambio", idVenta}); }
    async obtenerHistorialComercialVenta(idVenta) { return await this.get({accion:"obtenerHistorialComercialVenta", idVenta}); }
    async buscarProductosParaCambio(criterio) { return await this.get({accion:"buscarProductosParaCambio", criterio}); }
    async registrarCambio(datos) { return await this.post(Object.assign({accion:"registrarCambio"}, datos)); }
    async listarCambios(filtros={}) { return await this.get(Object.assign({accion:"listarCambios"}, filtros)); }
    async obtenerCambio(idCambio) { return await this.get({accion:"obtenerCambio", idCambio}); }

    async obtenerAuditoria(filtros={}) { return await this.post({accion:"obtenerAuditoria", filtros}); }

    async auditarSkusProductos() {
        return await this.get({ accion: "auditarSkusProductos" });
    }

    async aplicarPropuestasSku(propuestas) {
        return await this.post({ accion: "aplicarPropuestasSku", propuestas });
    }

    async obtenerEstadoMercadoLibre() {
        return await this.get({ accion: "obtenerEstadoMercadoLibre" });
    }

    async obtenerUrlAutorizacionMercadoLibre() {
        return await this.get({ accion: "obtenerUrlAutorizacionMercadoLibre" });
    }

    async listarInventarioMercadoLibre(filtros = {}) {
        return await this.get({
            accion: "listarInventarioMercadoLibre",
            buscar: filtros.buscar || "",
            estado: filtros.estado || "",
            stock: filtros.stock || "",
            estadoPublicacion: filtros.estadoPublicacion || "",
            variantes: filtros.variantes || "",
            offset: Number(filtros.offset || 0),
            limite: Number(filtros.limite || 200)
        });
    }

    async buscarProductosVinculacionMercadoLibre(criterio) {
        return await this.get({ accion: "buscarProductosVinculacionMercadoLibre", criterio: criterio || "" });
    }

    async importarInventarioMercadoLibre(opciones = {}) {
        return await this.post({ accion: "importarInventarioMercadoLibre", opciones });
    }

    async guardarVinculacionMercadoLibre(vinculacion) {
        return await this.post({ accion: "guardarVinculacionMercadoLibre", vinculacion });
    }

    async actualizarSkuMercadoLibre(vinculacionId) {
        return await this.post({ accion: "actualizarSkuMercadoLibre", vinculacionId });
    }

    async obtenerResumenImportacionMercadoLibre(importacionId) {
        return await this.get({ accion: "obtenerResumenImportacionMercadoLibre", importacionId });
    }

    async marcarImportacionMercadoLibreConError(importacionId, mensaje) {
        return await this.post({ accion: "marcarImportacionMercadoLibreConError", importacionId, mensaje });
    }

    async desconectarMercadoLibre() {
        return await this.post({ accion: "desconectarMercadoLibre" });
    }

}

// Instancia global compartida por seguridad, navegación y módulos independientes.
window.api = window.api || new Api();
