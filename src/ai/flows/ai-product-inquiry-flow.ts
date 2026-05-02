'use server';
/**
 * @fileOverview An AI tool that provides instant, relevant answers to user questions about specific product characteristics or uses.
 *
 * - aiProductInquiry - A function that handles product inquiries using AI.
 * - AIProductInquiryInput - The input type for the aiProductInquiry function.
 * - AIProductInquiryOutput - The return type for the aiProductInquiry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AIProductInquiryInputSchema = z.object({
  productName: z.string().describe('The name of the product the user is asking about.'),
  productDescription: z
    .string()
    .describe('A detailed description of the product, including features and uses.'),
  userQuestion: z.string().describe('The question from the user about the product.'),
});
export type AIProductInquiryInput = z.infer<typeof AIProductInquiryInputSchema>;

const AIProductInquiryOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s question about the product.'),
});
export type AIProductInquiryOutput = z.infer<typeof AIProductInquiryOutputSchema>;

export async function aiProductInquiry(input: AIProductInquiryInput): Promise<AIProductInquiryOutput> {
  return aiProductInquiryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiProductInquiryPrompt',
  input: {schema: AIProductInquiryInputSchema},
  output: {schema: AIProductInquiryOutputSchema},
  prompt: `You are a helpful and knowledgeable assistant for an e-commerce store. Your goal is to provide concise and accurate answers to customer questions about specific products, using only the provided product information.

Product Name: {{{productName}}}
Product Description: {{{productDescription}}}

Customer's Question: {{{userQuestion}}}

Based on the information above, please provide a clear and helpful answer to the customer's question.`,
});

const aiProductInquiryFlow = ai.defineFlow(
  {
    name: 'aiProductInquiryFlow',
    inputSchema: AIProductInquiryInputSchema,
    outputSchema: AIProductInquiryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
