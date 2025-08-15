'use server';

/**
 * @fileOverview An AI agent for generating accounting entries based on templates.
 *
 * - generateAccountingEntries - A function that generates accounting entries.
 * - GenerateAccountingEntriesInput - The input type for the generateAccountingEntries function.
 * - GenerateAccountingEntriesOutput - The return type for the generateAccountingEntries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AccountingEntryTemplateSchema = z.object({
  account: z.string().describe('The account number for the accounting entry.'),
  description: z.string().describe('A description of the accounting entry.'),
  debitFormula: z.string().describe('The formula for calculating the debit amount.  Use Handlebars syntax.'),
  creditFormula: z.string().describe('The formula for calculating the credit amount. Use Handlebars syntax.'),
});

const GenerateAccountingEntriesInputSchema = z.object({
  templateName: z.string().describe('The name of the accounting entry template to use.'),
  templates: z.array(AccountingEntryTemplateSchema).describe('The available templates for generating accounting entries.'),
  amount: z.number().describe('The amount to use for generating the accounting entries.'),
  amountType: z.enum(['Con IGV', 'Sin IGV']).describe('Whether the amount includes IGV or not.'),
});
export type GenerateAccountingEntriesInput = z.infer<typeof GenerateAccountingEntriesInputSchema>;

const AccountingEntrySchema = z.object({
  account: z.string().describe('The account number for the accounting entry.'),
  description: z.string().describe('A description of the accounting entry.'),
  debit: z.number().describe('The debit amount.'),
  credit: z.number().describe('The credit amount.'),
});

const GenerateAccountingEntriesOutputSchema = z.object({
  entries: z.array(AccountingEntrySchema).describe('The generated accounting entries.'),
});
export type GenerateAccountingEntriesOutput = z.infer<typeof GenerateAccountingEntriesOutputSchema>;

export async function generateAccountingEntries(
  input: GenerateAccountingEntriesInput
): Promise<GenerateAccountingEntriesOutput> {
  return generateAccountingEntriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAccountingEntriesPrompt',
  input: {schema: GenerateAccountingEntriesInputSchema},
  output: {schema: GenerateAccountingEntriesOutputSchema},
  prompt: `You are an expert accountant specializing in generating accounting entries from templates.

You will use the provided template and amount to generate a set of accounting entries.

Available Templates:
{{#each templates}}
  Template Name: {{this.templateName}}
  Account: {{this.account}}
  Description: {{this.description}}
  Debit Formula: {{this.debitFormula}}
  Credit Formula: {{this.creditFormula}}
{{/each}}

Selected Template: {{templateName}}
Amount: {{amount}}
Amount Type: {{amountType}}

Here are the accounting entries:
{
  "entries": [
    {{#each templates}}
    {
      "account": "{{this.account}}",
      "description": "{{this.description}}",
      "debit": {{this.debitFormula}},
      "credit": {{this.creditFormula}}
    }{{/each}}
  ]
}
`,
});

const generateAccountingEntriesFlow = ai.defineFlow(
  {
    name: 'generateAccountingEntriesFlow',
    inputSchema: GenerateAccountingEntriesInputSchema,
    outputSchema: GenerateAccountingEntriesOutputSchema,
  },
  async input => {
    const {amount, amountType} = input;

    let total = amount;
    let base = 0;
    let igv = 0;

    if (amountType === 'Con IGV') {
      base = total / 1.18;
      igv = total - base;
    } else {
      igv = total * 0.18;
      base = total;
      total = base + igv;
    }

    const variables = {
      total: total.toFixed(2),
      base: base.toFixed(2),
      igv: igv.toFixed(2),
    };

    // Substitute variables in template formulas
    const templatesWithValues = input.templates.map(template => ({
      ...template,
      debitFormula: replaceVariables(template.debitFormula, variables),
      creditFormula: replaceVariables(template.creditFormula, variables),
    }));

    const {output} = await prompt({...input, templates: templatesWithValues});
    return output!;
  }
);

function replaceVariables(formula: string, variables: { [key: string]: string }): string {
  let replacedFormula = formula;
  for (const key in variables) {
    replacedFormula = replacedFormula.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
  }
  return replacedFormula;
}
