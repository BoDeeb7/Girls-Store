
"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { CATEGORIES, PRODUCTS } from "./data/products";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { itemsCount } = useCart();

  const filteredProducts = selectedCategory === "all" 
    ? PRODUCTS 
    : PRODUCTS.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero / Branding Section */}
        <section className="text-center mb-12 animate-in fade-in zoom-in duration-700">
          <h1 className="text-4xl sm:text-6xl font-bold text-primary mb-4">
            Girls Store
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            أجمل منتجات العناية والجمال المختارة بعناية لكِ
          </p>
        </section>

        {/* Category Filters */}
        <section className="mb-10 overflow-x-auto no-scrollbar pb-2">
          <div className="flex items-center justify-center gap-2 sm:gap-4 min-w-max">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
                  selectedCategory === category.id
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                    : "bg-white text-muted-foreground border-transparent hover:border-primary/30 hover:text-primary"
                )}
              >
                {category.nameAr}
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
            <p className="text-muted-foreground">لا توجد منتجات في هذا القسم حالياً.</p>
          </div>
        )}
      </main>

      {/* Floating Cart Button for Mobile */}
      <div className="fixed bottom-6 right-6 z-50 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <button className="relative w-14 h-14 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
              <ShoppingBag className="w-6 h-6" />
              {itemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                  {itemsCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full p-0 overflow-hidden flex flex-col">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-right">سلة التسوق</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto">
              <CartView />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
