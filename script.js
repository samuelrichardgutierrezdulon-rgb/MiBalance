"use strict";

/* MIBALANCE - CONTROL DE GASTOS PERSONALES */
/* PROYECTO BTH 2026 */

/* 1. CONFIGURACIÓN */

const STORAGE = {
    movimientos: "mibalance_movimientos_v1",
    presupuestos: "mibalance_presupuestos_v1",
    tema: "mibalance_tema_v1"
};

const CATEGORIAS = {
    ingreso: [
        "Mesada",
        "Trabajo",
        "Regalo",
        "Venta",
        "Otros ingresos"
    ],
    gasto: [
        "Alimentación",
        "Transporte",
        "Educación",
        "Entretenimiento",
        "Salud",
        "Compras",
        "Servicios",
        "Otros gastos"
    ]
};

const COLORES = [
    "#B87A2E",
    "#16865D",
    "#D54D4D",
    "#6488C8",
    "#9273C4",
    "#E3A547",
    "#38A7A0",
    "#C67B9B"
];

const TITULOS = {
    resumen: "Resumen general",
    movimientos: "Mis movimientos",
    presupuesto: "Mi presupuesto",
    estadisticas: "Estadísticas financieras"
};

/* 2. ESTADO */

function cargarDatos(clave, inicial) {
    try {
        // El documento único permite restaurar todos los datos en una escritura.
        const conjunto = localStorage.getItem("mibalance_datos_v2");
        if (conjunto && clave !== STORAGE.tema) {
            return JSON.parse(conjunto)[clave] ?? inicial;
        }
        const dato = localStorage.getItem(clave);
        return dato === null ? inicial : JSON.parse(dato);
    } catch (error) {
        console.error("Error al cargar:", error);
        return inicial;
    }
}

function guardarDatos(clave, datos) {
    try {
        if (clave === STORAGE.tema) {
            localStorage.setItem(clave, JSON.stringify(datos));
        } else {
            const conjunto = {
                [STORAGE.movimientos]: cargarDatos(STORAGE.movimientos, []),
                [STORAGE.presupuestos]: cargarDatos(STORAGE.presupuestos, {})
            };
            conjunto[clave] = datos;
            localStorage.setItem("mibalance_datos_v2", JSON.stringify(conjunto));
        }
        return true;
    } catch (error) {
        console.error("Error al guardar:", error);
        mostrarToast("No se pudieron guardar los datos.");
        return false;
    }
}

let movimientos = cargarDatos(STORAGE.movimientos, []);
let presupuestos = cargarDatos(STORAGE.presupuestos, {});

if (!Array.isArray(movimientos)) {
    movimientos = [];
}

if (
    !presupuestos ||
    typeof presupuestos !== "object" ||
    Array.isArray(presupuestos)
) {
    presupuestos = {};
}

function obtenerFechaActual() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

let mesSeleccionado = obtenerFechaActual().slice(0, 7);
let temporizadorToast;

/* 3. ELEMENTOS */

const $ = (id) => document.getElementById(id);

const elementos = {
    pageTitle: $("pageTitle"),
    monthSelector: $("monthSelector"),
    totalIngresos: $("totalIngresos"),
    totalGastos: $("totalGastos"),
    saldoDisponible: $("saldoDisponible"),
    recentMovements: $("recentMovements"),
    movementsTable: $("movementsTable"),
    emptyMovements: $("emptyMovements"),
    searchInput: $("searchInput"),
    typeFilter: $("typeFilter"),
    categoryFilter: $("categoryFilter"),
    expenseChart: $("expenseChart"),
    chartLegend: $("chartLegend"),
    comparisonChart: $("comparisonChart"),
    categoryStats: $("categoryStats"),
    budgetAmount: $("budgetAmount"),
    budgetProgress: $("budgetProgress"),
    budgetStatus: $("budgetStatus"),
    budgetForm: $("budgetForm"),
    budgetInput: $("budgetInput"),
    budgetLimitDetail: $("budgetLimitDetail"),
    budgetSpentDetail: $("budgetSpentDetail"),
    budgetRemainingDetail: $("budgetRemainingDetail"),
    budgetDetailProgress: $("budgetDetailProgress"),
    budgetMessage: $("budgetMessage"),
    movementModal: $("movementModal"),
    movementForm: $("movementForm"),
    movementId: $("movementId"),
    movementDescription: $("movementDescription"),
    movementAmount: $("movementAmount"),
    movementType: $("movementType"),
    movementCategory: $("movementCategory"),
    movementDate: $("movementDate"),
    modalTitle: $("modalTitle"),
    themeToggle: $("themeToggle"),
    toast: $("toast")
};

