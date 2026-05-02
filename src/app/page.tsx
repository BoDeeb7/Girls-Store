"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, PRODUCTS } from "./data/products";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, VolumeX, Volume2 } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isMuted, setIsMuted] = useState(true);
  const { itemsCount } = useCart();

  const filteredProducts = selectedCategory === "all" 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20">
      <Navbar />

      <main className="container mx-auto px-4 py-12">
        {/* Custom Logo Hero Section based on image */}
        <section className="text-center mb-16 animate-in fade-in zoom-in duration-1000">
          <div className="flex flex-col items-center">
            <span className="text-sm sm:text-lg font-black text-primary tracking-[0.15em] uppercase mb-1">
              POWERED BY HASSAN DEEB
            </span>
            <div className="flex flex-col leading-[0.85] text-center">
              <span className="text-6xl sm:text-8xl font-black text-primary tracking-tighter">
                GIRLS
              </span>
              <span className="text-6xl sm:text-8xl font-black text-primary tracking-tighter flex items-center justify-center">
                STORE<span className="text-primary">.</span>
              </span>
            </div>
          </div>
        </section>

        {/* Category Filters Styled like the image */}
        <section className="mb-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-max pb-4">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-sm",
                  selectedCategory === category.id
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-primary/40 border-primary/5 hover:border-primary/20 hover:text-primary"
                )}
              >
                {category.id === 'all' ? `ALL - الكل` : category.name}
              </button>
            ))}
          </div>
        </section>

        {/* Product Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-8">
          {filteredProducts.map((product, idx) => (
            <div 
              key={product.id} 
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </section>

        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground italic">No products found in this category.</p>
          </div>
        )}
      </main>

      <Footer />

      {/* Floating Buttons Container */}
      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-between items-center pointer-events-none z-50">
        {/* Mute Toggle - Floating Left */}
        <button 
          onClick={() => setIsMuted(!isMuted)}
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 bg-white text-primary rounded-full shadow-lg border border-primary/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Floating Cart Button - Floating Right */}
        <div className="pointer-events-auto">
          <Sheet>
            <SheetTrigger asChild>
              <button className="relative w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
                <ShoppingBag className="w-6 h-6" />
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-primary text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
                    {itemsCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full p-0 overflow-hidden flex flex-col">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-left">Shopping Cart</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto">
                <CartView />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
