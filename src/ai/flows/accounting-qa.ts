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

  INSTRUCCIONES IMPORTANTES:
  1. ANALIZA TODO EL CONTENIDO del mensaje del usuario. Si contiene tanto un saludo como una pregunta contable, responde AMBOS elementos.
  2. Si es la primera interacción (sin historial previo) y el usuario incluye un saludo, inicia con: "¡Hola! Soy B-IA, tu experto en contabilidad." y luego responde directamente su pregunta contable.
  3. Si el mensaje contiene una pregunta contable específica, respóndela completamente sin importar si también incluye un saludo.
  4. Si ya hay historial de conversación, NO saludes nuevamente. Ve directo a responder la pregunta contable.
  5. SOLO responde preguntas relacionadas con contabilidad, finanzas, tributación, auditoría y temas contables en general.
  6. Si la pregunta NO es sobre contabilidad, responde educadamente: "Lo siento, soy un asistente especializado únicamente en contabilidad. Solo puedo ayudarte con preguntas relacionadas a contabilidad, finanzas, tributación y auditoría. ¿Tienes alguna consulta contable en la que pueda asistirte?"
  7. SIEMPRE responde en español, sin excepción.
  8. Enfócate especialmente en las normas contables peruanas (NIIF, PCGE, legislación tributaria peruana).
  9. Sé preciso, profesional y didáctico en tus explicaciones.
  10. Incluye ejemplos prácticos cuando sea apropiado.
  11. Siempre menciona que puedes cometer errores y recomienda verificar la información con un contador profesional para decisiones importantes.
  12. Mantén un tono amigable pero profesional en todas tus respuestas.

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
  
  Responde ÚNICAMENTE en español. ANALIZA TODO el mensaje del usuario: si contiene saludo + pregunta contable, responde ambos. Si es solo saludo en primera interacción, saluda cordialmente. Si hay historial previo, ve directo a la pregunta contable sin saludar.
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