/* 4. FUNCIONES GENERALES */

function formatearDinero(valor) {
    return "Bs " + (Number(valor) || 0).toLocaleString("es-BO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatearFecha(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha || "")) {
        return "Sin fecha";
    }

    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
}

function escaparHTML(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function mostrarToast(mensaje) {
    elementos.toast.textContent = mensaje;
    elementos.toast.classList.add("show");

    clearTimeout(temporizadorToast);

    temporizadorToast = setTimeout(() => {
        elementos.toast.classList.remove("show");
    }, 3200);
}

function generarId() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);
}

function ordenarMovimientos(lista) {
    return [...lista].sort((a, b) => {
        const diferencia = b.fecha.localeCompare(a.fecha);

        if (diferencia !== 0) {
            return diferencia;
        }

        return String(b.id).localeCompare(String(a.id));
    });
}

function movimientosDelMes() {
    return movimientos.filter((movimiento) =>
        typeof movimiento.fecha === "string" &&
        movimiento.fecha.startsWith(mesSeleccionado)
    );
}

function calcularTotales(lista) {
    let ingresos = 0;
    let gastos = 0;

    lista.forEach((movimiento) => {
        const monto = Number(movimiento.monto);

        if (!Number.isFinite(monto) || monto <= 0) {
            return;
        }

        if (movimiento.tipo === "ingreso") {
            ingresos += monto;
        }

        if (movimiento.tipo === "gasto") {
            gastos += monto;
        }
    });

    return {
        ingresos,
        gastos,
        saldo: ingresos - gastos
    };
}

function obtenerGastosPorCategoria(lista) {
    const categorias = {};

    lista.forEach((movimiento) => {
        if (movimiento.tipo !== "gasto") {
            return;
        }

        const categoria = movimiento.categoria || "Otros gastos";

        categorias[categoria] =
            (categorias[categoria] || 0) +
            Number(movimiento.monto);
    });

    return Object.entries(categorias)
        .sort((a, b) => b[1] - a[1]);
}

/* 5. NAVEGACIÓN */

function cambiarSeccion(seccion) {
    if (!TITULOS[seccion]) {
        return;
    }

    document.querySelectorAll(".page-section").forEach((pagina) => {
        pagina.classList.toggle(
            "active",
            pagina.id === seccion
        );
    });

    document.querySelectorAll("[data-section]").forEach((boton) => {
        boton.classList.toggle(
            "active",
            boton.dataset.section === seccion
        );
    });

    elementos.pageTitle.textContent = TITULOS[seccion];

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

/* 6. CATEGORÍAS */

function actualizarCategoriasFormulario() {
    const tipo = elementos.movementType.value;
    const categorias = CATEGORIAS[tipo] || [];
    const anterior = elementos.movementCategory.value;

    elementos.movementCategory.innerHTML = "";

    categorias.forEach((categoria) => {
        const opcion = document.createElement("option");
        opcion.value = categoria;
        opcion.textContent = categoria;
        elementos.movementCategory.appendChild(opcion);
    });

    if (categorias.includes(anterior)) {
        elementos.movementCategory.value = anterior;
    }
}

function actualizarFiltroCategorias() {
    const anterior = elementos.categoryFilter.value;

    const categorias = [
        ...new Set([
            ...CATEGORIAS.ingreso,
            ...CATEGORIAS.gasto,
            ...movimientos.map((m) => m.categoria)
        ])
    ]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "es"));

    elementos.categoryFilter.innerHTML =
        '<option value="todas">Todas las categorías</option>';

    categorias.forEach((categoria) => {
        const opcion = document.createElement("option");
        opcion.value = categoria;
        opcion.textContent = categoria;
        elementos.categoryFilter.appendChild(opcion);
    });

    if (categorias.includes(anterior)) {
        elementos.categoryFilter.value = anterior;
    }
}

