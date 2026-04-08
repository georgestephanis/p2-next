/**
 * P2026 Reactions Module
 *
 * Frontend reactions UI, REST API integration, and state management.
 */

export { useReactions } from './hooks';
export { default as ReactionUI } from './ReactionUI';
export { default as ReactionButton } from './ReactionButton';
export { default as ReactionPicker } from './ReactionPicker';
export { default as ParticipantList } from './ParticipantList';
export { default as PostReactionsWrapper } from './PostReactionsWrapper';
export { default as CommentReactionsWrapper } from './CommentReactionsWrapper';

import './_reaction-ui.scss';
import './_reaction-picker.scss';
import './_participant-list.scss';

/**
 * Initialize reactions module.
 *
 * Reactions are rendered via SlotFill (PostEnhancement) and Comment component
 * directly, so no additional DOM scanning is needed here.
 */
export const initReactionsModule = () => {};
