
"use client";

import { ShoppingBag, Search, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";

export function Navbar() {
  const { itemsCount } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="w-5 h-5 text-primary" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:flex">
            <Heart className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <div className="flex flex-col items-center group cursor-pointer transition-transform hover:scale-105">
          <span className="text-[8px] font-bold text-primary/60 tracking-[0.3em] uppercase mb-0.5">
            POWERED BY HASSAN DEEB
          </span>
          <div className="flex items-center gap-1">
            <span className="text-2xl sm:text-3xl font-black text-primary tracking-tighter leading-none">
              GIRLS STORE.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full">
                <ShoppingBag className="w-6 h-6 text-primary" />
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
                    {itemsCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden flex flex-col">
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
    </nav>
  );
}
