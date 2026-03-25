/**
 * Comment — single comment with inline reply form.
 */
import { useState, useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button, TextareaControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

export default function Comment( { comment, postId } ) {
	const [ replying, setReplying ] = useState( false );
	const [ replyContent, setReplyContent ] = useState( '' );

	const { createComment } = useDispatch( STORE_NAME );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingComment()
	);

	const currentUser = window.p2NextConfig?.currentUser;
	const canComment = !! currentUser;

	const onReplySubmit = useCallback( async () => {
		if ( ! replyContent.trim() ) {
			return;
		}
		await createComment( {
			postId,
			parentId: comment.id,
			content: replyContent,
		} );
		setReplyContent( '' );
		setReplying( false );
	}, [ postId, comment.id, replyContent, createComment ] );

	const avatarUrl =
		comment.author_avatar_urls?.[ '48' ] ??
		comment.author_avatar_urls?.[ 48 ];

	return (
		<div className="p2-next-comment" id={ `comment-${ comment.id }` }>
			<header className="p2-next-comment-header">
				{ avatarUrl && (
					<img
						className="p2-next-avatar"
						src={ avatarUrl }
						alt={ comment.author_name }
						width={ 32 }
						height={ 32 }
					/>
				) }
				<div className="p2-next-comment-meta">
					<span className="p2-next-author">
						{ comment.author_name }
					</span>
					<time
						className="p2-next-date"
						dateTime={ comment.date_gmt }
						title={ comment.date_gmt }
					>
						{ new Date( comment.date_gmt + 'Z' ).toLocaleString() }
					</time>
				</div>
			</header>

			<div
				className="p2-next-comment-content"
				dangerouslySetInnerHTML={ {
					__html: comment.content?.rendered ?? '',
				} }
			/>

			{ canComment && (
				<footer className="p2-next-comment-footer">
					{ ! replying && (
						<Button
							variant="link"
							onClick={ () => setReplying( true ) }
						>
							{ __( 'Reply', 'p2-next' ) }
						</Button>
					) }

					{ replying && (
						<div className="p2-next-reply-form">
							<TextareaControl
								label={ __( 'Your reply', 'p2-next' ) }
								hideLabelFromVision
								placeholder={ __(
									'Write a reply…',
									'p2-next'
								) }
								value={ replyContent }
								onChange={ setReplyContent }
								rows={ 3 }
							/>
							<div className="p2-next-reply-actions">
								<Button
									variant="primary"
									onClick={ onReplySubmit }
									disabled={
										isSaving || ! replyContent.trim()
									}
									isBusy={ isSaving }
								>
									{ isSaving
										? __( 'Posting…', 'p2-next' )
										: __( 'Post reply', 'p2-next' ) }
								</Button>
								<Button
									variant="tertiary"
									onClick={ () => {
										setReplying( false );
										setReplyContent( '' );
									} }
									disabled={ isSaving }
								>
									{ __( 'Cancel', 'p2-next' ) }
								</Button>
							</div>
						</div>
					) }
				</footer>
			) }
		</div>
	);
}
