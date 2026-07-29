const AltaRapidaProductos = {
  memoriaClave: "pos_alta_rapida_ultimos_valores",
  temporada: String(new Date().getFullYear()),
  guardando: false,
  cargados: [],

  inicializar() {
    document.getElementById("lblTemporada").textContent = this.temporada;
    this.registrarEventos();
    this.precargarMemoria();
    this.enfocarCodigo();
  },

  registrarEventos() {
    const form = document.getElementById("formAltaRapida");
    form?.addEventListener("submit", evento => {
      evento.preventDefault();
      this.guardarYNuevo();
    });

    const campos = ["codigoBarras", "descripcion", "proveedor", "codigoProductoProveedor", "marca", "categoria", "color", "talle", "precio"];
    campos.forEach((id, indice) => {
      document.getElementById(id)?.addEventListener("keydown", evento => {
        if (evento.key !== "Enter") return;
        evento.preventDefault();
        if (id === "precio") this.guardarYNuevo();
        else document.getElementById(campos[indice + 1])?.focus();
      });
    });

    document.getElementById("btnLimpiar")?.addEventListener("click", () => this.limpiarCompleto());

    document.addEventListener("keydown", evento => {
      if (evento.key === "F9") {
        evento.preventDefault();
        this.guardarYNuevo();
      }
      if (evento.key === "Escape") {
        evento.preventDefault();
        this.enfocarCodigo();
      }
    });
  },

  obtenerFormulario() {
    return {
      CodigoBarras: this.valor("codigoBarras"),
      Descripcion: this.valor("descripcion"),
      Proveedor: this.normalizarTexto(this.valor("proveedor")),
      CodigoProductoProveedor: this.valor("codigoProductoProveedor"),
      Marca: this.normalizarTexto(this.valor("marca")),
      Categoria: this.normalizarTexto(this.valor("categoria")),
      Color: this.normalizarTexto(this.valor("color")),
      Talle: this.normalizarTexto(this.valor("talle")),
      PrecioVenta: Number(document.getElementById("precio")?.value || 0),
      PrecioCompra: 0,
      StockMinimo: 1,
      StockInicial: 0,
      Temporada: this.temporada,
      Activo: "INACTIVO",
      SKU: ""
    };
  },

  validar(producto) {
    const form = document.getElementById("formAltaRapida");
    form.classList.add("was-validated");
    if (!producto.CodigoBarras) {
      document.getElementById("codigoBarras")?.focus();
      return false;
    }
    if (!producto.Descripcion) {
      document.getElementById("descripcion")?.focus();
      return false;
    }
    if (!Number.isFinite(producto.PrecioVenta) || producto.PrecioVenta < 0) {
      document.getElementById("precio")?.focus();
      return false;
    }
    return true;
  },

  async guardarYNuevo() {
    if (this.guardando) return;
    const producto = this.obtenerFormulario();
    if (!this.validar(producto)) return;

    this.guardando = true;
    this.estadoBoton(true);
    try {
      const resultado = await api.guardarProducto(producto);
      if (!resultado.ok) throw new Error(resultado.mensaje || "No fue posible guardar el producto.");

      producto.IdProducto = resultado.idProducto;
      producto.SKU = resultado.sku;
      this.cargados.unshift(producto);
      this.cargados = this.cargados.slice(0, 10);
      this.mostrarUltimos();
      this.guardarMemoria(producto);
      this.prepararSiguiente(producto);
      mostrarMensaje(`Producto ${resultado.sku || resultado.idProducto} creado correctamente.`, "success", 2500);
    } catch (error) {
      mostrarMensaje(error.message || "No fue posible guardar el producto.", "danger", 5000);
      if (/código de barras|codigo de barras|duplicado|existe/i.test(error.message || "")) {
        document.getElementById("codigoBarras")?.focus();
        document.getElementById("codigoBarras")?.select();
      }
    } finally {
      this.guardando = false;
      this.estadoBoton(false);
    }
  },

  prepararSiguiente(producto) {
    const recordar = document.getElementById("recordarValores")?.checked;
    document.getElementById("formAltaRapida")?.classList.remove("was-validated");
    this.asignar("codigoBarras", "");
    this.asignar("descripcion", "");
    this.asignar("proveedor", recordar ? producto.Proveedor : "");
    this.asignar("codigoProductoProveedor", "");
    this.asignar("marca", recordar ? producto.Marca : "");
    this.asignar("categoria", recordar ? producto.Categoria : "");
    this.asignar("color", recordar ? producto.Color : "");
    this.asignar("talle", recordar ? producto.Talle : "");
    this.asignar("precio", recordar ? producto.PrecioVenta : "");
    this.enfocarCodigo();
  },

  guardarMemoria(producto) {
    if (!document.getElementById("recordarValores")?.checked) return;
    localStorage.setItem(this.memoriaClave, JSON.stringify({
      Proveedor: producto.Proveedor,
      Marca: producto.Marca,
      Categoria: producto.Categoria,
      Color: producto.Color,
      Talle: producto.Talle,
      PrecioVenta: producto.PrecioVenta
    }));
  },

  precargarMemoria() {
    try {
      const memoria = JSON.parse(localStorage.getItem(this.memoriaClave) || "{}");
      this.asignar("proveedor", memoria.Proveedor || "");
      this.asignar("marca", memoria.Marca || "");
      this.asignar("categoria", memoria.Categoria || "");
      this.asignar("color", memoria.Color || "");
      this.asignar("talle", memoria.Talle || "");
      this.asignar("precio", memoria.PrecioVenta ?? "");
    } catch (error) {
      localStorage.removeItem(this.memoriaClave);
    }
  },

  limpiarCompleto() {
    document.getElementById("formAltaRapida")?.reset();
    document.getElementById("recordarValores").checked = true;
    document.getElementById("formAltaRapida")?.classList.remove("was-validated");
    localStorage.removeItem(this.memoriaClave);
    this.enfocarCodigo();
  },

  mostrarUltimos() {
    const tbody = document.getElementById("tablaUltimos");
    document.getElementById("lblContadorSesion").textContent = `${this.cargados.length} cargados en esta sesión`;
    tbody.innerHTML = this.cargados.map(producto => `
      <tr>
        <td>${this.escapar(producto.CodigoBarras)}</td>
        <td>${this.escapar(producto.Descripcion)}</td>
        <td>${this.escapar(producto.Proveedor)}</td>
        <td>${this.escapar(producto.CodigoProductoProveedor)}</td>
        <td>${this.escapar(producto.Marca)}</td>
        <td>${this.escapar(producto.Categoria)}</td>
        <td>${this.escapar(producto.Color)}</td>
        <td>${this.escapar(producto.Talle)}</td>
        <td class="text-end">${Number(producto.PrecioVenta).toLocaleString("es-AR", { style: "currency", currency: "ARS" })}</td>
      </tr>`).join("");
  },

  estadoBoton(ocupado) {
    const boton = document.getElementById("btnGuardar");
    if (!boton) return;
    boton.disabled = ocupado;
    boton.innerHTML = ocupado
      ? '<span class="spinner-border spinner-border-sm"></span> Guardando...'
      : '<i class="bi bi-save"></i> Guardar y nuevo <span class="shortcut-label">F9</span>';
  },

  enfocarCodigo() {
    window.setTimeout(() => document.getElementById("codigoBarras")?.focus(), 80);
  },

  valor(id) { return (document.getElementById(id)?.value || "").trim(); },
  asignar(id, valor) { const campo = document.getElementById(id); if (campo) campo.value = valor; },
  normalizarTexto(valor) { return String(valor || "").trim().replace(/\s+/g, " "); },
  escapar(valor) {
    return String(valor ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }
};

const api = new Api();
document.addEventListener("DOMContentLoaded", () => AltaRapidaProductos.inicializar());
