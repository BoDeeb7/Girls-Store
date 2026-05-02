
export interface Product {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  category: string;
  categoryAr: string;
  description: string;
  descriptionAr: string;
  imageUrl: string;
  imageHint: string;
}

export interface CartItem extends Product {
  quantity: number;
}
