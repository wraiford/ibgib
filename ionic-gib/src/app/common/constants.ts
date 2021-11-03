import { FilesystemDirectory, FilesystemEncoding } from '@capacitor/core';
import { GIB } from 'ts-gib/dist/V1';
import { Ib } from 'ts-gib';

export const IBGIB_BASE_DIR = FilesystemDirectory.Data;
export const IBGIB_FILES_ENCODING = FilesystemEncoding.UTF8;

export const IBGIB_BASE_SUBPATH = 'ibgib';
export const IBGIB_IBGIBS_SUBPATH = 'ibgibs';

/**
 * contains special ibgibs
 *
 * Use case:
 *   Because some special ibgibs will be changed frequently,
 *   e.g. settings, a separate folder will be useful.
 */
export const IBGIB_META_SUBPATH = 'meta';
/**
 * Path for storing binaries (e.g. pics).
 *
 * bins will be stored in the format:
 *   [hash].ext
 *
 * @example
 *   ABC123.jpg
 */
export const IBGIB_BIN_SUBPATH = 'bin';
export const IBGIB_DNA_SUBPATH = 'dna';

// export const TAGS_IB = 'tags';
// export const TAGS_IBGIB_ADDR = `${TAGS_IB}^${GIB}`;
// export const TAGS_IBGIB_ADDR_KEY = `key ${TAGS_IBGIB_ADDR}`;

/**
 * The main tags^gib ibgib uses this rel8n name to keep track of tags.
 */
export const TAG_REL8N_NAME = 'tag';
/**
 * The main roots^gib ibgib uses this rel8n name to keep track of roots.
 */
export const ROOT_REL8N_NAME = 'root';
/**
 * A tag ibGib uses this rel8n name for the ibgibs that it targets.
 */
export const TAGGED_REL8N_NAME = 'tagged';

/**
 * These rel8n names are shown in a list view by default.
 */
export const DEFAULT_LIST_REL8N_NAMES: string[] = [
    'pic', 'comment', 'link', 'tag', 'result'
]

export const DEFAULT_META_IB_STARTS: Ib[] = [
    'tags', 'tag ', 'settings', 'setting ',
]

export const SPECIAL_URLS = [
    'tags', 'home'
];

export const ILLEGAL_TAG_TEXT_CHARS = [
    '^', '?', '/', '\\', `|`,
];

/**
 * When showing a menu item, this is the max length
 */
export const MENU_ITEM_IB_SUBSTRING_LENGTH = 15;

/**
 * Default icon when creating a tag.
 */
export const DEFAULT_TAG_ICON = 'pricetag-outline';
/**
 * Default description when creating a tag.
 */
export const DEFAULT_TAG_DESCRIPTION = 'This is a tag used for organizing data.';

/**
 * 
 */
export const DEFAULT_ROOT_TEXT = 'root';
/**
 * Default icon specifically for roots.
 */
export const DEFAULT_ROOT_ICON = 'analytics-outline';
/**
 * Default description specifically for roots.
 */
export const DEFAULT_ROOT_DESCRIPTION = 'This is a root ibgib, which is basically like a root folder that is primarily responsible for "containing" other ibgibs.';