/* 7. FORMULARIO DE MOVIMIENTOS */

function abrirModal(id = null) {
    elementos.movementForm.reset();
    elementos.movementId.value = "";
    elementos.movementDate.value = obtenerFechaActual();
    elementos.movementType.value = "gasto";

    actualizarCategoriasFormulario();

    if (id !== null) {
        const movimiento = movimientos.find(
            (item) => String(item.id) === String(id)
        );

        if (!movimiento) {
            mostrarToast("No se encontró el movimiento.");
            return;
        }

        elementos.movementId.value = movimiento.id;
        elementos.movementDescription.value = movimiento.descripcion;
        elementos.movementAmount.value = movimiento.monto;
        elementos.movementType.value = movimiento.tipo;

        actualizarCategoriasFormulario();

        if (
            !Array.from(elementos.movementCategory.options)
                .some((opcion) => opcion.value === movimiento.categoria)
        ) {
            const opcion = document.createElement("option");
            opcion.value = movimiento.categoria;
            opcion.textContent = movimiento.categoria;
            elementos.movementCategory.appendChild(opcion);
        }

        elementos.movementCategory.value = movimiento.categoria;
        elementos.movementDate.value = movimiento.fecha;
        elementos.modalTitle.textContent = "Editar movimiento";
    } else {
        elementos.modalTitle.textContent = "Nuevo movimiento";
    }

    elementos.movementModal.classList.add("open");
    elementos.movementModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        elementos.movementDescription.focus();
    }, 50);
}

function cerrarModal() {
    elementos.movementModal.classList.remove("open");
    elementos.movementModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}

function guardarMovimiento(evento) {
    evento.preventDefault();

    const id = elementos.movementId.value.trim();
    const descripcion = elementos.movementDescription.value.trim();
    const monto = Number(elementos.movementAmount.value);
    const tipo = elementos.movementType.value;
    const categoria = elementos.movementCategory.value;
    const fecha = elementos.movementDate.value;

    if (!descripcion) {
        mostrarToast("Escribe una descripción.");
        return;
    }

    if (
        !Number.isFinite(monto) ||
        monto <= 0 ||
        Math.round(monto * 100) !== monto * 100
    ) {
        mostrarToast("Introduce un monto válido.");
        return;
    }

    if (!["ingreso", "gasto"].includes(tipo)) {
        mostrarToast("Selecciona un tipo válido.");
        return;
    }

    if (!CATEGORIAS[tipo].includes(categoria)) {
        const anterior = movimientos.find(
            (item) => String(item.id) === id
        );

        if (
            !anterior ||
            anterior.categoria !== categoria ||
            anterior.tipo !== tipo
        ) {
            mostrarToast("Selecciona una categoría válida.");
            return;
        }
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
        Number.isNaN(new Date(`${fecha}T12:00:00`).getTime())
    ) {
        mostrarToast("Selecciona una fecha válida.");
        return;
    }

    const movimiento = {
        id: id || generarId(),
        descripcion,
        monto: Math.round(monto * 100) / 100,
        tipo,
        categoria,
        fecha
    };

    let nuevosMovimientos;

    if (id) {
        nuevosMovimientos = movimientos.map((item) =>
            String(item.id) === id ? movimiento : item
        );
    } else {
        nuevosMovimientos = [...movimientos, movimiento];
    }

    if (!guardarDatos(STORAGE.movimientos, nuevosMovimientos)) {
        return;
    }

    movimientos = nuevosMovimientos;
    mesSeleccionado = fecha.slice(0, 7);
    elementos.monthSelector.value = mesSeleccionado;

    cerrarModal();
    actualizarTodo();

    mostrarToast(
        id
            ? "Movimiento actualizado correctamente."
            : "Movimiento registrado correctamente."
    );
}

