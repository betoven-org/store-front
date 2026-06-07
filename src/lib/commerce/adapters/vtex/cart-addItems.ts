import { AppContext } from "./client";
import { proxySetCookie } from "../../utils/cookies.ts";
import { parseCookie } from "./orderForm";
import { getSegmentFromBag } from "../../utils/segment.ts";
import type { OrderForm } from "./types";
import { forceHttpsOnAssets } from "./transform";

export interface Item {
  quantity: number;
  seller: string;
  id: string;
  index?: number;
  price?: number;
}

export interface Props {
  orderItems: Item[];
  allowedOutdatedData?: Array<"paymentData">;
}

/**
 * @docs https://developers.vtex.com/docs/api-reference/checkout-api#post-/api/checkout/pub/orderForm/-orderFormId-/items
 * @title Add Items to Cart
 * @description Add items to the cart
 */
const action = async (
  props: Props,
  req: Request,
  ctx: AppContext,
): Promise<OrderForm> => {
  const { vcsDeprecated } = ctx;
  const {
    orderItems,
    allowedOutdatedData = ["paymentData"],
  } = props;
  const { orderFormId } = parseCookie(req.headers);
  const cookie = req.headers.get("cookie") ?? "";
  const segment = getSegmentFromBag(ctx);

  try {
    const response = await vcsDeprecated
      ["POST /api/checkout/pub/orderForm/:orderFormId/items"]({
        orderFormId,
        allowedOutdatedData,
        sc: segment?.payload.channel,
      }, {
        body: { orderItems },
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          cookie,
        },
      });

    proxySetCookie(response.headers, ctx.response.headers, req.url);

    return forceHttpsOnAssets((await response.json()) as OrderForm);
  } catch (error) {
    console.error(error);

    throw error;
  }
};

export default action;
