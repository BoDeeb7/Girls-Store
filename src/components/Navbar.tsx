
"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, Search, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";
import { cn } from "@/lib/utils";

interface NavbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export function Navbar({ searchQuery, setSearchQuery }: NavbarProps) {
  const { itemsCount } = useCart();
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // التركيز التلقائي على خانة البحث عند ظهورها
  useEffect(() => {
    if (isSearchVisible) {
      const input = document.getElementById('navbar-search-input');
      input?.focus();
    }
  }, [isSearchVisible]);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-primary/5">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        {/* الجزء الأيسر: زر تفعيل البحث */}
        <div className="flex items-center gap-2 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "rounded-full transition-all duration-300",
              isSearchVisible ? "text-primary bg-primary/10" : "text-primary"
            )}
            onClick={() => {
              setIsSearchVisible(!isSearchVisible);
              if (isSearchVisible) setSearchQuery("");
            }}
          >
            {isSearchVisible ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-primary hidden sm:flex">
            <Heart className="w-5 h-5" />
          </Button>
        </div>

        {/* المنتصف: توقيع الموقع */}
        <div className="flex-1 flex justify-center">
          <div className="flex flex-col items-center group cursor-default">
            <span className="text-[14px] sm:text-[20px] font-black text-primary tracking-[0.3em] uppercase whitespace-nowrap transition-all duration-300 group-hover:tracking-[0.35em]">
              POWERED BY HASSAN DEEB
            </span>
            <div className="w-3/4 h-[2px] bg-primary/40 mt-1 transition-all duration-500 group-hover:w-full group-hover:bg-primary"></div>
          </div>
        </div>

        {/* الجزء الأيمن: السلة */}
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

      {/* شريط البحث المنبثق لأسفل */}
      <div className={cn(
        "overflow-hidden transition-all duration-500 ease-in-out bg-background border-t border-primary/5",
        isSearchVisible ? "max-h-24 opacity-100" : "max-h-0 opacity-0 pointer-events-none"
      )}>
        <div className="container mx-auto px-4 py-4">
          <div className="relative group flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
              <Input
                id="navbar-search-input"
                placeholder="Search for beauty products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-full bg-primary/5 border-none pl-11 pr-12 focus-visible:ring-2 focus-visible:ring-primary/20 text-base"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-primary/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-primary/40" />
                </button>
              )}
            </div>
            <Button 
              variant="ghost" 
              className="rounded-full sm:hidden font-bold text-xs uppercase tracking-widest text-primary/60"
              onClick={() => setIsSearchVisible(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
