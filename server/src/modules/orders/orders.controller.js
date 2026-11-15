import asyncHandler from '../../utils/asyncHandler.js';
import { ok } from '../../utils/response.js';
import * as ordersService from './orders.service.js';

export const checkout = asyncHandler(async (req, res) => {
  const result = await ordersService.checkout(req.user, req.body);
  return ok(res, result);
});

export const listMyOrders = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const { orders, meta } = await ordersService.listMyOrders(req.user, page, limit);
  return ok(res, orders, { meta });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrder(req.user, req.params.id);
  return ok(res, order);
});

export default {
  checkout,
  listMyOrders,
  getOrder,
};