function eliminarMovimiento(id) {
    const movimiento = movimientos.find(
        (item) => String(item.id) === String(id)
    );

    if (!movimiento) {
        mostrarToast("No se encontró el movimiento.");
        return;
    }

    const confirmado = confirm(
        `¿Deseas eliminar "${movimiento.descripcion}"?`
    );

    if (!confirmado) {
        return;
    }

    const nuevosMovimientos = movimientos.filter(
        (item) => String(item.id) !== String(id)
    );

    if (!guardarDatos(STORAGE.movimientos, nuevosMovimientos)) {
        return;
    }

    movimientos = nuevosMovimientos;
    actualizarTodo();
    mostrarToast("Movimiento eliminado.");
}

/* 8. RESUMEN */

function actualizarResumen() {
    const totales = calcularTotales(movimientosDelMes());

    elementos.totalIngresos.textContent =
        formatearDinero(totales.ingresos);

    elementos.totalGastos.textContent =
        formatearDinero(totales.gastos);

    elementos.saldoDisponible.textContent =
        formatearDinero(totales.saldo);

    elementos.saldoDisponible.style.color =
        totales.saldo < 0
            ? "var(--expense)"
            : "var(--text)";
}

/* 9. MOVIMIENTOS RECIENTES */

function actualizarRecientes() {
    const lista = ordenarMovimientos(
        movimientosDelMes()
    ).slice(0, 5);

    if (lista.length === 0) {
        elementos.recentMovements.innerHTML = `
            <p class="empty-state">
                Todavía no tienes movimientos registrados en este mes.
            </p>
        `;
        return;
    }

    elementos.recentMovements.innerHTML = lista.map((movimiento) => {
        const esIngreso = movimiento.tipo === "ingreso";

        return `
            <div class="recent-item">
                <div class="recent-item-info">
                    <div class="recent-icon">
                        ${esIngreso ? "↗" : "↘"}
                    </div>

                    <div>
                        <strong>
                            ${escaparHTML(movimiento.descripcion)}
                        </strong>

                        <small>
                            ${escaparHTML(movimiento.categoria)}
                            · ${formatearFecha(movimiento.fecha)}
                        </small>
                    </div>
                </div>

                <span class="${
                    esIngreso ? "amount-income" : "amount-expense"
                }">
                    ${esIngreso ? "+" : "-"}
                    ${formatearDinero(movimiento.monto)}
                </span>
            </div>
        `;
    }).join("");
}

/* 10. HISTORIAL */

function obtenerMovimientosFiltrados() {
    const busqueda = elementos.searchInput.value
        .trim()
        .toLocaleLowerCase("es");

    const tipo = elementos.typeFilter.value;
    const categoria = elementos.categoryFilter.value;

    return ordenarMovimientos(
        movimientosDelMes().filter((movimiento) => {
            const coincideBusqueda =
                movimiento.descripcion
                    .toLocaleLowerCase("es")
                    .includes(busqueda) ||
                movimiento.categoria
                    .toLocaleLowerCase("es")
                    .includes(busqueda);

            const coincideTipo =
                tipo === "todos" ||
                movimiento.tipo === tipo;

            const coincideCategoria =
                categoria === "todas" ||
                movimiento.categoria === categoria;

            return (
                coincideBusqueda &&
                coincideTipo &&
                coincideCategoria
            );
        })
    );
}

