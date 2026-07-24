
function ordenarVentasRecientes(ventas) {
  return [...(ventas || [])].sort((a, b) => {
    const fa = new Date(a.FechaHora || a.Fecha || 0).getTime() || 0;
    const fb = new Date(b.FechaHora || b.Fecha || 0).getTime() || 0;
    if (fa !== fb) return fb - fa;
    return String(b.IdVenta || "").localeCompare(String(a.IdVenta || ""), "es", { numeric: true });
  });
}
const EstadoCambio={venta:null,recibidos:[],entregados:[],medios:[],confirmando:false,idTransaccion:null};
const $=id=>document.getElementById(id); const moneda=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"}).format(Number(n)||0);
function mensaje(t,tipo="info"){if(window.Mensajes&&Mensajes.mostrar)Mensajes.mostrar(t,tipo);else console.log(t)}
function carga(id,on){$(id).classList.toggle("d-none",!on)}
function irPaso(id){bootstrap.Tab.getOrCreateInstance(document.querySelector(`[data-bs-target="#${id}"]`)).show();actualizarEstadoPasos()}
function hayRecibidos(){return EstadoCambio.recibidos.some(x=>Number(x.cantidad)>0)}
function actualizarEstadoPasos(){const p1=document.querySelector('[data-paso="1"]'),p2=document.querySelector('[data-paso="2"]'),p3=document.querySelector('[data-paso="3"]');p1?.classList.toggle("paso-completo",!!EstadoCambio.venta);p2?.classList.toggle("paso-completo",hayRecibidos());p3?.classList.toggle("paso-completo",EstadoCambio.entregados.some(x=>Number(x.cantidad)>0));if($("btnSiguienteEntregados"))$("btnSiguienteEntregados").disabled=!EstadoCambio.venta||!hayRecibidos()}
function avanzarAEntregados(){if(!EstadoCambio.venta){mensaje("Primero seleccioná una venta.","warning");irPaso("pasoVenta");return}if(!hayRecibidos()){mensaje("Indicá al menos un artículo que recibe el local.","warning");return}irPaso("pasoEntregados");setTimeout(()=>$("criterioProducto")?.focus(),150)}
async function buscarVentas(){carga("spinnerVenta",true);$("btnBuscarVenta").disabled=true;try{const r=await api.buscarVentasParaCambio({criterio:$("criterioVenta").value,fechaVenta:$("fechaVenta").value});if(!r.ok)throw new Error(r.mensaje);$("resultadosVentas").innerHTML=ordenarVentasRecientes(r.ventas||[]).map(v=>{const d=v.Disponibilidad||{},sin=d.EstadoDisponibilidad==="SIN_DISPONIBILIDAD",parcial=d.EstadoDisponibilidad==="PARCIAL",clase=sin?"sin-disponibilidad":(parcial?"disponibilidad-parcial":"disponible"),badge=sin?"Sin disponibilidad":(parcial?"Disponibilidad parcial":"Disponible"),btnSeleccion=sin?`<button class="btn btn-sm btn-secondary" disabled>Sin artículos disponibles</button>`:`<button class="btn btn-sm btn-primary seleccionar-venta" data-id="${v.IdVenta}">Seleccionar</button>`,acciones=`<div class="d-flex gap-2 flex-wrap justify-content-end"><button class="btn btn-sm btn-outline-dark ver-historial" data-id="${v.IdVenta}"><i class="bi bi-clock-history"></i> Historial</button>${btnSeleccion}</div>`;return `<div class="list-group-item resultado-item ${clase} d-flex justify-content-between gap-3 align-items-center"><div><div class="d-flex gap-2 align-items-center flex-wrap"><strong>${v.NumeroComprobante}</strong><span class="badge estado-disponibilidad">${badge}</span></div>${new Date(v.FechaHora).toLocaleString("es-AR")} · ${moneda(v.Total)}<br><small>${v.Productos||""}</small><div class="small mt-1">${Number(d.UnidadesDisponibles||0)} unidad(es) disponible(s)</div></div>${acciones}</div>`}).join("")||'<div class="text-muted">Sin resultados.</div>';document.querySelectorAll(".seleccionar-venta").forEach(b=>b.onclick=()=>cargarVenta(b.dataset.id));document.querySelectorAll(".ver-historial").forEach(b=>b.onclick=()=>mostrarHistorialComercial(b.dataset.id));}catch(e){mensaje(e.message,"danger")}finally{carga("spinnerVenta",false);$("btnBuscarVenta").disabled=false}}
async function cargarVenta(id){carga("spinnerCargaVenta",true);$("contenidoRecibidos").classList.add("d-none");irPaso("pasoRecibidos");try{const r=await api.obtenerVentaParaCambio(id);if(!r.ok)throw new Error(r.mensaje);EstadoCambio.venta=r;$("ventaSeleccionada").innerHTML=`<strong>${r.venta.NumeroComprobante}</strong> · ${new Date(r.venta.FechaHora||r.venta.Fecha).toLocaleString("es-AR")}`;EstadoCambio.recibidos=(r.detalle||[]).map(d=>({d,cantidad:0}));renderRecibidos();}catch(e){mensaje(e.message,"danger")}finally{carga("spinnerCargaVenta",false);$("contenidoRecibidos").classList.remove("d-none")}}
function renderRecibidos(){$("tablaRecibidos").innerHTML=EstadoCambio.recibidos.map((x,i)=>{const disp=Number(x.d.CantidadDisponibleCambio||0),agotado=disp<=0,origen=x.d.TipoOrigen==="CAMBIO"?`Cambio ${x.d.NumeroDocumentoOrigen||x.d.IdDocumentoOrigen}`:`Venta original`;return `<tr class="${agotado?'fila-sin-disponibilidad':''}"><td><div class="d-flex gap-2 align-items-center flex-wrap"><strong>${x.d.Descripcion}</strong>${agotado?'<span class="badge bg-secondary">SIN DISPONIBILIDAD</span>':''}</div><small>${x.d.SKU||""} · ${x.d.Color||'-'} · ${x.d.Talle||'-'}</small><div class="small text-muted">Origen: ${origen}</div></td><td><div><strong>${disp}</strong></div><small class="text-muted">Original: ${x.d.CantidadOriginal||x.d.Cantidad||0} · Consumida: ${x.d.CantidadConsumida||0}</small></td><td><input class="form-control form-control-sm cant-rec" data-i="${i}" type="number" min="0" max="${disp}" value="${x.cantidad}" ${agotado?'disabled':''}></td><td class="text-end"><div>${moneda((x.d.ImporteNetoUnitario||x.d.PrecioUnitario)*x.cantidad)}</div><small class="text-muted">Precio origen: ${moneda(x.d.ImporteNetoUnitario||x.d.PrecioUnitario)}</small></td></tr>`}).join("");document.querySelectorAll(".cant-rec").forEach(e=>e.oninput=()=>{EstadoCambio.recibidos[e.dataset.i].cantidad=Number(e.value)||0;renderRecibidos();calcular()});calcular()}
async function buscarProductos(){carga("spinnerProducto",true);$("btnBuscarProducto").disabled=true;try{const r=await api.buscarProductosParaCambio($("criterioProducto").value);if(!r.ok)throw new Error(r.mensaje);$("resultadosProductos").innerHTML=(r.productos||[]).slice(0,20).map(p=>`<button class="btn btn-sm btn-outline-secondary me-1 mb-1 prod" data-p='${JSON.stringify(p).replace(/'/g,"&#39;")}'>${p.SKU||""} · ${p.Descripcion} · Color: ${p.Color||p.color||"-"} · Talle: ${p.Talle||p.talle||"-"} · stock ${p.Stock}</button>`).join("")||'<span class="text-muted">Sin resultados.</span>';document.querySelectorAll(".prod").forEach(b=>b.onclick=()=>agregarProducto(JSON.parse(b.dataset.p)));}catch(e){mensaje(e.message,"danger")}finally{carga("spinnerProducto",false);$("btnBuscarProducto").disabled=false}}
function agregarProducto(p){const existe=EstadoCambio.entregados.find(x=>String(x.p.IdProducto)===String(p.IdProducto));if(existe)existe.cantidad++;else EstadoCambio.entregados.push({p,cantidad:1,precio:Number(p.PrecioVenta)||0,importe:Number(p.PrecioVenta)||0});renderEntregados()}
function renderEntregados(){$("tablaEntregados").innerHTML=EstadoCambio.entregados.map((x,i)=>{const importe=Number.isFinite(Number(x.importe))?Number(x.importe):Number(x.cantidad||0)*Number(x.precio||0);const unitario=Number(x.cantidad)>0?importe/Number(x.cantidad):0;return `<tr><td>${x.p.Descripcion}<br><small>${x.p.SKU||""}</small></td><td>${x.p.Color||x.p.color||"-"}</td><td>${x.p.Talle||x.p.talle||"-"}</td><td>${x.p.Stock}</td><td><input class="form-control form-control-sm cant-ent" data-i="${i}" type="number" min="1" max="${x.p.Stock}" value="${x.cantidad}"></td><td><input class="form-control form-control-sm imp-ent" data-i="${i}" type="number" min="0" step="0.01" value="${importe.toFixed(2)}" title="Importe total de esta línea"></td><td>${moneda(unitario)}</td><td><button class="btn btn-sm btn-outline-danger del-ent" data-i="${i}">×</button></td></tr>`}).join("");document.querySelectorAll(".cant-ent").forEach(e=>e.oninput=()=>{const x=EstadoCambio.entregados[e.dataset.i];const precioAnterior=Number(x.cantidad)>0?Number(x.importe||0)/Number(x.cantidad):Number(x.precio||0);x.cantidad=Number(e.value)||0;x.importe=Number((x.cantidad*precioAnterior).toFixed(2));x.precio=x.cantidad>0?x.importe/x.cantidad:0;renderEntregados()});document.querySelectorAll(".imp-ent").forEach(e=>e.oninput=()=>{const x=EstadoCambio.entregados[e.dataset.i];x.importe=Number(e.value)||0;x.precio=Number(x.cantidad)>0?x.importe/Number(x.cantidad):0;calcular()});document.querySelectorAll(".del-ent").forEach(e=>e.onclick=()=>{EstadoCambio.entregados.splice(e.dataset.i,1);renderEntregados()});calcular()}
function totales(){const recibido=EstadoCambio.recibidos.reduce((s,x)=>s+x.cantidad*Number(x.d.ImporteNetoUnitario||x.d.PrecioUnitario||0),0);const entregado=EstadoCambio.entregados.reduce((s,x)=>s+(Number.isFinite(Number(x.importe))?Number(x.importe):x.cantidad*x.precio),0);return{recibido,entregado,diferencia:entregado-recibido}}
function calcular(){const t=totales(),absorber=$("absorberDiferencia")?.checked===true;$("totalRecibido").textContent=moneda(t.recibido);$("totalEntregado").textContent=moneda(t.entregado);$("diferencia").textContent=moneda(t.diferencia);$("importePago").value=!absorber&&t.diferencia>0?t.diferencia.toFixed(2):"0.00";$("avisoMenor").classList.toggle("d-none",t.diferencia>=-0.01||absorber);$("bloquePagoDiferencia").classList.toggle("opacity-50",absorber);$("medioPago").disabled=absorber||t.diferencia<=0;$("importePago").disabled=absorber||t.diferencia<=0;$("btnConfirmar").disabled=!EstadoCambio.venta||t.recibido<=0||t.entregado<=0||(t.diferencia<-.01&&!absorber);actualizarEstadoPasos()}
function limpiarCambio(){EstadoCambio.venta=null;EstadoCambio.confirmando=false;EstadoCambio.idTransaccion=null;EstadoCambio.recibidos=[];EstadoCambio.entregados=[];$("criterioVenta").value="";$("fechaVenta").value="";$("criterioProducto").value="";$("resultadosVentas").innerHTML="";$("resultadosProductos").innerHTML="";$("ventaSeleccionada").innerHTML="Seleccioná una venta.";$("tablaRecibidos").innerHTML="";$("tablaEntregados").innerHTML="";$("observaciones").value="";$("absorberDiferencia").checked=false;calcular();irPaso("pasoVenta")}
function generarIdTransaccion(){
  try{
    if(window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  }catch(e){ console.warn("No se pudo generar UUID nativo",e); }
  return `CAM-${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}
async function confirmar(){
  if(EstadoCambio.confirmando)return;
  const t=totales(),absorber=$("absorberDiferencia").checked;
  if(!EstadoCambio.venta){mensaje("Seleccioná una venta antes de confirmar.","warning");return}
  try{
    EstadoCambio.confirmando=true;
    EstadoCambio.idTransaccion=EstadoCambio.idTransaccion||generarIdTransaccion();
    carga("spinnerConfirmar",true);
    $("btnConfirmar").disabled=true;
    $("estadoConfirmacion").classList.remove("d-none");
    const medio=$("medioPago");
    const pagos=!absorber&&t.diferencia>0?[{idMedioPago:medio.value,medioPago:medio.options[medio.selectedIndex]?.text||"",importe:Number($("importePago").value)}]:[];
    const datos={idTransaccion:EstadoCambio.idTransaccion,idVenta:EstadoCambio.venta.venta.IdVenta,numeroCaja:EstadoCambio.venta.venta.Caja||"1",absorberDiferencia:absorber,itemsRecibidos:EstadoCambio.recibidos.filter(x=>x.cantidad>0).map(x=>({idDetalle:x.d.IdDetalle,cantidad:x.cantidad})),itemsEntregados:EstadoCambio.entregados.filter(x=>x.cantidad>0).map(x=>({idProducto:x.p.IdProducto,cantidad:x.cantidad,precioUnitario:Number(x.cantidad)>0?Number(x.importe)/Number(x.cantidad):0,importeLinea:Number(x.importe)})),pagos,observaciones:$("observaciones").value};
    const r=await api.registrarCambio(datos);
    if(!r||r.ok!==true||!r.idCambio||!r.numeroCambio||!r.cambio)throw new Error((r&&r.mensaje)||"El servidor no confirmó correctamente el registro. La pantalla se conservará para reintentar.");
    $("comprobanteCambio").innerHTML=`<div class="text-center"><h4>COMPROBANTE DE CAMBIO</h4><strong>${r.numeroCambio}</strong></div><hr><p>Venta original: ${r.cambio.NumeroVentaOriginal}</p><h6>Recibido</h6>${(r.entradas||[]).map(x=>`<div>${x.Cantidad} × ${x.Descripcion} <span class="float-end">${moneda(x.Subtotal)}</span></div>`).join("")}<h6 class="mt-3">Entregado</h6>${(r.salidas||[]).map(x=>`<div>${x.Cantidad} × ${x.Descripcion} <span class="float-end">${moneda(x.Subtotal)}</span></div>`).join("")}<hr><div class="fs-5">Diferencia <strong class="float-end">${moneda(r.cambio.Diferencia)}</strong></div>${r.cambio.TipoDiferencia==="ABSORBIDA_LOCAL"?'<div class="alert alert-info mt-3 mb-0">Diferencia absorbida por el local. Sin movimiento de caja.</div>':""}`;
    new bootstrap.Modal($("modalComprobanteCambio")).show();
    mensaje(`Cambio ${r.numeroCambio} registrado correctamente.`,"success");
    limpiarCambio();
  }catch(e){
    console.error("Error al confirmar cambio",e);
    mensaje(e && e.message ? e.message : "No se pudo registrar el cambio.","danger");
    EstadoCambio.confirmando=false;
  }finally{
    carga("spinnerConfirmar",false);
    $("estadoConfirmacion").classList.add("d-none");
    calcular();
  }
}

function escHistorial(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function fechaHistorial(v){if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?escHistorial(v):d.toLocaleString("es-AR")}
function lineaHistorial(l){const mov=l.Movimiento==="ENTRADA"?"Recibido por el local":l.Movimiento==="SALIDA"?"Entregado al cliente":l.Movimiento==="DEVUELTO_CLIENTE"?"Devuelto por el cliente":"Venta";return `<div class="historial-linea"><div><strong>${escHistorial(l.Descripcion||"Artículo")}</strong><div class="small text-muted">${escHistorial(l.SKU||"")} ${l.Color?" · "+escHistorial(l.Color):""}${l.Talle?" · "+escHistorial(l.Talle):""}</div><span class="badge text-bg-light border">${mov}</span></div><div class="text-end"><strong>${Number(l.Cantidad||0)}</strong> × ${moneda(l.PrecioUnitario||0)}<div>${moneda(l.Subtotal||0)}</div></div></div>`}
function renderHistorialComercial(r){const eventos=(r.eventos||[]).map((e,i)=>{const tipo=e.Tipo==="VENTA"?"Venta original":e.Tipo==="CAMBIO"?"Cambio":"Devolución",icono=e.Tipo==="VENTA"?"bi-receipt":e.Tipo==="CAMBIO"?"bi-arrow-left-right":"bi-arrow-counterclockwise",extra=e.Tipo==="CAMBIO"?`<div class="small">Recibido ${moneda(e.TotalRecibido)} · Entregado ${moneda(e.TotalEntregado)} · Diferencia ${moneda(e.Diferencia)}</div>`:e.Tipo==="DEVOLUCION"?`<div class="small">Reconocido ${moneda(e.ImporteReconocido)} · Reintegrado ${moneda(e.ImporteReintegrado)}</div>`:`<div class="small">Total ${moneda(e.Total)}</div>`;return `<section class="historial-evento"><div class="historial-nodo"><i class="bi ${icono}"></i></div><div class="historial-tarjeta"><div class="d-flex justify-content-between gap-3 flex-wrap"><div><strong>${tipo}</strong> · ${escHistorial(e.NumeroDocumento||"")}<div class="small text-muted">${fechaHistorial(e.FechaHora)} · ${escHistorial(e.Estado||"")}</div></div>${extra}</div><div class="mt-2">${(e.Lineas||[]).map(lineaHistorial).join("")||'<div class="text-muted small">Sin detalle.</div>'}</div></div></section>`}).join("");const saldo=(r.saldoActual||[]).map(x=>`<tr class="${Number(x.CantidadDisponible)<=0?'fila-sin-disponibilidad':''}"><td><strong>${escHistorial(x.Descripcion)}</strong><div class="small text-muted">${escHistorial(x.SKU||"")} · ${escHistorial(x.Color||"-")} · ${escHistorial(x.Talle||"-")}</div><div class="small text-muted">Origen: ${x.TipoOrigen==="CAMBIO"?"Cambio "+escHistorial(x.NumeroDocumentoOrigen||""):"Venta original"}</div></td><td class="text-end">${Number(x.CantidadOriginal||0)}</td><td class="text-end">${Number(x.CantidadConsumida||0)}</td><td class="text-end"><strong>${Number(x.CantidadDisponible||0)}</strong></td></tr>`).join("");$("contenidoHistorialComercial").innerHTML=`<div class="mb-3"><strong>${escHistorial(r.venta.NumeroComprobante)}</strong> · ${fechaHistorial(r.venta.FechaHora||r.venta.Fecha)} · ${moneda(r.venta.Total)}</div><div class="historial-linea-tiempo">${eventos}</div><h6 class="mt-4">Saldo comercial actual</h6><div class="table-responsive"><table class="table table-sm align-middle"><thead><tr><th>Artículo</th><th class="text-end">Original</th><th class="text-end">Consumida</th><th class="text-end">Disponible</th></tr></thead><tbody>${saldo}</tbody></table></div>`}
async function mostrarHistorialComercial(idVenta){const modal=bootstrap.Modal.getOrCreateInstance($("modalHistorialComercial"));$("contenidoHistorialComercial").innerHTML='<div class="text-center py-5"><div class="spinner-border"></div><div class="mt-2">Cargando historial...</div></div>';modal.show();try{const r=await api.obtenerHistorialComercialVenta(idVenta);if(!r.ok)throw new Error(r.mensaje||"No se pudo cargar el historial.");renderHistorialComercial(r)}catch(e){$("contenidoHistorialComercial").innerHTML=`<div class="alert alert-danger">${escHistorial(e.message)}</div>`}}

async function inicio(){
  $("btnBuscarVenta").onclick=buscarVentas;
  $("btnAnteriorVenta").onclick=()=>irPaso("pasoVenta");
  $("btnSiguienteEntregados").onclick=avanzarAEntregados;
  $("btnAnteriorRecibidos").onclick=()=>irPaso("pasoRecibidos");
  document.querySelectorAll('[data-bs-toggle="tab"]').forEach(t=>t.addEventListener("shown.bs.tab",actualizarEstadoPasos));
  $("btnBuscarProducto").onclick=buscarProductos;
  $("criterioProducto").addEventListener("keydown",e=>{
    if(e.key!=="Enter"||e.isComposing)return;
    e.preventDefault();
    if(!$("btnBuscarProducto").disabled)buscarProductos();
  });
  $("btnConfirmar").onclick=confirmar;
  $("absorberDiferencia").onchange=calcular;
  const modalComprobante=$("modalComprobanteCambio");
  modalComprobante.addEventListener("hide.bs.modal",()=>{
    const activo=document.activeElement;
    if(activo&&modalComprobante.contains(activo)&&typeof activo.blur==="function")activo.blur();
  });
  modalComprobante.addEventListener("hidden.bs.modal",()=>{
    const destino=$("criterioVenta")||$("btnBuscarVenta");
    setTimeout(()=>destino?.focus(),0);
  });
  const modalHistorial=$("modalHistorialComercial");
  modalHistorial.addEventListener("hide.bs.modal",()=>{const activo=document.activeElement;if(activo&&modalHistorial.contains(activo)&&typeof activo.blur==="function")activo.blur();});
  modalHistorial.addEventListener("hidden.bs.modal",()=>setTimeout(()=>$("criterioVenta")?.focus(),0));
  const r=await api.obtenerMediosPago(false);
  EstadoCambio.medios=r.mediosPago||r.medios||[];
  $("medioPago").innerHTML=EstadoCambio.medios.map(m=>`<option value="${m.IdMedioPago}">${m.Nombre}</option>`).join("");
  calcular();
}
document.addEventListener("DOMContentLoaded",inicio);