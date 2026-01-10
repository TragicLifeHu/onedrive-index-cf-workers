// dynamic loads to ensure build-phase context

// Expose Durable Object bindings
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

const worker = {
  async fetch(request, env, ctx) {
    const { default: originalWorker } = await import('./.open-next/worker.js');
    const { runWithCloudflareRequestContext } = await import('./.open-next/cloudflare/init.js');

    return runWithCloudflareRequestContext(request, env, ctx, async () => {
      const response = await originalWorker.fetch(request, env, ctx);

      // Only process HTML responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        const url = new URL(request.url);
        // Avoid modifying root path or assets
        if (url.pathname !== '/' && !url.pathname.startsWith('/_next/') && !url.pathname.startsWith('/api/')) {
          try {
            // Import site config dynamically
            const { default: siteConfig } = await import('./config/site.config.js');

            const pathSegments = url.pathname.split('/').filter(p => p);
            if (pathSegments.length > 0) {
              const fileName = decodeURIComponent(pathSegments[pathSegments.length - 1]);
              const title = `${fileName} - ${siteConfig.title}`;

              let ogTitleFound = false;
              let twitterTitleFound = false;

              return new HTMLRewriter()
                .on('title', {
                  element(element) {
                    element.setInnerContent(title);
                  },
                })
                .on('meta[property="og:title"]', {
                  element(element) {
                    ogTitleFound = true;
                    element.setAttribute('content', title);
                  },
                })
                .on('meta[name="twitter:title"]', {
                  element(element) {
                    twitterTitleFound = true;
                    element.setAttribute('content', title);
                  },
                })
                .on('head', {
                  element(element) {
                    element.onEndTag(end => {
                      if (!ogTitleFound) {
                        end.before(`<meta property="og:title" content="${title}" />`, { html: true });
                      }
                      if (!twitterTitleFound) {
                        end.before(`<meta name="twitter:title" content="${title}" />`, { html: true });
                      }
                    });
                  },
                })
                .transform(response);
            }
          } catch (e) {
            console.error('Error rewriting title:', e);
          }
        }
      }

      return response;
    });
  },
};

export default worker;