function actualizarTabla() {
    const lista = obtenerMovimientosFiltrados();

    elementos.movementsTable.innerHTML = lista.map((movimiento) => {
        const esIngreso = movimiento.tipo === "ingreso";
        const idSeguro = escaparHTML(movimiento.id);

        return `
            <tr>
                <td data-label="Descripción">
                    <strong>
                        ${escaparHTML(movimiento.descripcion)}
                    </strong>
                </td>

                <td data-label="Categoría">
                    ${escaparHTML(movimiento.categoria)}
                </td>

                <td data-label="Fecha">
                    ${formatearFecha(movimiento.fecha)}
                </td>

                <td data-label="Tipo">
                    <span class="type-badge ${movimiento.tipo}">
                        ${esIngreso ? "Ingreso" : "Gasto"}
                    </span>
                </td>

                <td data-label="Monto" class="${
                    esIngreso ? "amount-income" : "amount-expense"
                }">
                    ${esIngreso ? "+" : "-"}
                    ${formatearDinero(movimiento.monto)}
                </td>

                <td data-label="Acciones">
                    <div class="table-actions">
                        <button
                            type="button"
                            class="action-button"
                            data-action="editar"
                            data-id="${idSeguro}">
                            Editar
                        </button>

                        <button
                            type="button"
                            class="action-button delete"
                            data-action="eliminar"
                            data-id="${idSeguro}">
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    elementos.emptyMovements.style.display =
        lista.length === 0 ? "block" : "none";
}

/* 11. PRESUPUESTOS */

function obtenerPresupuesto() {
    const valor = Number(presupuestos[mesSeleccionado]);

    return Number.isFinite(valor) && valor > 0
        ? valor
        : 0;
}

function guardarPresupuesto(evento) {
    evento.preventDefault();

    const valor = Number(elementos.budgetInput.value);

    if (
        !Number.isFinite(valor) ||
        valor <= 0 ||
        Math.round(valor * 100) !== valor * 100
    ) {
        mostrarToast("Introduce un presupuesto mayor que cero.");
        return;
    }

    const nuevosPresupuestos = {
        ...presupuestos,
        [mesSeleccionado]: Math.round(valor * 100) / 100
    };

    if (!guardarDatos(STORAGE.presupuestos, nuevosPresupuestos)) {
        return;
    }

    presupuestos = nuevosPresupuestos;
    actualizarPresupuesto();

    mostrarToast("Presupuesto mensual guardado correctamente.");
}

function actualizarPresupuesto() {
    const presupuesto = obtenerPresupuesto();
    const { gastos } = calcularTotales(movimientosDelMes());

    const restante = presupuesto - gastos;

    const porcentaje =
        presupuesto > 0
            ? (gastos / presupuesto) * 100
            : 0;

    const porcentajeVisual = Math.min(
        100,
        Math.max(0, porcentaje)
    );

    elementos.budgetAmount.textContent =
        formatearDinero(presupuesto);

    elementos.budgetLimitDetail.textContent =
        formatearDinero(presupuesto);

    elementos.budgetSpentDetail.textContent =
        formatearDinero(gastos);

    elementos.budgetRemainingDetail.textContent =
        formatearDinero(presupuesto > 0 ? restante : 0);

    elementos.budgetInput.value =
        presupuesto > 0 ? presupuesto : "";

    elementos.budgetProgress.style.width =
        `${porcentajeVisual}%`;

    elementos.budgetDetailProgress.style.width =
        `${porcentajeVisual}%`;

    const color =
        porcentaje >= 100
            ? "var(--expense)"
            : porcentaje >= 80
                ? "#e3a547"
                : "var(--primary)";

    elementos.budgetProgress.style.background = color;
    elementos.budgetDetailProgress.style.background = color;

    let mensaje;

    if (presupuesto === 0) {
        mensaje =
            "Todavía no has establecido un presupuesto para este mes.";
    } else if (gastos > presupuesto) {
        mensaje =
            `Has superado tu presupuesto por ${
                formatearDinero(gastos - presupuesto)
            }.`;
    } else if (gastos === presupuesto) {
        mensaje =
            "Has utilizado todo tu presupuesto mensual.";
    } else {
        mensaje =
            `Te quedan ${formatearDinero(restante)} disponibles.`;
    }

    if (presupuesto > 0) {
        mensaje += ` Has usado ${porcentaje.toFixed(1)}% de ${formatearDinero(presupuesto)}.`;
    }

    elementos.budgetStatus.textContent = mensaje;
    elementos.budgetMessage.textContent = mensaje;

    elementos.budgetRemainingDetail.style.color =
        restante < 0 && presupuesto > 0
            ? "var(--expense)"
            : "var(--text)";
}

/* 12. GRÁFICO CIRCULAR */

function actualizarGraficoGastos() {
    const categorias = obtenerGastosPorCategoria(
        movimientosDelMes()
    );

    if (categorias.length === 0) {
        elementos.expenseChart.style.background =
            "conic-gradient(var(--border) 0% 100%)";

        elementos.chartLegend.innerHTML = `
            <p style="color:var(--text-muted)">
                No hay gastos registrados.
            </p>
        `;
        return;
    }

    const total = categorias.reduce(
        (suma, [, monto]) => suma + monto,
        0
    );

    let inicio = 0;

    const segmentos = categorias.map(([, monto], indice) => {
        const porcentaje = monto / total * 100;
        const fin = inicio + porcentaje;
        const color = COLORES[indice % COLORES.length];

        const segmento = `${color} ${inicio}% ${fin}%`;
        inicio = fin;

        return segmento;
    });
    elementos.expenseChart.style.background =
        `conic-gradient(${segmentos.join(", ")})`;

    elementos.chartLegend.innerHTML =
        categorias.map(([categoria, monto], indice) => {
            const color = COLORES[indice % COLORES.length];

            return `
                <div class="legend-item">
                    <span
                        class="legend-color"
                        style="background:${color}">
                    </span>

                    <span>
                        ${escaparHTML(categoria)}
                        · ${formatearDinero(monto)}
                    </span>
                </div>
            `;
        }).join("");
}

/* 13. ESTADÍSTICAS */

function actualizarEstadisticas() {
    const lista = movimientosDelMes();
    const { ingresos, gastos } = calcularTotales(lista);
    const maximo = Math.max(ingresos, gastos, 1);

    const porcentajeIngresos = ingresos / maximo * 100;
    const porcentajeGastos = gastos / maximo * 100;

    elementos.comparisonChart.innerHTML = `
        <div class="comparison-item">
            <div class="comparison-label">
                <span>Ingresos</span>
                <strong>${formatearDinero(ingresos)}</strong>
            </div>

            <div class="comparison-track">
                <div
                    class="comparison-fill income"
                    style="width:${porcentajeIngresos}%">
                </div>
            </div>
        </div>

        <div class="comparison-item">
            <div class="comparison-label">
                <span>Gastos</span>
                <strong>${formatearDinero(gastos)}</strong>
            </div>

            <div class="comparison-track">
                <div
                    class="comparison-fill expense"
                    style="width:${porcentajeGastos}%">
                </div>
            </div>
        </div>
    `;

    const categorias = obtenerGastosPorCategoria(lista);

    if (categorias.length === 0) {
        elementos.categoryStats.innerHTML = `
            <p class="empty-state">
                Registra gastos para ver las estadísticas.
            </p>
        `;
        return;
    }

    elementos.categoryStats.innerHTML =
        categorias.map(([categoria, monto], indice) => {
            const color = COLORES[indice % COLORES.length];

            return `
                <div class="category-stat-item">
                    <span>
                        <span
                            class="legend-color"
                            style="
                                display:inline-block;
                                background:${color};
                                margin-right:8px;
                            ">
                        </span>

                        ${escaparHTML(categoria)}
                    </span>

                    <strong>
                        ${formatearDinero(monto)}
                    </strong>
                </div>
            `;
        }).join("");
}
/* 14. EXPORTAR CSV */

function exportarCSV() {
    const lista = obtenerMovimientosFiltrados();

    if (lista.length === 0) {
        mostrarToast("No hay movimientos para exportar.");
        return;
    }

    const filas = [
        [
            "Fecha",
            "Descripción",
            "Categoría",
            "Tipo",
            "Monto (Bs)"
        ]
    ];

    lista.forEach((movimiento) => {
        filas.push([
            movimiento.fecha,
            movimiento.descripcion,
            movimiento.categoria,
            movimiento.tipo,
            Number(movimiento.monto).toFixed(2)
        ]);
    });

    const contenido = filas.map((fila) => {
        return fila.map((valor) => {
            const texto = String(valor);

            const seguro = /^[=+\-@\t\r]/.test(texto)
                ? "'" + texto
                : texto;

            return `"${seguro.replaceAll('"', '""')}"`;
        }).join(";");
    }).join("\r\n");

    const archivo = new Blob(
        ["\uFEFF" + contenido],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = `MiBalance_${mesSeleccionado}.csv`;

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);

    mostrarToast("Archivo CSV exportado correctamente.");
}


