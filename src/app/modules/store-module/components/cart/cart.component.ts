import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { CartItem, ProductItem } from 'src/app/interfaces/store';
import { DatabaseService } from 'src/app/services/database.service';
import {
  removeFromCart,
  resetCart,
  updateCartItem,
} from 'src/app/store/store/store-actions';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
})
export class CartComponent implements OnInit {
  private _userID: string = ''; // Active user id stored in local storage
  cartItems: Array<CartItem> = []; // Cart items array
  totalCartPrice: number = 0; // Total cost of cart items
  selectedPaymentMethod: string = 'credit-card'; // Default payment method
  recentOrders: Array<any> = []; // Array to store recent orders

  constructor(
    private _fireStore: DatabaseService,
    private _messageService: MessageService,
    private _router: Router,
    private _store: Store<{
      store: {
        cart: Array<CartItem>;
        products: Array<ProductItem>;
        wishList: Array<ProductItem>;
      };
    }>
  ) {}

  ngOnInit(): void {
    this._userID = localStorage.getItem('userID')!;

    // Retrieve recent orders from local storage, if available
    const storedOrders = localStorage.getItem('recentOrders');
    if (storedOrders) {
      this.recentOrders = JSON.parse(storedOrders);
    }

    this._store.select('store').subscribe((response) => {
      this.cartItems = response.cart;
      this.calculateTotalPrice();
    });
  }

  // Calculate total price of cart items
  calculateTotalPrice(): void {
    this.totalCartPrice = this.cartItems.reduce((accumulator, obj) => {
      let productValue = obj.price * obj.count;
      return accumulator + productValue;
    }, 0);
  }

  // Decrease quantity of a cart item
  decreaseQty(item: CartItem): void {
    if (item.count > 1) {
      const updatedItem = { ...item, count: item.count - 1 };
      this._fireStore
        .updateCartItem(this._userID, updatedItem)
        .then(() => {
          this._store.dispatch(updateCartItem({ payload: updatedItem }));
          this.calculateTotalPrice();
        })
        .catch(() => {
          this.showErrorToast('Failed to decrement');
        });
    }
  }

  // Increase quantity of a cart item
  increaseQty(item: CartItem): void {
    const updatedItem = { ...item, count: item.count + 1 };
    this._fireStore
      .updateCartItem(this._userID, updatedItem)
      .then(() => {
        this._store.dispatch(updateCartItem({ payload: updatedItem }));
        this.calculateTotalPrice();
      })
      .catch(() => {
        this.showErrorToast('Failed to increment');
      });
  }

  // Remove a cart item
  removeCartItem(id: string): void {
    this._fireStore
      .removeFromCart(this._userID, id)
      .then(() => {
        this._store.dispatch(removeFromCart({ payload: { id: id } }));
        this.calculateTotalPrice();
      })
      .catch(() => {
        this.showErrorToast('Failed to remove item');
      });
  }

  // Empty the cart from the store and Firestore
  emptyCart(): void {
    this._store.dispatch(resetCart());
    this._fireStore
      .emptyCart(this._userID)
      .then(() => {
        this.cartItems = [];
        this.totalCartPrice = 0;
        this.showSuccessToast('Cart emptied successfully');
      })
      .catch(() => {
        this.showErrorToast('Failed to empty cart');
      });
  }

  // Navigate back to products page
  onShopNowClick(): void {
    this._router.navigate([`/store/products`]);
  }

  // Add current cart to recent orders and persist to local storage
  addToRecentOrders(): void {
    const order = {
      date: new Date().toLocaleString(),
      items: [...this.cartItems],
      total: this.totalCartPrice,
    };
    this.recentOrders.push(order);
    this.saveRecentOrdersToLocalStorage();
  }

  // Save recent orders to local storage
  saveRecentOrdersToLocalStorage(): void {
    localStorage.setItem('recentOrders', JSON.stringify(this.recentOrders));
  }

  // Delete an order from recent orders based on its index
  deleteOrder(index: number): void {
    this.recentOrders.splice(index, 1);
    this.saveRecentOrdersToLocalStorage();
    this._messageService.add({
      key: 'database',
      severity: 'success',
      detail: 'Order deleted successfully',
    });
  }

  // Process payment, save order history, and clear cart in both Firestore and state
  processPayment(): void {
    if (!this.selectedPaymentMethod) {
      this._messageService.add({
        key: 'error',
        severity: 'error',
        summary: 'Payment Error',
        detail: 'Please select a payment method',
      });
      return;
    }

    // Simulate payment processing
    this._messageService.add({
      key: 'paymentSuccess',
      severity: 'success',
      summary: 'Payment Successful',
      detail: `Payment completed using ${this.selectedPaymentMethod}`,
    });

    // Save order locally and in Firestore
    this.addToRecentOrders();
    this.saveOrderToHistory();

    // Clear the cart in Firestore then reset local state
    this._fireStore
      .emptyCart(this._userID)
      .then(() => {
        this._store.dispatch(resetCart());
        this.cartItems = [];
        this.totalCartPrice = 0;
        this.showSuccessToast('Cart cleared after payment');
      })
      .catch(() => {
        this.showErrorToast('Failed to clear cart after payment');
      });
  }

  // Save the order history as a bill in Firestore
  saveOrderToHistory(): void {
    const order = {
      date: new Date().toLocaleString(),
      items: this.cartItems,
      total: this.totalCartPrice,
    };

    this._fireStore
      .saveOrderBill(this._userID, order)
      .then(() => {
        this.showSuccessToast('Order history saved successfully');
      })
      .catch(() => {
        this.showErrorToast('Failed to save order history');
      });
  }

  // Success toast message
  showSuccessToast(message: string): void {
    this._messageService.add({
      key: 'database',
      severity: 'success',
      detail: message,
    });
  }

  // Error toast message
  showErrorToast(message: string): void {
    this._messageService.add({
      key: 'database',
      severity: 'error',
      detail: message,
    });
  }
}
