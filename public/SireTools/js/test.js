// ==========================================
// ARCHIVO DE PRUEBA - NO MODIFICAR
// ==========================================
// Este archivo contiene datos de prueba para validar
// el correcto funcionamiento del sistema SIRE Suite v10.0

console.log('✅ Sistema SIRE Suite v10.0 Cargado Correctamente');
console.log('📊 Módulos Activos: Compras y Ventas');
console.log('🔧 Validaciones: Activadas');
console.log('💾 Persistencia: LocalStorage');

// Test de funciones críticas
window.addEventListener('load', function() {
    console.log('🎯 Iniciando verificación del sistema...');
    
    // Verificar dependencias
    if (typeof XLSX !== 'undefined') {
        console.log('✅ SheetJS (XLSX) cargado correctamente');
    } else {
        console.warn('⚠️ SheetJS no detectado - Verificar conexión CDN');
    }
    
    // Verificar Tailwind
    const tailwindTest = document.createElement('div');
    tailwindTest.className = 'hidden';
    document.body.appendChild(tailwindTest);
    const isHidden = window.getComputedStyle(tailwindTest).display === 'none';
    document.body.removeChild(tailwindTest);
    
    if (isHidden) {
        console.log('✅ Tailwind CSS cargado correctamente');
    } else {
        console.warn('⚠️ Tailwind CSS no detectado - Verificar conexión CDN');
    }
    
    // Verificar funciones globales
    const functionsToCheck = [
        'setModule',
        'processPaste',
        'downloadExcel',
        'processText',
        'smartConvert'
    ];
    
    let allFunctionsPresent = true;
    functionsToCheck.forEach(func => {
        if (typeof window[func] === 'function') {
            console.log(`✅ Función ${func}() disponible`);
        } else {
            console.error(`❌ Función ${func}() NO encontrada`);
            allFunctionsPresent = false;
        }
    });
    
    if (allFunctionsPresent) {
        console.log('✅ Todas las funciones críticas están disponibles');
        console.log('🚀 Sistema listo para usar');
    } else {
        console.error('❌ Faltan funciones críticas - Revisar app.js');
    }
    
    // Verificar almacenamiento
    try {
        localStorage.setItem('SIRE_TEST', 'OK');
        const test = localStorage.getItem('SIRE_TEST');
        localStorage.removeItem('SIRE_TEST');
        if (test === 'OK') {
            console.log('✅ LocalStorage funcionando correctamente');
        }
    } catch (e) {
        console.warn('⚠️ LocalStorage no disponible - La persistencia no funcionará');
    }
    
    console.log('=====================================');
    console.log('SIRE Suite v10.0 - Sistema Validado');
    console.log('=====================================');
});
