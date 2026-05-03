
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp, query } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit2, ArrowLeft, Loader2, Save, X, Upload, Image as ImageIcon, Search, LogOut, Package, CheckCircle2 } from "lucide-react";
import { Product } from "@/app/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

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

  // Collections - Removed orderBy to prevent index errors from blocking data display
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, "categories")) : null, [db]);
  const productsQuery = useMemoFirebase(() => db ? query(collection(db, "products")) : null, [db]);
  
  const { data: categoriesData } = useCollection(categoriesQuery);
  const { data: productsData } = useCollection(productsQuery);

  // Local sorting
  const categories = categoriesData ? [...categoriesData].sort((a, b) => a.name.localeCompare(b.name)) : [];
  const products = productsData ? [...productsData].sort((a, b) => {
    const dateA = a.createdAt?.seconds || 0;
    const dateB = b.createdAt?.seconds || 0;
    return dateB - dateA;
  }) : [];

  // Form States
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  useEffect(() => {
    if (!isUserLoading && !isAdminRoleLoading) {
      if (!user) {
        router.push("/");
      } else if (!adminRole) {
        const timeout = setTimeout(() => {
          if (!adminRole) router.push("/");
        }, 1500);
        return () => clearTimeout(timeout);
      }
    }
  }, [user, isUserLoading, isAdminRoleLoading, adminRole, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      router.push("/");
    }
  };

  if (isUserLoading || isAdminRoleLoading || !user || !adminRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <div className="relative w-20 h-20">
          <Loader2 className="animate-spin text-primary w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Admin</span>
          </div>
        </div>
        <p className="text-primary font-bold animate-pulse uppercase tracking-[0.2em] text-[10px] text-center">Verifying Access...</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const readers = fileArray.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(base64Strings => {
      setEditingProduct(prev => ({
        ...prev,
        images: [...(prev?.images || []), ...base64Strings]
      }));
    });
  };

  const removeImage = (index: number) => {
    setEditingProduct(prev => ({
      ...prev,
      images: prev?.images?.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price) return;

    setIsSubmitting(true);
    try {
      const productData = {
        ...editingProduct,
        price: Number(editingProduct.price),
        category: editingProduct.category || "uncategorized",
        updatedAt: serverTimestamp(),
        createdAt: editingProduct.id ? editingProduct.createdAt : serverTimestamp(),
        images: editingProduct.images || [],
        imageUrl: editingProduct.images?.[0] || "",
      };

      if (editingProduct.id) {
        updateDocumentNonBlocking(doc(db, "products", editingProduct.id), productData);
        toast({ title: "Updated!", description: "Product has been updated successfully." });
      } else {
        const newDocRef = doc(collection(db, "products"));
        setDocumentNonBlocking(newDocRef, { ...productData, id: newDocRef.id }, { merge: true });
        toast({ title: "Saved!", description: "New product added to inventory." });
      }

      setEditingProduct(null);
    } catch (err) {
      toast({ title: "Error", description: "Could not save. Check image sizes.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    if (editingCategory.id) {
      updateDocumentNonBlocking(doc(db, "categories", editingCategory.id), { name: editingCategory.name, updatedAt: serverTimestamp() });
      toast({ title: "Updated", description: "Category name changed." });
    } else {
      const newDocRef = doc(collection(db, "categories"));
      setDocumentNonBlocking(newDocRef, { id: newDocRef.id, name: editingCategory.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      toast({ title: "Added", description: "New category created." });
    }
    setEditingCategory(null);
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const uncategorizedProducts = filteredProducts?.filter(p => !p.category || p.category === "uncategorized");

  return (
    <div className="min-h-screen bg-secondary/30 p-2 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 rounded-full self-start sm:self-auto text-xs sm:text-sm h-8 sm:h-10">
            <ArrowLeft className="w-4 h-4" /> Exit
          </Button>
          <div className="text-center">
            <h1 className="text-2xl sm:text-4xl font-black text-primary tracking-tighter uppercase leading-none">Management</h1>
            <p className="text-[8px] sm:text-[10px] font-bold text-primary/40 uppercase tracking-[0.3em] mt-1">Admin Dashboard</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="rounded-full gap-2 self-end sm:self-auto h-8 sm:h-10 px-4">
            <LogOut className="w-3 h-3 sm:w-4 h-4" /> <span className="text-[10px] sm:text-xs">Logout</span>
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-8 rounded-full h-10 sm:h-12 bg-white/50 border shadow-sm p-1">
            <TabsTrigger value="products" className="rounded-full text-[10px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white transition-all uppercase font-black">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full text-[10px] sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-white transition-all uppercase font-black">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4 sm:space-y-6">
            <Card className="rounded-xl sm:rounded-2xl border-none shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
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
              <CardContent className="p-3 sm:p-6">
                {editingProduct ? (
                  <form onSubmit={handleSaveProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Product Name</Label>
                        <Input value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="e.g. Velvet Lipstick" className="rounded-xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category</Label>
                        <Select value={editingProduct.category} onValueChange={val => setEditingProduct({...editingProduct, category: val})}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="uncategorized">Uncategorized</SelectItem>
                            {categories?.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Price ($)</Label>
                        <Input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} placeholder="0.00" className="rounded-xl" required />
                      </div>
                      
                      <div className="md:col-span-2 space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Gallery (Max 1MB total recommended)</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                          {editingProduct.images?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-lg sm:rounded-xl border-2 border-primary/10 overflow-hidden group shadow-sm">
                              <img src={img} className="w-full h-full object-cover" alt="preview" />
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-lg sm:rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-1 sm:gap-2 text-primary/40 hover:text-primary hover:border-primary/40 transition-all bg-primary/5 hover:bg-primary/10"
                          >
                            <Upload className="w-4 h-4 sm:w-6 sm:h-6" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em]">Upload</span>
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            multiple 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Description</Label>
                        <Textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Describe the product..." className="h-24 sm:h-32 rounded-xl resize-none" />
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <Button type="submit" disabled={isSubmitting} className="w-full sm:flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} Save Item
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="w-full sm:flex-1 rounded-full h-12 font-black uppercase tracking-widest">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Accordion type="multiple" className="space-y-3 sm:space-y-4" defaultValue={["uncategorized", ...(categories?.map(c => c.id) || [])]}>
                    {uncategorizedProducts && uncategorizedProducts.length > 0 && (
                      <AccordionItem value="uncategorized" className="border rounded-xl sm:rounded-2xl px-3 sm:px-4 overflow-hidden bg-white/50 border-primary/5 shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-4 sm:py-5 group">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Package className="w-3 h-3 sm:w-4 sm:h-4 text-primary/40" />
                            <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-primary group-hover:tracking-[0.2em] transition-all">Uncategorized</span>
                            <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                              {uncategorizedProducts.length}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4 sm:pb-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {uncategorizedProducts.map(product => (
                              <ProductListItem key={product.id} product={product} onEdit={() => setEditingProduct(product)} db={db} />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {categories?.map(category => {
                      const categoryProducts = filteredProducts?.filter(p => p.category === category.id);
                      if (categoryProducts?.length === 0 && productSearch) return null;
                      
                      return (
                        <AccordionItem key={category.id} value={category.id} className="border rounded-xl sm:rounded-2xl px-3 sm:px-4 overflow-hidden bg-white/50 border-primary/5 shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-4 sm:py-5 group">
                            <div className="flex items-center gap-2 sm:gap-3 text-left">
                              <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-primary group-hover:tracking-[0.2em] transition-all">{category.name}</span>
                              <span className="text-[9px] sm:text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                                {categoryProducts?.length || 0}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4 sm:pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {categoryProducts?.map(product => (
                                <ProductListItem key={product.id} product={product} onEdit={() => setEditingProduct(product)} db={db} />
                              ))}
                              {(!categoryProducts || categoryProducts.length === 0) && (
                                <div className="col-span-full py-6 sm:py-8 text-center bg-primary/5 rounded-xl border border-dashed border-primary/20">
                                  <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">No items in this category</p>
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

          <TabsContent value="categories" className="space-y-4 sm:space-y-6">
            <Card className="rounded-xl sm:rounded-2xl border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-primary text-white p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-black tracking-tight uppercase text-lg sm:text-xl">Category Manager</CardTitle>
                  {!editingCategory && (
                    <Button onClick={() => setEditingCategory({ name: '' })} variant="secondary" className="rounded-full font-black text-[10px] uppercase tracking-widest h-8 sm:h-9">
                      <Plus className="w-4 h-4 mr-1 sm:mr-2" /> New
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {editingCategory ? (
                  <form onSubmit={handleSaveCategory} className="flex flex-col sm:flex-row gap-3 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="w-full space-y-2 text-left">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category Name</Label>
                      <Input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="e.g. Skin Care" className="rounded-xl h-11" required />
                    </div>
                    <div className="flex w-full sm:w-auto gap-2">
                      <Button type="submit" className="flex-1 sm:px-8 h-11 font-black uppercase text-xs tracking-widest rounded-xl">Save</Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)} className="h-11 w-11 rounded-xl"><X className="w-4 h-4" /></Button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {categories?.map(cat => (
                      <div key={cat.id} className="p-4 sm:p-5 border border-primary/5 rounded-xl sm:rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-xl transition-all group bg-white/30">
                        <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-foreground/70">{cat.name}</span>
                        <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="hover:bg-primary/5 rounded-full w-8 h-8 sm:w-10 sm:h-10" onClick={() => setEditingCategory(cat)}>
                            <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="hover:bg-destructive/5 rounded-full w-8 h-8 sm:w-10 sm:h-10" onClick={() => {
                            if(confirm("Delete category?")) deleteDocumentNonBlocking(doc(db, "categories", cat.id));
                          }}>
                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
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

function ProductListItem({ product, onEdit, db }: { product: any, onEdit: () => void, db: any }) {
  return (
    <div className="p-3 sm:p-4 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all bg-white/30 border-primary/5">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border-2 border-primary/5">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-full h-full p-2 text-muted-foreground/30" />
          )}
        </div>
        <div className="overflow-hidden text-left">
          <p className="font-bold text-xs sm:text-sm truncate text-foreground">{product.name}</p>
          <p className="text-[10px] sm:text-xs text-primary font-black">${Number(product.price).toFixed(2)}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-2">
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/5" onClick={onEdit}>
          <Edit2 className="w-3 h-3 sm:w-4 h-4 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/5" onClick={() => {
          if(confirm("Delete item?")) deleteDocumentNonBlocking(doc(db, "products", product.id));
        }}>
          <Trash2 className="w-3 h-3 sm:w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
