<?php

namespace Automattic\WooCommerce\Tests\Blocks\BlockTypes;

use Automattic\WooCommerce\Tests\Blocks\Mocks\ProductCollectionMock;
use WC_Helper_Product;
use WC_Tax;
use WP_Query;
use Automattic\WooCommerce\Enums\ProductStockStatus;

/**
 * Tests for the ProductCollection block type
 */
class ProductCollection extends \WP_UnitTestCase {
	/**
	 * This variable holds our Product Query object.
	 *
	 * @var ProductCollectionMock
	 */
	private $block_instance;

	/**
	 * Return starting point for parsed block test data.
	 * Using a method instead of property to avoid sharing data between tests.
	 */
	private function get_base_parsed_block() {
		return array(
			'blockName' => 'woocommerce/product-collection',
			'attrs'     => array(
				'query' => array(
					'perPage'                  => 9,
					'pages'                    => 0,
					'offset'                   => 0,
					'postType'                 => 'product',
					'order'                    => 'desc',
					'orderBy'                  => 'date',
					'search'                   => '',
					'exclude'                  => array(),
					'sticky'                   => '',
					'inherit'                  => true,
					'isProductCollectionBlock' => true,
					'woocommerceAttributes'    => array(),
					'woocommerceStockStatus'   => array(
						ProductStockStatus::IN_STOCK,
						ProductStockStatus::OUT_OF_STOCK,
						ProductStockStatus::ON_BACKORDER,
					),
				),
			),
		);
	}

	/**
	 * Initiate the mock object.
	 */
	protected function setUp(): void {
		$this->block_instance = new ProductCollectionMock();
	}

	/**
	 * Build the merged_query for testing
	 *
	 * @param array $parsed_block Parsed block data.
	 * @param array $query        Query data.
	 */
	private function initialize_merged_query( $parsed_block = array(), $query = array() ) {
		if ( empty( $parsed_block ) ) {
			$parsed_block = $this->get_base_parsed_block();
		}

		$this->block_instance->set_parsed_block( $parsed_block );

		$block          = new \stdClass();
		$block->context = $parsed_block['attrs'];

		return $this->block_instance->build_frontend_query( $query, $block, 1 );
	}

	/**
	 * Build a simplified request for testing.
	 *
	 * @param array $params The parameters to set on the request.
	 * @return WP_REST_Request
	 */
	private function build_request( $params = array() ) {
		$params = wp_parse_args(
			$params,
			array(
				'featured'               => false,
				'woocommerceOnSale'      => false,
				'woocommerceAttributes'  => array(),
				'woocommerceStockStatus' => array(),
				'timeFrame'              => array(),
				'priceRange'             => array(),
			)
		);

		$params['isProductCollectionBlock'] = true;

		$request = new \WP_REST_Request( 'GET', '/wp/v2/product' );
		foreach ( $params as $param => $value ) {
			$request->set_param( $param, $value );
		}

		return $request;
	}

