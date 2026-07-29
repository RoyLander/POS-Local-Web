const SeguridadUI = {
  usuario: null,

  PERMISOS_ROL: Object.freeze({
    ADMIN: ["*"],
    SUPERVISOR: [
      "pagina.menu", "pagina.pos", "pagina.ventas", "pagina.cambios", "pagina.devoluciones", "pagina.devolucionesConsulta", "pagina.productos",
      "pagina.cargaMasivaProductos", "pagina.altaRapidaProductos", "pagina.auditoriaSku", "pagina.maestros", "pagina.inventario",
      "pagina.conteo", "pagina.reportesInventario", "pagina.caja",
      "pagina.auditoria", "pagina.herramientas", "pagina.stock",
      "ventas.anular", "productos.editar", "productos.cargaMasiva", "productos.altaRapida",
      "maestros.editar", "inventario.movimientos", "inventario.conteo",
      "estructura.verificar", "auditoria.ver"
    ],
    CAJERO: [
      "pagina.menu", "pagina.pos", "pagina.ventas", "pagina.cambios", "pagina.devoluciones", "pagina.devolucionesConsulta", "pagina.caja",
      "ventas.cobrar", "ventas.consultar", "devoluciones.preparar", "caja.operar"
    ]
  }),

  PAGINAS: Object.freeze({
    "menu.html": "pagina.menu",
    "index.html": "pagina.menu",
    "pos.html": "pagina.pos",
    "ventas.html": "pagina.ventas",
    "devoluciones.html": "pagina.devoluciones",
    "devoluciones-consulta.html": "pagina.devolucionesConsulta",
    "productos.html": "pagina.productos",
    "carga-masiva-productos.html": "pagina.cargaMasivaProductos",
    "alta-rapida-productos.html": "pagina.altaRapidaProductos",
    "auditoria-sku.html": "pagina.auditoriaSku",
    "mercado-libre.html": "pagina.mercadoLibre",
    "maestros-productos.html": "pagina.maestros",
    "medios-pago.html": "pagina.mediosPago",
    "inventario.html": "pagina.inventario",
    "stock.html": "pagina.stock",
    "conteo-inventario.html": "pagina.conteo",
    "reportes-inventario.html": "pagina.reportesInventario",
    "caja.html": "pagina.caja",
    "cambios.html": "pagina.cambios",
    "usuarios.html": "pagina.usuarios",
    "auditoria.html": "pagina.auditoria",
    "herramientas.html": "pagina.herramientas"
  }),

  iniciar() {
    this.crearModal();
    return this.validarSesion();
  },

  crearModal() {
    if (document.getElementById("modalLogin")) return;
    document.body.insertAdjacentHTML("beforeend", `<div class="modal fade" id="modalLogin" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h5 class="modal-title"><i class="bi bi-person-lock"></i> Iniciar sesión</h5></div><div class="modal-body"><div id="loginError" class="alert alert-danger d-none"></div><label class="form-label">Usuario</label><input id="loginUsuario" class="form-control text-uppercase mb-3" autocomplete="username"><label class="form-label">PIN</label><input id="loginPin" type="password" inputmode="numeric" class="form-control" autocomplete="current-password"><div class="form-text">Primer ingreso: ADMIN / 1234. Cambiá el PIN inmediatamente.</div></div><div class="modal-footer"><button id="btnLogin" class="btn btn-primary w-100">Ingresar</button></div></div></div></div>`);
    document.getElementById("btnLogin").onclick = () => this.login();
    document.getElementById("loginPin").onkeydown = e => { if (e.key === "Enter") this.login(); };
  },

  async validarSesion() {
    const token = localStorage.getItem("pos_token");
    if (!token) { this.mostrarLogin(); return; }
    try {
      const r = await api.obtenerSesionActual();
      if (!r.ok) throw new Error(r.mensaje);
      this.establecer(r.usuario);
    } catch (e) {
      localStorage.removeItem("pos_token");
      this.mostrarLogin();
    }
  },

  mostrarLogin() {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("modalLogin")).show();
    setTimeout(() => document.getElementById("loginUsuario").focus(), 300);
  },

  async login() {
    const u = document.getElementById("loginUsuario").value;
    const p = document.getElementById("loginPin").value;
    const b = document.getElementById("btnLogin");
    const err = document.getElementById("loginError");
    err.classList.add("d-none"); b.disabled = true;
    try {
      const r = await api.iniciarSesion(u, p);
      if (!r.ok) throw new Error(r.mensaje || "No se pudo iniciar sesión");
      localStorage.setItem("pos_token", r.token);
      this.establecer(r.usuario);
      bootstrap.Modal.getInstance(document.getElementById("modalLogin")).hide();
      location.reload();
    } catch (e) {
      err.textContent = e.message;
      err.classList.remove("d-none");
    } finally { b.disabled = false; }
  },

  establecer(usuario) {
    this.usuario = usuario;
    window.POS_USUARIO = usuario;
    const el = document.getElementById("navUsuario");
    if (el) el.textContent = usuario.nombre + " (" + usuario.rol + ")";
    if (!this.validarPaginaActual()) return;
    this.aplicarPermisos();
    document.dispatchEvent(new CustomEvent("pos:sesion-lista", { detail: usuario }));
  },

  puede(permiso) {
    if (!this.usuario || !permiso) return false;
    const permisos = this.PERMISOS_ROL[this.usuario.rol] || [];
    return permisos.includes("*") || permisos.includes(permiso);
  },

  validarPaginaActual() {
    const archivo = (location.pathname.split("/").pop() || "menu.html").toLowerCase();
    const permiso = this.PAGINAS[archivo];
    if (!permiso || this.puede(permiso)) return true;
    sessionStorage.setItem("pos_acceso_denegado", `El rol ${this.usuario.rol} no tiene acceso a esta pantalla.`);
    location.replace("menu.html");
    return false;
  },

  aplicarPermisos() {
    document.querySelectorAll("[data-permiso]").forEach(el => {
      const permitido = this.puede(el.dataset.permiso);
      el.classList.toggle("d-none", !permitido);
      el.toggleAttribute("disabled", !permitido && /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName));
    });
    document.querySelectorAll("[data-roles]").forEach(el => {
      const roles = el.dataset.roles.split(",").map(x => x.trim());
      el.classList.toggle("d-none", !this.usuario || !roles.includes(this.usuario.rol));
    });
    document.querySelectorAll("a[href]").forEach(el => {
      const archivo = (el.getAttribute("href") || "").split("?")[0].split("#")[0].split("/").pop().toLowerCase();
      const permiso = this.PAGINAS[archivo];
      if (permiso) el.classList.toggle("d-none", !this.puede(permiso));
    });
    this.aplicarPermisosConocidos();
  },

  aplicarPermisosConocidos() {
    const reglas = {
      "productos.editar": ["#btnNuevoProducto", "#btnGuardarProducto"],
      "productos.cargaMasiva": ["#btnGuardarTodo", "#btnAgregarFila", "#btnAgregarCinco", "#btnLimpiarGrilla"],
      "productos.altaRapida": ["#btnGuardar"],
      "inventario.conteo": ["#btnAplicarConteo", "#btnConfirmarConteo"],
      "inventario.movimientos": ["#btnGuardarMovimiento"],
      "estructura.verificar": ["#btnVerificarEstructura"],
      "usuarios.editar": ["#btnNuevo", "#guardar"],
      "mediosPago.editar": ["#btnNuevo", "#btnGuardar"],
      "maestros.editar": ["#btnNuevoMaestro", "#btnGuardarMaestro", "#btnGuardarAltaMaestroRapida"]
    };
    Object.entries(reglas).forEach(([permiso, selectores]) => {
      selectores.forEach(selector => document.querySelectorAll(selector).forEach(el => el.classList.toggle("d-none", !this.puede(permiso))));
    });
  },

  mostrarAvisoAcceso() {
    const mensaje = sessionStorage.getItem("pos_acceso_denegado");
    if (!mensaje) return;
    sessionStorage.removeItem("pos_acceso_denegado");
    const contenedor = document.getElementById("contenedorMensajes");
    if (contenedor && typeof mostrarMensaje === "function") mostrarMensaje(mensaje, "warning", 5000);
    else alert(mensaje);
  },

  async salir() {
    try { await api.cerrarSesion(); }
    finally { localStorage.removeItem("pos_token"); location.reload(); }
  }
};

document.addEventListener("DOMContentLoaded", () => SeguridadUI.iniciar().then(() => SeguridadUI.mostrarAvisoAcceso()));

window.SeguridadUI = SeguridadUI;
