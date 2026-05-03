
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp, query, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit2, ArrowLeft, Loader2, Save, X, Upload, Image as ImageIcon, Search, LogOut, Package } from "lucide-react";
import { Product } from "@/app/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

// Helper to resize and compress images before upload
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('canvas-2d' as any) || (canvas as any).getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality JPEG
    };
  });
};

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Role Check
  const adminRoleQuery = useMemoFirebase(() => (db && user) ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: isAdminRoleLoading } = useDoc(adminRoleQuery);

  // Collections
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, "categories")) : null, [db]);
  const productsQuery = useMemoFirebase(() => db ? query(collection(db, "products")) : null, [db]);
  
  const { data: categoriesData } = useCollection(categoriesQuery);
  const { data: productsData } = useCollection(productsQuery);

  // Local sorting and safety checks
  const categories = categoriesData ? [...categoriesData].sort((a, b) => (a.name || "").localeCompare(b.name || "")) : [];
  const products = productsData ? [...productsData].sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  }) : [];

  // Form States
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (!isUserLoading && !isAdminRoleLoading) {
      if (!user) {
        router.push("/");
      }
    }
  }, [user, isUserLoading, isAdminRoleLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      router.push("/");
    }
  };

  if (isUserLoading || isAdminRoleLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
        <p className="text-primary font-bold uppercase tracking-[0.2em] text-[10px]">Verifying Access...</p>
      </div>
    );
  }

  if (!user || !adminRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive font-bold uppercase tracking-[0.2em] text-xs">Access Denied</p>
        <Button onClick={() => router.push("/")} variant="outline" className="rounded-full">Return Home</Button>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const fileArray = Array.from(files);
    
    try {
      const compressedImages = await Promise.all(
        fileArray.map(async (file) => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = reader.result as string;
              const compressed = await compressImage(base64);
              resolve(compressed);
            };
            reader.readAsDataURL(file);
          });
        })
      );

      setEditingProduct(prev => ({
        ...prev,
        images: [...(prev?.images || []), ...compressedImages]
      }));
    } catch (err) {
      toast({ title: "Upload Error", description: "Could not process images.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setEditingProduct(prev => ({
      ...prev,
      images: prev?.images?.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name) {
      toast({ title: "Missing Name", description: "Please enter a product name.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const priceVal = Number(editingProduct.price) || 0;
      const productData = {
        name: editingProduct.name || "",
        description: editingProduct.description || "",
        price: priceVal,
        category: editingProduct.category || "uncategorized",
        updatedAt: serverTimestamp(),
        createdAt: editingProduct.createdAt || serverTimestamp(),
        images: editingProduct.images || [],
        imageUrl: editingProduct.images?.[0] || "",
        // Include default fields to avoid validation errors
        nameAr: editingProduct.nameAr || "",
        descriptionAr: editingProduct.descriptionAr || "",
        categoryAr: editingProduct.categoryAr || "",
        imageHint: editingProduct.imageHint || "cosmetics",
      };

      if (editingProduct.id) {
        await updateDoc(doc(db, "products", editingProduct.id), productData);
        toast({ title: "Updated!", description: "Product has been updated successfully." });
      } else {
        const newDocRef = doc(collection(db, "products"));
        await setDoc(newDocRef, { ...productData, id: newDocRef.id });
        toast({ title: "Saved!", description: "New product added to inventory." });
      }

      setEditingProduct(null);
    } catch (err: any) {
      console.error("Save error:", err);
      const isSizeError = err.message?.toLowerCase().includes("large") || err.code === "resource-exhausted" || err.message?.toLowerCase().includes("maximum");
      toast({ 
        title: "Error Saving", 
        description: isSizeError ? "Total image size is still too large. Try uploading fewer photos." : `Could not save: ${err.message || 'Unknown error'}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    setIsSubmitting(true);
    try {
      if (editingCategory.id) {
        await updateDoc(doc(db, "categories", editingCategory.id), { name: editingCategory.name, updatedAt: serverTimestamp() });
        toast({ title: "Updated", description: "Category name changed." });
      } else {
        const newDocRef = doc(collection(db, "categories"));
        await setDoc(newDocRef, { id: newDocRef.id, name: editingCategory.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: "Added", description: "New category created." });
      }
      setEditingCategory(null);
    } catch (err) {
      toast({ title: "Error", description: "Failed to save category.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const name = p.name || "";
    const desc = p.description || "";
    const search = productSearch.toLowerCase();
    return name.toLowerCase().includes(search) || desc.toLowerCase().includes(search);
  });

  const uncategorizedProducts = filteredProducts.filter(p => !p.category || p.category === "uncategorized");

  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="max-w-6xl mx-auto p-2 sm:p-6 lg:p-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-primary/5">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 rounded-full h-9 text-xs sm:text-sm">
            <ArrowLeft className="w-4 h-4" /> Exit
          </Button>
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-black text-primary uppercase tracking-tighter">Dashboard</h1>
            <p className="text-[9px] font-bold text-primary/40 uppercase tracking-[0.3em]">Inventory Management</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="rounded-full gap-2 h-9">
            <LogOut className="w-4 h-4" /> <span className="text-xs">Logout</span>
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl h-12 bg-white border p-1 shadow-sm">
            <TabsTrigger value="products" className="rounded-lg text-xs sm:text-sm font-black uppercase">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-lg text-xs sm:text-sm font-black uppercase">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card className="rounded-2xl border-none shadow-xl overflow-hidden bg-white/90 backdrop-blur-md">
              <CardHeader className="bg-primary text-white p-4 sm:p-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-black tracking-tight uppercase text-lg sm:text-xl">
                      {editingProduct ? (editingProduct.id ? 'Edit Item' : 'New Item') : 'Product List'}
                    </CardTitle>
                    {!editingProduct && (
                      <Button onClick={() => setEditingProduct({ images: [] })} variant="secondary" className="rounded-full h-8 sm:h-9 font-black text-[10px] uppercase tracking-widest px-4">
                        <Plus className="w-4 h-4 mr-1 sm:mr-2" /> Add
                      </Button>
                    )}
                  </div>
                  {!editingProduct && (
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                      <Input 
                        placeholder="Search inventory..." 
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-9 rounded-full h-9 sm:h-10 focus-visible:ring-white/40 w-full"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-2 sm:p-6">
                {editingProduct ? (
                  <form onSubmit={handleSaveProduct} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Product Name</Label>
                        <Input value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Item name" className="rounded-xl h-11" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category</Label>
                        <Select value={editingProduct.category || "uncategorized"} onValueChange={val => setEditingProduct({...editingProduct, category: val})}>
                          <SelectTrigger className="rounded-xl h-11">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Price ($)</Label>
                        <Input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} placeholder="0.00" className="rounded-xl h-11" required />
                      </div>
                      
                      <div className="md:col-span-2 space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                          Image Gallery {isUploading && <span className="text-primary animate-pulse ml-2">(Processing...)</span>}
                        </Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {editingProduct.images?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl border border-primary/10 overflow-hidden group shadow-sm">
                              <img src={img} className="w-full h-full object-cover" alt="preview" />
                              <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full shadow-lg">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 text-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
                          >
                            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <span className="text-[8px] font-black uppercase tracking-widest">{isUploading ? 'Resizing' : 'Upload'}</span>
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                        </div>
                        <p className="text-[9px] text-muted-foreground italic">Tip: Images are automatically resized for fast loading.</p>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Description</Label>
                        <Textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Enter item details..." className="h-28 rounded-xl resize-none" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button type="submit" disabled={isSubmitting || isUploading} className="w-full sm:flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} {editingProduct.id ? 'Update Item' : 'Save Item'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="w-full sm:flex-1 rounded-full h-12 font-black uppercase tracking-widest">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Accordion type="multiple" className="space-y-3" defaultValue={["uncategorized", ...(categories.map(c => c.id) || [])]}>
                    {uncategorizedProducts.length > 0 && (
                      <AccordionItem value="uncategorized" className="border rounded-2xl px-3 sm:px-4 bg-white/50 border-primary/5 shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-4">
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-primary/40" />
                            <span className="font-black uppercase tracking-widest text-[11px] text-primary">Uncategorized</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">{uncategorizedProducts.length}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {uncategorizedProducts.map(product => (
                              <ProductItem key={product.id} product={product} onEdit={() => setEditingProduct(product)} onDelete={async () => {
                                if(confirm("Delete this item?")) {
                                  try {
                                    await deleteDoc(doc(db, "products", product.id));
                                    toast({ title: "Deleted", description: "Product removed from inventory." });
                                  } catch (err) {
                                    toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
                                  }
                                }
                              }} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {categories.map(category => {
                      const categoryProducts = filteredProducts.filter(p => p.category === category.id);
                      if (categoryProducts.length === 0 && productSearch) return null;
                      return (
                        <AccordionItem key={category.id} value={category.id} className="border rounded-2xl px-3 sm:px-4 bg-white/50 border-primary/5 shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-black uppercase tracking-widest text-[11px] text-primary">{category.name}</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">{categoryProducts.length}</span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pb-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {categoryProducts.map(product => (
                                <ProductItem key={product.id} product={product} onEdit={() => setEditingProduct(product)} onDelete={async () => {
                                  if(confirm("Delete this item?")) {
                                    try {
                                      await deleteDoc(doc(db, "products", product.id));
                                      toast({ title: "Deleted", description: "Product removed from inventory." });
                                    } catch (err) {
                                      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
                                    }
                                  }
                                }} />
                              ))}
                              {categoryProducts.length === 0 && (
                                <div className="col-span-full py-6 text-center border-2 border-dashed border-primary/10 rounded-xl">
                                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest">No products in this category</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <Card className="rounded-2xl border-none shadow-xl bg-white/90 backdrop-blur-md">
              <CardHeader className="bg-primary text-white p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-black tracking-tight uppercase text-lg sm:text-xl">Categories</CardTitle>
                  {!editingCategory && (
                    <Button onClick={() => setEditingCategory({ name: '' })} variant="secondary" className="rounded-full font-black text-[10px] uppercase h-8">
                      <Plus className="w-4 h-4 mr-1" /> New
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {editingCategory ? (
                  <form onSubmit={handleSaveCategory} className="flex flex-col sm:flex-row gap-3 items-end pt-4">
                    <div className="w-full space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category Name</Label>
                      <Input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="e.g. Skin Care" className="rounded-xl h-11" required />
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                      <Button type="submit" disabled={isSubmitting} className="flex-1 sm:px-8 h-11 font-black uppercase text-xs rounded-xl">Save</Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)} className="h-11 w-11 rounded-xl"><X className="w-4 h-4" /></Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
                    {categories.map(cat => (
                      <div key={cat.id} className="p-4 border border-primary/5 rounded-2xl flex items-center justify-between bg-white/50 group hover:shadow-lg transition-all">
                        <span className="font-black uppercase tracking-widest text-[11px] text-foreground/70">{cat.name}</span>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/5" onClick={() => setEditingCategory(cat)}>
                            <Edit2 className="w-3 h-3 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/5" onClick={async () => {
                            if(confirm("Delete category?")) {
                              try {
                                await deleteDoc(doc(db, "categories", cat.id));
                                toast({ title: "Deleted", description: "Category removed." });
                              } catch (err) {
                                toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
                              }
                            }
                          }}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ProductItem({ product, onEdit, onDelete }: { product: any, onEdit: () => void, onDelete: () => void }) {
  const price = Number(product.price) || 0;
  const imageUrl = product.images?.[0] || product.imageUrl;

  return (
    <div className="p-3 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-md transition-all bg-white/30 border-primary/5">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 bg-muted rounded-lg overflow-hidden flex-shrink-0 border border-primary/5">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name || "Item"} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-full h-full p-2 text-muted-foreground/30" />
          )}
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-xs truncate text-foreground">{product.name || "Unnamed"}</p>
          <p className="text-[10px] text-primary font-black">${price.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/5" onClick={onEdit}>
          <Edit2 className="w-3 h-3 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/5" onClick={onDelete}>
          <Trash2 className="w-3 h-3 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
