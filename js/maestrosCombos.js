const MaestrosCombos = {
  datos: { MARCA: [], CATEGORIA: [], COLOR: [], TALLE: [] },
  mapaCampos: { Marca: "MARCA", Categoria: "CATEGORIA", Color: "COLOR", Talle: "TALLE" },
  selectOrigen: null,
  valorAnterior: "",
  modal: null,

  async cargar() {
    const r = await api.obtenerMaestros(false);
    if (!r.ok) throw new Error(r.mensaje || "No se pudieron cargar los maestros.");
    this.datos = r.agrupados || this.datos;
    return this.datos;
  },

  opciones(tipo, seleccionado = "", incluirAlta = true) {
    const valorActual = String(seleccionado || "");
    let html = '<option value="">— Sin especificar —</option>';
    (this.datos[tipo] || []).forEach(item => {
      const sel = item.Valor === valorActual ? " selected" : "";
      html += `<option value="${this.escapar(item.Valor)}"${sel}>${this.escapar(item.Valor)}</option>`;
    });
    if (valorActual && !(this.datos[tipo] || []).some(x => x.Valor === valorActual)) {
      html += `<option value="${this.escapar(valorActual)}" selected>${this.escapar(valorActual)} (existente)</option>`;
    }
    if (incluirAlta) html += '<option value="__NUEVO__">+ Agregar nuevo…</option>';
    return html;
  },

  aplicarSelect(select, tipo, seleccionado = "") {
    if (!select) return;
    select.dataset.tipoMaestro = tipo;
    select.innerHTML = this.opciones(tipo, seleccionado, true);
    if (!select.dataset.altaRegistrada) {
      select.addEventListener("focus", () => {
        select.dataset.valorPrevio = select.value === "__NUEVO__" ? "" : select.value;
      });
      select.addEventListener("change", async () => {
        if (select.value === "__NUEVO__") await this.solicitarAlta(select);
        else select.dataset.valorPrevio = select.value;
      });
      select.dataset.altaRegistrada = "true";
    }
  },

  asegurarModal() {
    if (document.getElementById("modalAltaMaestroRapida")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal fade" id="modalAltaMaestroRapida" tabindex="-1" aria-labelledby="tituloAltaMaestroRapida" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="tituloAltaMaestroRapida">
                <i class="bi bi-plus-circle"></i> Agregar valor
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
            </div>
            <div class="modal-body">
              <form id="formAltaMaestroRapida" novalidate>
                <div class="mb-3">
                  <label for="altaMaestroTipo" class="form-label">Tipo</label>
                  <input id="altaMaestroTipo" class="form-control" readonly>
                </div>
                <div class="mb-3">
                  <label for="altaMaestroValor" class="form-label">Nuevo valor *</label>
                  <input id="altaMaestroValor" class="form-control" maxlength="120" autocomplete="off" required>
                  <div class="invalid-feedback">Ingrese un valor.</div>
                </div>
                <div>
                  <label for="altaMaestroOrden" class="form-label">Orden</label>
                  <input id="altaMaestroOrden" type="number" class="form-control" min="0" step="1" value="0">
                  <div class="form-text">Los valores con menor orden se muestran primero.</div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button id="btnGuardarAltaMaestroRapida" type="button" class="btn btn-primary">
                <i class="bi bi-save"></i> Guardar valor
              </button>
            </div>
          </div>
        </div>
      </div>`);

    const elemento = document.getElementById("modalAltaMaestroRapida");
    this.modal = bootstrap.Modal.getOrCreateInstance(elemento);
    document.getElementById("btnGuardarAltaMaestroRapida")
      .addEventListener("click", () => this.guardarAltaRapida());
    document.getElementById("formAltaMaestroRapida")
      .addEventListener("submit", evento => {
        evento.preventDefault();
        this.guardarAltaRapida();
      });
    elemento.addEventListener("hidden.bs.modal", () => {
      if (this.selectOrigen && this.selectOrigen.value === "__NUEVO__") {
        this.selectOrigen.value = this.valorAnterior || "";
      }
      this.selectOrigen = null;
    });
  },

  async solicitarAlta(select) {
    this.asegurarModal();
    this.selectOrigen = select;
    this.valorAnterior = select.dataset.valorPrevio || "";
    const tipo = select.dataset.tipoMaestro;
    document.getElementById("altaMaestroTipo").value = this.nombreTipo(tipo);
    document.getElementById("altaMaestroValor").value = "";
    document.getElementById("altaMaestroValor").classList.remove("is-invalid");
    document.getElementById("altaMaestroOrden").value = "0";
    this.modal.show();
    document.getElementById("modalAltaMaestroRapida")
      .addEventListener("shown.bs.modal", () => document.getElementById("altaMaestroValor").focus(), { once: true });
  },

  async guardarAltaRapida() {
    if (!this.selectOrigen) return;
    const tipo = this.selectOrigen.dataset.tipoMaestro;
    const inputValor = document.getElementById("altaMaestroValor");
    const valor = inputValor.value.trim();
    const orden = Number(document.getElementById("altaMaestroOrden").value || 0);
    if (!valor) {
      inputValor.classList.add("is-invalid");
      inputValor.focus();
      return;
    }

    const boton = document.getElementById("btnGuardarAltaMaestroRapida");
    boton.disabled = true;
    try {
      const r = await api.guardarMaestro({ Tipo: tipo, Valor: valor, Activo: "ACTIVO", Orden: orden });
      if (!r.ok) throw new Error(r.mensaje || "No se pudo guardar el valor.");
      await this.cargar();
      document.querySelectorAll(`select[data-tipo-maestro="${tipo}"]`).forEach(combo => {
        const actual = combo === this.selectOrigen ? valor : (combo.value === "__NUEVO__" ? "" : combo.value);
        combo.innerHTML = this.opciones(tipo, actual, true);
        combo.value = actual;
        combo.dataset.valorPrevio = actual;
      });
      this.selectOrigen.value = valor;
      this.selectOrigen.dataset.valorPrevio = valor;
      this.selectOrigen = null;
      this.modal.hide();
      mostrarMensaje(r.mensaje || "Valor agregado.", "success");
    } catch (e) {
      mostrarMensaje(e.message || "No se pudo agregar el valor.", "danger", 6000);
      inputValor.focus();
    } finally {
      boton.disabled = false;
    }
  },

  nombreTipo(tipo) {
    return ({ MARCA: "Marca", CATEGORIA: "Categoría", COLOR: "Color", TALLE: "Talle" })[tipo] || tipo;
  },

  escapar(v) {
    return String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
};
