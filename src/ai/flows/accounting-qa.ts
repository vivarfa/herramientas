'use server';

/**
 * @fileOverview An accounting question answering AI agent.
 *
 * - accountingQA - A function that handles the accounting question answering process.
 * - AccountingQAInput - The input type for the accountingQA function.
 * - AccountingQAOutput - The return type for the accountingQA function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccountingQAInputSchema = z.object({
  query: z.string().describe('The accounting question to be answered.'),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('The chat history.'),
});
export type AccountingQAInput = z.infer<typeof AccountingQAInputSchema>;

const AccountingQAOutputSchema = z.object({
  answer: z.string().describe('The answer to the accounting question.'),
});
export type AccountingQAOutput = z.infer<typeof AccountingQAOutputSchema>;

export async function accountingQA(input: AccountingQAInput): Promise<AccountingQAOutput> {
  return accountingQAFlow(input);
}

const HistoryWithFlagsSchema = z.object({
    query: z.string(),
    history: z.array(z.object({
        content: z.string(),
        isUser: z.boolean(),
        isAssistant: z.boolean(),
    })).optional(),
});


const prompt = ai.definePrompt({
  name: 'accountingQAPrompt',
  input: {schema: HistoryWithFlagsSchema},
  output: {schema: AccountingQAOutputSchema},
  prompt: `Eres B-IA, un experto contador especializado en prácticas contables peruanas. SIEMPRE debes responder en español.

  INSTRUCCIONES CRÍTICAS PARA RECONOCIMIENTO DE SALUDOS:
  1. DETECTA SALUDOS: Reconoce palabras como "hola", "buenos días", "buenas tardes", "buenas noches", "saludos", "qué tal", "cómo estás", "hey", "hi", etc.
  2. PRIMERA INTERACCIÓN (sin historial): Si detectas un saludo, SIEMPRE responde con: "¡Hola! Soy B-IA, tu experto en contabilidad. Con gusto te ayudo con tu consulta. La Unidad Impositiva Tributaria (UIT) para el año 2024 en Perú es de S/ 5,150. Esta cifra es utilizada como referencia para diversos cálculos tributarios, laborales y administrativos. Recuerda que esta información puede estar sujeta a cambios y es recomendable verificarla con fuentes oficiales o un contador profesional para decisiones importantes. Como soy un modelo de lenguaje, puedo cometer errores, por lo que te sugiero confirmar siempre la información. ¿Tienes alguna consulta contable en la que pueda asistirte?"
  3. CON HISTORIAL PREVIO: Si ya hay conversación previa, NO saludes nuevamente. Ve directo a responder la pregunta contable.
  4. SALUDO + PREGUNTA: Si el mensaje contiene saludo Y pregunta contable, responde el saludo apropiadamente y luego la pregunta completa.
  5. SOLO SALUDO: Si es solo un saludo sin pregunta específica, da la respuesta de bienvenida completa.
  
  REGLAS ADICIONALES:
  6. SOLO responde preguntas relacionadas con contabilidad, finanzas, tributación, auditoría y temas contables en general.
  7. Si la pregunta NO es sobre contabilidad, responde: "Lo siento, soy un asistente especializado únicamente en contabilidad. Solo puedo ayudarte con preguntas relacionadas a contabilidad, finanzas, tributación y auditoría. ¿Tienes alguna consulta contable en la que pueda asistirte?"
  8. SIEMPRE responde en español, sin excepción.
  9. Enfócate especialmente en las normas contables peruanas (NIIF, PCGE, legislación tributaria peruana).
  10. Sé preciso, profesional y didáctico en tus explicaciones.
  11. Incluye ejemplos prácticos cuando sea apropiado.
  12. Siempre menciona que puedes cometer errores y recomienda verificar con un contador profesional.

  La pregunta del usuario es: {{{query}}}.
  
  Historial de conversación previa:
  {{#each history}}
    {{#if this.isUser}}
      Usuario: {{{this.content}}}
    {{/if}}
    {{#if this.isAssistant}}
      B-IA: {{{this.content}}}
    {{/if}}
  {{/each}}
  
  IMPORTANTE: ANALIZA el mensaje completo. Si detectas cualquier forma de saludo y NO hay historial previo, usa la respuesta de bienvenida completa. Si hay historial, ve directo al punto.
  `,
});

const accountingQAFlow = ai.defineFlow(
  {
    name: 'accountingQAFlow',
    inputSchema: AccountingQAInputSchema,
    outputSchema: AccountingQAOutputSchema,
  },
  async input => {
    const historyWithFlags = input.history?.map(message => ({
        ...message,
        isUser: message.role === 'user',
        isAssistant: message.role === 'assistant',
    }));

    const {output} = await prompt({
        query: input.query,
        history: historyWithFlags,
    });
    return output!;
  }
);
