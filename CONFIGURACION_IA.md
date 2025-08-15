# 🤖 Configuración de B-IA (Asistente Inteligente)

## 📋 Problema Identificado
La IA no puede conectarse porque falta la configuración de la API key de Google AI.

## 🔧 Solución

### Paso 1: Obtener API Key de Google AI
1. Ve a [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Create API Key"
4. Copia la API key generada

### Paso 2: Configurar la API Key
1. Abre el archivo `.env.local` en la raíz del proyecto
2. Reemplaza `your_google_ai_api_key_here` con tu API key real:
   ```
   GOOGLE_GENAI_API_KEY=tu_api_key_aqui
   ```
3. Guarda el archivo

### Paso 3: Reiniciar el Servidor
1. Detén el servidor (Ctrl+C en la terminal)
2. Ejecuta nuevamente: `npm run dev`

## ✅ Verificación
- Una vez configurada correctamente, B-IA debería responder a tus preguntas
- Si aún hay problemas, revisa la consola del navegador para más detalles

## 🔒 Seguridad
- El archivo `.env.local` está incluido en `.gitignore` para proteger tu API key
- Nunca compartas tu API key públicamente

## 💡 Características de B-IA
- Especializado en contabilidad peruana
- Límite de 100 consultas diarias
- Historial de conversación guardado localmente
- Interfaz amigable con chat en tiempo real