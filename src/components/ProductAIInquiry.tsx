"use client";

import { useState } from "react";
import { aiProductInquiry } from "@/ai/flows/ai-product-inquiry-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Product } from "@/app/types";
import { Sparkles, Send, Loader2 } from "lucide-react";

export function ProductAIInquiry({ product }: { product: Product }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    try {
      const result = await aiProductInquiry({
        productName: product.name,
        productDescription: product.description,
        userQuestion: question,
      });
      setAnswer(result.answer);
    } catch (error) {
      setAnswer("Sorry, something went wrong. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 text-left">
      <div className="flex items-center justify-start gap-2 text-primary font-medium">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm">Ask AI about this product</span>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="How do I use this?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="text-left focus-visible:ring-primary"
        />
        <Button 
          type="submit" 
          size="icon" 
          disabled={isLoading || !question.trim()}
          className="rounded-lg flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      {answer && (
        <div className="bg-secondary/50 p-3 rounded-lg border border-primary/10 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
