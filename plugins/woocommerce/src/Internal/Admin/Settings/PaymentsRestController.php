<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\Internal\Admin\Settings;

use Automattic\WooCommerce\Internal\Traits\AccessiblePrivateMethods;
use Automattic\WooCommerce\Internal\RestApiControllerBase;
use Exception;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Controller for the REST endpoints to service the Payments settings page.
 */
class PaymentsRestController extends RestApiControllerBase {
	use AccessiblePrivateMethods;

	/**
	 * Route base.
	 *
	 * @var string
	 */
	protected string $rest_base = 'settings/payments';

	/**
	 * The payments settings page service.
	 *
	 * @var Payments
	 */
	private Payments $payments;

	/**
	 * Get the WooCommerce REST API namespace for the class.
	 *
	 * @return string
	 */
	protected function get_rest_api_namespace(): string {
		return 'wc-admin';
	}

	/**
	 * Register the REST API endpoints handled by this controller.
	 *
	 * @param bool $override Whether to override the existing routes. Useful for testing.
	 */
	public function register_routes( bool $override = false ) {
		register_rest_route(
			'wc-admin',
			'/' . $this->rest_base . '/providers',
			array(
				array(
					'methods'             => \WP_REST_Server::READABLE,
					'callback'            => fn( $request ) => $this->run( $request, 'get_providers' ),
					'validation_callback' => 'rest_validate_request_arg',
					'permission_callback' => fn( $request ) => $this->check_permissions( $request ),
					'args'                => array(
						'location' => array(
							'description'       => __( 'ISO3166 alpha-2 country code. Defaults to WooCommerce\'s base location country.', 'woocommerce' ),
							'type'              => 'string',
							'pattern'           => '[a-zA-Z]{2}', // Two alpha characters.
							'required'          => false,
							'validate_callback' => fn( $value, $request ) => $this->check_location_arg( $value, $request ),
						),
					),
				),
				'schema' => fn() => $this->get_schema_for_get_payment_providers(),
			),
			$override
		);
		register_rest_route(
			'wc-admin',
			'/' . $this->rest_base . '/suggestion/(?P<id>[\w\d\-]+)/hide',
			array(
				array(
					'methods'             => \WP_REST_Server::EDITABLE,
					'callback'            => fn( $request ) => $this->run( $request, 'hide_payment_extension_suggestion' ),
					'permission_callback' => fn( $request ) => $this->check_permissions( $request ),
				),
			),
			$override
		);
	}

	/**
	 * Initialize the class instance.
	 *
	 * @param Payments $payments The payments settings page service.
	 *
	 * @internal
	 */
	final public function init( Payments $payments ): void {
		$this->payments = $payments;
	}

	/**
	 * Get the payment providers for the given location.
	 *
	 * @param WP_REST_Request $request The request object.
	 * @return WP_Error|WP_REST_Response
	 */
	protected function get_providers( WP_REST_Request $request ) {
		$location = $request->get_param( 'location' );
		if ( empty( $location ) ) {
			// Fall back to the base country if no location is provided.
			$location = WC()->countries->get_base_country();
		}

		try {
			$suggestions = $this->get_extension_suggestions( $location );
		} catch ( Exception $e ) {
			return new WP_Error( 'woocommerce_rest_payment_providers_error', $e->getMessage(), array( 'status' => 500 ) );
		}

		$response = array(
			'gateways'                => $this->payments->get_payment_providers(),
			'offline_payment_methods' => $this->payments->get_offline_payment_methods(),
			'preferred_suggestions'   => $suggestions['preferred'],
			'other_suggestions'       => $suggestions['other'],
			'suggestion_categories'   => $this->payments->get_extension_suggestion_categories(),
		);

		return rest_ensure_response( $this->prepare_payment_providers_response( $response ) );
	}

	/**
	 * Hide a payment extension suggestion.
	 *
	 * @param WP_REST_Request $request The request object.
	 *
	 * @return WP_Error|WP_REST_Response
	 */
	protected function hide_payment_extension_suggestion( WP_REST_Request $request ) {
		$suggestion_id = $request->get_param( 'id' );
		$suggestion    = $this->payments->get_payment_extension_suggestion_by_id( $suggestion_id );
		if ( is_null( $suggestion ) ) {
			return new WP_Error( 'woocommerce_rest_payment_extension_suggestion_error', __( 'Invalid suggestion ID.', 'woocommerce' ), array( 'status' => 400 ) );
		}

		$result = $this->payments->hide_payment_extension_suggestion( $suggestion_id );

		return rest_ensure_response( array( 'success' => $result ) );
	}

