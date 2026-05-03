
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Plus, Info, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Product } from "@/app/types";
import { useCart } from "@/hooks/use-cart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProductAIInquiry } from "./ProductAIInquiry";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // تبديل الصور تلقائياً وبشكل مستمر في حال تعدد الصور
  useEffect(() => {
    if (!product.images || product.images.length <= 1) {
      setCurrentImageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }, 3000); // تبديل كل 3 ثواني

    return () => clearInterval(interval);
  }, [product.images]);

  const displayImage = product.images?.[currentImageIndex] || product.imageUrl;

  return (
    <Card 
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white border-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Dialog>
        <DialogTrigger asChild>
          <div className="aspect-square relative overflow-hidden bg-muted cursor-pointer">
            {displayImage ? (
              <Image
                src={displayImage}
                alt={product.name}
                fill
                className="object-cover transition-opacity duration-1000"
                data-ai-hint={product.imageHint || "cosmetics"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5">
                <ImageIcon className="w-8 h-8 text-primary/20" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="bg-white/90 p-2 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
                <Info className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            {/* مؤشر النقاط الصغير للصور المتعددة */}
            {product.images && product.images.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                {product.images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`w-1 h-1 rounded-full transition-all duration-500 ${idx === currentImageIndex ? 'bg-primary w-3' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none rounded-2xl">
          <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto">
            {/* Image Section */}
            <div className="w-full md:w-1/2 bg-muted relative aspect-square">
              <Carousel className="w-full h-full">
                <CarouselContent className="h-full m-0">
                  {product.images && product.images.length > 0 ? (
                    product.images.map((img, index) => (
                      <CarouselItem key={index} className="p-0 h-full relative aspect-square">
                        {img ? (
                          <Image
                            src={img}
                            alt={`${product.name} view ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5">
                            <ImageIcon className="w-12 h-12 text-primary/20" />
                          </div>
                        )}
                      </CarouselItem>
                    ))
                  ) : (
                    <CarouselItem className="p-0 h-full relative aspect-square">
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <ImageIcon className="w-12 h-12 text-primary/20" />
                      </div>
                    </CarouselItem>
                  )}
                </CarouselContent>
                {product.images && product.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2 bg-white/50 border-none hover:bg-white" />
                    <CarouselNext className="right-2 bg-white/50 border-none hover:bg-white" />
                  </>
                )}
              </Carousel>
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <DialogHeader>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                      {product.category}
                    </p>
                    <DialogTitle className="text-2xl font-black tracking-tight text-primary">
                      {product.name}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                <div className="space-y-2">
                  <p className="text-2xl font-black text-primary">${product.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <ProductAIInquiry product={product} />
                </div>
              </div>

              <Button 
                className="w-full h-12 rounded-full font-black text-sm uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                onClick={() => addItem(product)}
              >
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CardContent className="p-4 text-left">
        <div className="flex flex-col">
          <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-widest font-bold opacity-50">
            {product.category}
          </p>
          <h3 className="font-bold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between mt-3">
            <p className="font-black text-primary text-lg">${product.price.toFixed(2)}</p>
            <Button 
              size="sm" 
              className="rounded-full w-9 h-9 p-0 shadow-md hover:scale-110 active:scale-90 transition-all" 
              onClick={(e) => {
                e.stopPropagation();
                addItem(product);
              }}
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
