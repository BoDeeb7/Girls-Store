"use client";

import { ShoppingBag, Search, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";

export function Navbar() {
  const { itemsCount } = useCart();

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-primary/5">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Button variant="ghost" size="icon" className="rounded-full text-primary">
            <Search className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-primary hidden sm:flex">
            <Heart className="w-5 h-5" />
          </Button>
        </div>

        {/* Centered Signature */}
        <div className="flex-1 flex justify-center">
          <div className="flex flex-col items-center group cursor-default">
            <span className="text-[11px] sm:text-sm font-black text-primary/80 tracking-[0.25em] uppercase whitespace-nowrap">
              POWERED BY HASSAN DEEB
            </span>
            <div className="w-1/2 h-[1px] bg-primary/30 mt-0.5 transition-all duration-300 group-hover:w-full group-hover:bg-primary/60"></div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-full text-primary">
                <ShoppingBag className="w-6 h-6" />
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-background">
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
