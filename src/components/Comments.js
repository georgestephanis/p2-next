/**
 * Comments — threaded comment list for a single post.
 */
import { useState, useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comment from './Comment';
import {
	getCommentEditorFormat,
	renderCommentEditor,
} from './comment-editor-registry';

function isMarkdownEmpty( markdown = '' ) {
	return ! markdown || ! markdown.trim();
}

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

function CommentTree( { comments, postId, depth = 0, canCreateComments } ) {
	return (
		<>
			{ comments.map( ( comment ) => (
				<div
					key={ comment.id }
					className={ `p2026-comment-thread depth-${ depth }` }
				>
					<Comment
						comment={ comment }
						postId={ postId }
						canCreateComments={ canCreateComments }
					/>
					{ comment.children.length > 0 && (
						<div className="p2026-comment-children">
							<CommentTree
								comments={ comment.children }
								postId={ postId }
								depth={ depth + 1 }
								canCreateComments={ canCreateComments }
							/>
						</div>
					) }
				</div>
			) ) }
		</>
	);
}

export default function Comments( { postId, canCreateComments = true } ) {
	const { createComment } = useDispatch( STORE_NAME );
	const comments = useSelect( ( select ) =>
		select( STORE_NAME ).getComments( postId )
	);
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingComment()
	);

	const [ content, setContent ] = useState( '' );
	const [ guestName, setGuestName ] = useState( '' );
	const [ guestEmail, setGuestEmail ] = useState( '' );
	const [ guestUrl, setGuestUrl ] = useState( '' );

	const currentUser = window.p2026Config?.currentUser;
	const canComment =
		( window.p2026Config?.canComment ?? !! currentUser ) &&
		canCreateComments;
	const editorContext = {
		scope: 'new-comment',
		postId,
	};
	const commentFormat = getCommentEditorFormat( editorContext );
	const requireNameEmail =
		! currentUser && !! window.p2026Config?.requireNameEmail;
	const missingGuestIdentity =
		requireNameEmail && ( ! guestName.trim() || ! guestEmail.trim() );

	const onCommentSubmit = useCallback( async () => {
		if (
			! canComment ||
			isMarkdownEmpty( content ) ||
			missingGuestIdentity
		) {
			return;
		}

		const authorData = ! currentUser
			? {
					author_name: guestName.trim(),
					author_email: guestEmail.trim(),
					author_url: guestUrl.trim(),
			  }
			: {};

		await createComment( {
			postId,
			content,
			format: commentFormat,
			authorData,
		} );

		setContent( '' );
		if ( ! currentUser ) {
			setGuestName( '' );
			setGuestEmail( '' );
			setGuestUrl( '' );
		}
	}, [
		canComment,
		content,
		missingGuestIdentity,
		currentUser,
		guestName,
		guestEmail,
		guestUrl,
		createComment,
		postId,
		commentFormat,
	] );

	const tree = buildTree( comments );

	return (
		<section
			className="p2026-comments"
			aria-label={ __( 'Comments', 'p2026' ) }
		>
			{ canComment && (
				<div className="p2026-new-comment-form p2026-reply-form">
					{ ! currentUser && (
						<>
							<TextControl
								label={ __( 'Name', 'p2026' ) }
								value={ guestName }
								onChange={ setGuestName }
								required={ requireNameEmail }
							/>
							<TextControl
								label={ __( 'Email', 'p2026' ) }
								type="email"
								value={ guestEmail }
								onChange={ setGuestEmail }
								required={ requireNameEmail }
							/>
							<TextControl
								label={ __( 'Website (optional)', 'p2026' ) }
								type="url"
								value={ guestUrl }
								onChange={ setGuestUrl }
							/>
						</>
					) }
					{ renderCommentEditor(
						{
							label: __( 'Comment', 'p2026' ),
							hideLabelFromVision: true,
							placeholder: __( 'Write a comment…', 'p2026' ),
							value: content,
							onChange: setContent,
							rows: 4,
						},
						editorContext
					) }
					<div className="p2026-reply-actions">
						<Button
							variant="primary"
							onClick={ onCommentSubmit }
							disabled={
								isSaving ||
								isMarkdownEmpty( content ) ||
								missingGuestIdentity
							}
							isBusy={ isSaving }
						>
							{ isSaving
								? __( 'Posting…', 'p2026' )
								: __( 'Post comment', 'p2026' ) }
						</Button>
					</div>
				</div>
			) }

			{ tree.length === 0 && (
				<p className="p2026-no-comments">
					{ __( 'No comments yet.', 'p2026' ) }
				</p>
			) }
			<CommentTree
				comments={ tree }
				postId={ postId }
				canCreateComments={ canCreateComments }
			/>
		</section>
	);
}
