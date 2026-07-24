function mostrarMensaje(mensaje, tipo = "success", duracion = 3500) {

    const contenedor =
        document.getElementById("contenedorMensajes");

    if (!contenedor) {
        console.log(mensaje);
        return;
    }

    const idMensaje = "mensaje-" + Date.now();

    contenedor.insertAdjacentHTML("beforeend", `
        <div
            id="${idMensaje}"
            class="alert alert-${tipo} alert-dismissible fade show shadow"
            role="alert">

            ${mensaje}

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert">
            </button>
        </div>
    `);

    window.setTimeout(() => {

        const elemento = document.getElementById(idMensaje);

        if (elemento) {
            elemento.remove();
        }

    }, duracion);
}