	/**
	 * Get the payment extension suggestions for the given location.
	 *
	 * @param string $location The location for which the suggestions are being fetched.
	 *
	 * @return array[] The payment extension suggestions for the given location, split into preferred and other.
	 * @throws Exception If there are malformed or invalid suggestions.
	 */
	private function get_extension_suggestions( string $location ): array {
		// If the requesting user can't install plugins, we don't suggest any extensions.
		if ( ! current_user_can( 'install_plugins' ) ) {
			return array(
				'preferred' => array(),
				'other'     => array(),
			);
		}

		return $this->payments->get_extension_suggestions( $location );
	}

	/**
	 * General permissions check for payments settings REST API endpoint.
	 *
	 * @param WP_REST_Request $request The request for which the permission is checked.
	 * @return bool|WP_Error True if the current user has the capability, otherwise an "Unauthorized" error or False if no error is available for the request method.
	 */
	private function check_permissions( WP_REST_Request $request ) {
		$context = 'read';
		if ( 'POST' === $request->get_method() ) {
			$context = 'edit';
		} elseif ( 'DELETE' === $request->get_method() ) {
			$context = 'delete';
		}

		if ( wc_rest_check_manager_permissions( 'payment_gateways', $context ) ) {
			return true;
		}

		$error_information = $this->get_authentication_error_by_method( $request->get_method() );
		if ( is_null( $error_information ) ) {
			return false;
		}

		return new WP_Error(
			$error_information['code'],
			$error_information['message'],
			array( 'status' => rest_authorization_required_code() )
		);
	}

	/**
	 * Validate the location argument.
	 *
	 * @param mixed           $value   Value of the argument.
	 * @param WP_REST_Request $request The current request object.
	 *
	 * @return WP_Error|true True if the location argument is valid, otherwise a WP_Error object.
	 */
	private function check_location_arg( $value, WP_REST_Request $request ) {
		// If the 'location' argument is not a string return an error.
		if ( ! is_string( $value ) ) {
			return new WP_Error( 'rest_invalid_param', esc_html__( 'The location argument must be a string.', 'woocommerce' ), array( 'status' => 400 ) );
		}

		// Get the registered attributes for this endpoint request.
		$attributes = $request->get_attributes();

		// Grab the location param schema.
		$args = $attributes['args']['location'];

		// If the location param doesn't match the regex pattern then we should return an error as well.
		if ( ! preg_match( '/^' . $args['pattern'] . '$/', $value ) ) {
			return new WP_Error( 'rest_invalid_param', esc_html__( 'The location argument must be a valid ISO3166 alpha-2 country code.', 'woocommerce' ), array( 'status' => 400 ) );
		}

		return true;
	}

	/**
	 * Prepare the response for the GET payment providers request.
	 *
	 * @param array $response The response to prepare.
	 *
	 * @return array The prepared response.
	 */
	private function prepare_payment_providers_response( array $response ): array {
		return $this->prepare_payment_providers_response_recursive( $response, $this->get_schema_for_get_payment_providers() );
	}

	/**
	 * Recursively prepare the response items for the GET payment providers request.
	 *
	 * @param mixed $response_item The response item to prepare.
	 * @param array $schema        The schema to use for preparing the response.
	 *
	 * @return mixed The prepared response item.
	 */
	private function prepare_payment_providers_response_recursive( $response_item, array $schema ) {
		if ( ! array_key_exists( 'properties', $schema ) || ! is_array( $schema['properties'] ) ) {
			return $response_item;
		}

		$prepared_response = array();
		foreach ( $schema['properties'] as $key => $property_schema ) {
			if ( array_key_exists( $key, $response_item ) ) {
				if ( is_array( $property_schema ) && array_key_exists( 'properties', $property_schema ) ) {
					$prepared_response[ $key ] = $this->prepare_payment_providers_response_recursive( $response_item[ $key ], $property_schema );
				} elseif ( is_array( $property_schema ) && array_key_exists( 'items', $property_schema ) ) {
					$prepared_response[ $key ] = array_map(
						fn( $item ) => $this->prepare_payment_providers_response_recursive( $item, $property_schema['items'] ),
						$response_item[ $key ]
					);
				} else {
					$prepared_response[ $key ] = $response_item[ $key ];
				}
			}
		}

		// Ensure the order is the same as in the schema.
		$prepared_response = array_merge( array_fill_keys( array_keys( $schema['properties'] ), null ), $prepared_response );

		// Remove any null values from the response.
		$prepared_response = array_filter( $prepared_response, fn( $value ) => ! is_null( $value ) );

		return $prepared_response;
	}

