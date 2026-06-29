/**
 * Data contracts for UI navigation state.
 */

/** Which slide-up panel (if any) is currently open. */
export type Panel = 'none' | 'library' | 'camera' | 'preview'

/** Active tab inside the Library sheet. */
export type LibraryTab = 'environment' | 'terrain' | 'objects'
