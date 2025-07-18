interface Window {
	WooCommerceEmailEditor: {
		current_post_type: string;
		current_post_id: string;
		email_types: {
			value: string;
			label: string;
			id: string;
		}[];
		block_preview_url: string;
		sender_settings: {
			from_name: string;
			from_address: string;
		};
	};
}

interface EntityWooCommerceData {
	sender_settings?: {
		from_address?: string;
		from_name?: string;
	};
	recipient?: string;
	cc?: string;
	bcc?: string;
}
