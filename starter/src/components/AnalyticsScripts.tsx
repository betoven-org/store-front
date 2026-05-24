import type { SiteSettings } from "@/lib/cms";

export function HeadScripts({ settings }: { settings: SiteSettings }) {
  const { analytics, scripts } = settings;

  return (
    <>
      {/* GTM - head */}
      {analytics.gtmId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${analytics.gtmId}');`,
          }}
        />
      )}

      {/* GA4 */}
      {analytics.ga4Id && !analytics.gtmId && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${analytics.ga4Id}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${analytics.ga4Id}');${
                analytics.googleAdsId
                  ? `gtag('config','${analytics.googleAdsId}');`
                  : ""
              }`,
            }}
          />
        </>
      )}

      {/* Facebook Pixel */}
      {analytics.facebookPixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${analytics.facebookPixelId}');fbq('track','PageView');`,
          }}
        />
      )}

      {/* Umami */}
      {analytics.umamiWebsiteId && analytics.umamiUrl && (
        <script
          defer
          src={`${analytics.umamiUrl}/script.js`}
          data-website-id={analytics.umamiWebsiteId}
        />
      )}

      {/* Custom head scripts */}
      {scripts.head && (
        <script dangerouslySetInnerHTML={{ __html: scripts.head }} />
      )}
    </>
  );
}

export function BodyScripts({ settings }: { settings: SiteSettings }) {
  const { analytics, scripts } = settings;

  return (
    <>
      {/* GTM noscript */}
      {analytics.gtmId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      )}

      {/* Custom body scripts */}
      {scripts.body && (
        <script dangerouslySetInnerHTML={{ __html: scripts.body }} />
      )}
    </>
  );
}
