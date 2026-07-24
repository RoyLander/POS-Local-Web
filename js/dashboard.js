function actualizarDashboard() {

    const items = carrito.getItems();

    const articulos = items.length;

    const unidades = items.reduce(
        (total, item) => total + Number(item.Cantidad),
        0
    );

    const total = carrito.getTotal();
    const simbolo = obtenerSimboloMoneda();

    const lblArticulos =
        document.getElementById("lblArticulos");

    const lblUnidades =
        document.getElementById("lblUnidades");

    const lblTotalMini =
        document.getElementById("lblTotalMini");

    if (lblArticulos) {
        lblArticulos.textContent = articulos;
    }

    if (lblUnidades) {
        lblUnidades.textContent = unidades;
    }

    if (lblTotalMini) {
        lblTotalMini.textContent =
            `${simbolo} ${total.toLocaleString("es-AR")}`;
    }
}