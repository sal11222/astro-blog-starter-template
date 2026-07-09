type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace Cloudflare {
  interface Env {
    CLOUDFLARE_EMAIL?: string;
    CLOUDFLARE_API_KEY?: string;
    CLOUDFLARE_ORGANIZATION_ID?: string;
  }
}

declare namespace App {
  interface Locals extends Runtime {}
}