	/**
	 * Test merging featured queries.
	 */
	public function test_merging_featured_queries() {
		$parsed_block                               = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['featured'] = true;

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'field'    => 'name',
				'terms'    => 'featured',
				'operator' => 'IN',
				'taxonomy' => 'product_visibility',
			),
			$merged_query['tax_query']
		);
	}

	/**
	 * Test merging on sale queries.
	 */
	public function test_merging_on_sale_queries() {
		// Mock the on sale product ids.
		$on_sale_product_ids = array( 1, 2, 3, 4 );
		set_transient( 'wc_products_onsale', $on_sale_product_ids, DAY_IN_SECONDS * 30 );

		$parsed_block                                        = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceOnSale'] = true;

		$merged_query = $this->initialize_merged_query( $parsed_block );

		foreach ( $on_sale_product_ids as $id ) {
			$this->assertContainsEquals( $id, $merged_query['post__in'] );
		}

		$this->assertCount( 4, $merged_query['post__in'] );

		delete_transient( 'wc_products_onsale' );
	}

	/**
	 * Test merging stock status queries.
	 */
	public function test_merging_stock_status_queries() {
		$parsed_block = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceStockStatus'] = array(
			ProductStockStatus::OUT_OF_STOCK,
			ProductStockStatus::ON_BACKORDER,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'value'   => array( ProductStockStatus::OUT_OF_STOCK, ProductStockStatus::ON_BACKORDER ),
				'compare' => 'IN',
				'key'     => '_stock_status',
			),
			$merged_query['meta_query']
		);
	}

	/**
	 * Test merging default stock queries that should use product visibility
	 * queries instead of meta query for stock status.
	 */
	public function test_merging_default_stock_queries() {
		$parsed_block = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceStockStatus'] = array(
			ProductStockStatus::IN_STOCK,
			ProductStockStatus::OUT_OF_STOCK,
			ProductStockStatus::ON_BACKORDER,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEmpty( $merged_query['meta_query'] );

		// Test with hide out of stock items option enabled.
		$parsed_block = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceStockStatus'] = array(
			ProductStockStatus::IN_STOCK,
			ProductStockStatus::ON_BACKORDER,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEmpty( $merged_query['meta_query'] );
	}

	/**
	 * Test merging attribute queries.
	 */
	public function test_merging_attribute_queries() {
		$parsed_block = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceAttributes'] = array(
			array(
				'taxonomy' => 'pa_test',
				'termId'   => 1,
			),
			array(
				'taxonomy' => 'pa_test',
				'termId'   => 2,
			),
			array(
				'taxonomy' => 'pa_another_test',
				'termId'   => 3,
			),
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'field'    => 'term_id',
				'terms'    => array( 3 ),
				'operator' => 'IN',
				'taxonomy' => 'pa_another_test',
			),
			$merged_query['tax_query']
		);

		$this->assertContainsEquals(
			array(
				'taxonomy' => 'pa_test',
				'field'    => 'term_id',
				'terms'    => array( 1, 2 ),
				'operator' => 'IN',
			),
			$merged_query['tax_query']
		);
	}

	/**
	 * Test merging order by rating queries.
	 */
	public function test_merging_order_by_rating_queries() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'rating';

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals( 'meta_value_num', $merged_query['orderby'] );
		$this->assertEquals( '_wc_average_rating', $merged_query['meta_key'] );
	}

	/**
	 * Test product visibility query exist in merged query.
	 */
	public function test_product_visibility_query_exist_in_merged_query() {
		$product_visibility_terms  = wc_get_product_visibility_term_ids();
		$product_visibility_not_in = array( is_search() ? $product_visibility_terms['exclude-from-search'] : $product_visibility_terms['exclude-from-catalog'] );

		$parsed_block = $this->get_base_parsed_block();

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => $product_visibility_not_in,
				'operator' => 'NOT IN',
			),
			$merged_query['tax_query']
		);
	}

	/**
	 * Test merging multiple queries.
	 */
	public function test_merging_multiple_queries() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'rating';
		$parsed_block['attrs']['query']['woocommerceStockStatus'] = array(
			ProductStockStatus::IN_STOCK,
			ProductStockStatus::OUT_OF_STOCK,
		);
		$parsed_block['attrs']['query']['woocommerceAttributes']  = array(
			array(
				'taxonomy' => 'pa_test',
				'termId'   => 1,
			),
			array(
				'taxonomy' => 'pa_test',
				'termId'   => 2,
			),
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals( 'meta_value_num', $merged_query['orderby'] );
		$this->assertEquals( '_wc_average_rating', $merged_query['meta_key'] );
		$this->assertContainsEquals(
			array(
				'compare' => 'IN',
				'key'     => '_stock_status',
				'value'   => array( ProductStockStatus::IN_STOCK, ProductStockStatus::OUT_OF_STOCK ),
			),
			$merged_query['meta_query']
		);
		$this->assertContainsEquals(
			array(
				'taxonomy' => 'pa_test',
				'field'    => 'term_id',
				'terms'    => array( 1, 2 ),
				'operator' => 'IN',
			),
			$merged_query['tax_query']
		);
	}

	/**
	 * Test merging filter by max price queries.
	 */
	public function test_merging_filter_by_max_price_queries() {
		set_query_var( 'max_price', 100 );

		$merged_query = $this->initialize_merged_query();

		$this->assertContainsEquals(
			array(
				array(
					'key'     => '_price',
					'value'   => 100,
					'compare' => '<=',
					'type'    => 'numeric',
				),
				array(),
				'relation' => 'AND',
			),
			$merged_query['meta_query']
		);
		set_query_var( 'max_price', '' );
	}

	/**
	 * Test merging filter by min price queries.
	 */
	public function test_merging_filter_by_min_price_queries() {
		set_query_var( 'min_price', 20 );

		$merged_query = $this->initialize_merged_query();

		$this->assertContainsEquals(
			array(
				array(),
				array(
					'key'     => '_price',
					'value'   => 20,
					'compare' => '>=',
					'type'    => 'numeric',
				),
				'relation' => 'AND',
			),
			$merged_query['meta_query']
		);
		set_query_var( 'min_price', '' );
	}

	/**
	 * Test merging filter by min and max price queries.
	 */
	public function test_merging_filter_by_min_and_max_price_queries() {
		set_query_var( 'max_price', 100 );
		set_query_var( 'min_price', 20 );

		$merged_query = $this->initialize_merged_query();

		$this->assertContainsEquals(
			array(
				array(
					'key'     => '_price',
					'value'   => 100,
					'compare' => '<=',
					'type'    => 'numeric',
				),
				array(
					'key'     => '_price',
					'value'   => 20,
					'compare' => '>=',
					'type'    => 'numeric',
				),
				'relation' => 'AND',
			),
			$merged_query['meta_query']
		);

		set_query_var( 'max_price', '' );
		set_query_var( 'min_price', '' );
	}

	/**
	 * Test merging filter by stock status queries.
	 */
	public function test_merging_filter_by_stock_status_queries() {
		set_query_var( 'filter_stock_status', ProductStockStatus::IN_STOCK );

		$merged_query = $this->initialize_merged_query();

		$this->assertContainsEquals(
			array(
				'operator' => 'IN',
				'key'      => '_stock_status',
				'value'    => array( ProductStockStatus::IN_STOCK ),
			),
			$merged_query['meta_query']
		);

		set_query_var( 'filter_stock_status', '' );
	}

	/**
	 * Test merging time range queries.
	 */
	public function test_merging_time_frame_before_queries() {
		$time_frame_date = gmdate( 'Y-m-d H:i:s' );

		$parsed_block                                = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['timeFrame'] = array(
			'operator' => 'not-in',
			'value'    => $time_frame_date,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'column'    => 'post_date_gmt',
				'before'    => $time_frame_date,
				'inclusive' => true,
			),
			$merged_query['date_query'],
		);
	}

	/**
	 * Test merging time range queries.
	 */
	public function test_merging_time_frame_after_queries() {
		$time_frame_date = gmdate( 'Y-m-d H:i:s' );

		$parsed_block                                = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['timeFrame'] = array(
			'operator' => 'in',
			'value'    => $time_frame_date,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertContainsEquals(
			array(
				'column'    => 'post_date_gmt',
				'after'     => $time_frame_date,
				'inclusive' => true,
			),
			$merged_query['date_query'],
		);
	}

	/**
	 * Test merging filter by stock status queries.
	 */
	public function test_merging_filter_by_attribute_queries() {
		// Mock the attribute data.
		$this->block_instance->set_attributes_filter_query_args(
			array(
				array(
					'filter'     => 'filter_color',
					'query_type' => 'query_type_color',
				),
				array(
					'filter'     => 'filter_size',
					'query_type' => 'query_type_size',
				),
			)
		);

		set_query_var( 'filter_color', 'blue' );
		set_query_var( 'query_type_color', 'or' );
		set_query_var( 'filter_size', 'xl,xxl' );
		set_query_var( 'query_type_size', 'and' );

		$merged_query = $this->initialize_merged_query();
		$tax_queries  = $merged_query['tax_query'];

		$and_query = array();
		foreach ( $tax_queries as $tax_query ) {
			if ( isset( $tax_query['relation'] ) && 'AND' === $tax_query['relation'] ) {
				$and_query = $tax_query;
			}
		}

		// Check if the AND query is an array.
		$this->assertIsArray( $and_query );

		$attribute_queries = array();
		foreach ( $and_query as $and_query_item ) {
			if ( is_array( $and_query_item ) ) {
				$attribute_queries = $and_query_item;
			}
		}

		$this->assertContainsEquals(
			array(
				'taxonomy' => 'pa_color',
				'field'    => 'slug',
				'terms'    => array( 'blue' ),
				'operator' => 'IN',
			),
			$attribute_queries
		);

		$this->assertContainsEquals(
			array(
				'taxonomy' => 'pa_size',
				'field'    => 'slug',
				'terms'    => array( 'xl', 'xxl' ),
				'operator' => 'AND',
			),
			$attribute_queries
		);

		set_query_var( 'filter_color', '' );
		set_query_var( 'query_type_color', '' );
		set_query_var( 'filter_size', '' );
		set_query_var( 'query_type_size', '' );
	}

	/**
	 * Test merging multiple filter queries.
	 */
	public function test_merging_multiple_filter_queries() {
		set_query_var( 'max_price', 100 );
		set_query_var( 'min_price', 20 );
		set_query_var( 'filter_stock_status', ProductStockStatus::IN_STOCK );

		$merged_query = $this->initialize_merged_query();

		$this->assertContainsEquals(
			array(
				'operator' => 'IN',
				'key'      => '_stock_status',
				'value'    => array( ProductStockStatus::IN_STOCK ),
			),
			$merged_query['meta_query']
		);

		$this->assertContainsEquals(
			array(
				array(
					'key'     => '_price',
					'value'   => 100,
					'compare' => '<=',
					'type'    => 'numeric',
				),
				array(
					'key'     => '_price',
					'value'   => 20,
					'compare' => '>=',
					'type'    => 'numeric',
				),
				'relation' => 'AND',
			),
			$merged_query['meta_query']
		);

		set_query_var( 'max_price', '' );
		set_query_var( 'min_price', '' );
		set_query_var( 'filter_stock_status', '' );
	}

	/**
	 * Test merging taxonomies query i.e.
	 * - Product categories
	 * - Product tags
	 */
	public function test_merging_taxonomies_query() {
		$merged_query = $this->initialize_merged_query(
			null,
			// Since we aren't calling the Query Loop build function, we need to provide
			// a tax_query rather than relying on it generating one from the input.
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'tax_query' => array(
					array(
						'taxonomy'         => 'product_cat',
						'terms'            => array( 1, 2 ),
						'include_children' => false,
					),
					array(
						'taxonomy'         => 'product_tag',
						'terms'            => array( 3, 4 ),
						'include_children' => false,
					),
				),
			)
		);

		$this->assertContains(
			array(
				'taxonomy'         => 'product_cat',
				'terms'            => array( 1, 2 ),
				'include_children' => false,
			),
			$merged_query['tax_query']
		);

		$this->assertContains(
			array(
				'taxonomy'         => 'product_tag',
				'terms'            => array( 3, 4 ),
				'include_children' => false,
			),
			$merged_query['tax_query']
		);
	}

	/**
	 * Test merging multiple filter queries on Editor side
	 */
	public function test_updating_rest_query_without_attributes() {
		$product_visibility_terms  = wc_get_product_visibility_term_ids();
		$product_visibility_not_in = array( is_search() ? $product_visibility_terms['exclude-from-search'] : $product_visibility_terms['exclude-from-catalog'] );

		$args    = array(
			'posts_per_page' => 9,
		);
		$request = $this->build_request();

		$updated_query = $this->block_instance->update_rest_query_in_editor( $args, $request );

		$this->assertContainsEquals(
			array(
				'key'     => '_stock_status',
				'value'   => array(),
				'compare' => 'IN',
			),
			$updated_query['meta_query'],
		);

		$this->assertEquals(
			array(
				array(
					'taxonomy' => 'product_visibility',
					'field'    => 'term_taxonomy_id',
					'terms'    => $product_visibility_not_in,
					'operator' => 'NOT IN',
				),
			),
			$updated_query['tax_query'],
		);
	}

	/**
	 * Test merging multiple filter queries.
	 */
	public function test_updating_rest_query_with_attributes() {
		$product_visibility_terms  = wc_get_product_visibility_term_ids();
		$product_visibility_not_in = array( is_search() ? $product_visibility_terms['exclude-from-search'] : $product_visibility_terms['exclude-from-catalog'] );

		$args            = array(
			'posts_per_page' => 9,
		);
		$time_frame_date = gmdate( 'Y-m-d H:i:s' );
		$params          = array(
			'featured'               => 'true',
			'woocommerceOnSale'      => 'true',
			'woocommerceAttributes'  => array(
				array(
					'taxonomy' => 'pa_test',
					'termId'   => 1,
				),
			),
			'woocommerceStockStatus' => array( ProductStockStatus::IN_STOCK, ProductStockStatus::OUT_OF_STOCK ),
			'timeFrame'              => array(
				'operator' => 'in',
				'value'    => $time_frame_date,
			),
			'priceRange'             => array(
				'min' => 1,
				'max' => 100,
			),
		);

		$request = $this->build_request( $params );

		$updated_query = $this->block_instance->update_rest_query_in_editor( $args, $request );

		$this->assertContainsEquals(
			array(
				'key'     => '_stock_status',
				'value'   => array( ProductStockStatus::IN_STOCK, ProductStockStatus::OUT_OF_STOCK ),
				'compare' => 'IN',
			),
			$updated_query['meta_query'],
		);

		$this->assertContains(
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'term_taxonomy_id',
				'terms'    => $product_visibility_not_in,
				'operator' => 'NOT IN',
			),
			$updated_query['tax_query'],
		);
		$this->assertContains(
			array(
				'taxonomy' => 'product_visibility',
				'field'    => 'name',
				'terms'    => 'featured',
				'operator' => 'IN',
			),
			$updated_query['tax_query'],
		);

		$this->assertContains(
			array(
				'column'    => 'post_date_gmt',
				'after'     => $time_frame_date,
				'inclusive' => true,
			),
			$updated_query['date_query'],
		);

		$this->assertContains(
			array(
				'field'    => 'term_id',
				'operator' => 'IN',
				'taxonomy' => 'pa_test',
				'terms'    => array( 1 ),
			),
			$updated_query['tax_query'],
		);

		$this->assertEquals(
			array(
				'min' => 1,
				'max' => 100,
			),
			$updated_query['priceRange'],
		);
	}

	/**
	 * Test that price range queries are set so they can be picked up in the `posts_clauses` filter.
	 */
	public function test_price_range_queries() {
		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 1,
			'max' => 100,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 1,
				'max' => 100,
			),
			$merged_query['priceRange'],
		);
	}

	/**
	 * Tests that empty price range clauses are not added to the query.
	 */
	public function test_price_range_clauses_empty() {
		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 0,
			'max' => 0,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 0,
				'max' => 0,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		$this->assertStringNotContainsString( 'wc_product_meta_lookup.min_price', $query->request );
		$this->assertStringNotContainsString( 'wc_product_meta_lookup.max_price', $query->request );
	}

	/**
	 * Tests that the minimum in a price range is added if set.
	 */
	public function test_price_range_clauses_min_price() {
		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 1,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 1,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.max_price >= 1.', $query->request );
	}

	/**
	 * Tests that the maximum in a price range is added if set.
	 */
	public function test_price_range_clauses_max_price() {
		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'max' => 1,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'max' => 1,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.min_price <= 1.', $query->request );
	}

	/**
	 * Tests that the both the minimum and maximum in a price range is added if set.
	 */
	public function test_price_range_clauses_min_max_price() {
		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 1,
			'max' => 2,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 1,
				'max' => 2,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.max_price >= 1.', $query->request );
		$this->assertStringContainsString( 'wc_product_meta_lookup.min_price <= 2.', $query->request );
	}

	/**
	 * Tests that the both the minimum and maximum in a price range is added if set.
	 */
	public function test_price_range_clauses_min_max_price_tax_exclusive() {
		update_option( 'woocommerce_prices_include_tax', 'yes' );
		update_option( 'woocommerce_tax_display_shop', 'excl' );

		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 1,
			'max' => 2,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 1,
				'max' => 2,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		delete_option( 'woocommerce_tax_display_shop' );
		delete_option( 'woocommerce_prices_include_tax' );

		$this->assertStringContainsString( 'wc_product_meta_lookup.max_price >= 1.', $query->request );
		$this->assertStringContainsString( 'wc_product_meta_lookup.min_price <= 2.', $query->request );
	}

	/**
	 * Tests that the both the minimum and maximum in a price range with taxes inclusive is added if set.
	 */
	public function test_price_range_clauses_min_max_price_tax_inclusive() {
		update_option( 'woocommerce_prices_include_tax', 'yes' );
		update_option( 'woocommerce_tax_display_shop', 'incl' );
		WC_Tax::create_tax_class( 'collection-test' );

		$product = WC_Helper_Product::create_simple_product();
		$product->set_tax_class( 'collection-test' );
		$product->save();

		$parsed_block                                 = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['priceRange'] = array(
			'min' => 1,
			'max' => 2,
		);

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals(
			array(
				'min' => 1,
				'max' => 2,
			),
			$merged_query['priceRange'],
		);

		$query = new WP_Query( $merged_query );

		delete_option( 'woocommerce_tax_display_shop' );
		delete_option( 'woocommerce_prices_include_tax' );
		$product->delete();
		WC_Tax::delete_tax_class_by( 'slug', 'collection-test' );

		$this->assertStringContainsString( "( wc_product_meta_lookup.tax_class = 'collection-test' AND wc_product_meta_lookup.`max_price` >= 1.", $query->request );
		$this->assertStringContainsString( "( wc_product_meta_lookup.tax_class = 'collection-test' AND wc_product_meta_lookup.`min_price` <= 2.", $query->request );
	}

	/**
	 * Test handpicked products queries.
	 */
	public function test_handpicked_products_queries() {
		$handpicked_product_ids = array( 1, 2, 3, 4 );

		$parsed_block = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['woocommerceHandPickedProducts'] = $handpicked_product_ids;

		$merged_query = $this->initialize_merged_query( $parsed_block );

		foreach ( $handpicked_product_ids as $id ) {
			$this->assertContainsEquals( $id, $merged_query['post__in'] );
		}

		$this->assertCount( 4, $merged_query['post__in'] );
	}

	/**
	 * Test merging exclusive id filters.
	 */
	public function test_merges_post__in() {
		$existing_id_filter     = array( 1, 4 );
		$handpicked_product_ids = array( 3, 4, 5, 6 );
		// The only ID present in ALL of the exclusive filters is 4.
		$expected_product_ids = array( 4 );

		$parsed_block                               = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['post__in'] = $existing_id_filter;
		$parsed_block['attrs']['query']['woocommerceHandPickedProducts'] = $handpicked_product_ids;

		$merged_query = $this->initialize_merged_query( $parsed_block );

		foreach ( $expected_product_ids as $id ) {
			$this->assertContainsEquals( $id, $merged_query['post__in'] );
		}

		$this->assertCount( 1, $merged_query['post__in'] );
	}

	/**
	 * Test merging exclusive id filters with no intersection.
	 */
	public function test_merges_post__in_empty_result_without_intersection() {
		$existing_id_filter     = array( 1, 4 );
		$handpicked_product_ids = array( 2, 3 );

		$parsed_block                               = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['post__in'] = $existing_id_filter;
		$parsed_block['attrs']['query']['woocommerceHandPickedProducts'] = $handpicked_product_ids;

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals( array( -1 ), $merged_query['post__in'] );
	}

	/**
	 * Test for frontend collection handlers.
	 */
	public function test_frontend_collection_handlers() {
		$build_query   = $this->getMockBuilder( \stdClass::class )
			->setMethods( [ '__invoke' ] )
			->getMock();
		$frontend_args = $this->getMockBuilder( \stdClass::class )
			->setMethods( [ '__invoke' ] )
			->getMock();
		$this->block_instance->register_collection_handlers( 'test-collection', $build_query, $frontend_args );

		$frontend_args->expects( $this->once() )
			->method( '__invoke' )
			->willReturnCallback(
				function ( $collection_args ) {
					$collection_args['test'] = 'test-arg';
					return $collection_args;
				}
			);
		$build_query->expects( $this->once() )
			->method( '__invoke' )
			->willReturnCallback(
				function ( $collection_args ) {
					$this->assertArrayHasKey( 'test', $collection_args );
					$this->assertEquals( 'test-arg', $collection_args['test'] );
					return array(
						'post__in' => array( 111 ),
					);
				}
			);

		$parsed_block                        = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection'] = 'test-collection';

		$merged_query = $this->initialize_merged_query( $parsed_block );

		$this->block_instance->unregister_collection_handlers( 'test-collection' );

		$this->assertContains( 111, $merged_query['post__in'] );
	}

	/**
	 * Test for editor collection handlers.
	 */
	public function test_editor_collection_handlers() {
		$build_query = $this->getMockBuilder( \stdClass::class )
			->setMethods( [ '__invoke' ] )
			->getMock();
		$editor_args = $this->getMockBuilder( \stdClass::class )
			->setMethods( [ '__invoke' ] )
			->getMock();
		$this->block_instance->register_collection_handlers( 'test-collection', $build_query, null, $editor_args );

		$editor_args->expects( $this->once() )
			->method( '__invoke' )
			->willReturnCallback(
				function ( $collection_args ) {
					$collection_args['test'] = 'test-arg';
					return $collection_args;
				}
			);
		$build_query->expects( $this->once() )
			->method( '__invoke' )
			->willReturnCallback(
				function ( $collection_args ) {
					$this->assertArrayHasKey( 'test', $collection_args );
					$this->assertEquals( 'test-arg', $collection_args['test'] );
					return array(
						'post__in' => array( 111 ),
					);
				}
			);

		$args    = array();
		$request = $this->build_request();
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'test-collection',
			)
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( $args, $request );

		$this->block_instance->unregister_collection_handlers( 'test-collection' );

		$this->assertContains( 111, $updated_query['post__in'] );
	}

	/**
	 * Test for the editor preview collection handler.
	 */
	public function test_editor_preview_collection_handler() {
		$preview_query = $this->getMockBuilder( \stdClass::class )
			->setMethods( [ '__invoke' ] )
			->getMock();
		$this->block_instance->register_collection_handlers(
			'test-collection',
			function () {
				return array();
			},
			null,
			null,
			$preview_query
		);

		$preview_query->expects( $this->once() )
			->method( '__invoke' )
			->willReturn(
				array(
					'post__in' => array( 123 ),
				)
			);

		$args    = array();
		$request = $this->build_request();
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'test-collection',
			)
		);
		$request->set_param(
			'previewState',
			array(
				'isPreview' => 'true',
			)
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( $args, $request );

		$this->block_instance->unregister_collection_handlers( 'test-collection' );

		$this->assertContains( 123, $updated_query['post__in'] );
	}

	/**
	 * Tests that the related products collection handler works as expected.
	 */
	public function test_collection_related_products() {
		$related_filter = $this->getMockBuilder( \stdClass::class )
		->setMethods( [ '__invoke' ] )
		->getMock();

		$expected_product_ids = array( 2, 3, 4 );

		// This filter will turn off the data store so we don't need dummy products.
		add_filter( 'woocommerce_product_related_posts_force_display', '__return_true', 0 );
		$related_filter->expects( $this->exactly( 2 ) )
			->method( '__invoke' )
			->with( array(), 1 )
			->willReturn( $expected_product_ids );
		add_filter( 'woocommerce_related_products', array( $related_filter, '__invoke' ), 10, 2 );

		// Frontend.
		$parsed_block                                       = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection']                = 'woocommerce/product-collection/related';
		$parsed_block['attrs']['query']['productReference'] = 1;
		$result_frontend                                    = $this->initialize_merged_query( $parsed_block );

		// Editor.
		$request = $this->build_request(
			array( 'productReference' => 1 )
		);
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'woocommerce/product-collection/related',
			)
		);
		$result_editor = $this->block_instance->update_rest_query_in_editor( array(), $request );

		remove_filter( 'woocommerce_product_related_posts_force_display', '__return_true', 0 );
		remove_filter( 'woocommerce_related_products', array( $related_filter, '__invoke' ) );

		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_frontend['post__in'] );
		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_editor['post__in'] );
	}

	/**
	 * Tests that the upsells collection handler works as expected.
	 */
	public function test_collection_upsells() {
		$expected_product_ids = array( 2, 3, 4 );
		$test_product         = WC_Helper_Product::create_simple_product( false );
		$test_product->set_upsell_ids( $expected_product_ids );
		$test_product->save();

		// Frontend.
		$parsed_block                                       = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection']                = 'woocommerce/product-collection/upsells';
		$parsed_block['attrs']['query']['productReference'] = $test_product->get_id();
		$result_frontend                                    = $this->initialize_merged_query( $parsed_block );

		// Editor.
		$request = $this->build_request(
			array( 'productReference' => $test_product->get_id() )
		);
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'woocommerce/product-collection/upsells',
			)
		);
		$result_editor = $this->block_instance->update_rest_query_in_editor( array(), $request );

		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_frontend['post__in'] );
		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_editor['post__in'] );
	}

	/**
	 * Tests that the cross-sells collection handler works as expected.
	 */
	public function test_collection_cross_sells() {
		$expected_product_ids = array( 2, 3, 4 );
		$test_product         = WC_Helper_Product::create_simple_product( false );
		$test_product->set_cross_sell_ids( $expected_product_ids );
		$test_product->save();

		// Frontend.
		$parsed_block                                       = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection']                = 'woocommerce/product-collection/cross-sells';
		$parsed_block['attrs']['query']['productReference'] = $test_product->get_id();
		$result_frontend                                    = $this->initialize_merged_query( $parsed_block );

		// Editor.
		$request = $this->build_request(
			array( 'productReference' => $test_product->get_id() )
		);
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'woocommerce/product-collection/cross-sells',
			)
		);
		$result_editor = $this->block_instance->update_rest_query_in_editor( array(), $request );

		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_frontend['post__in'] );
		$this->assertEqualsCanonicalizing( $expected_product_ids, $result_editor['post__in'] );
	}

	/**
	 * Test the add_price_sorting_posts_clauses method.
	 */
	public function test_add_price_sorting_posts_clauses() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'price';

		$parsed_block['attrs']['query']['order'] = 'asc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.min_price ASC', $query->request );

		$parsed_block['attrs']['query']['order'] = 'desc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.max_price DESC', $query->request );
	}

	/**
	 * Test the add_sales_sorting_posts_clauses method.
	 */
	public function test_add_sales_sorting_posts_clauses() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'sales';

		$parsed_block['attrs']['query']['order'] = 'asc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.total_sales ASC', $query->request );

		$parsed_block['attrs']['query']['order'] = 'desc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'wc_product_meta_lookup.total_sales DESC', $query->request );
	}

	/**
	 * Test the menu_order sorting functionality.
	 */
	public function test_menu_order_sorting() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'menu_order';
		$parsed_block['attrs']['query']['order']   = 'asc';
		$merged_query                              = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals( 'menu_order', $merged_query['orderby'] );
		$this->assertEquals( 'asc', $merged_query['order'] );
	}

	/**
	 * Tests alphabetical sorting by title for products with identical menu_order values in frontend context.
	 */
	public function test_frontend_menu_order_sorting_with_title_fallback() {
		$product1 = WC_Helper_Product::create_simple_product();
		$product1->set_menu_order( 10 );
		$product1->set_name( 'Pennant' );
		$product1->save();

		$product2 = WC_Helper_Product::create_simple_product();
		$product2->set_menu_order( 10 );
		$product2->set_name( 'Album' );
		$product2->save();

		$product3 = WC_Helper_Product::create_simple_product();
		$product3->set_menu_order( 5 );
		$product3->set_name( 'Beanie' );
		$product3->save();

		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'menu_order';
		$parsed_block['attrs']['query']['order']   = 'asc';
		$parsed_block['attrs']['query']['perPage'] = 10;

		$merged_query = $this->initialize_merged_query( $parsed_block );
		$query        = new WP_Query( $merged_query );

		$this->assertGreaterThanOrEqual( 3, $query->post_count );

		$ordered_product_ids = wp_list_pluck( $query->posts, 'ID' );

		$pos_product1 = array_search( $product1->get_id(), $ordered_product_ids, true );
		$pos_product2 = array_search( $product2->get_id(), $ordered_product_ids, true );
		$pos_product3 = array_search( $product3->get_id(), $ordered_product_ids, true );

		// Product3 (menu_order 5) should come before the others.
		$this->assertLessThan( $pos_product1, $pos_product3 );
		$this->assertLessThan( $pos_product2, $pos_product3 );

		// Product2 (Album) should come before Product1 (Pennant) when menu_order is same.
		$this->assertLessThan( $pos_product1, $pos_product2 );

		// Test descending order.
		$parsed_block['attrs']['query']['order'] = 'desc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$ordered_product_ids_desc = wp_list_pluck( $query->posts, 'ID' );

		$pos_product1_desc = array_search( $product1->get_id(), $ordered_product_ids_desc, true );
		$pos_product2_desc = array_search( $product2->get_id(), $ordered_product_ids_desc, true );
		$pos_product3_desc = array_search( $product3->get_id(), $ordered_product_ids_desc, true );

		// Product3 (menu_order 5) should come after the others in DESC order.
		$this->assertGreaterThan( $pos_product1_desc, $pos_product3_desc );
		$this->assertGreaterThan( $pos_product2_desc, $pos_product3_desc );

		// Between products with same menu_order (10), Pennant should come before Album in DESC.
		$this->assertLessThan( $pos_product2_desc, $pos_product1_desc );

		$product1->delete();
		$product2->delete();
		$product3->delete();
	}

	/**
	 * Tests that editor REST API queries correctly implement title fallback with menu_order sorting.
	 */
	public function test_editor_menu_order_sorting_with_title_fallback() {
		$product1 = WC_Helper_Product::create_simple_product();
		$product1->set_name( 'Pennant' );
		$product1->set_menu_order( 10 );
		$product1->save();

		$product2 = WC_Helper_Product::create_simple_product();
		$product2->set_name( 'Album' );
		$product2->set_menu_order( 10 );
		$product2->save();

		$product3 = WC_Helper_Product::create_simple_product();
		$product3->set_name( 'Beanie' );
		$product3->set_menu_order( 5 );
		$product3->save();

		$request = $this->build_request(
			array(
				'orderby'  => 'menu_order',
				'order'    => 'asc',
				'per_page' => 10,
			)
		);

		$query = array(
			'order'          => 'asc',
			'posts_per_page' => 10,
			'post_type'      => 'product',
			'post_status'    => 'publish',
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( $query, $request );

		$this->assertEquals( 'menu_order', $updated_query['orderby'] );

		$query_obj = new WP_Query( $updated_query );
		$posts     = $query_obj->posts;

		$test_product_ids = array( $product1->get_id(), $product2->get_id(), $product3->get_id() );
		$found_products   = array();

		foreach ( $posts as $post ) {
			if ( in_array( $post->ID, $test_product_ids, true ) ) {
				$found_products[] = $post->ID;
			}
		}

		$this->assertCount( 3, $found_products );

		$pos_product1 = array_search( $product1->get_id(), $found_products, true );
		$pos_product2 = array_search( $product2->get_id(), $found_products, true );
		$pos_product3 = array_search( $product3->get_id(), $found_products, true );

		// Product3 (menu_order 5) should come before the others (menu_order 10).
		$this->assertLessThan( $pos_product1, $pos_product3 );
		$this->assertLessThan( $pos_product2, $pos_product3 );

		// Between products with same menu_order (10), Album should come before Pennant.
		$this->assertLessThan( $pos_product1, $pos_product2 );

		// Test descending order.
		$request = $this->build_request(
			array(
				'orderby'  => 'menu_order',
				'order'    => 'desc',
				'per_page' => 10,
			)
		);

		$query = array(
			'order'          => 'desc',
			'posts_per_page' => 10,
			'post_type'      => 'product',
			'post_status'    => 'publish',
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( $query, $request );
		$query_obj     = new WP_Query( $updated_query );
		$posts         = $query_obj->posts;

		$found_products_desc = array();
		foreach ( $posts as $post ) {
			if ( in_array( $post->ID, $test_product_ids, true ) ) {
				$found_products_desc[] = $post->ID;
			}
		}

		$pos_product1_desc = array_search( $product1->get_id(), $found_products_desc, true );
		$pos_product2_desc = array_search( $product2->get_id(), $found_products_desc, true );
		$pos_product3_desc = array_search( $product3->get_id(), $found_products_desc, true );

		// Product3 (menu_order 5) should come after the others in DESC order.
		$this->assertGreaterThan( $pos_product1_desc, $pos_product3_desc );
		$this->assertGreaterThan( $pos_product2_desc, $pos_product3_desc );

		// Between products with same menu_order (10), Pennant should come before Album in DESC.
		$this->assertLessThan( $pos_product2_desc, $pos_product1_desc );

		$product1->delete();
		$product2->delete();
		$product3->delete();
	}

	/**
	 * Tests that menu_order REST query parameters are correctly processed in editor context.
	 */
	public function test_editor_menu_order_query_parameters() {
		$initial_query = array(
			'order' => 'desc',
		);

		$request = $this->build_request(
			array(
				'orderby' => 'menu_order',
			)
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( $initial_query, $request );

		$this->assertEquals( 'menu_order', $updated_query['orderby'] );
		$this->assertEquals( 'desc', $updated_query['order'] );

		$request = $this->build_request(
			array(
				'orderby' => 'menu_order',
			)
		);

		$updated_query = $this->block_instance->update_rest_query_in_editor( array(), $request );

		$this->assertEquals( 'menu_order', $updated_query['orderby'] );
		$this->assertTrue( ! isset( $updated_query['order'] ) || 'desc' === $updated_query['order'] );
	}

	/**
	 * Tests that menu_order sorting generates correct SQL clauses with title fallback.
	 */
	public function test_menu_order_sql_clauses_with_title_fallback() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'menu_order';
		unset( $parsed_block['attrs']['query']['order'] );

		$merged_query = $this->initialize_merged_query( $parsed_block );
		$query        = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'menu_order ASC, post_title ASC', $query->request );

		// Test descending order SQL clause.
		$parsed_block['attrs']['query']['order'] = 'desc';
		$merged_query                            = $this->initialize_merged_query( $parsed_block );
		$query                                   = new WP_Query( $merged_query );

		$this->assertStringContainsString( 'menu_order DESC, post_title DESC', $query->request );
	}

	/**
	 * Test the random sorting functionality.
	 */
	public function test_random_sorting() {
		$parsed_block                              = $this->get_base_parsed_block();
		$parsed_block['attrs']['query']['orderBy'] = 'random';
		$merged_query                              = $this->initialize_merged_query( $parsed_block );

		$this->assertEquals( 'rand', $merged_query['orderby'] );
	}

	/**
	 * Tests that the hand-picked collection handler works with empty product selection.
	 */
	public function test_collection_hand_picked_empty() {
		// Frontend.
		$parsed_block                        = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection'] = 'woocommerce/product-collection/hand-picked';
		$parsed_block['attrs']['query']['woocommerceHandPickedProducts'] = array();
		$result_frontend = $this->initialize_merged_query( $parsed_block );

		// Editor.
		$request = $this->build_request(
			array( 'woocommerceHandPickedProducts' => array() )
		);
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'woocommerce/product-collection/hand-picked',
			)
		);
		$result_editor = $this->block_instance->update_rest_query_in_editor( array(), $request );

		$this->assertEquals( array( -1 ), $result_frontend['post__in'] );
		$this->assertEquals( array( -1 ), $result_editor['post__in'] );
	}

	/**
	 * Tests that the hand-picked collection handler preserves product order.
	 */
	public function test_collection_hand_picked_order() {
		$product_ids = array( 4, 2, 7, 1 );

		// Frontend.
		$parsed_block                        = $this->get_base_parsed_block();
		$parsed_block['attrs']['collection'] = 'woocommerce/product-collection/hand-picked';
		$parsed_block['attrs']['query']['woocommerceHandPickedProducts'] = $product_ids;
		$result_frontend = $this->initialize_merged_query( $parsed_block );

		// Editor.
		$request = $this->build_request(
			array( 'woocommerceHandPickedProducts' => $product_ids )
		);
		$request->set_param(
			'productCollectionQueryContext',
			array(
				'collection' => 'woocommerce/product-collection/hand-picked',
			)
		);
		$result_editor = $this->block_instance->update_rest_query_in_editor( array(), $request );

		// Order should be preserved exactly as specified.
		$this->assertEquals( $product_ids, $result_frontend['post__in'] );
		$this->assertEquals( $product_ids, $result_editor['post__in'] );
	}

	/**
	 * Tests that the by-category collection handler works as expected.
	 */
	public function test_collection_by_category() {
		$electronics_cat    = wp_create_term( 'Electronics', 'product_cat' );
		$electronics_cat_id = $electronics_cat['term_id'];

		$clothing_cat    = wp_create_term( 'Clothing', 'product_cat' );
		$clothing_cat_id = $clothing_cat['term_id'];

		$laptop = WC_Helper_Product::create_simple_product();
		$laptop->set_name( 'Laptop' );
		$laptop->save();

		$phone = WC_Helper_Product::create_simple_product();
		$phone->set_name( 'Phone' );
		$phone->save();

		$tshirt = WC_Helper_Product::create_simple_product();
		$tshirt->set_name( 'T-Shirt' );
		$tshirt->save();

		$unassigned_product = WC_Helper_Product::create_simple_product();
		$unassigned_product->set_name( 'Unassigned Product' );
		$unassigned_product->save();

		// Assign products to categories.
		wp_set_object_terms( $laptop->get_id(), $electronics_cat_id, 'product_cat' );
		wp_set_object_terms( $phone->get_id(), $electronics_cat_id, 'product_cat' );
		wp_set_object_terms( $tshirt->get_id(), $clothing_cat_id, 'product_cat' );
		// unassigned_product has no category.

		// Test filtering by Electronics category - Frontend.
		$merged_query = $this->initialize_merged_query(
			null,
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'tax_query' => array(
					array(
						'taxonomy'         => 'product_cat',
						'terms'            => array( $electronics_cat_id ),
						'include_children' => false,
					),
				),
			)
		);

		$query             = new WP_Query( $merged_query );
		$found_product_ids = wp_list_pluck( $query->posts, 'ID' );

		// Should return laptop and phone (both in Electronics category).
		$this->assertContains( $laptop->get_id(), $found_product_ids );
		$this->assertContains( $phone->get_id(), $found_product_ids );
		$this->assertNotContains( $tshirt->get_id(), $found_product_ids );
		$this->assertNotContains( $unassigned_product->get_id(), $found_product_ids );

		// Test filtering by Electronics category - Editor.
		$args    = array(
			'posts_per_page' => 10,
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'tax_query'      => array(
				array(
					'taxonomy'         => 'product_cat',
					'terms'            => array( $electronics_cat_id ),
					'include_children' => false,
				),
			),
		);
		$request = $this->build_request();

		$updated_query    = $this->block_instance->update_rest_query_in_editor( $args, $request );
		$editor_query     = new WP_Query( $updated_query );
		$editor_found_ids = wp_list_pluck( $editor_query->posts, 'ID' );

		// Should return laptop and phone in editor as well.
		$this->assertContains( $laptop->get_id(), $editor_found_ids );
		$this->assertContains( $phone->get_id(), $editor_found_ids );
		$this->assertNotContains( $tshirt->get_id(), $editor_found_ids );
		$this->assertNotContains( $unassigned_product->get_id(), $editor_found_ids );

		// Test filtering by Clothing category.
		$merged_query_clothing = $this->initialize_merged_query(
			null,
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'tax_query' => array(
					array(
						'taxonomy'         => 'product_cat',
						'terms'            => array( $clothing_cat_id ),
						'include_children' => false,
					),
				),
			)
		);

		$query_clothing     = new WP_Query( $merged_query_clothing );
		$found_clothing_ids = wp_list_pluck( $query_clothing->posts, 'ID' );

		// Should return only t-shirt.
		$this->assertNotContains( $laptop->get_id(), $found_clothing_ids );
		$this->assertNotContains( $phone->get_id(), $found_clothing_ids );
		$this->assertContains( $tshirt->get_id(), $found_clothing_ids );
		$this->assertNotContains( $unassigned_product->get_id(), $found_clothing_ids );

		// Test filtering by Clothing category - Editor.
		$args_clothing    = array(
			'posts_per_page' => 10,
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'tax_query'      => array(
				array(
					'taxonomy'         => 'product_cat',
					'terms'            => array( $clothing_cat_id ),
					'include_children' => false,
				),
			),
		);
		$request_clothing = $this->build_request();

		$updated_query_clothing = $this->block_instance->update_rest_query_in_editor( $args_clothing, $request_clothing );
		$editor_query_clothing  = new WP_Query( $updated_query_clothing );
		$editor_clothing_ids    = wp_list_pluck( $editor_query_clothing->posts, 'ID' );

		// Should return only t-shirt in editor as well.
		$this->assertNotContains( $laptop->get_id(), $editor_clothing_ids );
		$this->assertNotContains( $phone->get_id(), $editor_clothing_ids );
		$this->assertContains( $tshirt->get_id(), $editor_clothing_ids );
		$this->assertNotContains( $unassigned_product->get_id(), $editor_clothing_ids );

		$laptop->delete();
		$phone->delete();
		$tshirt->delete();
		$unassigned_product->delete();
		wp_delete_term( $electronics_cat_id, 'product_cat' );
		wp_delete_term( $clothing_cat_id, 'product_cat' );
	}

	/**
	 * Tests that the by-tag collection handler works as expected.
	 */
	public function test_collection_by_tag() {
		// Create test tags.
		$featured_tag    = wp_create_term( 'Featured', 'product_tag' );
		$featured_tag_id = $featured_tag['term_id'];

		$sale_tag    = wp_create_term( 'Sale', 'product_tag' );
		$sale_tag_id = $sale_tag['term_id'];

		// Create test products.
		$featured_product = WC_Helper_Product::create_simple_product();
		$featured_product->set_name( 'Featured Product' );
		$featured_product->save();

		$sale_product = WC_Helper_Product::create_simple_product();
		$sale_product->set_name( 'Sale Product' );
		$sale_product->save();

		$regular_product = WC_Helper_Product::create_simple_product();
		$regular_product->set_name( 'Regular Product' );
		$regular_product->save();

		// Assign products to tags.
		wp_set_object_terms( $featured_product->get_id(), $featured_tag_id, 'product_tag' );
		wp_set_object_terms( $sale_product->get_id(), $sale_tag_id, 'product_tag' );
		// regular_product has no tags.

		// Test filtering by Featured tag - Frontend.
		$merged_query = $this->initialize_merged_query(
			null,
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'tax_query' => array(
					array(
						'taxonomy'         => 'product_tag',
						'terms'            => array( $featured_tag_id ),
						'include_children' => false,
					),
				),
			)
		);

		$query             = new WP_Query( $merged_query );
		$found_product_ids = wp_list_pluck( $query->posts, 'ID' );

		// Should return only featured product.
		$this->assertContains( $featured_product->get_id(), $found_product_ids );
		$this->assertNotContains( $sale_product->get_id(), $found_product_ids );
		$this->assertNotContains( $regular_product->get_id(), $found_product_ids );

		// Test filtering by Featured tag - Editor.
		$args    = array(
			'posts_per_page' => 10,
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'tax_query'      => array(
				array(
					'taxonomy'         => 'product_tag',
					'terms'            => array( $featured_tag_id ),
					'include_children' => false,
				),
			),
		);
		$request = $this->build_request();

		$updated_query    = $this->block_instance->update_rest_query_in_editor( $args, $request );
		$editor_query     = new WP_Query( $updated_query );
		$editor_found_ids = wp_list_pluck( $editor_query->posts, 'ID' );

		// Should return only featured product in editor as well.
		$this->assertContains( $featured_product->get_id(), $editor_found_ids );
		$this->assertNotContains( $sale_product->get_id(), $editor_found_ids );
		$this->assertNotContains( $regular_product->get_id(), $editor_found_ids );

		// Test filtering by Sale tag - Frontend.
		$merged_query_sale = $this->initialize_merged_query(
			null,
			array(
				// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
				'tax_query' => array(
					array(
						'taxonomy'         => 'product_tag',
						'terms'            => array( $sale_tag_id ),
						'include_children' => false,
					),
				),
			)
		);

		$query_sale     = new WP_Query( $merged_query_sale );
		$found_sale_ids = wp_list_pluck( $query_sale->posts, 'ID' );

		// Should return only sale product.
		$this->assertNotContains( $featured_product->get_id(), $found_sale_ids );
		$this->assertContains( $sale_product->get_id(), $found_sale_ids );
		$this->assertNotContains( $regular_product->get_id(), $found_sale_ids );

		// Test filtering by Sale tag - Editor.
		$args_sale    = array(
			'posts_per_page' => 10,
			// phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
			'tax_query'      => array(
				array(
					'taxonomy'         => 'product_tag',
					'terms'            => array( $sale_tag_id ),
					'include_children' => false,
				),
			),
		);
		$request_sale = $this->build_request();

		$updated_query_sale = $this->block_instance->update_rest_query_in_editor( $args_sale, $request_sale );
		$editor_query_sale  = new WP_Query( $updated_query_sale );
		$editor_sale_ids    = wp_list_pluck( $editor_query_sale->posts, 'ID' );

		// Should return only sale product in editor as well.
		$this->assertNotContains( $featured_product->get_id(), $editor_sale_ids );
		$this->assertContains( $sale_product->get_id(), $editor_sale_ids );
		$this->assertNotContains( $regular_product->get_id(), $editor_sale_ids );

		$featured_product->delete();
		$sale_product->delete();
		$regular_product->delete();
		wp_delete_term( $featured_tag_id, 'product_tag' );
		wp_delete_term( $sale_tag_id, 'product_tag' );
	}
}