/* RESPALDOS: EXPORTAR, VALIDAR Y RESTAURAR */

function exportarRespaldo() {
    const respaldo = {
        sistema: "MiBalance",
        version: 1,
        creado: new Date().toISOString(),
        movimientos,
        presupuestos
    };
    const archivo = new Blob([JSON.stringify(respaldo, null, 2)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `MiBalance-respaldo-${obtenerFechaActual()}.json`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarToast("Respaldo descargado.");
}

function validarRespaldo(datos) {
    if (!datos || datos.sistema !== "MiBalance" || datos.version !== 1 ||
        !Array.isArray(datos.movimientos) || !datos.presupuestos ||
        typeof datos.presupuestos !== "object" || Array.isArray(datos.presupuestos)) {
        throw new Error("El archivo no es un respaldo válido de MiBalance.");
    }

    const ids = new Set();
    for (const item of datos.movimientos) {
        if (!item || !["string", "number"].includes(typeof item.id) ||
            !String(item.id).trim() || ids.has(String(item.id)) ||
            typeof item.descripcion !== "string" || !item.descripcion.trim() ||
            typeof item.categoria !== "string" || !item.categoria.trim() ||
            !["ingreso", "gasto"].includes(item.tipo) ||
            !Number.isFinite(item.monto) || item.monto <= 0 ||
            typeof item.fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.fecha) ||
            !Number.isFinite(Date.parse(item.fecha)) ||
            new Date(item.fecha).toISOString().slice(0, 10) !== item.fecha) {
            throw new Error("El respaldo contiene movimientos inválidos o repetidos.");
        }
        ids.add(String(item.id));
    }

    for (const [mes, monto] of Object.entries(datos.presupuestos)) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ||
            !Number.isFinite(monto) || monto < 0) {
            throw new Error("El respaldo contiene presupuestos inválidos.");
        }
    }
    return datos;
}

