/**
 * External dependencies
 */
import { useSelect, useDispatch, select, dispatch } from '@wordpress/data';
import {
	StrictMode,
	createRoot,
	useEffect,
	useLayoutEffect,
	useState,
} from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { store as editorStore } from '@wordpress/editor';
import { useMergeRefs } from '@wordpress/compose';
import '@wordpress/format-library'; // Enables text formatting capabilities

/**
 * Internal dependencies
 */
import { getAllowedBlockNames, initBlocks } from './blocks';
import { initializeLayout } from './layouts/flex-email';
import { InnerEditor } from './components/block-editor';
import { createStore, storeName } from './store';
import { initHooks } from './editor-hooks';
import { initTextHooks } from './text-hooks';
import {
	initEventCollector,
	initStoreTracking,
	initDomTracking,
} from './events';
import { initContentValidationMiddleware } from './middleware/content-validation';
import {
	useContentValidation,
	useRemoveSavingFailedNotices,
	useFilterEditorContentStylesheets,
} from './hooks';
import { cleanupConfigurationChanges } from './config-tools';

function Editor( {
	postId,
	postType,
	isPreview = false,
	contentRef = null,
}: {
	postId: number | string;
	postType: string;
	isPreview?: boolean;
	contentRef?: React.Ref< HTMLDivElement > | null;
} ) {
	const [ isInitialized, setIsInitialized ] = useState( false );
	const { settings } = useSelect(
		( sel ) => ( {
			settings: sel( storeName ).getInitialEditorSettings(),
		} ),
		[]
	);

	useContentValidation();
	useRemoveSavingFailedNotices();

	const { setEmailPost } = useDispatch( storeName );
	useEffect( () => {
		setEmailPost( postId, postType );
		setIsInitialized( true );
	}, [ postId, postType, setEmailPost ] );

	const stylesContentRef = useFilterEditorContentStylesheets();
	const mergedContentRef = useMergeRefs( [ stylesContentRef, contentRef ] );

	if ( ! isInitialized ) {
		return null;
	}

	// Set allowed blockTypes and isPreviewMode to the editor settings.
	const editorSettings = {
		...settings,
		allowedBlockTypes: getAllowedBlockNames(),
		isPreviewMode: isPreview,
	};

	return (
		<StrictMode>
			<InnerEditor
				postId={ postId }
				postType={ postType }
				settings={ editorSettings }
				contentRef={ mergedContentRef }
			/>
		</StrictMode>
	);
}

function onInit() {
	initEventCollector();
	initStoreTracking();
	initDomTracking();
	createStore();
	initContentValidationMiddleware();
	initializeLayout();
	initBlocks();
	initHooks();
	initTextHooks();
}

export function initialize( elementId: string ) {
	const container = document.getElementById( elementId );
	if ( ! container ) {
		return;
	}
	const { current_post_id, current_post_type } =
		window.WooCommerceEmailEditor;

	if ( current_post_id === undefined || current_post_id === null ) {
		throw new Error( 'current_post_id is required but not provided.' );
	}

	if ( ! current_post_type ) {
		throw new Error( 'current_post_type is required but not provided.' );
	}

	const WrappedEditor = applyFilters(
		'woocommerce_email_editor_wrap_editor_component',
		Editor
	) as typeof Editor;
	onInit();
	const root = createRoot( container );
	root.render(
		<WrappedEditor
			postId={ current_post_id }
			postType={ current_post_type }
		/>
	);
}

export function ExperimentalEmailEditor( {
	postId,
	postType,
	isPreview = false,
	contentRef = null,
}: {
	postId: string;
	postType: string;
	isPreview?: boolean;
	contentRef?: React.Ref< HTMLDivElement > | null;
} ) {
	const [ isInitialized, setIsInitialized ] = useState( false );

	useLayoutEffect( () => {
		const backupEditorSettings = select( editorStore ).getEditorSettings();
		onInit();
		setIsInitialized( true );
		// Cleanup global editor settings
		return () => {
			try {
				cleanupConfigurationChanges();
			} finally {
				dispatch( editorStore ).updateEditorSettings(
					backupEditorSettings
				);
			}
		};
	}, [] );

	const WrappedEditor = applyFilters(
		'woocommerce_email_editor_wrap_editor_component',
		Editor
	) as typeof Editor;

	if ( ! isInitialized ) {
		return null;
	}

	return (
		<WrappedEditor
			postId={ postId }
			postType={ postType }
			isPreview={ isPreview }
			contentRef={ contentRef }
		/>
	);
}
