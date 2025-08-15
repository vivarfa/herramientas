import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Verificar si la API key está configurada
if (!process.env.GOOGLE_GENAI_API_KEY) {
  console.warn('⚠️  GOOGLE_GENAI_API_KEY no está configurada. La IA no funcionará correctamente.');
  console.warn('📝 Por favor, configura tu API key en el archivo .env.local');
  console.warn('🔗 Obtén tu API key desde: https://aistudio.google.com/app/apikey');
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
