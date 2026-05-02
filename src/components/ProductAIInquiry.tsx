
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
      setAnswer("عذراً، حدث خطأ ما. يرجى المحاولة لاحقاً.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 text-right">
      <div className="flex items-center justify-end gap-2 text-primary font-medium">
        <span className="text-sm">اسألي الذكاء الاصطناعي عن هذا المنتج</span>
        <Sparkles className="w-4 h-4" />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Button 
          type="submit" 
          size="icon" 
          disabled={isLoading || !question.trim()}
          className="rounded-lg flex-shrink-0"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
        </Button>
        <Input
          placeholder="كيف يمكنني استخدامه؟"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="text-right focus-visible:ring-primary"
        />
      </form>

      {answer && (
        <div className="bg-secondary/50 p-3 rounded-lg border border-primary/10 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
