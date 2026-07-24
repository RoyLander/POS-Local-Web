const Comprobante = {
    crear(datos) {
        const pagos = Array.isArray(datos.pagos) ? datos.pagos : [];
        const subtotalPagos = pagos.reduce((total, pago) => total + Number(pago.ImporteBase || 0), 0);
        const descuentoPagos = pagos.reduce((total, pago) => total + Number(pago.ImporteDescuento || 0), 0);
        const totalPagos = pagos.reduce((total, pago) => total + Number(pago.ImporteCobrado || 0), 0);

        return {
            numero: datos.numero,
            fechaHora: datos.fechaHora || new Date(),
            negocio: {
                nombreSistema: AppState.configuracion.NombreSistema || "POS Local",
                nombreNegocio: AppState.configuracion.NombreNegocio || "",
                direccion: AppState.configuracion.Direccion || "",
                telefono: AppState.configuracion.Telefono || "",
                cuit: AppState.configuracion.CUIT || ""
            },
            caja: AppState.configuracion.NumeroCaja || "1",
            usuario: AppState.configuracion.UsuarioDefault || "ADMIN",
            medioPago: datos.medioPago,
            pagos: pagos,
            subtotal: Number(pagos.length ? subtotalPagos : (datos.subtotal ?? datos.total ?? 0)),
            descuento: Number(pagos.length ? descuentoPagos : (datos.descuento || 0)),
            idVenta: datos.idVenta || "",
            items: datos.items.map(item => ({
                idProducto: item.IdProducto,
                sku: item.SKU || "",
                codigoBarras: item.CodigoBarras || "",
                descripcion: item.Descripcion || "",
                color: item.Color || "",
                talle: item.Talle || "",
                cantidad: Number(item.Cantidad || 0),
                precioUnitario: Number(item.PrecioVenta || 0),
                subtotal: Number(item.Subtotal || 0)
            })),
            total: Number(pagos.length ? totalPagos : (datos.total || 0))
        };
    },

    generarHtml(comprobante) {
        const fecha = new Date(comprobante.fechaHora);
        const fechaTexto = fecha.toLocaleDateString("es-AR");
        const horaTexto = fecha.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        const pagosHtml = (comprobante.pagos || []).map(pago => `<div>${Comprobante.escaparHtml(pago.MedioPago)}: ${formatearMoneda(pago.ImporteCobrado)}${Number(pago.ImporteDescuento || 0) > 0 ? ` (descuento ${formatearMoneda(pago.ImporteDescuento)})` : ""}</div>`).join("");

        const detalle = comprobante.items.map(item => `
            <tr>
                <td>
                    <strong>${Comprobante.escaparHtml(item.descripcion)}</strong>
                    ${item.color || item.talle
                        ? `<div class="muted">
                            ${Comprobante.escaparHtml(item.color)}
                            ${item.talle ? ` · Talle ${Comprobante.escaparHtml(item.talle)}` : ""}
                           </div>`
                        : ""}
                </td>
                <td class="numero">${item.cantidad}</td>
                <td class="numero">${formatearMoneda(item.precioUnitario)}</td>
                <td class="numero">${formatearMoneda(item.subtotal)}</td>
            </tr>
        `).join("");

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Comprobante ${comprobante.numero}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            color: #212529;
            background: #f3f5f7;
        }
        .ticket {
            max-width: 760px;
            margin: 0 auto;
            padding: 24px;
            background: #fff;
            border: 1px solid #dfe3e8;
            border-radius: 10px;
        }
        .ticket-header { text-align: center; margin-bottom: 18px; }
        .ticket-header h1 { margin: 0; font-size: 1.6rem; }
        .ticket-header h2 { margin: 6px 0 0; font-size: 1.1rem; font-weight: normal; }
        .datos {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px 20px;
            margin-bottom: 16px;
            font-size: 0.92rem;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { padding: 9px 6px; border-bottom: 1px solid #e7eaee; vertical-align: top; }
        th { text-align: left; background: #f8f9fa; }
        .numero { text-align: right; white-space: nowrap; }
        .muted { margin-top: 3px; color: #6c757d; font-size: 0.82rem; }
        .total { margin-top: 18px; text-align: right; font-size: 1.5rem; font-weight: bold; }
        .pie { margin-top: 22px; text-align: center; color: #6c757d; font-size: 0.88rem; }
        @media print {
            body { padding: 0; background: #fff; }
            .ticket { max-width: none; border: 0; border-radius: 0; padding: 10mm; }
        }
    </style>
</head>
<body>
    <section class="ticket">
        <header class="ticket-header">
            <h1>${Comprobante.escaparHtml(comprobante.negocio.nombreNegocio)}</h1>
            <h2>${Comprobante.escaparHtml(comprobante.negocio.nombreSistema)}</h2>
            ${comprobante.negocio.direccion
                ? `<div class="muted">${Comprobante.escaparHtml(comprobante.negocio.direccion)}</div>`
                : ""}
            ${comprobante.negocio.cuit
                ? `<div class="muted">CUIT: ${Comprobante.escaparHtml(comprobante.negocio.cuit)}</div>`
                : ""}
        </header>

        <div class="datos">
            <div><strong>Comprobante:</strong> ${Comprobante.escaparHtml(String(comprobante.numero))}</div>
            <div><strong>Fecha:</strong> ${fechaTexto} ${horaTexto}</div>
            <div><strong>Caja:</strong> ${Comprobante.escaparHtml(String(comprobante.caja))}</div>
            <div><strong>Usuario:</strong> ${Comprobante.escaparHtml(String(comprobante.usuario))}</div>
            <div><strong>Medio de pago:</strong> ${Comprobante.escaparHtml(comprobante.medioPago)}</div>
            <div><strong>Pagos:</strong>${pagosHtml || "-"}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Artículo</th>
                    <th class="numero">Cant.</th>
                    <th class="numero">Precio</th>
                    <th class="numero">Subtotal</th>
                </tr>
            </thead>
            <tbody>${detalle}</tbody>
        </table>

        ${comprobante.descuento > 0 ? `<div class="numero">Subtotal: ${formatearMoneda(comprobante.subtotal)}</div><div class="numero">Descuento: -${formatearMoneda(comprobante.descuento)}</div>` : ""}
        <div class="total">Total: ${formatearMoneda(comprobante.total)}</div>
        <footer class="pie">Gracias por su compra.</footer>
    </section>
</body>
</html>`.trim();
    },

    escaparHtml(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
};
