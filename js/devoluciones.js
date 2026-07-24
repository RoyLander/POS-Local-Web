
function ordenarVentasRecientes(ventas) {
  return [...(ventas || [])].sort((a, b) => {
    const fa = new Date(a.FechaHora || a.Fecha || 0).getTime() || 0;
    const fb = new Date(b.FechaHora || b.Fecha || 0).getTime() || 0;
    if (fa !== fb) return fb - fa;
    return String(b.IdVenta || "").localeCompare(String(a.IdVenta || ""), "es", { numeric: true });
  });
}
const DevolucionesUI = {
  venta: null,
  medios: [],

  iniciar() {
    this.bind();
    document.addEventListener("pos:sesion-lista", () => this.configurarRol());
    this.cargarMedios();
    this.agregarReintegro();
  },

  moneda(valor) {
    return Number(valor || 0).toLocaleString("es-AR", {
      style: "currency", currency: "ARS", minimumFractionDigits: 2
    });
  },

  bind() {
    document.getElementById("btnBuscarVenta").onclick = () => this.buscar();
    document.getElementById("criterioVenta").onkeydown = e => { if (e.key === "Enter") this.buscar(); };
    document.getElementById("btnAgregarReintegro").onclick = () => this.agregarReintegro();
    document.getElementById("btnConfirmarDevolucion").onclick = () => this.confirmar();
    document.getElementById("motivoGeneral").onchange = () => this.recalcular();
    const modalHistorial=document.getElementById("modalHistorialComercial");
    modalHistorial.addEventListener("hide.bs.modal",()=>{
      const activo=document.activeElement;
      if(
        activo&&
        modalHistorial.contains(activo)&&
        typeof activo.blur==="function"
      ) activo.blur();
      });
    modalHistorial.addEventListener("hidden.bs.modal",()=>
      setTimeout(
        ()=>      document.getElementById("criterioVenta")?.focus(),
        0
      )
    );
  },

  configurarRol() {
    const u = SeguridadUI.usuario;
  },

  async cargarMedios() {
    try {
      const r = await api.obtenerMediosPago(false);
      this.medios = r.mediosPago || r.medios || [];
      this.renderReintegros();
    } catch (e) { console.error(e); }
  },

  proceso(on, texto) {
    document.getElementById("textoProceso").textContent = texto || "Procesando...";
    document.getElementById("overlayProceso").classList.toggle("d-none", !on);
  },

  async buscar() {
    const criterio = document.getElementById("criterioVenta").value.trim();
    const fechaVenta = document.getElementById("fechaVenta").value;
    if (!criterio && !fechaVenta) return alert("Ingresá un Id, comprobante, producto o fecha de venta.");
    this.proceso(true, "Buscando ventas...");
    try {
      const r = await api.buscarVentasParaDevolucion({ criterio, descripcion: criterio, fechaVenta });
      if (!r.ok) throw new Error(r.mensaje);
      this.renderResultados(r.ventas || []);
    } catch (e) {
      alert(e.message);
    } finally {
      this.proceso(false);
    }
  },

  renderResultados(ventas) {
    ventas = ordenarVentasRecientes(ventas);
    const cont = document.getElementById("resultadosVentas");
    if (!ventas.length) {
      cont.innerHTML = '<div class="alert alert-warning mb-0">No se encontraron ventas con esos filtros.</div>';
      return;
    }
    cont.innerHTML = `<div class="table-responsive"><table class="table table-sm table-hover align-middle mb-0">
      <thead><tr><th>Comprobante</th><th>Fecha</th><th>Productos</th><th class="text-end">Total</th><th></th></tr></thead>
      <tbody>${ventas.map(v => {const d=v.Disponibilidad||{},sin=d.EstadoDisponibilidad==="SIN_DISPONIBILIDAD",parcial=d.EstadoDisponibilidad==="PARCIAL",estado=sin?"Sin disponibilidad":(parcial?"Parcial":"Disponible");return `<tr class="${sin?'fila-sin-disponibilidad':''}">
        <td><strong>${this.esc(v.NumeroComprobante)}</strong><div class="small text-muted">ID ${this.esc(v.IdVenta)}</div><span class="badge ${sin?'bg-secondary':(parcial?'bg-warning text-dark':'bg-success')}">${estado}</span></td>
        <td>${new Date(v.FechaHora).toLocaleString("es-AR")}</td>
        <td>${this.esc(v.Productos || `${v.CantidadItems || 0} artículo(s)`)}<div class="small text-muted">${Number(d.UnidadesDisponibles||0)} unidad(es) disponible(s)</div></td>
        <td class="text-end">${this.moneda(v.Total)}</td>
        <td class="text-end"><div class="d-flex gap-2 justify-content-end flex-wrap"><button class="btn btn-sm btn-outline-dark js-historial" data-id="${this.esc(v.IdVenta)}"><i class="bi bi-clock-history"></i> Historial</button>${sin?'<button class="btn btn-sm btn-secondary" disabled>Sin disponibilidad</button>':`<button class="btn btn-sm btn-outline-primary js-seleccionar" data-id="${this.esc(v.IdVenta)}">Seleccionar</button>`}</div></td>
      </tr>`}).join("")}</tbody></table></div>`;
    cont.querySelectorAll(".js-seleccionar").forEach(btn => btn.onclick = () => this.cargarVenta(btn.dataset.id));
    cont.querySelectorAll(".js-historial").forEach(btn => btn.onclick = () => this.mostrarHistorial(btn.dataset.id));
  },

  async mostrarHistorial(idVenta) {
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalHistorialComercial"));
    const cont = document.getElementById("contenidoHistorialComercial");
    cont.innerHTML = '<div class="text-center py-5"><div class="spinner-border"></div><div class="mt-2">Cargando historial...</div></div>';
    modal.show();
    try {
      const r = await api.obtenerHistorialComercialVenta(idVenta);
      if (!r.ok) throw new Error(r.mensaje || "No se pudo cargar el historial.");
      this.renderHistorial(r);
    } catch (e) {
      cont.innerHTML = `<div class="alert alert-danger">${this.esc(e.message)}</div>`;
    }
  },

  renderHistorial(r) {
    const fecha = v => { const d=new Date(v); return Number.isNaN(d.getTime())?this.esc(v||""):d.toLocaleString("es-AR"); };
    const linea = l => {const mov=l.Movimiento==="ENTRADA"?"Recibido por el local":l.Movimiento==="SALIDA"?"Entregado al cliente":l.Movimiento==="DEVUELTO_CLIENTE"?"Devuelto por el cliente":"Venta";return `<div class="historial-linea"><div><strong>${this.esc(l.Descripcion||"Artículo")}</strong><div class="small text-muted">${this.esc(l.SKU||"")} ${l.Color?" · "+this.esc(l.Color):""}${l.Talle?" · "+this.esc(l.Talle):""}</div><span class="badge text-bg-light border">${mov}</span></div><div class="text-end"><strong>${Number(l.Cantidad||0)}</strong> × ${this.moneda(l.PrecioUnitario||0)}<div>${this.moneda(l.Subtotal||0)}</div></div></div>`;};
    const eventos=(r.eventos||[]).map(e=>{const tipo=e.Tipo==="VENTA"?"Venta original":e.Tipo==="CAMBIO"?"Cambio":"Devolución",icono=e.Tipo==="VENTA"?"bi-receipt":e.Tipo==="CAMBIO"?"bi-arrow-left-right":"bi-arrow-counterclockwise",extra=e.Tipo==="CAMBIO"?`<div class="small">Recibido ${this.moneda(e.TotalRecibido)} · Entregado ${this.moneda(e.TotalEntregado)} · Diferencia ${this.moneda(e.Diferencia)}</div>`:e.Tipo==="DEVOLUCION"?`<div class="small">Reconocido ${this.moneda(e.ImporteReconocido)} · Reintegrado ${this.moneda(e.ImporteReintegrado)}</div>`:`<div class="small">Total ${this.moneda(e.Total)}</div>`;return `<section class="historial-evento"><div class="historial-nodo"><i class="bi ${icono}"></i></div><div class="historial-tarjeta"><div class="d-flex justify-content-between gap-3 flex-wrap"><div><strong>${tipo}</strong> · ${this.esc(e.NumeroDocumento||"")}<div class="small text-muted">${fecha(e.FechaHora)} · ${this.esc(e.Estado||"")}</div></div>${extra}</div><div class="mt-2">${(e.Lineas||[]).map(linea).join("")||'<div class="text-muted small">Sin detalle.</div>'}</div></div></section>`}).join("");
    const saldo=(r.saldoActual||[]).map(x=>`<tr class="${Number(x.CantidadDisponible)<=0?'fila-sin-disponibilidad':''}"><td><strong>${this.esc(x.Descripcion)}</strong><div class="small text-muted">${this.esc(x.SKU||"")} · ${this.esc(x.Color||"-")} · ${this.esc(x.Talle||"-")}</div><div class="small text-muted">Origen: ${x.TipoOrigen==="CAMBIO"?"Cambio "+this.esc(x.NumeroDocumentoOrigen||""):"Venta original"}</div></td><td class="text-end">${Number(x.CantidadOriginal||0)}</td><td class="text-end">${Number(x.CantidadConsumida||0)}</td><td class="text-end"><strong>${Number(x.CantidadDisponible||0)}</strong></td></tr>`).join("");
    document.getElementById("contenidoHistorialComercial").innerHTML=`<div class="mb-3"><strong>${this.esc(r.venta.NumeroComprobante)}</strong> · ${fecha(r.venta.FechaHora||r.venta.Fecha)} · ${this.moneda(r.venta.Total)}</div><div class="historial-linea-tiempo">${eventos}</div><h6 class="mt-4">Saldo comercial actual</h6><div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Artículo</th><th class="text-end">Original</th><th class="text-end">Consumida</th><th class="text-end">Disponible</th></tr></thead><tbody>${saldo}</tbody></table></div>`;
  },

  async cargarVenta(idVenta) {
    this.proceso(true, "Cargando venta...");
    try {
      const r = await api.buscarVentaParaDevolucion(idVenta);
      if (!r.ok) throw new Error(r.mensaje);
      this.venta = r;
      this.renderVenta();
      this.recalcular();
      document.getElementById("resultadosVentas").innerHTML = "";
    } catch (e) {
      alert(e.message);
    } finally {
      this.proceso(false);
    }
  },

  renderVenta() {
    const v = this.venta.venta;
    document.getElementById("datosVenta").innerHTML = `<strong>${this.esc(v.NumeroComprobante)}</strong> · ${new Date(v.FechaHora || v.Fecha).toLocaleString("es-AR")} · Total ${this.moneda(v.Total)} · Estado ${this.esc(v.Estado)}`;
    const tb = document.getElementById("tablaItems");
    tb.innerHTML = this.venta.detalle.map((x, i) => {const disponible=Number(x.CantidadDisponible||0),agotado=disponible<=0,origen=x.TipoOrigen==="CAMBIO"?`Cambio ${x.NumeroDocumentoOrigen||x.IdDocumentoOrigen}`:"Venta original";return `<tr data-i="${i}" class="${agotado?'fila-sin-disponibilidad':''}">
      <td><strong>${this.esc(x.Descripcion)}</strong>${agotado?' <span class="badge bg-secondary">SIN DISPONIBILIDAD</span>':''}<div class="small text-muted">${this.esc(x.SKU || "")} · ${this.esc(x.Color||'-')} · ${this.esc(x.Talle||'-')}</div><div class="small text-muted">Origen: ${this.esc(origen)}</div></td>
      <td class="text-end">${x.CantidadOriginal||x.Cantidad}</td><td class="text-end">${x.CantidadConsumida||0}</td><td class="text-end"><strong>${disponible}</strong></td>
      <td><input class="form-control form-control-sm cantidad-dev js-cantidad" type="number" min="0" max="${disponible}" value="0" ${agotado?'disabled':''}></td>
      <td><select class="form-select form-select-sm estado-dev js-estado" ${agotado?'disabled':''}><option>APTO_PARA_VENTA</option><option>DEFECTUOSO</option><option>DAÑADO</option><option>USADO</option><option>SIN_ETIQUETA</option><option>NO_REINGRESA</option></select></td>
      <td class="text-center"><input class="form-check-input js-stock" type="checkbox" checked ${agotado?'disabled':''}></td>
      <td class="text-end js-neto">${this.moneda(0)}<div class="small text-muted">Precio origen: ${this.moneda(x.ImporteNetoUnitario||x.PrecioUnitario)}</div></td></tr>`}).join("");
    tb.querySelectorAll("input,select").forEach(x => x.onchange = () => {
      if (x.classList.contains("js-estado")) {
        const st = x.closest("tr").querySelector(".js-stock");
        if (["DEFECTUOSO","DAÑADO","USADO","NO_REINGRESA"].includes(x.value)) st.checked = false;
      }
      this.recalcular();
    });
  },

  itemsSeleccionados() {
    if (!this.venta) return [];
    return [...document.querySelectorAll("#tablaItems tr[data-i]")].map(tr => {
      const d = this.venta.detalle[Number(tr.dataset.i)];
      const c = Number(tr.querySelector(".js-cantidad").value || 0);
      return {idDetalle:d.IdDetalle,cantidad:c,reingresaStock:tr.querySelector(".js-stock").checked,estadoProducto:tr.querySelector(".js-estado").value,motivo:document.getElementById("motivoGeneral").value,neto:c*Number(d.ImporteNetoUnitario||0),bruto:c*Number(d.PrecioUnitario||0),descuento:c*Number(d.DescuentoUnitarioProporcional||0)};
    }).filter(x => x.cantidad > 0);
  },

  recalcular() {
    const items=this.itemsSeleccionados(), bruto=items.reduce((s,x)=>s+x.bruto,0), desc=items.reduce((s,x)=>s+x.descuento,0), neto=items.reduce((s,x)=>s+x.neto,0);
    document.getElementById("subtotalDevuelto").textContent=this.moneda(bruto);
    document.getElementById("descuentoDevuelto").textContent=this.moneda(desc);
    document.getElementById("importeReconocido").textContent=this.moneda(neto);
    document.querySelectorAll("#tablaItems tr[data-i]").forEach(tr=>{const d=this.venta.detalle[Number(tr.dataset.i)],c=Number(tr.querySelector(".js-cantidad").value||0);tr.querySelector(".js-neto").textContent=this.moneda(c*Number(d.ImporteNetoUnitario||0));});
    const suma=this.leerReintegros().reduce((s,x)=>s+x.importe,0), pend=Math.round((neto-suma)*100)/100;
    document.getElementById("pendienteReintegro").textContent=this.moneda(pend);
    document.getElementById("pendienteReintegro").className=Math.abs(pend)<.01?"text-success":"text-danger";
    document.getElementById("btnConfirmarDevolucion").disabled=!items.length||Math.abs(pend)>=.01||!document.getElementById("motivoGeneral").value;
  },

  agregarReintegro() {
    const div=document.createElement("div"); div.className="row g-2 mb-2 reintegro";
    div.innerHTML=`<div class="col-6"><select class="form-select form-select-sm medio"><option value="">Medio...</option>${this.medios.map(m=>`<option value="${m.IdMedioPago||""}">${this.esc(m.Nombre)}</option>`).join("")}</select></div><div class="col-5"><input class="form-control form-control-sm importe" type="number" min="0" step="0.01" placeholder="Importe"></div><div class="col-1"><button type="button" class="btn btn-sm btn-outline-danger quitar">×</button></div>`;
    document.getElementById("listaReintegros").appendChild(div);
    div.querySelectorAll("input,select").forEach(x=>x.oninput=()=>this.recalcular());
    div.querySelector(".medio").onchange=()=>{const neto=this.itemsSeleccionados().reduce((s,x)=>s+x.neto,0),otros=this.leerReintegros(div).reduce((s,x)=>s+x.importe,0);if(!div.querySelector(".importe").value)div.querySelector(".importe").value=Math.max(0,Math.round((neto-otros)*100)/100);this.recalcular();};
    div.querySelector(".quitar").onclick=()=>{div.remove();this.recalcular();};
  },

  renderReintegros(){document.querySelectorAll(".reintegro .medio").forEach(sel=>{const old=sel.value;sel.innerHTML=`<option value="">Medio...</option>${this.medios.map(m=>`<option value="${m.IdMedioPago||""}">${this.esc(m.Nombre)}</option>`).join("")}`;sel.value=old;});},
  leerReintegros(excluir){return [...document.querySelectorAll(".reintegro")].filter(x=>x!==excluir).map(x=>({idMedioPago:x.querySelector(".medio").value,medioPago:x.querySelector(".medio").selectedOptions[0]?.text||"",importe:Number(x.querySelector(".importe").value||0)})).filter(x=>x.idMedioPago&&x.importe>0);},

  async confirmar(){if(!this.venta)return;const datos={idVenta:this.venta.venta.IdVenta,numeroCaja:this.venta.venta.Caja||"1",motivoGeneral:document.getElementById("motivoGeneral").value,observaciones:document.getElementById("observaciones").value,items:this.itemsSeleccionados(),reintegros:this.leerReintegros()};if(!confirm("¿Confirmar la devolución? Esta operación afecta stock y caja."))return;this.proceso(true,"Registrando devolución...");try{const r=await api.registrarDevolucion(datos);if(!r.ok)throw new Error(r.mensaje);this.imprimir(r);alert(`Devolución ${r.numeroDevolucion} registrada correctamente.`);location.reload();}catch(e){alert(e.message);}finally{this.proceso(false);}},
  imprimir(r){const w=open("","_blank","width=800,height=700");const rows=(r.detalle||[]).map(x=>`<tr><td>${this.esc(x.Descripcion)}</td><td>${x.Cantidad}</td><td>${this.moneda(x.ImporteReconocido)}</td></tr>`).join("");w.document.write(`<html><head><title>${r.numeroDevolucion}</title><style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd}.total{text-align:right;font-size:22px;font-weight:bold}</style></head><body><h2>Comprobante de devolución</h2><p><b>Número:</b> ${r.numeroDevolucion}</p><p><b>Venta original:</b> ${this.esc(r.devolucion.NumeroVentaOriginal)}</p><table><tr><th>Artículo</th><th>Cantidad</th><th>Importe</th></tr>${rows}</table><p class="total">Total reintegrado: ${this.moneda(r.devolucion.ImporteReintegrado)}</p><script>print()<\/script></body></html>`);w.document.close();},
  esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
};
document.addEventListener("DOMContentLoaded",()=>DevolucionesUI.iniciar());
