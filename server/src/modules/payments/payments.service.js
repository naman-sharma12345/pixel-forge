import Order from '../../models/Order.js';
import { ApiError } from '../../utils/ApiError.js';
import { nanoid } from 'nanoid';
import * as ordersService from '../orders/orders.service.js';

export const mockConfirm = async (user, { orderId, outcome }) => {
  const userIdStr = (user._id || user).toString();
  const order = await Order.findById(orderId);

  if (!order || order.user.toString() !== userIdStr) {
    throw ApiError.notFound('Order not found');
  }

  if (order.provider !== 'mock') {
    throw ApiError.badRequest('Invalid payment provider');
  }

  if (outcome === 'failure') {
    await ordersService.markFailed(orderId);
    throw new ApiError(402, 'PAYMENT_FAILED', 'Payment was declined (mock)');
  }

  const paymentId = 'mockpay_' + nanoid(10);
  const result = await ordersService.fulfillOrder(orderId, paymentId);
  return result;
};

export default {
  mockConfirm,
};
