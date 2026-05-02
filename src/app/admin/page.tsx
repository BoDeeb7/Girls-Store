
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, Edit2, ArrowLeft, Loader2, Save, X, Upload, Image as ImageIcon, Search } from "lucide-react";
import { Product } from "@/app/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (!isUserLoading && !user) {
      router.push("/");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !db || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
        <p className="text-primary font-bold animate-pulse">Authenticating Session...</p>
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

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Button>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase text-center flex-1">Admin Panel</h1>
          <Button variant="destructive" size="sm" onClick={() => { router.push("/"); }}>
            Logout
          </Button>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 rounded-full h-12">
            <TabsTrigger value="products" className="rounded-full">Manage Products</TabsTrigger>
            <TabsTrigger value="categories" className="rounded-full">Manage Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <Card className="rounded-2xl border-none shadow-xl overflow-hidden">
              <CardHeader className="bg-primary text-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <CardTitle>{editingProduct ? (editingProduct.id ? 'Edit Product' : 'Add Product') : 'Inventory Management'}</CardTitle>
                  {!editingProduct && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                        <Input 
                          placeholder="Search products..." 
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/60 pl-9 rounded-full h-9 focus-visible:ring-white/40"
                        />
                      </div>
                      <Button onClick={() => setEditingProduct({ images: [] })} variant="secondary" className="rounded-full h-9">
                        <Plus className="w-4 h-4 mr-2" /> Add Item
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
                        <Label>Product Name</Label>
                        <Input value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="e.g. Velvet Lipstick" required />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={editingProduct.category} onValueChange={val => setEditingProduct({...editingProduct, category: val})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories?.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input type="number" step="0.01" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: e.target.value})} placeholder="0.00" required />
                      </div>
                      
                      <div className="md:col-span-2 space-y-4">
                        <Label>Product Images</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                          {editingProduct.images?.map((img, idx) => (
                            <div key={idx} className="relative aspect-square rounded-xl border overflow-hidden group">
                              <img src={img} className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 bg-destructive text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-primary/20 flex flex-col items-center justify-center gap-2 text-primary/40 hover:text-primary hover:border-primary/40 transition-all bg-primary/5"
                          >
                            <Upload className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Upload</span>
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
                        <Label>Description</Label>
                        <Textarea value={editingProduct.description || ''} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Detailed product description..." className="h-24" />
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-full font-bold">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} Save Product
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setEditingProduct(null)} className="flex-1 rounded-full font-bold">
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Accordion type="multiple" className="space-y-4" defaultValue={categories?.map(c => c.id)}>
                    {categories?.map(category => {
                      const categoryProducts = filteredProducts?.filter(p => p.category === category.id);
                      if (categoryProducts?.length === 0 && productSearch) return null;
                      
                      return (
                        <AccordionItem key={category.id} value={category.id} className="border rounded-xl px-4 overflow-hidden bg-background/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase tracking-widest text-sm text-primary">{category.name}</span>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {categoryProducts?.length || 0}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryProducts?.map(product => (
                                <div key={product.id} className="p-4 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all bg-white/50">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                                      {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <ImageIcon className="w-full h-full p-3 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="font-bold text-sm truncate">{product.name}</p>
                                      <p className="text-xs text-primary font-black">${product.price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingProduct(product)}>
                                      <Edit2 className="w-4 h-4 text-primary" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteDocumentNonBlocking(doc(db, "products", product.id))}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              {categoryProducts?.length === 0 && (
                                <p className="text-xs text-muted-foreground italic p-4 text-center col-span-full">
                                  No products in this category.
                                </p>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                    {/* Handle products with no category or invalid category */}
                    {(() => {
                      const orphanedProducts = filteredProducts?.filter(p => !categories?.find(c => c.id === p.category));
                      if (!orphanedProducts || orphanedProducts.length === 0) return null;
                      return (
                        <AccordionItem value="other" className="border rounded-xl px-4 overflow-hidden bg-background/50">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-black uppercase tracking-widest text-sm text-muted-foreground">Uncategorized</span>
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
                                {orphanedProducts.length}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {orphanedProducts.map(product => (
                                <div key={product.id} className="p-4 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all bg-white/50">
                                  <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                                      {product.images?.[0] ? (
                                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <ImageIcon className="w-full h-full p-3 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="overflow-hidden">
                                      <p className="font-bold text-sm truncate">{product.name}</p>
                                      <p className="text-xs text-primary font-black">${product.price.toFixed(2)}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingProduct(product)}>
                                      <Edit2 className="w-4 h-4 text-primary" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteDocumentNonBlocking(doc(db, "products", product.id))}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })()}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <Card className="rounded-2xl border-none shadow-xl">
              <CardHeader className="bg-primary text-white">
                <div className="flex items-center justify-between">
                  <CardTitle>Category Settings</CardTitle>
                  {!editingCategory && (
                    <Button onClick={() => setEditingCategory({ name: '' })} variant="secondary" className="rounded-full">
                      <Plus className="w-4 h-4 mr-2" /> New Category
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {editingCategory ? (
                  <form onSubmit={handleSaveCategory} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Category Name</Label>
                      <Input value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} placeholder="e.g. Skin Care" required />
                    </div>
                    <Button type="submit" className="rounded-full px-8">Save</Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingCategory(null)} className="rounded-full"><X className="w-4 h-4" /></Button>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories?.map(cat => (
                      <div key={cat.id} className="p-4 border rounded-xl flex items-center justify-between hover:bg-white hover:shadow-lg transition-all group">
                        <span className="font-bold">{cat.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => setEditingCategory(cat)}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteDocumentNonBlocking(doc(db, "categories", cat.id))}>
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