	/**
	 * Get the schema for the GET payment providers request.
	 *
	 * @return array[]
	 */
	private function get_schema_for_get_payment_providers(): array {
		$schema               = array(
			'$schema' => 'http://json-schema.org/draft-04/schema#',
			'title'   => 'WooCommerce Settings Payments providers for the given location.',
			'type'    => 'object',
		);
		$schema['properties'] = array(
			'gateways'                => array(
				'type'        => 'array',
				'description' => esc_html__( 'The registered payment gateways.', 'woocommerce' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'items'       => $this->get_schema_for_payment_gateway(),
			),
			'offline_payment_methods' => array(
				'type'        => 'array',
				'description' => esc_html__( 'The offline payment methods.', 'woocommerce' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'items'       => $this->get_schema_for_payment_gateway(),
			),
			'preferred_suggestions'   => array(
				'type'        => 'array',
				'description' => esc_html__( 'The preferred suggestions.', 'woocommerce' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'items'       => $this->get_schema_for_suggestion(),
			),
			'other_suggestions'       => array(
				'type'        => 'array',
				'description' => esc_html__( 'The other suggestions.', 'woocommerce' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'items'       => $this->get_schema_for_suggestion(),
			),
			'suggestion_categories'   => array(
				'type'        => 'array',
				'description' => esc_html__( 'The suggestion categories.', 'woocommerce' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
				'items'       => array(
					'type'        => 'object',
					'description' => esc_html__( 'A suggestion category.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'properties'  => array(
						'id'          => array(
							'type'        => 'string',
							'description' => esc_html__( 'The unique identifier for the category.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'_priority'   => array(
							'type'        => 'integer',
							'description' => esc_html__( 'The priority of the category.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'title'       => array(
							'type'        => 'string',
							'description' => esc_html__( 'The title of the category.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'description' => array(
							'type'        => 'string',
							'description' => esc_html__( 'The description of the category.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),

					),
				),
			),
		);

		return $schema;
	}

	/**
	 * Get the schema for a payment gateway.
	 *
	 * @return array The schema for a payment gateway.
	 */
	private function get_schema_for_payment_gateway(): array {
		return array(
			'type'        => 'object',
			'description' => esc_html__( 'A payment gateway.', 'woocommerce' ),
			'properties'  => array(
				'id'                => array(
					'type'        => 'string',
					'description' => esc_html__( 'The unique identifier for the payment gateway.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'_order'            => array(
					'type'        => 'integer',
					'description' => esc_html__( 'The sort order of the payment gateway.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'title'             => array(
					'type'        => 'string',
					'description' => esc_html__( 'The title of the payment gateway.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'description'       => array(
					'type'        => 'string',
					'description' => esc_html__( 'The description of the payment gateway.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'short_description' => array(
					'type'        => 'string',
					'description' => esc_html__( 'The short description of the payment gateway.', 'woocommerce' ),
					'readonly'    => true,
				),
				'supports'          => array(
					'description' => __( 'Supported features for this payment gateway.', 'woocommerce' ),
					'type'        => 'array',
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array(
						'type' => 'string',
					),
				),
				'plugin'            => array(
					'type'       => 'object',
					'context'    => array( 'view', 'edit' ),
					'readonly'   => true,
					'properties' => array(
						'_type'  => array(
							'type'        => 'string',
							'description' => esc_html__( 'The type of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'slug'   => array(
							'type'        => 'string',
							'description' => esc_html__( 'The slug of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'status' => array(
							'type'        => 'string',
							'description' => esc_html__( 'The status of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
					),
				),
				'image'             => array(
					'type'        => 'string',
					'description' => esc_html__( 'The URL of the payment gateway image.', 'woocommerce' ),
					'readonly'    => true,
				),
				'icon'              => array(
					'type'        => 'string',
					'description' => esc_html__( 'The URL of the payment gateway icon (square aspect ratio - 72px by 72px).', 'woocommerce' ),
					'readonly'    => true,
				),
				'links'             => array(
					'description' => __( 'Links for the payment gateway.', 'woocommerce' ),
					'type'        => 'array',
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array(
						'type'       => 'object',
						'properties' => array(
							'_type' => array(
								'type'        => 'string',
								'description' => esc_html__( 'The type of the link.', 'woocommerce' ),
								'context'     => array( 'view', 'edit' ),
								'readonly'    => true,
							),
							'url'   => array(
								'type'        => 'string',
								'description' => esc_html__( 'The URL of the link.', 'woocommerce' ),
								'context'     => array( 'view', 'edit' ),
								'readonly'    => true,
							),
						),
					),
				),
				'state'             => array(
					'type'        => 'object',
					'description' => esc_html__( 'The state of the payment gateway.', 'woocommerce' ),
					'properties'  => array(
						'enabled'     => array(
							'type'        => 'boolean',
							'description' => esc_html__( 'Whether the payment gateway is enabled for use.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'needs_setup' => array(
							'type'        => 'boolean',
							'description' => esc_html__( 'Whether the payment gateway needs setup.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'test_mode'   => array(
							'type'        => 'boolean',
							'description' => esc_html__( 'Whether the payment gateway is in test mode.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
					),
				),
				'management'        => array(
					'type'        => 'object',
					'description' => esc_html__( 'The management details of the payment gateway.', 'woocommerce' ),
					'properties'  => array(
						'settings_url' => array(
							'type'        => 'string',
							'description' => esc_html__( 'The URL to the settings page for the payment gateway.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
					),
				),
			),
		);
	}

	/**
	 * Get the schema for a suggestion.
	 *
	 * @return array The schema for a suggestion.
	 */
	private function get_schema_for_suggestion(): array {
		return array(
			'type'        => 'object',
			'description' => esc_html__( 'A suggestion with full details.', 'woocommerce' ),
			'context'     => array( 'view', 'edit' ),
			'readonly'    => true,
			'properties'  => array(
				'id'                => array(
					'type'        => 'string',
					'description' => esc_html__( 'The unique identifier for the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'_priority'         => array(
					'type'        => 'integer',
					'description' => esc_html__( 'The priority of the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'_type'             => array(
					'type'        => 'string',
					'description' => esc_html__( 'The type of the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'title'             => array(
					'type'        => 'string',
					'description' => esc_html__( 'The title of the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'description'       => array(
					'type'        => 'string',
					'description' => esc_html__( 'The description of the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
				'short_description' => array(
					'type'        => 'string',
					'description' => esc_html__( 'The short description of the suggestion.', 'woocommerce' ),
					'readonly'    => true,
				),
				'plugin'            => array(
					'type'       => 'object',
					'context'    => array( 'view', 'edit' ),
					'readonly'   => true,
					'properties' => array(
						'_type'  => array(
							'type'        => 'string',
							'description' => esc_html__( 'The type of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'slug'   => array(
							'type'        => 'string',
							'description' => esc_html__( 'The slug of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
						'status' => array(
							'type'        => 'string',
							'description' => esc_html__( 'The status of the plugin.', 'woocommerce' ),
							'context'     => array( 'view', 'edit' ),
							'readonly'    => true,
						),
					),
				),
				'image'             => array(
					'type'        => 'string',
					'description' => esc_html__( 'The URL of the image.', 'woocommerce' ),
					'readonly'    => true,
				),
				'icon'              => array(
					'type'        => 'string',
					'description' => esc_html__( 'The URL of the icon (square aspect ratio).', 'woocommerce' ),
					'readonly'    => true,
				),
				'links'             => array(
					'type'     => 'array',
					'context'  => array( 'view', 'edit' ),
					'readonly' => true,
					'items'    => array(
						'type'       => 'object',
						'properties' => array(
							'_type' => array(
								'type'        => 'string',
								'description' => esc_html__( 'The type of the link.', 'woocommerce' ),
								'context'     => array( 'view', 'edit' ),
								'readonly'    => true,
							),
							'url'   => array(
								'type'        => 'string',
								'description' => esc_html__( 'The URL of the link.', 'woocommerce' ),
								'context'     => array( 'view', 'edit' ),
								'readonly'    => true,
							),
						),
					),
				),
				'tags'              => array(
					'description' => esc_html__( 'The tags associated with the suggestion.', 'woocommerce' ),
					'type'        => 'array',
					'uniqueItems' => true,
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
					'items'       => array(
						'type'        => 'string',
						'description' => esc_html__( 'The tags associated with the suggestion.', 'woocommerce' ),
						'readonly'    => true,
					),
				),
				'category'          => array(
					'type'        => 'string',
					'description' => esc_html__( 'The category of the suggestion.', 'woocommerce' ),
					'context'     => array( 'view', 'edit' ),
					'readonly'    => true,
				),
			),
		);
	}
}