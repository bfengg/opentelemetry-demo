// Copyright The OpenTelemetry Authors
// SPDX-License-Identifier: Apache-2.0

import type { NextApiRequest, NextApiResponse } from 'next';
import CartGateway from '../../gateways/rpc/Cart.gateway';
import CheckoutGateway from '../../gateways/rpc/Checkout.gateway';
import { CartItem, Empty, OrderResult, PlaceOrderRequest } from '../../protos/demo';
import InstrumentationMiddleware from '../../utils/telemetry/InstrumentationMiddleware';
import logger from '../../utils/telemetry/logger';

type TBuyNowRequest = Omit<PlaceOrderRequest, 'userCurrency'> & { item: CartItem };
type TResponse = OrderResult | Empty | { error: string };

const handler = async ({ method, body, query }: NextApiRequest, res: NextApiResponse<TResponse>) => {
  if (method !== 'POST') return res.status(405).send('');

  const { currencyCode = 'USD' } = query;
  const { item, ...order } = body as TBuyNowRequest;

  await CartGateway.emptyCart(order.userId);
  await CartGateway.addItem(order.userId, item);

  try {
    const { order: placed } = await CheckoutGateway.placeOrder({ ...order, userCurrency: currencyCode as string });
    logger.info({ 'demo.order.id': placed?.orderId, 'app.product.id': item.productId }, 'Buy now order placed');
    return res.status(200).json(placed ?? {});
  } catch (error) {
    logger.error({ err: error }, 'Buy now failed to place order');
    return res.status(500).json({ error: 'Failed to place order.' });
  }
};

export default InstrumentationMiddleware(handler);
