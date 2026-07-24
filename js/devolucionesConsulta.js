const ConsultaDev = {
  detalleActual: null,
  modal: null,

  moneda(valor) {
    return Number(valor || 0).toLocaleString("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2
    });
  },

  fecha(valor) {
    if (!valor) return "-";
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? this.esc(valor) : fecha.toLocaleString("es-AR");
  },

  async cargar() {
    const filtros = {
      numero: document.getElementById("filtroNumero").value.trim(),
      descripcion: document.getElementById("filtroProducto").value.trim(),
      fechaVenta: document.getElementById("filtroFechaVenta").value
    };
    const r = await api.listarDevoluciones(filtros);
    const t = document.getElementById("tabla");
    t.innerHTML = (r.devoluciones || []).map(x => `<tr>
      <td>${this.esc(x.NumeroDevolucion)}</td><td>${this.esc(x.NumeroVentaOriginal)}</td>
      <td>${this.fecha(x.FechaVenta)}</td>
      <td>${this.fecha(x.FechaHora)}</td>
      <td>${this.esc(x.Productos || "")}</td><td>${this.esc(x.UsuarioOperador)}</td><td>${this.esc(x.UsuarioAutorizante)}</td>
      <td class="text-end">${this.moneda(x.ImporteReconocido)}</td>
      <td><button class="btn btn-sm btn-outline-primary" onclick="ConsultaDev.ver('${this.esc(x.IdDevolucion)}')"><i class="bi bi-eye me-1"></i>Ver</button></td></tr>`).join("") || '<tr><td colspan="9" class="text-center text-muted">Sin resultados</td></tr>';
  },

  async ver(id) {
    const r = await api.obtenerDevolucion(id);
    if (!r.ok) {
      this.mostrarError(r.mensaje || "No se pudo consultar la devolución.");
      return;
    }

    this.detalleActual = r;
    const d = r.devolucion || {};
    document.getElementById("modalDetalleDevolucionTitulo").textContent =
      `${d.NumeroDevolucion || "Devolución"} · Venta ${d.NumeroVentaOriginal || "-"}`;

    const filasDetalle = (r.detalle || []).map(x => `<tr>
      <td>${this.esc(x.Descripcion || "")}</td>
      <td>${this.esc(x.SKU || "-")}</td>
      <td class="text-end">${Number(x.CantidadDevueltaActual || 0)}</td>
      <td>${this.esc(x.EstadoProducto || "-")}</td>
      <td>${String(x.ReingresaStock || "").toUpperCase() === "SI" ? '<span class="badge text-bg-success">Sí</span>' : '<span class="badge text-bg-secondary">No</span>'}</td>
      <td class="text-end">${this.moneda(x.ImporteReconocido)}</td>
    </tr>`).join("");

    const filasReintegros = (r.reintegros || []).map(x => `<tr>
      <td>${this.esc(x.MedioPago || "")}</td>
      <td>${this.esc(x.Estado || "")}</td>
      <td>${this.esc(x.ReferenciaExterna || "-")}</td>
      <td class="text-end">${this.moneda(x.Importe)}</td>
    </tr>`).join("");

    document.getElementById("modalDetalleDevolucionCuerpo").innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-3"><div class="small text-muted">Fecha devolución</div><strong>${this.fecha(d.FechaHora)}</strong></div>
        <div class="col-md-3"><div class="small text-muted">Operador</div><strong>${this.esc(d.UsuarioOperador || "-")}</strong></div>
        <div class="col-md-3"><div class="small text-muted">Autorizante</div><strong>${this.esc(d.UsuarioAutorizante || "-")}</strong></div>
        <div class="col-md-3"><div class="small text-muted">Total reconocido</div><strong>${this.moneda(d.ImporteReconocido)}</strong></div>
      </div>
      <h6>Artículos devueltos</h6>
      <div class="table-responsive mb-3"><table class="table table-sm align-middle">
        <thead><tr><th>Producto</th><th>SKU</th><th class="text-end">Cantidad</th><th>Estado</th><th>Stock</th><th class="text-end">Importe</th></tr></thead>
        <tbody>${filasDetalle || '<tr><td colspan="6" class="text-center text-muted">Sin detalle</td></tr>'}</tbody>
      </table></div>
      <h6>Reintegros</h6>
      <div class="table-responsive"><table class="table table-sm align-middle mb-0">
        <thead><tr><th>Medio</th><th>Estado</th><th>Referencia</th><th class="text-end">Importe</th></tr></thead>
        <tbody>${filasReintegros || '<tr><td colspan="4" class="text-center text-muted">Sin reintegros</td></tr>'}</tbody>
      </table></div>
      ${d.Observaciones ? `<div class="alert alert-light border mt-3 mb-0"><strong>Observaciones:</strong> ${this.esc(d.Observaciones)}</div>` : ""}`;

    this.modal.show();
  },

  imprimir() {
    if (!this.detalleActual) return;
    window.print();
  },

  mostrarError(mensaje) {
    const cuerpo = document.getElementById("modalDetalleDevolucionCuerpo");
    document.getElementById("modalDetalleDevolucionTitulo").textContent = "No se pudo completar la consulta";
    cuerpo.innerHTML = `<div class="alert alert-danger mb-0">${this.esc(mensaje)}</div>`;
    this.modal.show();
  },

  esc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
};

document.addEventListener("DOMContentLoaded", () => {
  ConsultaDev.modal = new bootstrap.Modal(document.getElementById("modalDetalleDevolucion"));
  document.getElementById("buscar").onclick = () => ConsultaDev.cargar();
  document.getElementById("imprimirDevolucion").onclick = () => ConsultaDev.imprimir();
  ["filtroNumero", "filtroProducto"].forEach(id => {
    document.getElementById(id).onkeydown = e => {
      if (e.key === "Enter") ConsultaDev.cargar();
    };
  });
  document.addEventListener("pos:sesion-lista", () => ConsultaDev.cargar());
});
