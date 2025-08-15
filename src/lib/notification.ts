
"use client";

// Usamos un objeto para mantener un registro de los timeouts de las notificaciones
// para poder cancelarlas por su ID.
const scheduledNotifications: { [key: string]: number } = {};

/**
 * Solicita permiso para mostrar notificaciones.
 * Es una buena práctica llamarlo como resultado de una acción del usuario.
 */
export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

/**
 * Programa una notificación del navegador para una fecha y hora específicas.
 * @param id Un ID único para la notificación (usado para cancelarla).
 * @param scheduleDate La fecha y hora en que la notificación debe mostrarse.
 * @param title El título de la notificación.
 * @param body El cuerpo del mensaje de la notificación.
 */
export function scheduleNotification(id: string, scheduleDate: Date, title: string, body: string) {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones de escritorio.');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.warn('El permiso para notificaciones no ha sido concedido.');
    // Opcionalmente, podrías solicitar el permiso aquí, aunque es mejor hacerlo
    // como respuesta directa a una acción del usuario.
    // requestNotificationPermission();
    return;
  }

  const now = new Date().getTime();
  const timeUntilNotification = scheduleDate.getTime() - now;

  if (timeUntilNotification < 0) {
    console.log(`La fecha de la notificación para "${id}" ya pasó.`);
    return;
  }

  // Si ya existe un timeout para este ID, lo limpiamos antes de crear uno nuevo.
  if (scheduledNotifications[id]) {
    clearTimeout(scheduledNotifications[id]);
  }

  const timeoutId = window.setTimeout(() => {
    // Cuando el timeout se completa, mostramos la notificación.
    new Notification(title, {
      body: body,
      icon: '/biluz.png', // Ícono de la app
    });
    // Limpiamos la referencia del timeout una vez que se ha ejecutado.
    delete scheduledNotifications[id];
  }, timeUntilNotification);

  // Guardamos la referencia al timeout para poder cancelarlo si es necesario.
  scheduledNotifications[id] = timeoutId;
}

/**
 * Cancela una notificación programada.
 * @param id El ID único de la notificación que se va a cancelar.
 */
export function cancelNotification(id: string) {
  if (scheduledNotifications[id]) {
    clearTimeout(scheduledNotifications[id]);
    delete scheduledNotifications[id];
  }
}
