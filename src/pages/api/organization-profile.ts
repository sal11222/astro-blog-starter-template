import type { APIRoute } from "astro";
import Cloudflare from "cloudflare";

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
	const env = locals.runtime.env;
	const apiEmail = env.CLOUDFLARE_EMAIL;
	const apiKey = env.CLOUDFLARE_API_KEY;
	const organizationId = env.CLOUDFLARE_ORGANIZATION_ID;

	if (!apiEmail || !apiKey || !organizationId) {
		return Response.json(
			{
				error:
					"Missing configuration: set the CLOUDFLARE_EMAIL, CLOUDFLARE_API_KEY, and CLOUDFLARE_ORGANIZATION_ID secrets.",
			},
			{ status: 503 },
		);
	}

	const client = new Cloudflare({ apiEmail, apiKey });

	try {
		const organizationProfile =
			await client.organizations.organizationProfile.get(organizationId);

		return Response.json({
			business_name: organizationProfile.business_name,
			business_address: organizationProfile.business_address,
			business_email: organizationProfile.business_email,
			business_phone: organizationProfile.business_phone,
			external_metadata: organizationProfile.external_metadata,
		});
	} catch (error) {
		if (error instanceof Cloudflare.APIError) {
			return Response.json(
				{ error: `Cloudflare API error: ${error.message}` },
				{ status: error.status ?? 502 },
			);
		}
		throw error;
	}
};
