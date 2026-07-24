function establecerTexto(idElemento, valor) {
    const elemento = document.getElementById(idElemento);
    if (elemento) elemento.textContent = valor;
}

function obtenerSimboloMoneda() {
    return AppState.configuracion.SimboloMoneda || "$";
}

function formatearMoneda(valor) {
    return `${obtenerSimboloMoneda()} ${Number(valor || 0).toLocaleString("es-AR")}`;
}
