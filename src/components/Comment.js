/**
 * Comment — single comment with inline reply form.
 */
import { useState, useCallback, useEffect } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import {
	getCommentEditorFormat,
	renderCommentEditor,
} from './comment-editor-registry';

function isMarkdownEmpty( markdown = '' ) {
	return ! markdown || ! markdown.trim();
}

function renderedHtmlToText( html = '' ) {
	if ( ! html ) {
		return '';
	}

	const container = document.createElement( 'div' );
	container.innerHTML = html;
	return ( container.textContent || '' ).trim();
}

function getEditableContent( comment ) {
	if ( typeof comment?.p2026EditableContent === 'string' ) {
		return comment.p2026EditableContent;
	}

	return renderedHtmlToText( comment?.content?.rendered ?? '' );
}

export default function Comment( {
	comment,
	postId,
	canCreateComments = true,
} ) {
	const [ replying, setReplying ] = useState( false );
	const [ replyContent, setReplyContent ] = useState( '' );
	const [ editing, setEditing ] = useState( false );
	const [ editContent, setEditContent ] = useState( () =>
		getEditableContent( comment )
	);
	const [ guestName, setGuestName ] = useState( '' );
	const [ guestEmail, setGuestEmail ] = useState( '' );
	const [ guestUrl, setGuestUrl ] = useState( '' );

	const { createComment, updateComment } = useDispatch( STORE_NAME );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingComment()
	);

	const currentUser = window.p2026Config?.currentUser;
	const canComment =
		( window.p2026Config?.canComment ?? !! currentUser ) &&
		canCreateComments;
	const requireNameEmail =
		! currentUser && !! window.p2026Config?.requireNameEmail;
	const missingGuestIdentity =
		requireNameEmail && ( ! guestName.trim() || ! guestEmail.trim() );
	const canEditComment = !! comment.p2026CanEdit;
	const replyEditorContext = {
		scope: 'reply',
		postId,
		commentId: comment.id,
	};
	const editEditorContext = {
		scope: 'edit-comment',
		postId,
		commentId: comment.id,
	};
	const replyFormat = getCommentEditorFormat( replyEditorContext );
	const editFormat = getCommentEditorFormat( editEditorContext );

	useEffect( () => {
		if ( ! editing ) {
			setEditContent( getEditableContent( comment ) );
		}
	}, [
		editing,
		comment.id,
		comment.p2026EditableContent,
		comment.content?.rendered,
	] );

	const onReplySubmit = useCallback( async () => {
		if ( ! replyContent.trim() || missingGuestIdentity ) {
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
			parentId: comment.id,
			content: replyContent,
			format: replyFormat,
			authorData,
		} );
		setReplyContent( '' );
		if ( ! currentUser ) {
			setGuestName( '' );
			setGuestEmail( '' );
			setGuestUrl( '' );
		}
		setReplying( false );
	}, [
		postId,
		comment.id,
		replyContent,
		missingGuestIdentity,
		currentUser,
		guestName,
		guestEmail,
		guestUrl,
		createComment,
		replyFormat,
	] );

	const avatarUrl =
		comment.author_avatar_urls?.[ '48' ] ??
		comment.author_avatar_urls?.[ 48 ];

	const onEditSubmit = useCallback( async () => {
		if ( ! canEditComment || isMarkdownEmpty( editContent ) ) {
			return;
		}

		await updateComment( {
			postId,
			commentId: comment.id,
			content: editContent,
			format: editFormat,
		} );

		setEditing( false );
	}, [
		canEditComment,
		editContent,
		updateComment,
		postId,
		comment.id,
		editFormat,
	] );

	return (
		<div className="p2026-comment" id={ `comment-${ comment.id }` }>
			<header className="p2026-comment-header">
				{ avatarUrl && (
					<img
						className="p2026-avatar"
						src={ avatarUrl }
						alt={ comment.author_name }
						width={ 32 }
						height={ 32 }
					/>
				) }
				<div className="p2026-comment-meta">
					<span className="p2026-author">
						{ comment.author_name }
					</span>
					<time
						className="p2026-date"
						dateTime={ comment.date_gmt }
						title={ comment.date_gmt }
					>
						{ new Date( comment.date_gmt + 'Z' ).toLocaleString() }
					</time>
				</div>
			</header>

			{ ! editing && (
				<div
					className="p2026-comment-content"
					dangerouslySetInnerHTML={ {
						__html: comment.content?.rendered ?? '',
					} }
				/>
			) }

			{ editing && (
				<div className="p2026-reply-form p2026-comment-edit-form">
					{ renderCommentEditor(
						{
							label: __( 'Edit comment', 'p2026' ),
							hideLabelFromVision: true,
							placeholder: __( 'Edit your comment…', 'p2026' ),
							value: editContent,
							onChange: setEditContent,
							rows: 4,
						},
						editEditorContext
					) }
					<div className="p2026-reply-actions">
						<Button
							variant="primary"
							onClick={ onEditSubmit }
							disabled={
								isSaving || isMarkdownEmpty( editContent )
							}
							isBusy={ isSaving }
						>
							{ isSaving
								? __( 'Saving…', 'p2026' )
								: __( 'Save', 'p2026' ) }
						</Button>
						<Button
							variant="tertiary"
							onClick={ () => {
								setEditing( false );
								setEditContent( getEditableContent( comment ) );
							} }
							disabled={ isSaving }
						>
							{ __( 'Cancel', 'p2026' ) }
						</Button>
					</div>
				</div>
			) }

			{ ( canComment || canEditComment ) && (
				<footer className="p2026-comment-footer">
					{ canComment && ! replying && ! editing && (
						<Button
							variant="link"
							onClick={ () => setReplying( true ) }
						>
							{ __( 'Reply', 'p2026' ) }
						</Button>
					) }

					{ canComment &&
						canEditComment &&
						! replying &&
						! editing && (
							<span
								className="p2026-comment-action-sep"
								aria-hidden="true"
							>
								{ '·' }
							</span>
						) }

					{ canEditComment && ! editing && ! replying && (
						<Button
							variant="link"
							onClick={ () => setEditing( true ) }
						>
							{ __( 'Edit', 'p2026' ) }
						</Button>
					) }

					{ canComment && replying && ! editing && (
						<div className="p2026-reply-form">
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
										label={ __(
											'Website (optional)',
											'p2026'
										) }
										type="url"
										value={ guestUrl }
										onChange={ setGuestUrl }
									/>
								</>
							) }
							{ renderCommentEditor(
								{
									label: __( 'Reply', 'p2026' ),
									hideLabelFromVision: true,
									placeholder: __(
										'Write a reply…',
										'p2026'
									),
									value: replyContent,
									onChange: setReplyContent,
									rows: 3,
								},
								replyEditorContext
							) }
							<div className="p2026-reply-actions">
								<Button
									variant="primary"
									onClick={ onReplySubmit }
									disabled={
										isSaving ||
										! replyContent.trim() ||
										missingGuestIdentity
									}
									isBusy={ isSaving }
								>
									{ isSaving
										? __( 'Posting…', 'p2026' )
										: __( 'Post reply', 'p2026' ) }
								</Button>
								<Button
									variant="tertiary"
									onClick={ () => {
										setReplying( false );
										setReplyContent( '' );
									} }
									disabled={ isSaving }
								>
									{ __( 'Cancel', 'p2026' ) }
								</Button>
							</div>
						</div>
					) }
				</footer>
			) }
		</div>
	);
}
