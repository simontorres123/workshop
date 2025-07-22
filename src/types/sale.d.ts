type PaymentMethod = 'CASH' | 'CARD';

interface SoldItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface Sale {
  _id: string;
  items: SoldItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  transactionDate: Date;
  createdBy: string; // ID del admin
}
