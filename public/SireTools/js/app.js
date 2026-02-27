// ==========================================
// SIRE SUITE PROFESIONAL V10.0
// Analizador de Compras y Ventas SUNAT
// ==========================================

// --- ESTADO GLOBAL ---
let currentModule = 'compras';
let GLOBAL = {
    headers: [],
    allRows: [],
    rawAll: [],
    summary: {
        base18: 0, igv18: 0,
        base105: 0, igv105: 0,
        baseExonerado: 0,
        baseInafecto: 0,
        valorNoGravado: 0,
        isc: 0,
        icbper: 0,
        otrosTributos: 0,
        baseDGNG: 0, igvDGNG: 0,
        baseDNG: 0, igvDNG: 0,
        descuentoBI: 0,
        descuentoIGV: 0,
        valorExportacion: 0,
        baseIVAP: 0, ivap: 0,
        totalBase: 0,
        totalIGV: 0,
        totalGeneral: 0,
        totalFacturas: 0,
        totalNotasCredito: 0
    },
    clasificacion: {
        regimen18: [],
        tasa105: [],
        notasCredito: [],
        exonerado: [],
        inafecto: [],
        otros: []
    },
    validation: {
        issues: [],
        suggestions: []
    }
};

// Funciones de log (placeholder)
function addLog() {}
function renderLog() {}

const STORAGE_KEYS = {
    compras: 'SIRE_STATE_COMPRAS',
    ventas: 'SIRE_STATE_VENTAS'
};

// ==========================================
// NAVEGACIÓN ENTRE MÓDULOS
// ==========================================

function setModule(module) {
    currentModule = module;
    
    // Actualizar botones de navegación
    document.getElementById('nav-compras').classList.remove('active');
    document.getElementById('nav-ventas').classList.remove('active');
    document.getElementById(`nav-${module}`).classList.add('active');

    // Actualizar título y color
    if (module === 'compras') {
        document.getElementById('module-title').textContent = 'Compras';
        document.getElementById('module-title').className = 'text-blue-300';
        document.getElementById('module-icon').className = 'fas fa-shopping-cart text-2xl';
    } else {
        document.getElementById('module-title').textContent = 'Ventas';
        document.getElementById('module-title').className = 'text-green-300';
        document.getElementById('module-icon').className = 'fas fa-chart-bar text-2xl';
    }

    addLog('info', 'cambio_modulo', { module });
    restoreStateForModule(module);
}

// ==========================================
// GESTIÓN DE ESTADO
// ==========================================

function limpiarResultados() {
    document.getElementById('results').classList.add('hidden');
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('pasteArea').value = '';
    document.getElementById('fileInput').value = '';
    resetGlobalState();
}

function resetGlobalState() {
    GLOBAL = {
        headers: [],
        allRows: [],
        rawAll: [],
        summary: {
            base18: 0, igv18: 0, base105: 0, igv105: 0,
            baseExonerado: 0, baseInafecto: 0, valorNoGravado: 0,
            isc: 0, icbper: 0, otrosTributos: 0,
            baseDGNG: 0, igvDGNG: 0, baseDNG: 0, igvDNG: 0,
            descuentoBI: 0, descuentoIGV: 0, valorExportacion: 0,
            baseIVAP: 0, ivap: 0,
            totalBase: 0, totalIGV: 0, totalGeneral: 0,
            totalFacturas: 0, totalNotasCredito: 0
        },
        clasificacion: {
            regimen18: [], tasa105: [], notasCredito: [],
            exonerado: [], inafecto: [], otros: []
        },
        validation: {
            issues: [],
            suggestions: []
        }
    };
}

function persistCurrentState() {
    try {
        const key = STORAGE_KEYS[currentModule];
        if (!key) return;
        const data = {
            headers: GLOBAL.headers,
            allRows: GLOBAL.allRows,
            rawAll: GLOBAL.rawAll,
            summary: GLOBAL.summary,
            clasificacion: GLOBAL.clasificacion
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error al persistir estado:', e);
    }
}

function restoreStateForModule(module) {
    try {
        const key = STORAGE_KEYS[module];
        if (!key) return;
        const raw = localStorage.getItem(key);
        if (!raw) {
            limpiarResultados();
            return;
        }
        const data = JSON.parse(raw);
        GLOBAL.headers = data.headers || [];
        GLOBAL.allRows = data.allRows || [];
        GLOBAL.rawAll = data.rawAll || [];
        GLOBAL.summary = data.summary || resetGlobalState().summary;
        GLOBAL.clasificacion = data.clasificacion || resetGlobalState().clasificacion;
        mostrarResultados();
        document.getElementById('errorMessage').classList.add('hidden');
        document.getElementById('results').classList.remove('hidden');
    } catch (e) {
        console.error('Error al restaurar estado:', e);
        limpiarResultados();
    }
}

function clearCurrentModuleState() {
    try {
        const key = STORAGE_KEYS[currentModule];
        if (key) localStorage.removeItem(key);
    } catch (e) {
        console.error('Error al limpiar estado:', e);
    }
    limpiarResultados();
}

// ==========================================
// SISTEMA DE PESTAÑAS
// ==========================================

function switchTab(tab) {
    document.getElementById('errorMessage').classList.add('hidden');
    
    const tabs = {
        'paste': document.getElementById('tab-paste'),
        'upload': document.getElementById('tab-upload')
    };
    const btns = {
        'paste': document.getElementById('btn-paste'),
        'upload': document.getElementById('btn-upload')
    };

    for (let key in tabs) {
        if (key === tab) {
            tabs[key].classList.remove('hidden');
            btns[key].classList.add('tab-active');
            btns[key].classList.remove('tab-inactive');
        } else {
            tabs[key].classList.add('hidden');
            btns[key].classList.remove('tab-active');
            btns[key].classList.add('tab-inactive');
        }
    }
}

// ==========================================
// CARGA DE ARCHIVOS
// ==========================================

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', (e) => { 
    e.preventDefault(); 
    dropZone.classList.add('bg-purple-100', 'border-purple-500'); 
});

dropZone.addEventListener('dragleave', () => { 
    dropZone.classList.remove('bg-purple-100', 'border-purple-500'); 
});

dropZone.addEventListener('drop', (e) => { 
    e.preventDefault(); 
    dropZone.classList.remove('bg-purple-100', 'border-purple-500');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        readFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        readFile(e.target.files[0]);
    }
});

function readFile(file) {
    if (!file) return;
    
    addLog('info', 'archivo_seleccionado', { name: file.name, size: file.size, type: file.type });
    
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    
    // Validar PDF
    if (ext === 'pdf') {
        showError('Los archivos PDF no se pueden analizar directamente. Exporta o copia el detalle a Excel/TXT y vuelve a intentar.');
        addLog('warn', 'archivo_pdf_no_soportado', { name: file.name });
        return;
    }
    
    // Leer Excel
    if (ext === 'xlsx' || ext === 'xls') {
        readExcelFile(file);
        return;
    }
    
    // Leer texto
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        addLog('info', 'archivo_cargado_texto', { length: text.length });
        processText(text);
    };
    reader.onerror = () => {
        showError('No se pudo leer el archivo. Verifica que el formato sea TXT o CSV del SIRE.');
        addLog('error', 'lectura_archivo_fallida', { name: file.name });
    };
    reader.readAsText(file, "utf-8");
}

