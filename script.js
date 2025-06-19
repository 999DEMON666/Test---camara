document.addEventListener('DOMContentLoaded', (event) => {
    const splashScreen = document.getElementById('splash-screen');
    const body = document.body;

    // Ocultar el splash screen después de 2-3 segundos (ajusta el tiempo)
    setTimeout(() => {
        splashScreen.classList.add('hidden'); // Añade la clase para ocultar con transición
        body.style.overflowY = 'auto'; // Habilita el scroll del body si es necesario
    }, 2500); // 2.5 segundos
});
