import { createSlotFill } from '@wordpress/components';

const {
	Slot: PostFooterMetaSlot,
	Fill: PostFooterMetaFill,
} = createSlotFill( 'P2026PostFooterMeta' );

const {
	Slot: CommentFooterMetaSlot,
	Fill: CommentFooterMetaFill,
} = createSlotFill( 'P2026CommentFooterMeta' );

export {
	PostFooterMetaSlot,
	PostFooterMetaFill,
	CommentFooterMetaSlot,
	CommentFooterMetaFill,
};
