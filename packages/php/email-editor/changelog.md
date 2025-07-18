# Changelog 

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/woocommerce/email-editor/releases/tag/1.1.0) - 2025-07-16 

-   Minor - Add Table_Wrapper_Helper utility class. [#59264]
-   Minor - Preserve personalization tags in email text version
-   Patch - Mark the emogrifier package a production dependency
-   Patch - Add documentation for Personalization Tags [#59226]

## [1.0.0](https://github.com/woocommerce/email-editor/releases/tag/1.0.0) - 2025-06-27 

-   Patch - Address PHP 8.4 deprecation warnings. [#57722]
-   Patch - Fix default rendering mode for WordPress 6.8 [#56820]
-   Patch - Fixed parsing empty argument values in personalization tags. [#58500]
-   Patch - Fix tiny rendering issues with image borders, list padding when the background color is set, and top margin for cite in the quote block. [#58796]
-   Patch - Sending correct email when user create an account after placing an order. [#57689]
-   Patch - Refactor Email Editor Container to use email editor container instead of Blocks registry container for better library export compatibility. [#59209]
-   Patch - Add command for PHP static analysis. [#58135]
-   Patch - Add email editor files to the Woo Monorepo [#55598]
-   Patch - Introduce a new Rendering_Context class that replaces Settings_Controller in renderer classes [#58796]
-   Patch - Monorepo: consolidate packages licenses to `GPL-2.0-or-later`. [#58941]
-   Patch - Remove unused Codeception config file for the email-editor package [#55971]
-   Patch - Remove usage of `settings.allowedBlockTypes` from the email editor configuration. [#58966]
-   Patch - Update package.json commands [#56161]
-   Patch - Add possibility to get current context to for personalization [#57330]
-   Patch - Fixed social links block styling by adding explicit margin-right:0 to prevent unwanted spacing on social icon images [#59188]
-   Patch - Add theme color pallete to base theme and remove the default heading color and use text color as fallback [#58078]
-   Patch - Ensure "Preview in new tab" shows the lastest editor saved content. [#58481]
-   Patch - Use email templates registry when listing allowed templates for association with an email post [#56110]
-   Minor - Add autosave timeout and disable code editor in editor settings [#57775]
-   Minor - Add email block renderer for the Quote core block. [#57280]
-   Minor - Add support for rendering Social Link and Social Links block in the Email Editor. [#58194]
-   Minor - Add Woo email content to the preview in the email editor [#57337]
-   Minor - Add `woocommerce_email_editor_send_preview_email_personalizer_context` filter to modify the personalizer context data for the send preview email function [#57795]
-   Minor - Handle Personalization Tags in href attributes [#57958]
-   Minor - Implement logging support in the email editor [#58607]
-   Minor - Add support for a block custom callback render_email_callback and remove Blocks_Registry class. [#59070]
-   Minor - Update package for publishing to Packagist [#59058]
-   Updated post type for theme from `mailpoet_email_theme` to `woocommerce_email_theme` for consistency with WooCommerce naming conventions. [#55938]
-   Updated user theme post name from `wp-global-styles-mailpoet` to `wp-global-styles-woocommerce-email` to align with WooCommerce naming standards. [#55938]
-   Update minimum supported WordPress version to 6.7 [#58246]
