const IntegracionPantallas = {

    inicializar: function() {

        document.body.classList.add(
            "navegacion-unificada"
        );

        IntegracionPantallas.crearContenedorNavegacion();
        IntegracionPantallas.asegurarOrdenNavegacion();
        IntegracionPantallas.marcarBarrasPropias();
    },

    crearContenedorNavegacion: function() {

        let contenedor =
            document.getElementById(
                "navegacionPrincipal"
            );

        if (contenedor) {
            return;
        }

        contenedor =
            document.createElement("div");

        contenedor.id =
            "navegacionPrincipal";

        document.body.insertBefore(
            contenedor,
            document.body.firstChild
        );
    },

    asegurarOrdenNavegacion: function() {

        const contenedor =
            document.getElementById(
                "navegacionPrincipal"
            );

        if (
            !contenedor ||
            document.body.firstElementChild ===
            contenedor
        ) {
            return;
        }

        document.body.insertBefore(
            contenedor,
            document.body.firstChild
        );
    },

    marcarBarrasPropias: function() {

        document
            .querySelectorAll(
                "body > nav.navbar, .app-shell > nav.navbar"
            )
            .forEach(function(barra) {

                if (
                    !barra.classList.contains(
                        "pos-global-nav"
                    )
                ) {
                    barra.classList.add(
                        "barra-acciones-pantalla"
                    );
                }
            });
    }
};

IntegracionPantallas.inicializar();
