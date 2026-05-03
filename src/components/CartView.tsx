
"use client";

import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function CartView() {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const [fullName, setFullName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("whish");

  const handleWhatsAppOrder = () => {
    if (!fullName.trim()) return;

    const phoneNumber = "96176511272";
    const paymentLabel = paymentMethod === "whish" ? "Whish Money" : "Cash on Delivery";
    
    let message = `*GIRLS STORE - NEW ORDER*\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${fullName}\n`;
    message += `Payment: ${paymentLabel}\n\n`;
    
    message += `*Order Items:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n*TOTAL: $${totalPrice.toFixed(2)}*\n\n`;
    message += `Please confirm my order. Thank you!`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, "_blank");
    
    // Clear cart after order
    clearCart();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-primary opacity-50" />
        </div>
        <p className="text-muted-foreground font-medium">Your cart is empty</p>
      </div>
    );
  }

  const isFormValid = fullName.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Items List */}
        <div className="space-y-4">
          <h3 className="font-black uppercase text-xs tracking-widest text-primary/40 px-1">Your Selection</h3>
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 p-3 border rounded-xl bg-background/30 group">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border bg-muted">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm line-clamp-1">{item.name}</h4>
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-primary font-black mt-1">${item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center justify-start gap-3 mt-2">
                  <div className="flex items-center border rounded-full overflow-hidden h-8 bg-white shadow-sm">
                    <button 
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                      className="px-2 hover:bg-muted transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-xs font-black border-x w-8 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-2 hover:bg-muted transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Form */}
        <div className="space-y-6 pt-4 border-t">
          <h3 className="font-black uppercase text-xs tracking-widest text-primary/40 px-1">Delivery Details</h3>
          
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-black uppercase tracking-widest text-foreground/70">Full Name *</Label>
            <Input 
              id="fullName"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl border-primary/10 focus-visible:ring-primary h-12"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black uppercase tracking-widest text-foreground/70">Payment Method</Label>
            <RadioGroup 
              value={paymentMethod} 
              onValueChange={setPaymentMethod}
              className="grid grid-cols-1 gap-3"
            >
              <div className={`flex items-center space-x-3 space-y-0 border rounded-xl p-4 transition-all ${paymentMethod === 'whish' ? 'border-primary bg-primary/5 shadow-sm' : 'border-primary/10'}`}>
                <RadioGroupItem value="whish" id="whish" />
                <Label htmlFor="whish" className="flex-1 cursor-pointer font-bold text-sm">Whish Money</Label>
              </div>
              <div className={`flex items-center space-x-3 space-y-0 border rounded-xl p-4 transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 shadow-sm' : 'border-primary/10'}`}>
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer font-bold text-sm">Cash on Delivery</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </div>

      {/* Summary & Order Button */}
      <div className="p-6 border-t bg-background/50 space-y-4">
        <div className="flex justify-between items-center text-xl font-black">
          <span className="text-primary/40 text-sm uppercase tracking-widest">Total Amount</span>
          <span className="text-primary">${totalPrice.toFixed(2)}</span>
        </div>
        
        <div className="space-y-2">
          {!isFormValid && (
            <p className="text-[10px] text-destructive font-bold text-center uppercase tracking-tighter">
              * Please enter your full name to proceed
            </p>
          )}
          <Button 
            className="w-full h-14 rounded-full text-lg font-black gap-3 bg-[#25D366] hover:bg-[#1ebd57] text-white border-none shadow-xl disabled:opacity-50 disabled:grayscale"
            onClick={handleWhatsAppOrder}
            disabled={!isFormValid}
          >
            ORDER VIA WHATSAPP
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.232 3.484 8.412-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.309 1.656zm6.29-4.131c1.53.884 3.179 1.35 4.868 1.352 5.56 0 10.088-4.527 10.091-10.088 0-2.693-1.048-5.225-2.956-7.133s-4.44-2.956-7.133-2.956c-5.56 0-10.088 4.527-10.091 10.088-.001 1.777.469 3.513 1.359 5.044l-1.015 3.703 3.877-1.01zm11.367-7.39c-.33-.165-1.951-.964-2.251-1.074s-.519-.165-.736.165-.841 1.074-1.031 1.294-.38.247-.71.082c-.33-.165-1.393-.513-2.653-1.636-1.004-.897-1.681-2.004-1.879-2.334s-.02-.509.145-.672c.148-.147.33-.385.495-.578s.219-.33.33-.55.055-.412-.028-.577c-.083-.165-.736-1.774-1.008-2.435-.264-.643-.531-.555-.736-.565l-.628-.01c-.217 0-.57.082-.868.412s-1.139 1.114-1.139 2.72 1.176 3.153 1.341 3.373c.165.22 2.315 3.535 5.608 4.956.783.338 1.394.54 1.871.691.786.25 1.499.215 2.064.13.629-.094 1.951-.798 2.226-1.568s.275-1.43.193-1.568c-.082-.138-.303-.22-.633-.385z"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
