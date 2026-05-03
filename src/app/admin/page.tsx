
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Role Check
  const adminRoleQuery = useMemoFirebase(() => (db && user) ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: isAdminRoleLoading } = useDoc(adminRoleQuery);

  // Collections
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, "categories"), orderBy("name", "asc")) : null, [db]);
  const productsQuery = useMemoFirebase(() => db ? query(collection(db, "products"), orderBy("createdAt", "desc")) : null, [db]);
  
  const { data: categories } = useCollection(categoriesQuery);
  const { data: products } = useCollection(productsQuery);

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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative w-24 h-24">
          <Loader2 className="animate-spin text-primary w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Admin</span>
          </div>
        </div>
        <p className="text-primary font-bold animate-pulse uppercase tracking-[0.2em] text-xs">Verifying Access...</p>
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
    } else {
      const newDocRef = doc(collection(db, "products"));
      setDocumentNonBlocking(newDocRef, { ...productData, id: newDocRef.id }, { merge: true });
    }

    setEditingProduct(null);
    setIsSubmitting(false);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    if (editingCategory.id) {
      updateDocumentNonBlocking(doc(db, "categories", editingCategory.id), { name: editingCategory.name, updatedAt: serverTimestamp() });
    } else {
      const newDocRef = doc(collection(db, "categories"));
      setDocumentNonBlocking(newDocRef, { id: newDocRef.id, name: editingCategory.name, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    }
    setEditingCategory(null);
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Group products by category, including a special group for uncategorized ones
  const uncategorizedProducts = filteredProducts?.filter(p => !p.category || p.category === "uncategorized");

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2 rounded-full">
            <ArrowLeft className="w-4 h-4" /> Exit
          </Button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-black text-primary tracking-tighter uppercase leading-none">Management</h1>
            <p className="text-[10px] font-bold text-primary/40 uppercase tracking-[0.3em] mt-1">Admin Dashboard</p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLogout} className="rounded-full gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 rounded-full h-12 bg-white/50 border shadow-sm p-1">
            <TabsTrigger value="products" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Inventory</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card className="rounded-2xl border-none shadow-xl overflow-hidden bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-primary text-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle className="font-black tracking-tight uppercase">
                    {editingProduct ? (editingProduct.id ? 'Edit Item' : 'New Item') : 'Product List'}
                  </CardTitle>
                  {!editingProduct && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                        <Input 
                          placeholder="Search items..." 
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-9 rounded-full h-9 focus-visible:ring-white/40 min-w-[200px]"
                        />
                      </div>
                      <Button onClick={() => setEditingProduct({ images: [] })} variant="secondary" className="rounded-full h-9 font-black text-[10px] uppercase tracking-widest">
                        <Plus className="w-4 h-4 mr-2" /> Add
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {editingProduct ? (
                  <form onSubmit={handleSaveProduct} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Gallery (Multiple Uploads)</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                          {editingProduct.images?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl border-2 border-primary/10 overflow-hidden group shadow-sm">
                              <img src={img} className="w-full h-full object-cover" alt="preview" />
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-destructive text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-2 text-primary/40 hover:text-primary hover:border-primary/40 transition-all bg-primary/5 hover:bg-primary/10"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Upload</span>
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
                        <Textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Describe the magic of this product..." className="h-32 rounded-xl resize-none" />
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4">
                      <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-full h-12 font-black uppercase tracking-widest shadow-lg">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} Save Item
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="flex-1 rounded-full h-12 font-black uppercase tracking-widest">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Accordion type="multiple" className="space-y-4" defaultValue={["uncategorized", ...(categories?.map(c => c.id) || [])]}>
                    {/* Uncategorized section shown first or if products exist */}
                    {uncategorizedProducts && uncategorizedProducts.length > 0 && (
                      <AccordionItem value="uncategorized" className="border rounded-2xl px-4 overflow-hidden bg-white/50 border-primary/5 shadow-sm">
                        <AccordionTrigger className="hover:no-underline py-5 group">
                          <div className="flex items-center gap-3">
                            <Package className="w-4 h-4 text-primary/40" />
                            <span className="font-black uppercase tracking-widest text-xs text-primary group-hover:tracking-[0.2em] transition-all">Uncategorized</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                              {uncategorizedProducts.length}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-6">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <AccordionItem key={category.id} value={category.id} className="border rounded-2xl px-4 overflow-hidden bg-white/50 border-primary/5 shadow-sm">
                          <AccordionTrigger className="hover:no-underline py-5 group">
                            <div className="flex items-center gap-3">
                              <span className="font-black uppercase tracking-widest text-xs text-primary group-hover:tracking-[0.2em] transition-all">{category.name}</span>
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                                {categoryProducts?.length || 0}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryProducts?.map(product => (
                                <ProductListItem key={product.id} product={product} onEdit={() => setEditingProduct(product)} db={db} />
                              ))}
                              {(!categoryProducts || categoryProducts.length === 0) && (
                                <div className="col-span-full py-8 text-center bg-primary/5 rounded-xl border border-dashed border-primary/20">
                                  <p className="text-xs text-primary/40 font-bold uppercase tracking-widest">No items in this category</p>
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

          <TabsContent value="categories" className="space-y-6">
            <Card className="rounded-2xl border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-primary text-white p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-black tracking-tight uppercase">Category Manager</CardTitle>
                  {!editingCategory && (
                    <Button onClick={() => setEditingCategory({ name: '' })} variant="secondary" className="rounded-full font-black text-[10px] uppercase tracking-widest">
                      <Plus className="w-4 h-4 mr-2" /> New
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {editingCategory ? (
                  <form onSubmit={handleSaveCategory} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-1 space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60">Category Name</Label>
                      <Input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="e.g. Skin Care" className="rounded-xl h-11" required />
                    </div>
                    <Button type="submit" className="rounded-full px-8 h-11 font-black uppercase text-xs tracking-widest">Save</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)} className="rounded-full h-11 w-11"><X className="w-4 h-4" /></Button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                      <div key={cat.id} className="p-5 border border-primary/5 rounded-2xl flex items-center justify-between hover:bg-white hover:shadow-xl transition-all group bg-white/30">
                        <span className="font-black uppercase tracking-widest text-xs text-foreground/70">{cat.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="hover:bg-primary/5 rounded-full" onClick={() => setEditingCategory(cat)}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" className="hover:bg-destructive/5 rounded-full" onClick={() => deleteDocumentNonBlocking(doc(db, "categories", cat.id))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
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
    <div className="p-4 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-xl transition-all bg-white/30 border-primary/5">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border-2 border-primary/5">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-full h-full p-3 text-muted-foreground" />
          )}
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm truncate text-foreground">{product.name}</p>
          <p className="text-xs text-primary font-black">${product.price.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-primary/5" onClick={onEdit}>
          <Edit2 className="w-4 h-4 text-primary" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-destructive/5" onClick={() => deleteDocumentNonBlocking(doc(db, "products", product.id))}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
