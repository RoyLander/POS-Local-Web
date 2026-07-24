class Carrito {
    constructor() {
        this.items = [];
    }

    agregar(producto) {
        const stockDisponible = Number(producto.Stock || 0);
        const item = this.items.find(actual => actual.IdProducto == producto.IdProducto);

        if (item) {
            if (item.Cantidad + 1 > item.StockDisponible) {
                return { ok: false, mensaje: "No hay más stock disponible para este producto." };
            }
            item.Cantidad++;
            item.Subtotal = item.Cantidad * item.PrecioVenta;
            return { ok: true };
        }

        if (stockDisponible <= 0) {
            return { ok: false, mensaje: "Este producto no tiene stock disponible." };
        }

        this.items.push({
            IdProducto: producto.IdProducto,
            SKU: producto.SKU,
            CodigoBarras: producto.CodigoBarras,
            Descripcion: producto.Descripcion,
            Marca: producto.Marca,
            Color: producto.Color,
            Talle: producto.Talle,
            PrecioVenta: Number(producto.PrecioVenta || 0),
            StockDisponible: stockDisponible,
            Cantidad: 1,
            Subtotal: Number(producto.PrecioVenta || 0)
        });

        return { ok: true };
    }

    aumentar(idProducto) {
        const item = this.items.find(actual => actual.IdProducto == idProducto);
        if (!item) return { ok: false, mensaje: "El producto no existe en el carrito." };

        if (item.Cantidad + 1 > item.StockDisponible) {
            return { ok: false, mensaje: "No hay más stock disponible para este producto." };
        }

        item.Cantidad++;
        item.Subtotal = item.Cantidad * item.PrecioVenta;
        return { ok: true };
    }

    disminuir(idProducto) {
        const item = this.items.find(actual => actual.IdProducto == idProducto);
        if (!item) return { ok: false };

        item.Cantidad--;
        if (item.Cantidad <= 0) {
            this.eliminar(idProducto);
            return { ok: true };
        }

        item.Subtotal = item.Cantidad * item.PrecioVenta;
        return { ok: true };
    }

    eliminar(idProducto) {
        this.items = this.items.filter(item => item.IdProducto != idProducto);
        return { ok: true };
    }

    vaciar() {
        this.items = [];
    }

    getItems() {
        return this.items;
    }

    getTotal() {
        return this.items.reduce((total, item) => total + item.Subtotal, 0);
    }
}
