import { Injectable } from '@angular/core';
import { ProductItem, CartItem } from '../interfaces/store';
import { Animal } from '../interfaces/adoption';
import { Observable } from 'rxjs';
import {
  AngularFirestore,
  DocumentChangeAction,
} from '@angular/fire/compat/firestore';
import { deleteField } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  constructor(private _fireStore: AngularFirestore) {}

  async saveOrderBill(userID: string, order: any): Promise<void> {
    const billText = this.generateBillText(order); // Generate bill as text
    const orderData = {
      date: order.date,
      total: order.total,
      bill: billText,
    };

    await this._fireStore
      .collection('Orders')
      .doc(userID)
      .collection('OrderHistory')
      .add(orderData);
  }

  // Helper function to generate the bill as text
  generateBillText(order: any): string {
    let billText = `Order Date: ${order.date}\n\n`;
    billText += `Items:\n`;

    order.items.forEach((item: CartItem) => {
      billText += `- ${item.title} (x${item.count}) - $${
        item.price * item.count
      }\n`;
    });

    billText += `\nTotal: $${order.total}\n`;

    return billText;
  }

  // Generate ID from firebase
  generateID(): string {
    return this._fireStore.createId();
  }

  // Fetch all store items in database
  fetchAllStoreItems(): Observable<DocumentChangeAction<unknown>[]> {
    return this.fetchCollection(FireStoreCollections.Store);
  }

  // Fetch all blog posts in database
  fetchBlogPosts(): Observable<DocumentChangeAction<unknown>[]> {
    return this.fetchCollection(FireStoreCollections.Blog);
  }

  // Fetch all adoption animals
  fetchAllAnimals(): Observable<DocumentChangeAction<unknown>[]> {
    return this.fetchCollection(FireStoreCollections.Pets);
  }

  // Fetch collection from Firestore
  private fetchCollection(
    collectionPath: string
  ): Observable<DocumentChangeAction<unknown>[]> {
    return this._fireStore.collection(collectionPath).snapshotChanges();
  }

  // Fetch all wishlist items for logged user
  fetchAllWishlistItems(userID: string): Observable<any> {
    return this.fetchDocument(FireStoreCollections.Wishlist, userID);
  }

  // Fetch cart items for logged user
  fetchUserCart(userID: string): Observable<any> {
    return this.fetchDocument(FireStoreCollections.Cart, userID);
  }

  // Fetch document from Firestore
  private fetchDocument(
    collectionPath: string,
    docID: string
  ): Observable<any> {
    return this._fireStore
      .collection(collectionPath)
      .doc(docID)
      .snapshotChanges();
  }

  // Check if wishlist document exists for the current logged-in user
  checkWishlistDocExist(userID: string): Observable<any> {
    return this.checkDocumentExist(FireStoreCollections.Wishlist, userID);
  }

  // Check if cart document exists for the current logged-in user
  checkCartDocExist(userID: string): Observable<any> {
    return this.checkDocumentExist(FireStoreCollections.Cart, userID);
  }

  // Check if document exists
  private checkDocumentExist(
    collectionPath: string,
    docID: string
  ): Observable<any> {
    return this._fireStore.collection(collectionPath).doc(docID).get();
  }

  // Add to wishlist or cart
  private addToCollection(
    collectionPath: string,
    userID: string,
    product: ProductItem | CartItem,
    docExist: boolean
  ): Promise<void> {
    const docRef = this._fireStore.collection(collectionPath).doc(userID);
    const productData = { [product.id]: product };
    return docExist ? docRef.update(productData) : docRef.set(productData);
  }

  // Add to wishlist for current logged-in user
  addToWishlist(
    userID: string,
    product: ProductItem,
    docExist: boolean
  ): Promise<void> {
    return this.addToCollection(
      FireStoreCollections.Wishlist,
      userID,
      product,
      docExist
    );
  }

  // Add to cart for current logged-in user
  addToCart(
    userID: string,
    product: CartItem,
    docExist: boolean
  ): Promise<void> {
    return this.addToCollection(
      FireStoreCollections.Cart,
      userID,
      product,
      docExist
    );
  }

  // Remove item from collection (wishlist or cart)
  private removeFromCollection(
    collectionPath: string,
    userID: string,
    productID: string
  ): Promise<void> {
    return this._fireStore
      .collection(collectionPath)
      .doc(userID)
      .update({ [productID]: deleteField() });
  }

  // Remove item from wishlist for current logged-in user
  removeFromWishlist(userID: string, productID: string): Promise<void> {
    return this.removeFromCollection(
      FireStoreCollections.Wishlist,
      userID,
      productID
    );
  }

  // Remove item from cart for current logged-in user
  removeFromCart(userID: string, productID: string): Promise<void> {
    return this.removeFromCollection(
      FireStoreCollections.Cart,
      userID,
      productID
    );
  }

  // Update cart item for current logged-in user
  updateCartItem(userID: string, product: CartItem): Promise<void> {
    return this._fireStore
      .collection(FireStoreCollections.Cart)
      .doc(userID)
      .update({ [product.id]: product });
  }

  // Remove all items from cart for current logged-in user
  emptyCart(userID: string): Promise<void> {
    return this._fireStore
      .collection(FireStoreCollections.Cart)
      .doc(userID)
      .delete();
  }

  // Add animal to animal collection in database
  addAnimal(animal: Animal): Promise<void> {
    return this._fireStore
      .collection(FireStoreCollections.Pets)
      .doc(animal.id)
      .set(animal);
  }

  // Add review to product item
  addReviewToProductItem(product: ProductItem): Promise<void> {
    return this._fireStore
      .collection(FireStoreCollections.Store)
      .doc(product.id)
      .update({ reviews: product.reviews });
  }

  // NEW: Fetch order history from Firestore for the given user
  fetchOrderHistory(userID: string): Observable<any[]> {
    return this._fireStore
      .collection('Orders')
      .doc(userID)
      .collection('OrderHistory')
      .valueChanges();
  }
}

export enum FireStoreCollections {
  Users = '/Users',
  Store = '/Store',
  Blog = '/Blog',
  Wishlist = '/Wishlist',
  Cart = '/Cart',
  Pets = '/Pets',
}
