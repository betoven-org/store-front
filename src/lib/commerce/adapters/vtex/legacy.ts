/**
 * VTEX Legacy loader utilities (stub)
 */

export function getFirstItemAvailable(items: any[]): any | undefined {
  return items.find((item: any) =>
    item.sellers?.some((seller: any) =>
      seller.commertialOffer?.AvailableQuantity > 0
    )
  ) || items[0];
}