function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const firstSheet = wb.SheetNames[0];
            const ws = wb.Sheets[firstSheet];
            const csv = XLSX.utils.sheet_to_csv(ws, { FS: '\t' });
            addLog('info', 'excel_convertido_a_texto', { sheet: firstSheet, length: csv.length });
            processText(csv);
        } catch (err) {
            showError('No se pudo procesar el archivo Excel. Asegúrate de que sea una plantilla SIRE válida.');
            addLog('error', 'procesamiento_excel_fallido', { message: String(err && err.message) });
        }
    };
    reader.onerror = () => {
        showError('No se pudo leer el archivo Excel.');
        addLog('error', 'lectura_excel_fallida', { name: file.name });
    };
    reader.readAsArrayBuffer(file);
}

// ==========================================
// PROCESAMIENTO - ENTRADA PRINCIPAL
// ==========================================

function processPaste() {
    const text = document.getElementById('pasteArea').value;
    if (!text.trim()) { 
        showError("Por favor pega los datos primero."); 
        return; 
    }
    
    addLog('info', 'procesar_pegado', { length: text.length });
    processText(text);
}

// ==========================================
// CONVERSIÓN INTELIGENTE
// ==========================================

function smartConvert(cell) {
    if (!cell) return "";
    let str = String(cell).trim().replace(/"/g, '');
    if (str === "") return "";
    if ((str.includes('/') || str.includes('-')) && str.length >= 8 && isNaN(str)) {
        return str;
    }
    const numericLike = str.replace(/,/g, '').replace(/\./g, '');
    if ((str.startsWith('0') && str.length > 1 && str[1] !== '.') || isNaN(numericLike)) {
        const clean = numericLike;
        if (isNaN(clean)) return str;
        if (str.startsWith('0') && !str.startsWith('0.')) return str;
    }
    let normalized = str;
    if (str.includes(',') && !str.includes('.') && /,\d{1,2}$/.test(str)) {
        normalized = str.replace(/\./g, '').replace(',', '.');
    } else {
        normalized = str.replace(/,/g, '');
    }
    if (!isNaN(normalized) && normalized !== "") {
        return parseFloat(normalized);
    }
    return str;
}

function splitRow(line, separator) {
    if (separator === '\t') {
        let cols = line.split('\t');
        // Fallback para espacios múltiples
        if (cols.length < 5 && line.includes('  ')) {
            cols = line.split(/\s{2,}/);
        }
        return cols;
    }
    return line.split(separator);
}

// ==========================================
// PROCESAMIENTO PRINCIPAL
// ==========================================

function processText(rawData) {
    resetGlobalState();
    
    const lines = rawData.split(/\r\n|\n/);
    if (lines.length < 2) { 
        showError("El archivo está vacío o incompleto."); 
        return; 
    }

    // Detectar separador
    let separator = '\t';
    const firstNonEmpty = lines.find(l => l && l.trim()) || '';
    
    if (firstNonEmpty.includes('|')) {
        separator = '|';
    } else if (firstNonEmpty.includes(';')) {
        separator = ';';
    } else if (firstNonEmpty.includes(',') && /RUC|RAZON|RAZÓN|BI GRAVADA/i.test(firstNonEmpty)) {
        separator = ',';
    }

    addLog('info', 'inicio_procesar', { module: currentModule, lines: lines.length, separator });

    // Buscar columnas según módulo
    let columnMap = {};
    if (currentModule === 'compras') {
        columnMap = buscarColumnasCompras(lines, separator);
    } else {
        columnMap = buscarColumnasVentas(lines, separator);
        const ajuste = ajustarMapeoVentasPorPatron(lines, separator, columnMap);
        columnMap = ajuste.map;
        if (ajuste.notice) {
            GLOBAL.validation.suggestions.push(ajuste.notice);
        }
    }

    // Validar encabezado encontrado
    if (columnMap.headerIndex === -1) {
        showError(`No se encontraron las columnas requeridas para ${currentModule}. Incluye la fila de encabezados del SIRE en el archivo o pegado.`);
        addLog('error', 'encabezado_no_encontrado', { module: currentModule });
        return;
    }

    if (currentModule === 'ventas') {
        const diag = analizarEstructuraVentas(lines, separator, columnMap);
        GLOBAL.validation.issues.push(...diag.issues);
        GLOBAL.validation.suggestions.push(...diag.suggestions);
    }

    // Validar columnas críticas
    if (currentModule === 'compras' && (columnMap.baseDG === -1 || columnMap.igvDG === -1)) {
        showError('No se identificaron las columnas de Base e IGV en el archivo de compras.');
        addLog('error', 'columnas_clave_faltantes', { module: currentModule });
        return;
    }
    
    if (currentModule === 'ventas' && (columnMap.baseGravada === -1 || columnMap.igv === -1)) {
        showError('No se identificaron las columnas de Base e IGV en el archivo de ventas.');
        addLog('error', 'columnas_clave_faltantes', { module: currentModule });
        return;
    }

    // Guardar encabezados
    const headerIndex = columnMap.headerIndex;
    GLOBAL.headers = splitRow(lines[headerIndex], separator).map(h => h.trim().replace(/"/g, ''));

    // Procesar cada fila
    for (let i = headerIndex + 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const rawLine = lines[i];
        
        if (currentModule === 'ventas' && separator === '\t') {
            const montosPreview = extraerMontosVentasDesdeLinea(rawLine);
            if (!montosPreview) {
                continue;
            }
        }

        const rawCols = splitRow(rawLine, separator);
        const typedCols = rawCols.map(c => smartConvert(c));
        
        GLOBAL.rawAll.push(typedCols);
        
        if (currentModule === 'compras') {
            procesarFilaCompra(typedCols, columnMap);
        } else {
            procesarFilaVenta(typedCols, columnMap, rawLine);
        }
    }

    // Recalcular totales
    if (currentModule === 'ventas') {
        recomputeSummaryVentasFromRows();
    }
    
    calcularTotalesFinales();
    mostrarResultados();
    persistCurrentState();
    
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
}

// ==========================================
// BÚSQUEDA DE COLUMNAS - COMPRAS
// ==========================================

function buscarColumnasCompras(lines, separator) {
    const map = {
        headerIndex: -1,
        razonSocial: -1,
        ruc: -1,
        tipoDoc: -1,
        baseDG: -1,
        igvDG: -1,
        baseDGNG: -1,
        igvDGNG: -1,
        baseDNG: -1,
        igvDNG: -1,
        valorNG: -1,
        isc: -1,
        icbper: -1,
        otrosTrib: -1,
        totalCP: -1,
        tipoNota: -1
    };

    const keywords = {
        razonSocial: ['RAZON SOCIAL', 'RAZÓN SOCIAL', 'APELLIDOS NOMBRES', 'APELLIDOS Y NOMBRES', 'DENOMINACION', 'DENOMINACIÓN', 'PROVEEDOR'],
        ruc: ['NRO DOC IDENTIDAD', 'NRO DOC. IDENTIDAD', 'NRO DOC', 'NRO DOCUMENTO', 'NUM DOC', 'NUMERO DOCUMENTO', 'N° DOCUMENTO', 'Nº DOCUMENTO'],
        tipoDoc: ['TIPO CP', 'TIPO CP/DOC'],
        baseDG: ['BI GRAVADO DG'],
        igvDG: ['IGV / IPM DG', 'IGV/IPM DG'],
        baseDGNG: ['BI GRAVADO DGNG'],
        igvDGNG: ['IGV / IPM DGNG', 'IGV/IPM DGNG'],
        baseDNG: ['BI GRAVADO DNG'],
        igvDNG: ['IGV / IPM DNG', 'IGV/IPM DNG'],
        valorNG: ['VALOR ADQ. NG', 'VALOR ADQ NG'],
        isc: ['ISC'],
        icbper: ['ICBPER'],
        otrosTrib: ['OTROS TRIB'],
        totalCP: ['TOTAL CP'],
        tipoNota: ['TIPO DE NOTA']
    };

    // Buscar encabezado
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const row = lines[i].toUpperCase();
        const hasBase = row.includes('BI GRAVADO DG');
        const hasIgvDG = row.includes('IGV / IPM DG') || row.includes('IGV/IPM DG');
        
        if (hasBase && hasIgvDG) {
            map.headerIndex = i;
            const headers = splitRow(lines[i], separator).map(h => h.trim().toUpperCase());
            const razonCandidates = [];
            
            // Mapear columnas según palabras clave
            headers.forEach((h, idx) => {
                Object.keys(keywords).forEach(key => {
                    if (keywords[key].some(kw => h.includes(kw))) {
                        if (key === 'razonSocial') {
                            razonCandidates.push(idx);
                        }
                        if (map[key] === -1) {
                            map[key] = idx;
                        }
                    }
                });
            });

            const proveedorIdx = headers.findIndex(h => {
                const norm = h.replace(/\s+/g, ' ');
                return norm.includes('APELLIDOS NOMBRES/ RAZÓN SOCIAL') || norm.includes('APELLIDOS NOMBRES/ RAZON SOCIAL');
            });

            if (proveedorIdx !== -1) {
                map.razonSocial = proveedorIdx;
            } else {
                if (razonCandidates.length > 0) {
                    map.razonSocial = detectarMejorRazonSocial(razonCandidates, lines, i, separator);
                }

                if (map.ruc !== -1 && map.razonSocial === -1) {
                    const headersRow = splitRow(lines[i], separator);
                    const candidateIdx = map.ruc + 1;
                    if (candidateIdx < headersRow.length) {
                        map.razonSocial = candidateIdx;
                    }
                }

                if (map.razonSocial === -1) {
                    const razonPorContenido = detectarRazonSocialComprasPorContenido(lines, separator, i);
                    if (razonPorContenido !== -1) {
                        map.razonSocial = razonPorContenido;
                    }
                }
            }
            
            break;
        }
    }

    return map;
}

// ==========================================
// BÚSQUEDA DE COLUMNAS - VENTAS
// ==========================================

function buscarColumnasVentas(lines, separator) {
    const map = {
        headerIndex: -1,
        razonSocial: -1,
        ruc: -1,
        tipoDoc: -1,
        valorExport: -1,
        baseGravada: -1,
        descuentoBI: -1,
        igv: -1,
        descuentoIGV: -1,
        exonerado: -1,
        inafecto: -1,
        isc: -1,
        baseIVAP: -1,
        ivap: -1,
        icbper: -1,
        otrosTrib: -1,
        totalCP: -1,
        tipoNota: -1
    };

    const keywords = {
        razonSocial: ['RAZON SOCIAL', 'RAZÓN SOCIAL', 'APELLIDOS NOMBRES', 'APELLIDOS Y NOMBRES', 'DENOMINACION', 'DENOMINACIÓN'],
        ruc: [
            'NRO DOC.', 'NRO DOC', 'NRO DOCUMENTO', 'NUM DOC', 'NUMERO DOCUMENTO',
            'N° DOCUMENTO', 'Nº DOCUMENTO', 'RUC',
            'NUMERO DOCUMENTO IDENTIDAD', 'NÚMERO DOCUMENTO IDENTIDAD',
            'DOC. IDENTIDAD', 'DOCUMENTO IDENTIDAD'
        ],
        tipoDoc: ['TIPO CP', 'TIPO CP/DOC'],
        valorExport: ['VALOR FACTURADO EXPORTACION', 'VALOR FACTURADO EXPORTACIÓN'],
        baseGravada: ['BI GRAVADA', 'BI GRAVADO', 'BASE IMPONIBLE'],
        descuentoBI: ['DSCTO BI', 'DESCUENTO BI'],
        igv: ['IGV / IPM', 'IGV/IPM', 'IGV ', ' IGV', 'IMPUESTO GENERAL'],
        descuentoIGV: ['DSCTO IGV', 'DESCUENTO IGV'],
        exonerado: ['MTO EXONERADO', 'MONTO EXONERADO', 'EXONERADO'],
        inafecto: ['MTO INAFECTO', 'MONTO INAFECTO', 'INAFECTO'],
        isc: ['ISC'],
        baseIVAP: ['BI GRAV IVAP', 'BASE IMPONIBLE IVAP'],
        ivap: ['IVAP'],
        icbper: ['ICBPER'],
        otrosTrib: ['OTROS TRIBUTOS'],
        totalCP: ['TOTAL CP', 'IMPORTE TOTAL'],
        tipoNota: ['TIPO DE NOTA']
    };

    // Buscar encabezado
    for (let i = 0; i < Math.min(lines.length, 50); i++) {
        const row = lines[i].toUpperCase();
        const hasBase = row.includes('BI GRAVADA') || row.includes('BI GRAVADO') || row.includes('BASE IMPONIBLE');
        const hasIgv = row.includes('IGV / IPM') || row.includes('IGV/IPM') || row.includes(' IGV') || row.includes('IMPUESTO GENERAL');
        
        if (hasBase && hasIgv) {
            map.headerIndex = i;
            const headers = splitRow(lines[i], separator).map(h => h.trim().toUpperCase());
            const razonCandidates = [];
            
            // Mapear columnas
            headers.forEach((h, idx) => {
                Object.keys(keywords).forEach(key => {
                    if (keywords[key].some(kw => h.includes(kw))) {
                        if (key === 'razonSocial') {
                            razonCandidates.push(idx);
                        }
                        if (map[key] === -1) {
                            map[key] = idx;
                        }
                    }
                });
            });

            // Detectar mejor columna de razón social
            if (razonCandidates.length > 0) {
                map.razonSocial = detectarMejorRazonSocial(razonCandidates, lines, i, separator);
            }
            
            break;
        }
    }

    // Fallback inteligente para RUC si no se detectó por encabezado
    if (map.headerIndex !== -1 && map.ruc === -1) {
        const headerIndex = map.headerIndex;
        const maxRows = Math.min(lines.length, headerIndex + 201);
        const score = {};

        for (let i = headerIndex + 1; i < maxRows; i++) {
            if (!lines[i] || !lines[i].trim()) continue;
            const cols = splitRow(lines[i], separator);
            cols.forEach((c, idx) => {
                const clean = String(c || '').replace(/\D/g, '');
                if (clean.length >= 8 && clean.length <= 11) {
                    if (!score[idx]) score[idx] = 0;
                    score[idx]++;
                }
            });
        }

        let bestIdx = -1;
        let bestScore = 0;
        Object.keys(score).forEach(k => {
            const idx = parseInt(k, 10);
            if (score[idx] > bestScore) {
                bestScore = score[idx];
                bestIdx = idx;
            }
        });

        if (bestIdx !== -1 && bestScore >= 3) {
            map.ruc = bestIdx;
        }
    }

    return map;
}

// ==========================================
// ANÁLISIS ESTRUCTURA VENTAS
// ==========================================

function analizarEstructuraVentas(lines, separator, map) {
    const result = {
        issues: [],
        suggestions: []
    };

    if (map.headerIndex === -1) {
        result.issues.push('No se encontró la fila de encabezados de ventas.');
        return result;
    }

    const requiredCols = [
        'ruc',
        'tipoDoc',
        'baseGravada',
        'igv',
        'totalCP'
    ];

    requiredCols.forEach(key => {
        if (map[key] === -1) {
            result.issues.push(`Falta la columna requerida de ventas: ${key}.`);
        }
    });

    const numericCols = [
        'valorExport',
        'baseGravada',
        'descuentoBI',
        'igv',
        'descuentoIGV',
        'exonerado',
        'inafecto',
        'isc',
        'baseIVAP',
        'ivap',
        'icbper',
        'otrosTrib',
        'totalCP'
    ];

    const typeStats = {};
    numericCols.forEach(key => {
        typeStats[key] = { numeric: 0, text: 0 };
    });

    const headerIndex = map.headerIndex;
    const maxRows = Math.min(lines.length, headerIndex + 201);

    const tasasInvalidas = { count: 0, total: 0 };
    const tipoDocSet = new Set();

    for (let i = headerIndex + 1; i < maxRows; i++) {
        if (!lines[i] || !lines[i].trim()) continue;
        const cols = splitRow(lines[i], separator);
        const typed = cols.map(c => smartConvert(c));

        numericCols.forEach(key => {
            const idx = map[key];
            if (idx === -1 || idx >= typed.length) return;
            const val = typed[idx];
            if (val === "" || val === null || typeof val === 'undefined') return;
            if (typeof val === 'number') {
                typeStats[key].numeric++;
            } else {
                typeStats[key].text++;
            }
        });

        if (map.baseGravada !== -1 && map.igv !== -1) {
            if (map.baseGravada < typed.length && map.igv < typed.length) {
                const base = parseFloat(typed[map.baseGravada]) || 0;
                const igv = parseFloat(typed[map.igv]) || 0;
                if (base !== 0 && igv !== 0) {
                    const proporcion = Math.abs(igv / base);
                    tasasInvalidas.total++;
                    if (proporcion < 0.05 || proporcion > 0.25) {
                        tasasInvalidas.count++;
                    }
                }
            }
        }

        if (map.tipoDoc !== -1 && map.tipoDoc < typed.length) {
            const tipoDocVal = String(typed[map.tipoDoc] || '').trim();
            if (tipoDocVal) {
                tipoDocSet.add(tipoDocVal);
            }
        }
    }

    Object.keys(typeStats).forEach(key => {
        const s = typeStats[key];
        if (s.numeric === 0 && s.text > 0 && map[key] !== -1) {
            result.issues.push(`La columna ${key} contiene texto donde se esperan importes numéricos.`);
            result.suggestions.push(`Revisa el formato numérico y el separador decimal de la columna ${key}.`);
        }
    });

    if (tasasInvalidas.total > 0) {
        const ratio = tasasInvalidas.count / tasasInvalidas.total;
        if (ratio > 0.3) {
            result.issues.push('Se detectaron proporciones IGV/Base fuera del rango esperado en múltiples filas.');
            result.suggestions.push('Verifica que las columnas de Base e IGV estén correctamente mapeadas y que el separador decimal sea correcto.');
        }
    }

    const catalogoTipoDoc = new Set([
        '01', '03', '07', '08', '12', '13', '14', '15'
    ]);
    const desconocidos = [];
    tipoDocSet.forEach(v => {
        const clean = v.replace(/\D/g, '');
        if (clean && !catalogoTipoDoc.has(clean)) {
            desconocidos.push(v);
        }
    });

    if (desconocidos.length > 0) {
        result.issues.push('Se encontraron códigos de tipo de comprobante que no coinciden con el catálogo SUNAT.');
        result.suggestions.push('Revisa la columna "Tipo CP/Doc." y verifica que use códigos SUNAT válidos.');
    }

    return result;
}

// ==========================================
// AJUSTE DE MAPEO VENTAS POR PATRÓN DE IGV
// ==========================================

function ajustarMapeoVentasPorPatron(lines, separator, map) {
    if (!map || map.headerIndex === -1) {
        return { map, notice: '' };
    }

    const headerIndex = map.headerIndex;
    const maxRows = Math.min(lines.length, headerIndex + 201);

    const muestras = [];
    for (let i = headerIndex + 1; i < maxRows; i++) {
        if (!lines[i] || !lines[i].trim()) continue;
        const cols = splitRow(lines[i], separator);
        const typed = cols.map(c => smartConvert(c));
        muestras.push(typed);
        if (muestras.length >= 200) break;
    }

    if (muestras.length === 0) {
        return { map, notice: '' };
    }

    const columnasNumericas = {};
    muestras.forEach(row => {
        row.forEach((val, idx) => {
            if (typeof val === 'number' && !isNaN(val) && val !== 0) {
                if (!columnasNumericas[idx]) {
                    columnasNumericas[idx] = { nonZero: 0 };
                }
                columnasNumericas[idx].nonZero++;
            }
        });
    });

    const candidatosBase = [];
    const candidatosIGV = [];
    Object.keys(columnasNumericas).forEach(k => {
        const idx = parseInt(k, 10);
        const count = columnasNumericas[idx].nonZero;
        if (count >= 3) {
            candidatosBase.push(idx);
            candidatosIGV.push(idx);
        }
    });

    if (candidatosBase.length === 0 || candidatosIGV.length === 0) {
        return { map, notice: '' };
    }

    function evaluarPar(baseIdx, igvIdx) {
        let match = 0;
        muestras.forEach(row => {
            if (baseIdx >= row.length || igvIdx >= row.length) return;
            const base = parseFloat(row[baseIdx]) || 0;
            const igv = parseFloat(row[igvIdx]) || 0;
            if (base === 0 || igv === 0) return;
            const proporcion = Math.abs(igv / base);
            if ((proporcion >= 0.17 && proporcion <= 0.19) || (proporcion >= 0.09 && proporcion <= 0.11)) {
                match++;
            }
        });
        return match;
    }

    let mejorBase = map.baseGravada;
    let mejorIgv = map.igv;
    let mejorMatch = 0;

    if (map.baseGravada !== -1 && map.igv !== -1) {
        mejorMatch = evaluarPar(map.baseGravada, map.igv);
    }

    candidatosBase.forEach(bIdx => {
        candidatosIGV.forEach(iIdx => {
            if (bIdx === iIdx) return;
            const m = evaluarPar(bIdx, iIdx);
            if (m > mejorMatch) {
                mejorMatch = m;
                mejorBase = bIdx;
                mejorIgv = iIdx;
            }
        });
    });

    if (mejorMatch >= 5 && (mejorBase !== map.baseGravada || mejorIgv !== map.igv)) {
        map.baseGravada = mejorBase;
        map.igv = mejorIgv;
        return {
            map,
            notice: 'Se ajustó automáticamente el mapeo de Base e IGV según proporciones 18% y 10.5%.'
        };
    }

    return { map, notice: '' };
}

// ==========================================
// FUNCIÓN AUXILIAR: DETECTAR MEJOR RAZÓN SOCIAL
// ==========================================

function detectarMejorRazonSocial(razonCandidates, lines, headerIndex, separator) {
    const samplesStart = headerIndex + 1;
    const samplesEnd = Math.min(lines.length, samplesStart + 50);
    
    const stats = razonCandidates.map(idx => ({
        idx,
        distinct: new Set(),
        nonEmpty: 0,
        hasLetters: 0
    }));

    // Analizar muestras
    for (let k = samplesStart; k < samplesEnd; k++) {
        if (!lines[k] || !lines[k].trim()) continue;
        const cols = splitRow(lines[k], separator);
        
        stats.forEach(s => {
            if (s.idx >= cols.length) return;
            const raw = String(cols[s.idx] || '').trim().toUpperCase();
            if (!raw) return;
            
            s.nonEmpty++;
            if (/[A-ZÁÉÍÓÚÑ]/.test(raw)) {
                s.hasLetters++;
                s.distinct.add(raw);
            }
        });
    }

    // Seleccionar mejor candidato
    let best = stats[0];
    stats.forEach(s => {
        if (s.hasLetters > best.hasLetters) {
            best = s;
        } else if (s.hasLetters === best.hasLetters && s.distinct.size > best.distinct.size) {
            best = s;
        }
    });

    return best.idx;
}

function detectarRazonSocialComprasPorContenido(lines, separator, headerIndex) {
    if (!lines[headerIndex]) return -1;
    const headers = splitRow(lines[headerIndex], separator);
    const colCount = headers.length;
    if (colCount === 0) return -1;

    const stats = [];
    for (let i = 0; i < colCount; i++) {
        stats.push({
            idx: i,
            distinct: new Set(),
            letters: 0,
            numericLike: 0,
            currencyLike: 0,
            nonEmpty: 0
        });
    }

    const start = headerIndex + 1;
    const end = Math.min(lines.length, start + 200);

    for (let r = start; r < end; r++) {
        if (!lines[r] || !lines[r].trim()) continue;
        const cols = splitRow(lines[r], separator);
        for (let c = 0; c < colCount; c++) {
            if (c >= cols.length) continue;
            const raw = String(cols[c] || '').trim();
            if (!raw) continue;

            const upper = raw.toUpperCase();
            const st = stats[c];
            st.nonEmpty++;

            if (/[A-ZÁÉÍÓÚÑ]/.test(upper)) {
                st.letters++;
            }

            if (/^-?[0-9.,]+$/.test(raw.replace(/\s+/g, ''))) {
                st.numericLike++;
            }

            if (/^(PEN|USD|EUR)$/.test(upper)) {
                st.currencyLike++;
            }

            st.distinct.add(upper);
        }
    }

    const candidates = stats.filter(s => {
        if (s.nonEmpty === 0) return false;
        const lettersRatio = s.letters / s.nonEmpty;
        const numericRatio = s.numericLike / s.nonEmpty;
        const currencyRatio = s.currencyLike / s.nonEmpty;
        const isMostlyText = lettersRatio >= 0.5;
        const isMostlyNumeric = numericRatio >= 0.7;
        const isCurrency = currencyRatio >= 0.5;
        if (!isMostlyText) return false;
        if (isMostlyNumeric) return false;
        if (isCurrency) return false;
        return s.distinct.size >= 3;
    });

    if (candidates.length === 0) return -1;

    let best = candidates[0];
    candidates.forEach(c => {
        if (c.distinct.size > best.distinct.size) {
            best = c;
        } else if (c.distinct.size === best.distinct.size && c.letters > best.letters) {
            best = c;
        }
    });

    return best.idx;
}

// ==========================================
// PROCESAR FILA - COMPRAS
// ==========================================

function procesarFilaCompra(cols, map) {
    // Extraer valores
    const razonSocial = map.razonSocial !== -1 ? String(cols[map.razonSocial] || '') : '';
    const ruc = map.ruc !== -1 ? String(cols[map.ruc] || '').trim() : '';
    const tipoDoc = map.tipoDoc !== -1 ? String(cols[map.tipoDoc] || '') : '';
    const tipoNota = map.tipoNota !== -1 ? String(cols[map.tipoNota] || '') : '';
    
    const baseDG = parseFloat(cols[map.baseDG]) || 0;
    const igvDG = parseFloat(cols[map.igvDG]) || 0;
    const baseDGNG = map.baseDGNG !== -1 ? (parseFloat(cols[map.baseDGNG]) || 0) : 0;
    const igvDGNG = map.igvDGNG !== -1 ? (parseFloat(cols[map.igvDGNG]) || 0) : 0;
    const baseDNG = map.baseDNG !== -1 ? (parseFloat(cols[map.baseDNG]) || 0) : 0;
    const igvDNG = map.igvDNG !== -1 ? (parseFloat(cols[map.igvDNG]) || 0) : 0;
    const valorNG = map.valorNG !== -1 ? (parseFloat(cols[map.valorNG]) || 0) : 0;
    const isc = map.isc !== -1 ? (parseFloat(cols[map.isc]) || 0) : 0;
    const icbper = map.icbper !== -1 ? (parseFloat(cols[map.icbper]) || 0) : 0;
    const otrosTrib = map.otrosTrib !== -1 ? (parseFloat(cols[map.otrosTrib]) || 0) : 0;
    const totalCP = map.totalCP !== -1 ? (parseFloat(cols[map.totalCP]) || 0) : 0;

    // Detectar nota de crédito
    const esNotaCredito = tipoDoc === '07' || /CREDITO/i.test(tipoNota) || baseDG < 0 || igvDG < 0;

    // Crear registro
    const registro = {
        razonSocial,
        tipoDoc,
        esNotaCredito,
        baseDG,
        igvDG,
        baseDGNG,
        igvDGNG,
        baseDNG,
        igvDNG,
        valorNG,
        isc,
        icbper,
        otrosTrib,
        totalCP,
        tasa: 0
    };

    // Clasificar por tasa (solo si hay base e IGV válidos)
    if (baseDG !== 0 && igvDG !== 0) {
        const proporcion = Math.abs(igvDG / baseDG);
        
        if (proporcion >= 0.17 && proporcion <= 0.19) {
            registro.tasa = 18;
            GLOBAL.summary.base18 += baseDG;
            GLOBAL.summary.igv18 += igvDG;
            GLOBAL.clasificacion.regimen18.push(registro);
        } else if (proporcion >= 0.09 && proporcion <= 0.11) {
            registro.tasa = 10.5;
            GLOBAL.summary.base105 += baseDG;
            GLOBAL.summary.igv105 += igvDG;
            GLOBAL.clasificacion.tasa105.push(registro);
        }
    }

    // Acumular otros conceptos
    GLOBAL.summary.baseDGNG += baseDGNG;
    GLOBAL.summary.igvDGNG += igvDGNG;
    GLOBAL.summary.baseDNG += baseDNG;
    GLOBAL.summary.igvDNG += igvDNG;
    GLOBAL.summary.valorNoGravado += valorNG;
    GLOBAL.summary.isc += isc;
    GLOBAL.summary.icbper += icbper;
    GLOBAL.summary.otrosTributos += otrosTrib;

    // Contar documentos válidos
    const esComprobanteValido = esDocumentoIdentidadValido(ruc) && (
        baseDG !== 0 || igvDG !== 0 || baseDGNG !== 0 || igvDGNG !== 0 ||
        baseDNG !== 0 || igvDNG !== 0 || valorNG !== 0 || totalCP !== 0
    );

    if (esComprobanteValido) {
        if (esNotaCredito) {
            GLOBAL.summary.totalNotasCredito++;
            GLOBAL.clasificacion.notasCredito.push(registro);
        } else {
            GLOBAL.summary.totalFacturas++;
        }
    }

    GLOBAL.allRows.push(registro);
}

// ==========================================
// PROCESAR FILA - VENTAS (CORREGIDO)
// ==========================================

function extraerMontosVentasDesdeLinea(line) {
    if (!line || !line.trim()) return null;
    const tokens = line.trim().split(/\s+/);
    let currencyIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i].toUpperCase();
        if (t === 'PEN' || t === 'USD' || t === 'EUR') {
            currencyIndex = i;
            break;
        }
    }
    if (currencyIndex === -1) return null;

    function parseNum(idx) {
        if (idx < 0 || idx >= tokens.length) return 0;
        const raw = tokens[idx];
        let str = String(raw).trim().replace(/"/g, '');
        if (!str) return 0;
        let normalized = str;
        if (str.includes(',') && !str.includes('.') && /,\d{1,2}$/.test(str)) {
            normalized = str.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = str.replace(/,/g, '');
        }
        const n = parseFloat(normalized);
        return isNaN(n) ? 0 : n;
    }

    const totalCP = parseNum(currencyIndex - 1);
    const otrosTrib = parseNum(currencyIndex - 2);
    const icbper = parseNum(currencyIndex - 3);
    const ivap = parseNum(currencyIndex - 4);
    const baseIVAP = parseNum(currencyIndex - 5);
    const isc = parseNum(currencyIndex - 6);
    const inafecto = parseNum(currencyIndex - 7);
    const exonerado = parseNum(currencyIndex - 8);
    const descuentoIGV = parseNum(currencyIndex - 9);
    const igv = parseNum(currencyIndex - 10);
    const descuentoBI = parseNum(currencyIndex - 11);
    const baseGravada = parseNum(currencyIndex - 12);
    const valorExport = parseNum(currencyIndex - 13);

    return {
        valorExport,
        baseGravada,
        descuentoBI,
        igv,
        descuentoIGV,
        exonerado,
        inafecto,
        isc,
        baseIVAP,
        ivap,
        icbper,
        otrosTrib,
        totalCP
    };
}

function extraerRucYRazonDesdeLinea(line) {
    if (!line || !line.trim()) return null;
    const tokens = line.trim().split(/\s+/);
    let currencyIndex = -1;
    for (let i = tokens.length - 1; i >= 0; i--) {
        const t = tokens[i].toUpperCase();
        if (t === 'PEN' || t === 'USD' || t === 'EUR') {
            currencyIndex = i;
            break;
        }
    }
    if (currencyIndex === -1) return null;

    const metaEnd = currencyIndex - 13;
    if (metaEnd <= 0) return null;

    let razonStart = -1;
    for (let i = metaEnd - 1; i >= 0; i--) {
        const token = tokens[i];
        if (/[A-ZÁÉÍÓÚÑ]/.test(token.toUpperCase())) {
            razonStart = i;
            break;
        }
    }

    if (razonStart === -1) return null;

    let startName = razonStart;
    while (startName - 1 >= 0) {
        const prev = tokens[startName - 1];
        if (/[A-ZÁÉÍÓÚÑ]/.test(prev.toUpperCase())) {
            startName--;
        } else {
            break;
        }
    }

    let ruc = '';
    for (let i = startName - 1; i >= 0; i--) {
        const clean = tokens[i].replace(/\D/g, '');
        if (clean.length >= 8 && clean.length <= 15) {
            ruc = clean;
            break;
        }
    }

    const razonTokens = tokens.slice(startName, metaEnd);
    const razonSocial = razonTokens.join(' ');

    if (!razonSocial && !ruc) return null;

    return { ruc, razonSocial };
}

function procesarFilaVenta(cols, map, rawLine) {
    let razonSocial = map.razonSocial !== -1 ? String(cols[map.razonSocial] || '') : '';
    let ruc = map.ruc !== -1 ? String(cols[map.ruc] || '').trim() : '';
    const tipoDoc = map.tipoDoc !== -1 ? String(cols[map.tipoDoc] || '') : '';
    const tipoNota = map.tipoNota !== -1 ? String(cols[map.tipoNota] || '') : '';
    
    let montos = extraerMontosVentasDesdeLinea(rawLine || '');

    const docInfo = extraerRucYRazonDesdeLinea(rawLine || '');
    if (docInfo) {
        if (docInfo.razonSocial) {
            razonSocial = docInfo.razonSocial;
        }
        if (docInfo.ruc) {
            ruc = docInfo.ruc;
        }
    }

    let valorExport = 0;
    let baseGravada = 0;
    let descuentoBI = 0;
    let igv = 0;
    let descuentoIGV = 0;
    let exonerado = 0;
    let inafecto = 0;
    let isc = 0;
    let baseIVAP = 0;
    let ivap = 0;
    let icbper = 0;
    let otrosTrib = 0;
    let totalCP = 0;

    if (montos) {
        valorExport = montos.valorExport;
        baseGravada = montos.baseGravada;
        descuentoBI = montos.descuentoBI;
        igv = montos.igv;
        descuentoIGV = montos.descuentoIGV;
        exonerado = montos.exonerado;
        inafecto = montos.inafecto;
        isc = montos.isc;
        baseIVAP = montos.baseIVAP;
        ivap = montos.ivap;
        icbper = montos.icbper;
        otrosTrib = montos.otrosTrib;
        totalCP = montos.totalCP;
    } else {
        valorExport = map.valorExport !== -1 ? (parseFloat(cols[map.valorExport]) || 0) : 0;
        baseGravada = map.baseGravada !== -1 ? (parseFloat(cols[map.baseGravada]) || 0) : 0;
        descuentoBI = map.descuentoBI !== -1 ? (parseFloat(cols[map.descuentoBI]) || 0) : 0;
        igv = map.igv !== -1 ? (parseFloat(cols[map.igv]) || 0) : 0;
        descuentoIGV = map.descuentoIGV !== -1 ? (parseFloat(cols[map.descuentoIGV]) || 0) : 0;
        exonerado = map.exonerado !== -1 ? (parseFloat(cols[map.exonerado]) || 0) : 0;
        inafecto = map.inafecto !== -1 ? (parseFloat(cols[map.inafecto]) || 0) : 0;
        isc = map.isc !== -1 ? (parseFloat(cols[map.isc]) || 0) : 0;
        baseIVAP = map.baseIVAP !== -1 ? (parseFloat(cols[map.baseIVAP]) || 0) : 0;
        ivap = map.ivap !== -1 ? (parseFloat(cols[map.ivap]) || 0) : 0;
        icbper = map.icbper !== -1 ? (parseFloat(cols[map.icbper]) || 0) : 0;
        otrosTrib = map.otrosTrib !== -1 ? (parseFloat(cols[map.otrosTrib]) || 0) : 0;
        totalCP = map.totalCP !== -1 ? (parseFloat(cols[map.totalCP]) || 0) : 0;
    }

    // CORRECCIÓN: No usar descuentos como base/IGV automáticamente
    // Los descuentos son campos separados

    const esNotaCredito = tipoDoc === '07' || /CREDITO/i.test(tipoNota) || baseGravada < 0 || igv < 0 || totalCP < 0;

    const registro = {
        razonSocial,
        tipoDoc,
        esNotaCredito,
        valorExport,
        baseGravada,
        descuentoBI,
        igv,
        descuentoIGV,
        exonerado,
        inafecto,
        isc,
        baseIVAP,
        ivap,
        icbper,
        otrosTrib,
        totalCP,
        tasa: 0,
        invalido: false
    };

    let proporcion = 0;
    if (baseGravada !== 0 && igv !== 0) {
        proporcion = Math.abs(igv / baseGravada);
        
        if (proporcion >= 0.17 && proporcion <= 0.19) {
            registro.tasa = 18;
            GLOBAL.clasificacion.regimen18.push(registro);
        } else if (proporcion >= 0.09 && proporcion <= 0.11) {
            registro.tasa = 10.5;
            GLOBAL.clasificacion.tasa105.push(registro);
        }
    }

    if (!esNotaCredito && proporcion !== 0 && (proporcion < 0.05 || proporcion > 0.25)) {
        registro.invalido = true;
    }

    // Contar documentos válidos
    const esComprobanteValido = esDocumentoIdentidadValido(ruc) && (
        baseGravada !== 0 || igv !== 0 || valorExport !== 0 || exonerado !== 0 ||
        inafecto !== 0 || totalCP !== 0
    );

    if (esComprobanteValido) {
        if (esNotaCredito) {
            GLOBAL.summary.totalNotasCredito++;
            GLOBAL.clasificacion.notasCredito.push(registro);
        } else {
            GLOBAL.summary.totalFacturas++;
        }
    }

    // Clasificar exonerados/inafectos
    if (exonerado > 0) GLOBAL.clasificacion.exonerado.push(registro);
    if (inafecto > 0) GLOBAL.clasificacion.inafecto.push(registro);

    GLOBAL.allRows.push(registro);
}

// ==========================================
// RECALCULAR TOTALES - VENTAS (CORREGIDO)
// ==========================================

function recomputeSummaryVentasFromRows() {
    GLOBAL.summary.base18 = 0;
    GLOBAL.summary.igv18 = 0;
    GLOBAL.summary.base105 = 0;
    GLOBAL.summary.igv105 = 0;
    GLOBAL.summary.valorExportacion = 0;
    GLOBAL.summary.descuentoBI = 0;
    GLOBAL.summary.descuentoIGV = 0;
    GLOBAL.summary.baseExonerado = 0;
    GLOBAL.summary.baseInafecto = 0;
    GLOBAL.summary.isc = 0;
    GLOBAL.summary.baseIVAP = 0;
    GLOBAL.summary.ivap = 0;
    GLOBAL.summary.icbper = 0;
    GLOBAL.summary.otrosTributos = 0;

    GLOBAL.allRows.forEach(registro => {
        if (registro.invalido) {
            return;
        }

        // Acumular según tasa
        if (registro.tasa === 18) {
            GLOBAL.summary.base18 += registro.baseGravada;
            GLOBAL.summary.igv18 += registro.igv;
        } else if (registro.tasa === 10.5) {
            GLOBAL.summary.base105 += registro.baseGravada;
            GLOBAL.summary.igv105 += registro.igv;
        }

        // Acumular otros conceptos
        GLOBAL.summary.valorExportacion += registro.valorExport || 0;
        GLOBAL.summary.descuentoBI += Math.abs(registro.descuentoBI || 0);
        GLOBAL.summary.descuentoIGV += Math.abs(registro.descuentoIGV || 0);
        GLOBAL.summary.baseExonerado += registro.exonerado || 0;
        GLOBAL.summary.baseInafecto += registro.inafecto || 0;
        GLOBAL.summary.isc += registro.isc || 0;
        GLOBAL.summary.baseIVAP += registro.baseIVAP || 0;
        GLOBAL.summary.ivap += registro.ivap || 0;
        GLOBAL.summary.icbper += registro.icbper || 0;
        GLOBAL.summary.otrosTributos += registro.otrosTrib || 0;
    });
}

// ==========================================
// CALCULAR TOTALES FINALES
// ==========================================

function calcularTotalesFinales() {
    if (currentModule === 'compras') {
        GLOBAL.summary.totalBase = 
            GLOBAL.summary.base18 + 
            GLOBAL.summary.base105 + 
            GLOBAL.summary.baseDGNG + 
            GLOBAL.summary.baseDNG;
        
        GLOBAL.summary.totalIGV = 
            GLOBAL.summary.igv18 + 
            GLOBAL.summary.igv105 + 
            GLOBAL.summary.igvDGNG + 
            GLOBAL.summary.igvDNG;
        
        GLOBAL.summary.totalGeneral = 
            GLOBAL.summary.totalBase + 
            GLOBAL.summary.totalIGV + 
            GLOBAL.summary.valorNoGravado + 
            GLOBAL.summary.isc + 
            GLOBAL.summary.icbper + 
            GLOBAL.summary.otrosTributos;
    } else {
        GLOBAL.summary.totalBase = 
            GLOBAL.summary.base18 + 
            GLOBAL.summary.base105;
        
        GLOBAL.summary.totalIGV = 
            GLOBAL.summary.igv18 + 
            GLOBAL.summary.igv105;

        let totalCP = 0;
        GLOBAL.allRows.forEach(registro => {
            if (registro.invalido) return;
            if (typeof registro.totalCP === 'number') {
                totalCP += registro.totalCP;
            } else if (registro.totalCP) {
                const n = parseFloat(registro.totalCP) || 0;
                totalCP += n;
            }
        });

        GLOBAL.summary.totalGeneral = totalCP;
    }
}

// ==========================================
// VALIDACIÓN DE DOCUMENTO
// ==========================================

function esDocumentoIdentidadValido(doc) {
    if (!doc) return false;
    const clean = String(doc).replace(/\D/g, '');
    return clean.length >= 8;
}

// ==========================================
// MOSTRAR RESULTADOS
// ==========================================

function mostrarResultados() {
    updateDisplayValues();
    updateComparisonView();
    renderConceptosAdicionales();
    renderValidationReport();
}

function updateDisplayValues() {
    const roundPDT = document.getElementById('roundingToggle').checked;
    
    const format = (val) => {
        let num = parseFloat(val) || 0;
        if (roundPDT) num = Math.round(num);
        return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Actualizar valores
    document.getElementById('res18Base').textContent = format(GLOBAL.summary.base18);
    document.getElementById('res18IGV').textContent = format(GLOBAL.summary.igv18);
    document.getElementById('res105Base').textContent = format(GLOBAL.summary.base105);
    document.getElementById('res105IGV').textContent = format(GLOBAL.summary.igv105);
    document.getElementById('resTotalBase').textContent = format(GLOBAL.summary.totalBase);
    document.getElementById('resTotalIGV').textContent = format(GLOBAL.summary.totalIGV);
    document.getElementById('resGranTotal').textContent = format(GLOBAL.summary.totalGeneral);
    
    document.getElementById('resFacturas').textContent = GLOBAL.summary.totalFacturas;
    document.getElementById('resNotasCredito').textContent = GLOBAL.summary.totalNotasCredito;
}

function updateComparisonView() {
    const tbody = document.getElementById('detailsTable');
    tbody.innerHTML = '';
    
    const limit = 50;
    const rows = GLOBAL.allRows.slice(0, limit);
    
    rows.forEach(row => {
        let baseVal, igvVal;
        if (currentModule === 'compras') {
            baseVal = row.baseDG;
            igvVal = row.igvDG;
        } else {
            baseVal = row.baseGravada;
            igvVal = row.igv;

            if (row.esNotaCredito) {
                if (baseVal === 0 && row.descuentoBI !== 0) {
                    baseVal = row.descuentoBI;
                }
                if (igvVal === 0 && row.descuentoIGV !== 0) {
                    igvVal = row.descuentoIGV;
                }
            }
        }

        const razonTexto = String(row.razonSocial || '').trim().toUpperCase();
        const baseCero = !baseVal || Math.abs(baseVal) < 0.005;
        const igvCero = !igvVal || Math.abs(igvVal) < 0.005;

        if ((razonTexto === '' || razonTexto === 'SIN DATOS') && baseCero && igvCero) {
            return;
        }

        const tr = document.createElement('tr');
        
        const calc18 = baseVal * 0.18;
        const calc105 = baseVal * 0.105;
        
        const diff18 = Math.abs(igvVal - calc18);
        const diff105 = Math.abs(igvVal - calc105);
        
        let estado = '⚠️ Revisar';
        let estadoClass = 'text-yellow-700 bg-yellow-100';
        
        if (currentModule === 'ventas' && row.esNotaCredito) {
            estado = 'NC';
            estadoClass = 'text-blue-700 bg-blue-100';
        } else {
            if (diff18 < 0.02) {
                estado = '✅ 18%';
                estadoClass = 'text-green-700 bg-green-100';
            } else if (diff105 < 0.02) {
                estado = '✅ 10.5%';
                estadoClass = 'text-orange-700 bg-orange-100';
            }
        }
        
        tr.innerHTML = `
            <td class="font-medium">${row.razonSocial || 'Sin datos'}</td>
            <td class="text-right font-mono">${baseVal.toFixed(2)}</td>
            <td class="text-right font-mono">${igvVal.toFixed(2)}</td>
            <td class="text-right font-mono text-gray-500">${calc18.toFixed(2)}</td>
            <td class="text-right font-mono text-gray-500">${calc105.toFixed(2)}</td>
            <td class="text-center">
                <span class="px-2 py-1 rounded-full text-xs font-semibold ${estadoClass}">
                    ${estado}
                </span>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

function renderConceptosAdicionales() {
    const container = document.getElementById('conceptosAdicionales');
    
    const conceptos = [];
    
    if (currentModule === 'compras') {
        if (GLOBAL.summary.baseDGNG > 0) conceptos.push({ label: 'Base DGNG', value: GLOBAL.summary.baseDGNG, igv: GLOBAL.summary.igvDGNG });
        if (GLOBAL.summary.baseDNG > 0) conceptos.push({ label: 'Base DNG', value: GLOBAL.summary.baseDNG, igv: GLOBAL.summary.igvDNG });
        if (GLOBAL.summary.valorNoGravado > 0) conceptos.push({ label: 'Valor No Gravado', value: GLOBAL.summary.valorNoGravado });
    } else {
        if (GLOBAL.summary.valorExportacion > 0) conceptos.push({ label: 'Valor Exportación', value: GLOBAL.summary.valorExportacion });
        if (GLOBAL.summary.descuentoBI > 0) conceptos.push({ label: 'Descuento BI', value: GLOBAL.summary.descuentoBI });
        if (GLOBAL.summary.descuentoIGV > 0) conceptos.push({ label: 'Descuento IGV', value: GLOBAL.summary.descuentoIGV });
        if (GLOBAL.summary.baseExonerado > 0) conceptos.push({ label: 'Exonerado', value: GLOBAL.summary.baseExonerado });
        if (GLOBAL.summary.baseInafecto > 0) conceptos.push({ label: 'Inafecto', value: GLOBAL.summary.baseInafecto });
        if (GLOBAL.summary.baseIVAP > 0) conceptos.push({ label: 'Base IVAP', value: GLOBAL.summary.baseIVAP, igv: GLOBAL.summary.ivap });
    }
    
    if (GLOBAL.summary.isc > 0) conceptos.push({ label: 'ISC', value: GLOBAL.summary.isc });
    if (GLOBAL.summary.icbper > 0) conceptos.push({ label: 'ICBPER', value: GLOBAL.summary.icbper });
    if (GLOBAL.summary.otrosTributos > 0) conceptos.push({ label: 'Otros Tributos', value: GLOBAL.summary.otrosTributos });
    
    if (conceptos.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    
    const roundPDT = document.getElementById('roundingToggle').checked;
    const format = (val) => {
        let num = parseFloat(val) || 0;
        if (roundPDT) num = Math.round(num);
        return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    
    container.innerHTML = `
        <h3 class="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
            <i class="fas fa-info-circle text-blue-600"></i>
            Conceptos Adicionales Detectados
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${conceptos.map(c => `
                <div class="bg-white p-4 rounded-xl shadow border border-gray-200">
                    <p class="text-xs text-gray-600 font-semibold uppercase mb-1">${c.label}</p>
                    <p class="text-xl font-bold text-gray-900">${format(c.value)}</p>
                    ${c.igv !== undefined ? `<p class="text-xs text-gray-500 mt-1">IGV: ${format(c.igv)}</p>` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

function renderValidationReport() {
    const container = document.getElementById('validationReport');
    if (!container) return;

    const validation = GLOBAL.validation || { issues: [], suggestions: [] };
    const issues = Array.isArray(validation.issues) ? validation.issues : [];
    const suggestions = Array.isArray(validation.suggestions) ? validation.suggestions : [];

    if (issues.length === 0 && suggestions.length === 0) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');

    const issuesHtml = issues.map(i => `<li class="mb-1">${i}</li>`).join('');
    const suggestionsHtml = suggestions.map(s => `<li class="mb-1">${s}</li>`).join('');

    container.innerHTML = `
        <h3 class="font-bold text-gray-800 mb-3 text-base flex items-center gap-2">
            <i class="fas fa-search text-yellow-600"></i>
            Análisis de formato y columnas
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-800">
            <div>
                <p class="font-semibold mb-1">Alertas detectadas:</p>
                ${issues.length > 0 ? `<ul class="list-disc list-inside text-red-700">${issuesHtml}</ul>` : '<p class="text-green-700">Sin problemas críticos detectados.</p>'}
            </div>
            <div>
                <p class="font-semibold mb-1">Sugerencias de mejora:</p>
                ${suggestions.length > 0 ? `<ul class="list-disc list-inside text-yellow-800">${suggestionsHtml}</ul>` : '<p class="text-gray-600">No se requieren ajustes adicionales.</p>'}
            </div>
        </div>
    `;
}

// ==========================================
// ERRORES
// ==========================================

function showError(msg) {
    document.getElementById('errorText').textContent = msg;
    document.getElementById('errorMessage').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

// ==========================================
// DESCARGA EXCEL
// ==========================================

function downloadExcel() {
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen
    const summaryData = [
        ['RESUMEN ANÁLISIS SIRE - ' + currentModule.toUpperCase()],
        [''],
        ['Concepto', 'Base Imponible', 'IGV', 'Total'],
        ['Régimen 18%', GLOBAL.summary.base18, GLOBAL.summary.igv18, GLOBAL.summary.base18 + GLOBAL.summary.igv18],
        ['Tasa 10.5%', GLOBAL.summary.base105, GLOBAL.summary.igv105, GLOBAL.summary.base105 + GLOBAL.summary.igv105],
        [''],
        ['Total Base', GLOBAL.summary.totalBase, '', ''],
        ['Total IGV', GLOBAL.summary.totalIGV, '', ''],
        ['GRAN TOTAL', '', '', GLOBAL.summary.totalGeneral],
        [''],
        ['Facturas/Boletas', GLOBAL.summary.totalFacturas],
        ['Notas de Crédito', GLOBAL.summary.totalNotasCredito]
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');
    
    // Hoja 2: Detalle
    const headers = GLOBAL.headers.length > 0 ? GLOBAL.headers : ['Datos'];
    const detailData = [headers, ...GLOBAL.rawAll];
    const ws2 = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle');
    
    // Descargar
    const filename = `SIRE_${currentModule}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    restoreStateForModule(currentModule);

    const mainToggle = document.getElementById('roundingToggle');
    const navToggle = document.getElementById('roundingToggleNav');
    const navWrapper = document.getElementById('nav-rounding-wrapper');

    function syncNavFromMain() {
        if (!mainToggle || !navToggle) return;
        navToggle.checked = mainToggle.checked;
    }

    function syncMainFromNav() {
        if (!mainToggle || !navToggle) return;
        mainToggle.checked = navToggle.checked;
        updateDisplayValues();
        renderConceptosAdicionales();
    }

    if (mainToggle && navToggle) {
        syncNavFromMain();
        mainToggle.addEventListener('change', () => {
            syncNavFromMain();
            renderConceptosAdicionales();
        });
        navToggle.addEventListener('change', syncMainFromNav);
    }

    function handleScroll() {
        if (!navWrapper) return;
        const threshold = 220;
        if (window.scrollY > threshold) {
            navWrapper.classList.remove('hidden');
        } else {
            navWrapper.classList.add('hidden');
        }
    }

    window.addEventListener('scroll', handleScroll);
    handleScroll();
});
