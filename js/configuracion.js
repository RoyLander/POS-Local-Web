const Configuracion = {
    async cargar() {
        try {
            const resultado = await api.obtenerConfiguracion();
            if (!resultado.ok) {
                mostrarMensaje(resultado.mensaje || "No fue posible cargar la configuración.", "warning");
                return;
            }
            AppState.configuracion = resultado.configuracion || {};
            Configuracion.aplicar();
        } catch (error) {
            console.error(error);
            mostrarMensaje("No se pudo cargar la configuración. Se utilizarán los valores locales.", "warning");
        }
    },

    aplicar() {
        establecerTexto("lblNombreSistema", AppState.configuracion.NombreSistema || "POS Local");
        establecerTexto("lblNombreNegocio", AppState.configuracion.NombreNegocio || "");
        establecerTexto("lblNumeroCaja", AppState.configuracion.NumeroCaja || "1");
        establecerTexto("lblUsuario", AppState.configuracion.UsuarioDefault || "ADMIN");
        establecerTexto("lblVersion", AppState.configuracion.Version || "0.8.1");
        document.title = `${AppState.configuracion.NombreSistema || "POS Local"} - ${AppState.configuracion.NombreNegocio || ""}`;
    }
};
