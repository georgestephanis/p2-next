import {
	PostFooterMetaFill,
	CommentFooterMetaFill,
} from '../../slots/reactions';
import PostReactionsWrapper from './PostReactionsWrapper';
import CommentReactionsWrapper from './CommentReactionsWrapper';

export default function ReactionSlotFills() {
	const activeModules = window.p2026Config?.activeModules;
	const isActive =
		! Array.isArray( activeModules ) ||
		activeModules.includes( 'reactions' );

	if ( ! isActive ) {
		return null;
	}

	return (
		<>
			<PostFooterMetaFill>
				{ ( { postId } ) =>
					postId ? <PostReactionsWrapper postId={ postId } /> : null
				}
			</PostFooterMetaFill>
			<CommentFooterMetaFill>
				{ ( { commentId } ) =>
					commentId ? (
						<CommentReactionsWrapper commentId={ commentId } />
					) : null
				}
			</CommentFooterMetaFill>
		</>
	);
}
