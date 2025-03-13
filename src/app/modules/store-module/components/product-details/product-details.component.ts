import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { CartItem, ProductItem } from 'src/app/interfaces/store';
import { DatabaseService } from 'src/app/services/database.service';
import {
  addToCart,
  addToWishList,
  removeFromWishList,
} from 'src/app/store/store/store-actions';

@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss'],
})
export class ProductDetailsComponent implements OnInit {
  private _userID: string = ''; // Active user id stored in local storage
  productItem: ProductItem | null = null; // Product item to be viewed

  constructor(
    private _messageService: MessageService,
    private _activeRoute: ActivatedRoute,
    private _router: Router,
    private _fireStore: DatabaseService,
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
    this._store.select('store').subscribe((response) => {
      let temp = response.products.find(
        (element) => element.id === this._activeRoute.snapshot.params['id']
      );

      if (temp) {
        this.productItem = JSON.parse(JSON.stringify(temp));
        if (
          response.wishList.findIndex(
            (wishlist) => wishlist.id === this.productItem!.id
          ) !== -1
        ) {
          this.productItem!.wishList = true;
        }
      }
    });
  }

  // Function to toggle wishlist
  alterWishlist(): void {
    if (this._userID) {
      if (this.productItem!.wishList) {
        this._fireStore.checkWishlistDocExist(this._userID).subscribe(
          (response) => {
            this._fireStore
              .addToWishlist(this._userID, this.productItem!, response.exists)
              .then(() => {
                this._store.dispatch(
                  addToWishList({ payload: this.productItem! })
                );
                this.showSuccessToast('Item added to wishlist');
              })
              .catch(() => {
                this.showErrorToast('Failed to add item to wishlist');
              });
          },
          () => {
            this.showErrorToast('Failed to add item to wishlist');
          }
        );
      } else {
        this._fireStore
          .removeFromWishlist(this._userID, this.productItem!.id)
          .then(() => {
            this._store.dispatch(
              removeFromWishList({ payload: this.productItem! })
            );
            this.showSuccessToast('Item removed from wishlist');
          })
          .catch(() => {
            this.showErrorToast('Failed to remove item from wishlist');
          });
      }
    } else {
      this._router.navigate(['/auth/login']);
    }
  }

  // Function to add product to cart
  addToCart(): void {
    if (this._userID) {
      const cartItem: CartItem = { ...this.productItem!, count: 1 };
      this._fireStore.checkCartDocExist(this._userID).subscribe(
        (response) => {
          this._fireStore
            .addToCart(this._userID, cartItem, response.exists)
            .then(() => {
              this._store.dispatch(addToCart({ payload: cartItem }));
              this.showSuccessToast('Item added to cart');
            })
            .catch(() => {
              this.showErrorToast('Failed to add item to cart');
            });
        },
        () => {
          this.showErrorToast('Failed to add item to cart');
        }
      );
    } else {
      this._router.navigate(['/auth/login']);
    }
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
