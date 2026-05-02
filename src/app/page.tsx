
"use client";

import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ProductCard } from "@/components/ProductCard";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { ShoppingBag, VolumeX, Volume2, Lock } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CartView } from "@/components/CartView";
import { Footer } from "@/components/Footer";
import { useCollection, useMemoFirebase, useFirestore } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Product } from "./types";

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { itemsCount } = useCart();
  const db = useFirestore();
  const router = useRouter();

  // Admin trigger state
  const [logoClicks, setLogoClicks] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  // Firestore Data
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, "categories"), orderBy("name", "asc")) : null, [db]);
  const productsQuery = useMemoFirebase(() => db ? query(collection(db, "products"), orderBy("createdAt", "desc")) : null, [db]);
  
  const { data: categoriesData } = useCollection(categoriesQuery);
  const { data: productsData } = useCollection(productsQuery);

  const categories = categoriesData || [];
  const products = productsData || [] as Product[];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
    const startAudio = async () => {
      try { await audio.play(); } catch (e) {}
    };
    startAudio();
    const unlockAudio = () => {
      if (audio.paused) audio.play().catch(() => {});
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    return () => document.removeEventListener('click', unlockAudio);
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted && audioRef.current.paused) audioRef.current.play().catch(() => {});
    }
  }, [isMuted]);

  const handleLogoClick = () => {
    const newCount = logoClicks + 1;
    setLogoClicks(newCount);
    if (newCount === 7) {
      setShowPasswordDialog(true);
      setLogoClicks(0);
    }
    // Reset click counter if user waits too long
    setTimeout(() => setLogoClicks(0), 3000);
  };

  const handleAdminAuth = () => {
    if (adminPassword === "Hassan@GS#7") {
      localStorage.setItem("admin_auth", "true");
      router.push("/admin");
    } else {
      alert("Incorrect Password");
      setAdminPassword("");
      setShowPasswordDialog(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleMute = () => setIsMuted(!isMuted);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/20">
      <Navbar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <audio ref={audioRef} src="https://cdn.pixabay.com/audio/2022/05/27/audio_180873748b.mp3" loop playsInline preload="auto" />

      <main className="container mx-auto px-4 py-12">
        <section className="text-center mb-16 animate-in fade-in zoom-in duration-1000">
          <div className="flex flex-col items-center">
            <div 
              className="flex flex-col leading-[0.85] text-center font-body cursor-pointer active:scale-95 transition-transform"
              onClick={handleLogoClick}
            >
              <span className="text-7xl sm:text-9xl font-black text-primary tracking-tighter uppercase">
                Girls
              </span>
              <div className="flex items-baseline justify-center">
                <span className="text-7xl sm:text-9xl font-black text-primary tracking-tighter uppercase">
                  Store
                </span>
                <span className="text-7xl sm:text-9xl font-black text-[#FBCFE8] leading-none">.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12 overflow-x-auto no-scrollbar">
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-max pb-4">
            <button
              onClick={() => setSelectedCategory("all")}
              className={cn(
                "px-6 py-2.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-sm",
                selectedCategory === "all"
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-primary/40 border-primary/5 hover:border-primary/20 hover:text-primary"
              )}
            >
              ALL
            </button>
            {categories.map((category) => (
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
                {category.name}
              </button>
            ))}
          </div>
        </section>

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
            <p className="text-muted-foreground italic">
              {searchQuery ? `No products found matching "${searchQuery}"` : "No products found in this category."}
            </p>
          </div>
        )}
      </main>

      <Footer />

      <div className="fixed bottom-6 left-0 right-0 px-6 flex justify-between items-center pointer-events-none z-50">
        <button 
          onClick={toggleMute}
          className="pointer-events-auto w-10 h-10 sm:w-12 sm:h-12 bg-white text-primary rounded-full shadow-lg border border-primary/10 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

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

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Admin Access Required
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input 
              type="password" 
              placeholder="Enter password" 
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminAuth()}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAdminAuth} className="w-full rounded-full font-black uppercase tracking-widest">
              Unlock Dashboard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