async function restaurarRespaldo(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    try {
        const datos = validarRespaldo(JSON.parse(await archivo.text()));
        const aceptar = confirm(
            `Restaurar ${datos.movimientos.length} movimientos y ${Object.keys(datos.presupuestos).length} presupuestos. ` +
            "Esto reemplazará tus datos actuales. Descarga primero un respaldo si quieres conservarlos."
        );
        if (!aceptar) return;

        // Una sola escritura: si falla, los datos anteriores siguen disponibles.
        localStorage.setItem("mibalance_datos_v2", JSON.stringify({
            [STORAGE.movimientos]: datos.movimientos,
            [STORAGE.presupuestos]: datos.presupuestos
        }));
        movimientos = datos.movimientos;
        presupuestos = datos.presupuestos;
        actualizarTodo();
        mostrarToast("Respaldo restaurado correctamente.");
    } catch (error) {
        console.error("Error al restaurar:", error);
        mostrarToast("No se pudo restaurar. Revisa el archivo y el espacio del navegador.");
    } finally {
        evento.target.value = "";
    }
}

/* 15. MODO OSCURO */

function iniciarTema() {
    const tema = cargarDatos(STORAGE.tema, "claro");

    document.body.classList.toggle(
        "dark",
        tema === "oscuro"
    );

    actualizarBotonTema();
}

