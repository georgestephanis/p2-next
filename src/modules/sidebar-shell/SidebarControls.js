import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import SearchWidget from '../../components/SearchWidget';
import { STORE_NAME } from '../../store';

export default function SidebarControls() {
	const isLoggedIn = !! window.p2026Config?.currentUser;
	const activeModules = window.p2026Config?.activeModules;
	const isPostStateActive =
		! Array.isArray( activeModules ) ||
		activeModules.includes( 'post-state' );

	const { setPostStateFilter } = useDispatch( STORE_NAME );
	const postStateFilter = useSelect( ( select ) =>
		select( STORE_NAME ).getPostStateFilter()
	);
	const unresolvedCount = useSelect(
		( select ) =>
			select( STORE_NAME )
				.getPosts()
				.filter( ( post ) => post?.p2026State?.slug === 'unresolved' )
				.length
	);

	if ( ! isLoggedIn ) {
		return null;
	}

	return (
		<div className="p2026-sidebar-shell__tool-panel">
			<h3 className="p2026-sidebar-shell__title">
				{ __( 'Feed Tools', 'p2026' ) }
			</h3>
			{ isPostStateActive && (
				<div className="p2026-feed-filter" role="group">
					<Button
						variant={
							postStateFilter === 'all' ? 'secondary' : 'tertiary'
						}
						onClick={ () => setPostStateFilter( 'all' ) }
					>
						{ __( 'All posts', 'p2026' ) }
					</Button>
					<Button
						variant={
							postStateFilter === 'unresolved'
								? 'secondary'
								: 'tertiary'
						}
						onClick={ () => setPostStateFilter( 'unresolved' ) }
						disabled={ unresolvedCount === 0 }
					>
						{ __( 'Open only', 'p2026' ) }
					</Button>
				</div>
			) }
			<SearchWidget />
		</div>
	);
}
