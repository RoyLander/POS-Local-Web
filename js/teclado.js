const Teclado = {
    inicializar() {
        document.addEventListener("keydown", evento => {
            if (evento.key === "F2") {
                evento.preventDefault();
                Productos.enfocar();
                document.getElementById("txtBuscar")?.select();
                return;
            }

            if (evento.key === "F4") {
                evento.preventDefault();
                Ventas.finalizar();
                return;
            }

            if (evento.key === "Escape") {
                evento.preventDefault();
                Ventas.cancelar();
            }
        });
    }
};
