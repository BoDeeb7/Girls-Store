
"use client";

import { useState, useEffect } from "react";
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
import { Trash2, Plus, Edit2, ArrowLeft, Loader2, Save, X } from "lucide-react";
import { Product } from "@/app/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  // Collections
  const categoriesQuery = useMemoFirebase(() => db ? query(collection(db, "categories"), orderBy("name", "asc")) : null, [db]);
  const productsQuery = useMemoFirebase(() => db ? query(collection(db, "products"), orderBy("createdAt", "desc")) : null, [db]);
  
  const { data: categories } = useCollection(categoriesQuery);
  const { data: products } = useCollection(productsQuery);

  // Form States
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [editingCategory, setEditingCategory] = useState<{ id?: string, name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Strictly redirect if loading is finished and no user session is found
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

  return (
    <div className="min-h-screen bg-secondary/30 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Button>
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">Admin Panel</h1>
          <Button variant="destructive" size="sm" onClick={() => { localStorage.removeItem("admin_auth"); router.push("/"); }}>
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
                <div className="flex items-center justify-between">
                  <CardTitle>{editingProduct ? (editingProduct.id ? 'Edit Product' : 'Add Product') : 'Store Inventory'}</CardTitle>
                  {!editingProduct && (
                    <Button onClick={() => setEditingProduct({ images: [] })} variant="secondary" className="rounded-full">
                      <Plus className="w-4 h-4 mr-2" /> Add Item
                    </Button>
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
                      <div className="space-y-2">
                        <Label>Image URLs (one per line)</Label>
                        <Textarea 
                          value={editingProduct.images?.join('\n') || ''} 
                          onChange={e => setEditingProduct({...editingProduct, images: e.target.value.split('\n').filter(url => url.trim())})} 
                          placeholder="Paste image URLs here..." 
                          className="h-32"
                        />
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products?.map(product => (
                      <div key={product.id} className="p-4 border rounded-xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0 border">
                            {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="font-bold text-sm line-clamp-1">{product.name}</p>
                            <p className="text-xs text-primary font-black">${product.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" onClick={() => setEditingProduct(product)}>
                            <Edit2 className="w-4 h-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteDocumentNonBlocking(doc(db, "products", product.id))}>
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

          <TabsContent value="categories" className="space-y-6">
            <Card className="rounded-2xl border-none shadow-xl">
              <CardHeader className="bg-primary text-white">
                <div className="flex items-center justify-between">
                  <CardTitle>Manage Categories</CardTitle>
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
