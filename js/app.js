const api = new Api();
const carrito = new Carrito();

const AppState = {
    configuracion: {},
    productosEncontrados: [],
    ultimoTextoBuscado: "",
    usuario: null,
    ventaActual: null
};

document.addEventListener("DOMContentLoaded", async () => {
    await Configuracion.cargar();
    Productos.inicializar();
    Teclado.inicializar();
    Ventas.actualizarCarrito();
    Productos.enfocar();
});