function actualizarBotonTema() {
    const oscuro = document.body.classList.contains("dark");

    elementos.themeToggle.textContent =
        oscuro ? "☀" : "☾";

    elementos.themeToggle.setAttribute(
        "aria-label",
        oscuro
            ? "Activar modo claro"
            : "Activar modo oscuro"
    );
}

function cambiarTema() {
    const oscuro = document.body.classList.toggle("dark");

    guardarDatos(
        STORAGE.tema,
        oscuro ? "oscuro" : "claro"
    );

    actualizarBotonTema();
}
/* 16. ACTUALIZACIÓN GENERAL */

function actualizarTodo() {
    actualizarFiltroCategorias();
    actualizarResumen();
    actualizarRecientes();
    actualizarTabla();
    actualizarPresupuesto();
    actualizarGraficoGastos();
    actualizarEstadisticas();
}

/* 17. EVENTOS */

function configurarEventos() {
    document.querySelectorAll("[data-section]").forEach((boton) => {
        boton.addEventListener("click", () => {
            cambiarSeccion(boton.dataset.section);
        });
    });

    $("newMovementBtn").addEventListener(
        "click",
        () => abrirModal()
    );

    $("closeModalBtn").addEventListener(
        "click",
        cerrarModal
    );

    $("cancelModalBtn").addEventListener(
        "click",
        cerrarModal
    );

    elementos.movementModal.addEventListener(
        "click",
        (evento) => {
            if (evento.target === elementos.movementModal) {
                cerrarModal();
            }
        }
    );

    document.addEventListener("keydown", (evento) => {
        if (
            evento.key === "Escape" &&
            elementos.movementModal.classList.contains("open")
        ) {
            cerrarModal();
        }
    });

    elementos.movementType.addEventListener(
        "change",
        actualizarCategoriasFormulario
    );

    elementos.movementForm.addEventListener(
        "submit",
        guardarMovimiento
    );

    elementos.movementsTable.addEventListener(
        "click",
        (evento) => {
            const boton = evento.target.closest("[data-action]");

            if (!boton) {
                return;
            }

            const id = boton.dataset.id;

            if (boton.dataset.action === "editar") {
                abrirModal(id);
            }

            if (boton.dataset.action === "eliminar") {
                eliminarMovimiento(id);
            }
        }
    );

    elementos.monthSelector.addEventListener(
        "change",
        () => {
            if (!elementos.monthSelector.value) {
                return;
            }

            mesSeleccionado = elementos.monthSelector.value;
            actualizarTodo();
        }
    );

    elementos.searchInput.addEventListener(
        "input",
        actualizarTabla
    );

    elementos.typeFilter.addEventListener(
        "change",
        actualizarTabla
    );

    elementos.categoryFilter.addEventListener(
        "change",
        actualizarTabla
    );

    elementos.budgetForm.addEventListener(
        "submit",
        guardarPresupuesto
    );

    $("exportBtn").addEventListener(
        "click",
        exportarCSV
    );

    $("backupBtn").addEventListener("click", exportarRespaldo);
    $("restoreBtn").addEventListener("click", () => $("backupFile").click());
    $("backupFile").addEventListener("change", restaurarRespaldo);

    elementos.themeToggle.addEventListener(
        "click",
        cambiarTema
    );
}
/* 18. INICIAR APLICACIÓN */

function iniciarAplicacion() {
    elementos.monthSelector.value = mesSeleccionado;

    actualizarCategoriasFormulario();
    iniciarTema();
    configurarEventos();
    actualizarTodo();
    cambiarSeccion("resumen");

    console.log("MiBalance iniciado correctamente.");
}

iniciarAplicacion();