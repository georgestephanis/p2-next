/**
 * Comments — threaded comment list for a single post.
 */
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comment from './Comment';

/**
 * Nest flat comment array into a tree by parent ID.
 *
 * @param {Array}  comments Flat array of comment objects.
 * @param {number} parentId ID of the parent (0 for root).
 * @return {Array} Comments with a `children` property.
 */
function buildTree( comments, parentId = 0 ) {
	return comments
		.filter( ( c ) => c.parent === parentId )
		.map( ( c ) => ( { ...c, children: buildTree( comments, c.id ) } ) );
}

function CommentTree( { comments, postId, depth = 0 } ) {
	return (
		<>
			{ comments.map( ( comment ) => (
				<div
					key={ comment.id }
					className={ `p2-next-comment-thread depth-${ depth }` }
				>
					<Comment comment={ comment } postId={ postId } />
					{ comment.children.length > 0 && (
						<div className="p2-next-comment-children">
							<CommentTree
								comments={ comment.children }
								postId={ postId }
								depth={ depth + 1 }
							/>
						</div>
					) }
				</div>
			) ) }
		</>
	);
}

export default function Comments( { postId } ) {
	const comments = useSelect( ( select ) =>
		select( STORE_NAME ).getComments( postId )
	);

	const tree = buildTree( comments );

	return (
		<section
			className="p2-next-comments"
			aria-label={ __( 'Comments', 'p2-next' ) }
		>
			{ tree.length === 0 && (
				<p className="p2-next-no-comments">
					{ __( 'No comments yet.', 'p2-next' ) }
				</p>
			) }
			<CommentTree comments={ tree } postId={ postId } />
		</section>
	);
}
