import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as cartService from './cart.service.js';

export const getCart = asyncHandler(async (req, res) => {
  const cartView = await cartService.getCart(req.user);
  return ok(res, cartView);
});

export const addItem = asyncHandler(async (req, res) => {
  const { assetId } = req.body;
  const cartView = await cartService.addItem(req.user, assetId);
  return ok(res, cartView, { message: 'Added to cart' });
});

export const removeItem = asyncHandler(async (req, res) => {
  const { assetId } = req.params;
  const cartView = await cartService.removeItem(req.user, assetId);
  return ok(res, cartView, { message: 'Removed from cart' });
});

export const clearCart = asyncHandler(async (req, res) => {
  const cartView = await cartService.clearCart(req.user);
  return ok(res, cartView, { message: 'Cart cleared' });
});

export default {
  getCart,
  addItem,
  removeItem,
  clearCart,
};
