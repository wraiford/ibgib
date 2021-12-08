import { FilesystemDirectory, FilesystemEncoding } from '@capacitor/core';
import { GIB } from 'ts-gib/dist/V1';
import { Ib } from 'ts-gib';

/**
 * When the application first starts, it looks to bootstrap itself.
 * So it will look for a file with this primitive address.
 *
 * This file should contain the absolute minimum information required
 * to resolve to an ibgib proper with a valid ^gib hash.
 * Atow I can't think of any further information required
 * than simply the ib^gib address of that ibgib, accompanied with
 * any required pathing metadata to find it.
 *
 * ## notes
 *
 * Usually primitives are not stored/persisted. This is because the
 * `gib` indicates that there is no hash corroboration ("guarantee")
 * to the internal data or rel8ns. However, a newly started app
 * has to start somewhere. This offers an alternative to using
 * app storage and streamlines the app overall, since instead of
 * working with two stores (in Ionic: `Storage` and `FileSystem`)
 * we will just be working with one (`FileSystem`).
 *
 * In the future, we'll want to do a workflow here where the user
 * can start from an existing space, but for now it's just located
 * here.
 */
export const BOOTSTRAP_SPACE_ADDR = `bootstrap^${GIB}`;
/**
 * The bootstrap space should be primitive except a single rel8n
 * with this rel8n name with a single rel8d address.
 */
export const SPACE_REL8N_NAME_BOOTSTRAP_SPACE = `space`;
/**
 * rel8n name in a space ibgib to the config ibgib(s?)
 */
export const SPACE_REL8N_NAME_CONFIG = `config`;

/**
 * Ionic-specific folder that represents OS directory.
 *
 * Can't seem to find the files in emulator when I use the Data folder.
 * {@link FilesystemDirectory}
 */
// export const IBGIB_BASE_DIR = FilesystemDirectory.Data;
export const IBGIB_BASE_DIR = FilesystemDirectory.Documents;
/**
 * encoding for ibgib files.
 *
 * ## notes
 *
 * atow, only UTF-8 is supported.
 */
export const IBGIB_FILES_ENCODING = FilesystemEncoding.UTF8;
/**
 * Base directory for all data of the app.
 */
export const IBGIB_BASE_SUBPATH = 'ibgib';
/**
 * Default space that is also used for bootstrapping.
 *
 * The user should provide his/her own space name that will contain their data.
 * If a custom user space name is not provided, one should be auto-generated.
 *
 * ## notes
 *
 * * the leading 000's help to put the space earlier in alphabetized listing if viewing through an OS file viewer
 */
export const IBGIB_SPACE_SUBPATH_DEFAULT = '000_default_space';
/**
 * Subpath for "normal" ibgibs (non-meta, non-dna, non-binary, etc.).
 */
export const IBGIB_IBGIBS_SUBPATH = 'ibgibs';
/**
 * should contain special-use ibgibs to the application.
 *
 * Use case:
 *   Because some special ibgibs will be changed frequently,
 *   e.g. settings, a separate folder will be useful.
 */
export const IBGIB_META_SUBPATH = 'meta';

export const VALID_SPACE_NAME_EXAMPLES = [
    'justLetters', 'valid_here', 'hyphens-allowed', '0CanStartOrEndWithNumbers9'
];
export const INVALID_SPACE_NAME_EXAMPLES = [
    'IHaveASymbol!', 'invalid hereWithSpace', '-cantStartWithHyphen', '_OrUnderscore'
];
/**
 * Path for storing the dna for ibgibs.
 *
 * bins will be stored without hyphens in the format:
 *   [hash].[ext]
 *
 * @example
 *   641575866a7c42bda89f58de5cd1c3aa.jpg
 */
export const IBGIB_BIN_SUBPATH = 'bin';
/**
 * Path for storing the dna for ibgibs.
 *
 * ## notes
 *
 * eventually, these should most likely be stored in "colder"
 * storage, like compressed, low-priority.
 */
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
    'pic', 'comment', 'link', 'tag', 'result',
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
/**
 * rel8n name used inside the root to those ibgib it contains.
 *
 * @example
 * ```json
 *  {
 *      ib: root,
 *      gib: ABC123,
 *      data: {...},
 *      rel8ns: {
 *          [rel8nName]: ["a^1", "b^2"]
 *      }
 *  }
 * ```
 */
export const DEFAULT_ROOT_REL8N_NAME = 'x';

export const CURRENT_VERSION = '1';
export const WITNESS_ARG_METADATA_STRING = 'witness_arg';
export const WITNESS_RESULT_METADATA_STRING = 'witness_result';
