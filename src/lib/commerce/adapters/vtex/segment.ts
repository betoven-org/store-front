/**
 * VTEX Segment utilities (simplified for Next.js context)
 */

export interface Segment {
  utmi_campaign?: string;
  utm_campaign?: string;
  utm_source?: string;
  regionId?: string;
  cultureInfo?: string;
  currencyCode?: string;
  currencySymbol?: string;
  channelPrivacy?: string;
  sc?: string;
}

export function getSegmentFromBag(): Segment {
  return {};
}

export function getSegmentCacheKeyWithoutUTM(_segment: Segment): string {
  return "";
}

export function withSegmentCookie(headers: Headers): Headers {
  return headers;
}
