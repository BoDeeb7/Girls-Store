
"use client";

import Image from "next/image";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/app/types";
import { useCart } from "@/hooks/use-cart";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProductAIInquiry } from "./ProductAIInquiry";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white border-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-square relative overflow-hidden bg-muted">
        <Image
          src={product.imageUrl}
          alt={product.nameAr}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          data-ai-hint={product.imageHint}
        />
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <Dialog>
          <DialogTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="absolute top-2 left-2 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 bg-white/90"
            >
              <Info className="w-4 h-4 text-primary" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-right">{product.nameAr}</DialogTitle>
            </DialogHeader>
            <ProductAIInquiry product={product} />
          </DialogContent>
        </Dialog>
      </div>

      <CardContent className="p-4 text-right">
        <p className="text-xs text-muted-foreground mb-1">{product.categoryAr}</p>
        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{product.nameAr}</h3>
        <div className="flex items-center justify-between mt-3">
          <Button 
            size="sm" 
            className="rounded-full w-8 h-8 p-0" 
            onClick={() => addItem(product)}
          >
            <Plus className="w-5 h-5" />
          </Button>
          <p className="font-bold text-primary">{product.price.toFixed(2)} ر.س</p>
        </div>
      </CardContent>
    </Card>
  );
}
