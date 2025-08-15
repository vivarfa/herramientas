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
  prompt: `You are an expert accountant specializing in Peruvian accounting practices.

  You will use this information to answer the user's question about accounting.

  Be aware that you may be wrong, and make sure to disclaim this to the user.

  The user's question is: {{{query}}}.
  Here is the prior chat history:
  {{#each history}}
    {{#if this.isUser}}
      User: {{{this.content}}}
    {{/if}}
    {{#if this.isAssistant}}
      Assistant: {{{this.content}}}
    {{/if}}
  {{/each}}
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
