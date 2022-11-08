/**
 * @module big_mess of constants...eesh.
 */


import { Directory, Encoding } from '@capacitor/filesystem';


import { GIB } from 'ts-gib/dist/V1';
import { Ib, } from 'ts-gib';
import { SaltStrategy } from 'encrypt-gib';

/**
 * Naive selective logging/tracing mechanism.
 */
export const GLOBAL_LOG_A_LOT: boolean | number = false;
/**
 * Used in console.timeLog() calls...
 * Initialized in app component constructor
 */
export const GLOBAL_TIMER_NAME = '[ib^gib timer]';

export const GLOBAL_DEBUG_BORDER = false;

export const STORAGE_KEY_APP_USES_STUFF = 'STORAGE_KEY_APP_USES_STUFF';

/**
 * When expressing ibgib data paths, this will be used as the delimiter
 * to indicate a sub-object.
 *
 * # notes
 *
 * This should be used with the understanding that having overly-complex data
 * maps is an indication that the ibgib may possibly be better designed as
 * multiple ibgibs linked via their rel8ns.
 *
 * That said, I think it will be common for grouping settings, especially
 * mapping from external sources (API, SDK, etc.).
 */
export const DEFAULT_DATA_PATH_DELIMITER = '/';

/**
 * Zero space is a default space that uses default values that should be
 * reproducible and not break or something...it's all in flux really.
 */
export const ZERO_SPACE_ID = 'zero';

export const IBGIB_SPACE_NAME_DEFAULT = 'default_space';

/**
 *
 */
export const DEFAULT_UUID = undefined;
export const UUID_REGEXP = /^[a-zA-Z0-9_\-.]{1,256}$/;
/**
 * regular expression for a classname.
 *
 * Used in witnesses atm.
 */
export const CLASSNAME_REGEXP = /^[a-zA-Z0-9_]{1,255}$/;

/**
 * See {@link BootstrapIbGib}
 */
export const BOOTSTRAP_IBGIB_ADDR = `bootstrap^${GIB}`;
/**
 * {@see BootstrapData}
 */
export const BOOTSTRAP_DATA_DEFAULT_SPACE_ID_KEY = `defaultSpaceId`;
/**
 * Key for index tracking known spaceIds in a bootstrap ibgib.
 * {@see BootstrapData}
 */
export const BOOTSTRAP_DATA_KNOWN_SPACE_IDS_KEY = `spaceIds`;
/**
 * rel8n name in a space ibgib to the config ibgib(s?)
 */
export const SPACE_REL8N_NAME_CONFIG = `config`;
export const SPACE_NAME_REGEXP = /^[a-zA-Z][\w\-]{0,62}[a-zA-Z]$/;


/**
 * Ionic-specific folder that represents OS directory.
 *
 * Can't seem to find the files in emulator when I use the Data folder.
 * {@link Directory}
 */
// export const IBGIB_BASE_DIR = Directory.Data;
export const IBGIB_BASE_DIR = Directory.Documents;
/**
 * encoding for ibgib files.
 *
 * ## notes
 *
 * atow, only UTF-8 is supported.
 */
export const IBGIB_ENCODING = Encoding.UTF8;
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
export const IBGIB_SPACE_SUBPATH_DEFAULT = `000_${IBGIB_SPACE_NAME_DEFAULT}`;
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
export const IBGIB_DOWNLOADED_PICS_SUBPATH = 'DownloadedPics';

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
/**
 *
 */
export const PERSIST_OPTS_AND_RESULTS_IBGIBS_DEFAULT = false;
/**
 * Yep, this one starts with default instead of ending with it.
 */
export const DEFAULT_LOCAL_SPACE_DESCRIPTION = `This is a local space. There are many like it, but this one is...`;

/**
 * default if for some reason there is no extension in data.ext
 *
 * ## driving itnent
 *
 * implementing download pic
 */
export const DEFAULT_PIC_FILE_EXTENSION = 'png';

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
export const SPACE_REL8N_NAME = 'space';
/**
 * The main roots^gib ibgib uses this rel8n name to keep track of roots.
 *
 * NOTE: This is different than the rel8nName that a root ibgib uses to link to its ibgibs!
 * {@link DEFAULT_ROOT_REL8N_NAME}
 */
export const ROOT_REL8N_NAME = 'root';
/**
 * A tag ibGib uses this rel8n name for the ibgibs that it targets.
 */
export const TAGGED_REL8N_NAME = 'target';
/**
 * A spaces ibGib uses this rel8n name for related sync spaces, used
 * in replicating ibgib spaces.
 */
export const SYNC_SPACE_REL8N_NAME = 'syncSpace';
/**
 * A secrets ibgib uses this rel8n name for its children secrets.
 */
export const SECRET_REL8N_NAME = 'secret';
/**
 * An encryptions ibgib uses this rel8n name for its children encryptions.
 */
export const ENCRYPTION_REL8N_NAME = 'encryption';
/**
 * Related encrypted ciphertext ibgibs will use this rel8n name.
 * Those ciphertext ibgibs will then relate to the encryption used.
 */
export const CIPHERTEXT_REL8N_NAME = 'ciphertext';
export const CONSENSUS_REL8N_NAME = 'consensus';
/**
 * The primary rel8n name atm for the autosyncs feature.
 */
export const AUTOSYNC_ALWAYS_REL8N_NAME = 'always';
/**
 * rel8n name used inside the root to those ibgib it contains.
 *
 * NOTE: This is different than the rel8nName 'root' that the roots^gib uses!
 * {@link ROOT_REL8N_NAME}
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
export const BINARY_REL8N_NAME = 'bin';
/**
 * In a Robbot's rel8ns, this is the rel8n name that links to tags that the
 * Robbot uses for tagging its output.
 */
export const ROBBOT_TAG_TJP_ADDRS_REL8N_NAME = 'tagTjpAddrs';
/**
 * A spaces ibGib uses this rel8n name for related sync spaces, used
 * in replicating ibgib spaces.
 */
export const ROBBOT_REL8N_NAME = 'robbot';
/**
 * When a robbot witnesses an ibgib, it will "remember" the ibgib
 * by relating the target ibgib to itself via this rel8nName.
 */
export const DEFAULT_ROBBOT_TARGET_REL8N_NAME = 'x';
export const ARCHIVE_REL8N_NAME = 'archive';
export const TRASH_REL8N_NAME = 'trash';

/**
 * wah wah wah...
 */
export const IBGIB_ROBBOT_NAME_DEFAULT = 'i';

export const CONSENSUS_ADDR_SYNC_NAIVE_PUT_MERGE = 'sync naive put merge^gib'

/**
 * These rel8n names are shown in a list view by default.
 */
export const DEFAULT_LIST_REL8N_NAMES: string[] = [
    'pic', 'comment', 'link',
    'result', 'import',
    'tagged',
    TAGGED_REL8N_NAME,
    TAG_REL8N_NAME,
    ROOT_REL8N_NAME, // hack for now to get all to show
    DEFAULT_ROOT_REL8N_NAME,
    ROBBOT_REL8N_NAME,
    SYNC_SPACE_REL8N_NAME,
]

export const DEFAULT_META_IB_STARTS: Ib[] = [
    'tags', 'tag ', 'settings', 'setting ', 'witness space ',
]

export const SPECIAL_URLS = [
    'tags', 'home'
];

export const ILLEGAL_TAG_TEXT_CHARS = [
    '^', '?', '/', '\\', `|`,
];

export const ILLEGAL_TAG_DESC_CHARS = [
    '^',
];
/**
 * When showing a menu item, this is the max length
 */
export const MENU_ITEM_IB_SUBSTRING_LENGTH = 15;

/**
 * comment ibs atow are comment [commentText substring]
 */
export const DEFAULT_COMMENT_TEXT_IB_SUBSTRING_LENGTH = 10;
/**
 * comment ib can have additional metadata string,
 *
 * @example "comment thisisacomm here_is_addl_metadata"
 */
export const DEFAULT_COMMENT_METADATA_IB_SUBSTRING_LENGTH = 64;
export const DEFAULT_LINK_TEXT_IB_SUBSTRING_LENGTH = 20;

/**
 * Used in ErrorIbGib_V1.ib
 */
export const DEFAULT_ERROR_MSG_IB_SUBSTRING_LENGTH = 20;
/**
 * regexp for an error ibgib's (ErrorIbGib_V1) ib property.
 */
export const ERROR_IB_REGEXP = /^error (\w+) ([a-fA-F\d]{32}|undefined)$/;
/**
 * capture groups for expected (in various places). will return `null` if
 * does not have an id section like `(E: abcdef32chars)`.
 */
export const ERROR_MSG_WITH_ID_CAPTURE_GROUPS_REGEXP = /^(\[.+\])?\s?(\(UNEXPECTED\)|\(unexpected\))?(.+)(\([EIWeiw]: [a-fA-F\d]{32}\))(\(UNEXPECTED\)|\(unexpected\))?$/;
export const ERROR_MSG_LOCATION_ONLY_REGEXP = /^(\[.+\]).+$/;

/**
 * If a comment/link/whatever has only alphanumerics, this is used in the ib.
 */
export const ONLY_HAS_NON_ALPHANUMERICS = '_nonalphanumerics_';

/**
 * Default icon when creating a tag.
 */
export const DEFAULT_TAG_ICON = 'pricetag-outline';
/**
 * Default description when creating a tag.
 */
export const DEFAULT_TAG_DESCRIPTION = 'This is a tag used for organizing data.';

/**
 * Icon for a single robbot
 */
export const DEFAULT_ROBBOT_ICON = 'body-outline';

/**
 *
 */
export const DEFAULT_SPACE_TEXT = 'space';
/**
 * Default icon specifically for spaces.
 */
export const DEFAULT_SPACE_ICON = 'sparkles-outline';
/**
 * Default description specifically for spaces.
 */
export const DEFAULT_SPACE_DESCRIPTION =
    `This is a space ibgib, which is basically a special ibgib who has behavior
to interface with data stores and/or other space(s) to provide concrete location
for ibgibs. All ibgibs can have relationships with other ibgibs, but this one
specifically either implies a physical interface to things like databases,
file systems, and similar; OR, when this space interfaces with other spaces, this
is a logical organization of ibgib locations, like when configuring clusters or
consensus algorithms.`;
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
export const DEFAULT_SPACE_REL8N_NAME = 'x';

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

export const CURRENT_VERSION = '1';
export const WITNESS_ARG_METADATA_STRING = 'witness_arg';
export const WITNESS_RESULT_METADATA_STRING = 'witness_result';



export const DEFAULT_ENCRYPTION_INITIAL_RECURSIONS = 50000;
export const MIN_ENCRYPTION_INITIAL_RECURSIONS = 1000;
export const MAX_ENCRYPTION_INITIAL_RECURSIONS = 10000000;
export const MIN_ENCRYPTION_RECURSIONS_PER_HASH = 1;
export const MAX_ENCRYPTION_RECURSIONS_PER_HASH = 1000;
export const MIN_ENCRYPTION_SALT_LENGTH = 50;
export const MAX_ENCRYPTION_SALT_LENGTH = 99999;
export const MIN_ENCRYPTION_PASSWORD_LENGTH = 8;
export const MAX_ENCRYPTION_PASSWORD_LENGTH = 9999999;
export const DEFAULT_ENCRYPTION_SALT_STRATEGY: SaltStrategy = SaltStrategy.appendPerHash;
export const DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH = 10;
export const DEFAULT_ENCRYPTION_HASH_ALGORITHM = 'SHA-256';

/**
 * List of common special chars for english.
 *
 * ## intent
 *
 * When sanitizing input.
 */
export const ALLISH_SPECIAL_CHARS = `\`~!@#$%^&*()_\\-+=|\\\\\\]}[{"':;?/>.<,`;
export const FILENAME_SPECIAL_CHARS = ` \`~!@#$%&*()_\\-+=|\\]}[{"';?>.<,`;

/**
 * If this matches, then we will encode the data field in our storage (aws
 * anyway atow)
 */
export const IBGIB_DATA_REGEX_INDICATES_NEED_TO_ENCODE = /[^\w\s\d`~!@#$%\^&*()_\\\-+=|\]\}\[\{"':;?/>.<,]/;

/**
 * Much restricted list of chars in english.
 *
 * ## intent
 *
 * When sanitizing input.
 */
export const SAFE_SPECIAL_CHARS = `.'",!?-`;

export const IB_MAX_LENGTH_DEFAULT = 155;
/**
 * Defaults to word characters, space, tab, hyphen, and other
 * non-slash (path navigating) chars.
 *
 * Does not allow new lines or other whitespace, only tabs and spaces.
 *
 * ## atow
 *
 * `^[\\w\\t\\-|=+.&%\$#@!~\` \\[\\]\\(\\)\\{\\}]{1,${IB_MAX_LENGTH_DEFAULT}}$`
 */
export const IB_REGEXP_DEFAULT = new RegExp(`^[\\w\\t\\-|=+.&%\$#@!~\` \\[\\]\\(\\)\\{\\}]{1,${IB_MAX_LENGTH_DEFAULT}}$`);
export const COMMA_DELIMITED_SIMPLE_STRINGS_REGEXP = /^[\w\-]+(,?[\w+\-])*$/;
export const COMMA_DELIMITED_SIMPLE_STRINGS_REGEXP_DESCRIPTION = 'text must only be comma-delimited, no-spaces simple words like "comment,link,pic,x,under_score,hyphens-ok-too"';

export const TAG_TEXT_REGEXP = /^\w[\w .\-?!]{1,30}[\w.?!]$/;
export const TAG_TEXT_REGEXP_DESCRIPTION = `tag text must start and end with an alphanumeric, and can contain a hyphen, question mark, dot or space.`;

/**
 * RegExp for a hexadecimal string of length 32
 */
export const HEXADECIMAL_HASH_STRING_REGEXP_32 = /^[0-9a-fA-F]{32}$/;
/**
 * RegExp for a hexadecimal string of length 64
 */
export const HEXADECIMAL_HASH_STRING_REGEXP_64 = /^[0-9a-fA-F]{64}$/;

export const QUERY_PARAM_PAUSED = 'paused';
export const QUERY_PARAM_ROBBOT = 'robbot';

// #region AWS Amazon

/**
 * @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
 */
export const AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX: RegExp = /^[a-zA-Z0-9_\-.]{3,255}$/;
export const AWS_S3_REGEXP_BUCKET: RegExp = /^[a-zA-Z0-9_\-.]{3,255}$/;
/**
 * @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
 */
export const AWS_DYNAMODB_REGEXP_ATTR: RegExp = /^[a-zA-Z0-9_\-.]{1,255}$/;
/**
 * @example us-east-1
 */
export const AWS_REGION_REGEXP = /^[a-z][a-z]-[a-z]{1,20}-[0-9]{1,2}$/;

/**
 * Default primary key name for dynamodb
 */
export const DEFAULT_PRIMARY_KEY_NAME = 'ibGibAddrHash';
/** Max number of retries due to throughput failures */
export const DEFAULT_AWS_MAX_RETRY_THROUGHPUT = 5;
export const DEFAULT_AWS_MAX_RETRY_UNPROCESSED_ITEMS = 5;
export const DEFAULT_AWS_PUT_BATCH_SIZE = 22;
export const DEFAULT_AWS_GET_BATCH_SIZE = 100;
export const DEFAULT_AWS_PUT_THROTTLE_MS = 1000;
export const DEFAULT_AWS_GET_THROTTLE_MS = 500;
/** Will send query commands in parallel in batches of this size.  */
export const DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE = 5;
export const DEFAULT_AWS_RETRY_THROUGHPUT_THROTTLE_MS = 3000;
export const DEFAULT_AWS_VALIDATE_IBGIBADDRS_MATCH_IBGIBS = true;
/**
 * This is returned if we're trying to do things too quickly when batch write/get
 *
 * @link https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/dynamodbv2/model/ProvisionedThroughputExceededException.html
 */
export const AWS_THROUGHPUT_ERROR_NAME = "ProvisionedThroughputExceededException";
export const AWS_ERROR_MSG_ITEM_SIZE_EXCEEDED = "Item size has exceeded the maximum allowed size";
/**
 * Interval in ms between polling for updates ("notifications") between local
 * space (ibgibs service) and dynamo sync space(s), or for use within a single
 * space for checking its internal state.
 *
 * Of course, long polling is very hacky, but so is using DynamoDB in the cloud
 * for a sync space. Obviously need to progress to a more mature and robust sync
 * space/outer space architecture.
 */
export const DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS = 30_000;
export const DEFAULT_LOCAL_SPACE_POLLING_DELAY_FIRST_RUN_MS = 10_000;
/**
 * {@link DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS} but for outer spaces, so
 * longer interval atow.
 */
export const DEFAULT_OUTER_SPACE_POLLING_INTERVAL_MS = 20_000;
/**
 * Amount of time to delay for FIRST poll execution.
 */
export const DEFAULT_OUTER_SPACE_POLLING_DELAY_FIRST_RUN_MS = 10_000;

/**
 * hacky scroll to bottom after items load per platform
 */
export const DEFAULT_SCROLL_DELAY_MS_WEB_HACK = 5_000;
/**
 * hacky scroll to bottom after items load per platform
 */
export const DEFAULT_SCROLL_DELAY_MS_ANDROID_HACK = 3_000;
/**
 * hacky scroll to bottom after items load per platform
 */
export const DEFAULT_SCROLL_DELAY_MS_IOS_HACK = 2_000;

/**
 * AWS DynamoDB only allows 400K per item-ish.
 *
 * Somehow indexes affect this limit, but it's apparently convoluted.
 *
 * @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html#limits-items
 * @link https://stackoverflow.com/questions/42181346/maximum-size-of-dynamodb-item
 * @link https://stackoverflow.com/questions/58031280/aws-dynamodb-put-item-size-limit-exception-for-item-size-less-than-400kb
 * @link https://stackoverflow.com/questions/33768971/how-to-calculate-dynamodb-item-size-getting-validationerror-400kb-boto
 *
 * I'm setting a limit slightly less than half of the 400K, assuming my
 * global secondary index has something to do with this.
 */
export const AWS_DYNAMODB_LARGE_ITEM_SIZE_LIMIT_ISH_BYTES = 180_000; // curre

/**
 * Name of the secondary global index (tjp+n) in DynamoDB.
 */
export const AWS_DYNAMODB_TJP_N_SECONDARY_INDEX_NAME = 'tjp-n-index';
export const OUTER_SPACE_DEFAULT_IB_DELIMITER = ' ';
export const DEFAULT_TX_ID_LENGTH = 5;
export const DEFAULT_AWS_PROJECTION_EXPRESSION = 'ib,gib,data,rel8ns,n';

/**
 * When a status is first created, this is used to indicate that
 * the tjp has not been set.
 */
export const STATUS_UNDEFINED_TJP_GIB = GIB;
/**
 * When a status is first created, this is used to indicate that
 * the txId has not been set.
 */
export const STATUS_UNDEFINED_TX_ID = '0';

export const SPACE_LOCK_IB_TERM = 'space_lock';
/**
 * When attempting to acquire a lock ona  space, and it is already lock, it will
 * wait a random amount of ms before trying to lock again. This is the default
 * max amount of ms before reattempting.
 */
export const DEFAULT_MAX_DELAY_MS_RETRY_LOCK_ACQUIRE = 100;
/**
 * Will retry this many times before giving up...
 */
export const DEFAULT_MAX_DELAY_RETRY_LOCK_ACQUIRE_ATTEMPTS = 100;
/**
 * We don't want someone locking a space forever by accident.
 */
export const MAX_LOCK_SECONDS_VALID = 60 * 2; // two minutes
/**
 * Default value for secondsValid when acquiring/releasing lock in/on LOCAL
 * space.
 */
export const DEFAULT_SECONDS_VALID_LOCAL = 2;
/**
 * Default value for secondsValid when acquiring/releasing lock in/on
 * OUTER space, e.g. sync spaces like aws dynamo sync space.
 */
export const DEFAULT_SECONDS_VALID_OUTER = 30;

/**
 * retry count when calling getDependencyGraph.
 *
 * ## driving use case
 *
 * dependency graph fails when concurrent merges made in sync space.
 * need to wait until previous graph merger happens then retry.
 */
export const DEFAULT_MAX_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE = 5;
/**
 * when getting dependency graph, sometimes we have to wait to retry
 */
export const DEFAULT_MS_BETWEEN_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE = 5000;
/**
 * retry count when calling getDependencyGraph.
 *
 * ## driving use case
 *
 * dependency graph fails when concurrent merges made in sync space.
 * need to wait until previous graph merger happens then retry.
 */
export const DEFAULT_MAX_RETRIES_GET_DEPENDENCY_GRAPH_LOCAL = 3;
/**
 * when getting dependency graph, sometimes we have to wait to retry
 */
export const DEFAULT_MS_BETWEEN_RETRIES_GET_DEPENDENCY_GRAPH_LOCAL = 1000;

export const AWS_RESERVED_WORDS = [
    'ABORT',
    'ABSOLUTE',
    'ACTION',
    'ADD',
    'AFTER',
    'AGENT',
    'AGGREGATE',
    'ALL',
    'ALLOCATE',
    'ALTER',
    'ANALYZE',
    'AND',
    'ANY',
    'ARCHIVE',
    'ARE',
    'ARRAY',
    'AS',
    'ASC',
    'ASCII',
    'ASENSITIVE',
    'ASSERTION',
    'ASYMMETRIC',
    'AT',
    'ATOMIC',
    'ATTACH',
    'ATTRIBUTE',
    'AUTH',
    'AUTHORIZATION',
    'AUTHORIZE',
    'AUTO',
    'AVG',
    'BACK',
    'BACKUP',
    'BASE',
    'BATCH',
    'BEFORE',
    'BEGIN',
    'BETWEEN',
    'BIGINT',
    'BINARY',
    'BIT',
    'BLOB',
    'BLOCK',
    'BOOLEAN',
    'BOTH',
    'BREADTH',
    'BUCKET',
    'BULK',
    'BY',
    'BYTE',
    'CALL',
    'CALLED',
    'CALLING',
    'CAPACITY',
    'CASCADE',
    'CASCADED',
    'CASE',
    'CAST',
    'CATALOG',
    'CHAR',
    'CHARACTER',
    'CHECK',
    'CLASS',
    'CLOB',
    'CLOSE',
    'CLUSTER',
    'CLUSTERED',
    'CLUSTERING',
    'CLUSTERS',
    'COALESCE',
    'COLLATE',
    'COLLATION',
    'COLLECTION',
    'COLUMN',
    'COLUMNS',
    'COMBINE',
    'COMMENT',
    'COMMIT',
    'COMPACT',
    'COMPILE',
    'COMPRESS',
    'CONDITION',
    'CONFLICT',
    'CONNECT',
    'CONNECTION',
    'CONSISTENCY',
    'CONSISTENT',
    'CONSTRAINT',
    'CONSTRAINTS',
    'CONSTRUCTOR',
    'CONSUMED',
    'CONTINUE',
    'CONVERT',
    'COPY',
    'CORRESPONDING',
    'COUNT',
    'COUNTER',
    'CREATE',
    'CROSS',
    'CUBE',
    'CURRENT',
    'CURSOR',
    'CYCLE',
    'DATA',
    'DATABASE',
    'DATE',
    'DATETIME',
    'DAY',
    'DEALLOCATE',
    'DEC',
    'DECIMAL',
    'DECLARE',
    'DEFAULT',
    'DEFERRABLE',
    'DEFERRED',
    'DEFINE',
    'DEFINED',
    'DEFINITION',
    'DELETE',
    'DELIMITED',
    'DEPTH',
    'DEREF',
    'DESC',
    'DESCRIBE',
    'DESCRIPTOR',
    'DETACH',
    'DETERMINISTIC',
    'DIAGNOSTICS',
    'DIRECTORIES',
    'DISABLE',
    'DISCONNECT',
    'DISTINCT',
    'DISTRIBUTE',
    'DO',
    'DOMAIN',
    'DOUBLE',
    'DROP',
    'DUMP',
    'DURATION',
    'DYNAMIC',
    'EACH',
    'ELEMENT',
    'ELSE',
    'ELSEIF',
    'EMPTY',
    'ENABLE',
    'END',
    'EQUAL',
    'EQUALS',
    'ERROR',
    'ESCAPE',
    'ESCAPED',
    'EVAL',
    'EVALUATE',
    'EXCEEDED',
    'EXCEPT',
    'EXCEPTION',
    'EXCEPTIONS',
    'EXCLUSIVE',
    'EXEC',
    'EXECUTE',
    'EXISTS',
    'EXIT',
    'EXPLAIN',
    'EXPLODE',
    'EXPORT',
    'EXPRESSION',
    'EXTENDED',
    'EXTERNAL',
    'EXTRACT',
    'FAIL',
    'FALSE',
    'FAMILY',
    'FETCH',
    'FIELDS',
    'FILE',
    'FILTER',
    'FILTERING',
    'FINAL',
    'FINISH',
    'FIRST',
    'FIXED',
    'FLATTERN',
    'FLOAT',
    'FOR',
    'FORCE',
    'FOREIGN',
    'FORMAT',
    'FORWARD',
    'FOUND',
    'FREE',
    'FROM',
    'FULL',
    'FUNCTION',
    'FUNCTIONS',
    'GENERAL',
    'GENERATE',
    'GET',
    'GLOB',
    'GLOBAL',
    'GO',
    'GOTO',
    'GRANT',
    'GREATER',
    'GROUP',
    'GROUPING',
    'HANDLER',
    'HASH',
    'HAVE',
    'HAVING',
    'HEAP',
    'HIDDEN',
    'HOLD',
    'HOUR',
    'IDENTIFIED',
    'IDENTITY',
    'IF',
    'IGNORE',
    'IMMEDIATE',
    'IMPORT',
    'IN',
    'INCLUDING',
    'INCLUSIVE',
    'INCREMENT',
    'INCREMENTAL',
    'INDEX',
    'INDEXED',
    'INDEXES',
    'INDICATOR',
    'INFINITE',
    'INITIALLY',
    'INLINE',
    'INNER',
    'INNTER',
    'INOUT',
    'INPUT',
    'INSENSITIVE',
    'INSERT',
    'INSTEAD',
    'INT',
    'INTEGER',
    'INTERSECT',
    'INTERVAL',
    'INTO',
    'INVALIDATE',
    'IS',
    'ISOLATION',
    'ITEM',
    'ITEMS',
    'ITERATE',
    'JOIN',
    'KEY',
    'KEYS',
    'LAG',
    'LANGUAGE',
    'LARGE',
    'LAST',
    'LATERAL',
    'LEAD',
    'LEADING',
    'LEAVE',
    'LEFT',
    'LENGTH',
    'LESS',
    'LEVEL',
    'LIKE',
    'LIMIT',
    'LIMITED',
    'LINES',
    'LIST',
    'LOAD',
    'LOCAL',
    'LOCALTIME',
    'LOCALTIMESTAMP',
    'LOCATION',
    'LOCATOR',
    'LOCK',
    'LOCKS',
    'LOG',
    'LOGED',
    'LONG',
    'LOOP',
    'LOWER',
    'MAP',
    'MATCH',
    'MATERIALIZED',
    'MAX',
    'MAXLEN',
    'MEMBER',
    'MERGE',
    'METHOD',
    'METRICS',
    'MIN',
    'MINUS',
    'MINUTE',
    'MISSING',
    'MOD',
    'MODE',
    'MODIFIES',
    'MODIFY',
    'MODULE',
    'MONTH',
    'MULTI',
    'MULTISET',
    'NAME',
    'NAMES',
    'NATIONAL',
    'NATURAL',
    'NCHAR',
    'NCLOB',
    'NEW',
    'NEXT',
    'NO',
    'NONE',
    'NOT',
    'NULL',
    'NULLIF',
    'NUMBER',
    'NUMERIC',
    'OBJECT',
    'OF',
    'OFFLINE',
    'OFFSET',
    'OLD',
    'ON',
    'ONLINE',
    'ONLY',
    'OPAQUE',
    'OPEN',
    'OPERATOR',
    'OPTION',
    'OR',
    'ORDER',
    'ORDINALITY',
    'OTHER',
    'OTHERS',
    'OUT',
    'OUTER',
    'OUTPUT',
    'OVER',
    'OVERLAPS',
    'OVERRIDE',
    'OWNER',
    'PAD',
    'PARALLEL',
    'PARAMETER',
    'PARAMETERS',
    'PARTIAL',
    'PARTITION',
    'PARTITIONED',
    'PARTITIONS',
    'PATH',
    'PERCENT',
    'PERCENTILE',
    'PERMISSION',
    'PERMISSIONS',
    'PIPE',
    'PIPELINED',
    'PLAN',
    'POOL',
    'POSITION',
    'PRECISION',
    'PREPARE',
    'PRESERVE',
    'PRIMARY',
    'PRIOR',
    'PRIVATE',
    'PRIVILEGES',
    'PROCEDURE',
    'PROCESSED',
    'PROJECT',
    'PROJECTION',
    'PROPERTY',
    'PROVISIONING',
    'PUBLIC',
    'PUT',
    'QUERY',
    'QUIT',
    'QUORUM',
    'RAISE',
    'RANDOM',
    'RANGE',
    'RANK',
    'RAW',
    'READ',
    'READS',
    'REAL',
    'REBUILD',
    'RECORD',
    'RECURSIVE',
    'REDUCE',
    'REF',
    'REFERENCE',
    'REFERENCES',
    'REFERENCING',
    'REGEXP',
    'REGION',
    'REINDEX',
    'RELATIVE',
    'RELEASE',
    'REMAINDER',
    'RENAME',
    'REPEAT',
    'REPLACE',
    'REQUEST',
    'RESET',
    'RESIGNAL',
    'RESOURCE',
    'RESPONSE',
    'RESTORE',
    'RESTRICT',
    'RESULT',
    'RETURN',
    'RETURNING',
    'RETURNS',
    'REVERSE',
    'REVOKE',
    'RIGHT',
    'ROLE',
    'ROLES',
    'ROLLBACK',
    'ROLLUP',
    'ROUTINE',
    'ROW',
    'ROWS',
    'RULE',
    'RULES',
    'SAMPLE',
    'SATISFIES',
    'SAVE',
    'SAVEPOINT',
    'SCAN',
    'SCHEMA',
    'SCOPE',
    'SCROLL',
    'SEARCH',
    'SECOND',
    'SECTION',
    'SEGMENT',
    'SEGMENTS',
    'SELECT',
    'SELF',
    'SEMI',
    'SENSITIVE',
    'SEPARATE',
    'SEQUENCE',
    'SERIALIZABLE',
    'SESSION',
    'SET',
    'SETS',
    'SHARD',
    'SHARE',
    'SHARED',
    'SHORT',
    'SHOW',
    'SIGNAL',
    'SIMILAR',
    'SIZE',
    'SKEWED',
    'SMALLINT',
    'SNAPSHOT',
    'SOME',
    'SOURCE',
    'SPACE',
    'SPACES',
    'SPARSE',
    'SPECIFIC',
    'SPECIFICTYPE',
    'SPLIT',
    'SQL',
    'SQLCODE',
    'SQLERROR',
    'SQLEXCEPTION',
    'SQLSTATE',
    'SQLWARNING',
    'START',
    'STATE',
    'STATIC',
    'STATUS',
    'STORAGE',
    'STORE',
    'STORED',
    'STREAM',
    'STRING',
    'STRUCT',
    'STYLE',
    'SUB',
    'SUBMULTISET',
    'SUBPARTITION',
    'SUBSTRING',
    'SUBTYPE',
    'SUM',
    'SUPER',
    'SYMMETRIC',
    'SYNONYM',
    'SYSTEM',
    'TABLE',
    'TABLESAMPLE',
    'TEMP',
    'TEMPORARY',
    'TERMINATED',
    'TEXT',
    'THAN',
    'THEN',
    'THROUGHPUT',
    'TIME',
    'TIMESTAMP',
    'TIMEZONE',
    'TINYINT',
    'TO',
    'TOKEN',
    'TOTAL',
    'TOUCH',
    'TRAILING',
    'TRANSACTION',
    'TRANSFORM',
    'TRANSLATE',
    'TRANSLATION',
    'TREAT',
    'TRIGGER',
    'TRIM',
    'TRUE',
    'TRUNCATE',
    'TTL',
    'TUPLE',
    'TYPE',
    'UNDER',
    'UNDO',
    'UNION',
    'UNIQUE',
    'UNIT',
    'UNKNOWN',
    'UNLOGGED',
    'UNNEST',
    'UNPROCESSED',
    'UNSIGNED',
    'UNTIL',
    'UPDATE',
    'UPPER',
    'URL',
    'USAGE',
    'USE',
    'USER',
    'USERS',
    'USING',
    'UUID',
    'VACUUM',
    'VALUE',
    'VALUED',
    'VALUES',
    'VARCHAR',
    'VARIABLE',
    'VARIANCE',
    'VARINT',
    'VARYING',
    'VIEW',
    'VIEWS',
    'VIRTUAL',
    'VOID',
    'WAIT',
    'WHEN',
    'WHENEVER',
    'WHERE',
    'WHILE',
    'WINDOW',
    'WITH',
    'WITHIN',
    'WITHOUT',
    'WORK',
    'WRAPPED',
    'WRITE',
    'YEAR',
    'ZONE',
]

// #endregion

/**
 * Ionicons const "enum"
 */
export const IONICONS = [
    'add',
    'add-circle',
    'alert',
    'alert-circle',
    'add',
    'airplane',
    'alarm',
    'albums',
    'alert',
    'alert-circle',
    'american-football',
    'analytics',
    'aperture',
    'apps',
    'archive',
    'arrow-back',
    'arrow-back-circle',
    'arrow-down',
    'arrow-down-circle',
    'arrow-forward',
    'arrow-forward-circle',
    'arrow-redo',
    'arrow-redo-circle',
    'arrow-undo',
    'arrow-undo-circle',
    'arrow-up',
    'arrow-up-circle',
    'at',
    'at-circle',
    'attach',
    'backspace',
    'bandage',
    'bar-chart',
    'barbell',
    'barcode',
    'baseball',
    'basket',
    'basketball',
    'battery-charging',
    'battery-dead',
    'battery-full',
    'battery-half',
    'beaker',
    'bed',
    'beer',
    'bicycle',
    'bluetooth',
    'boat',
    'body',
    'bonfire',
    'book',
    'bookmark',
    'bookmarks',
    'briefcase',
    'browsers',
    'brush',
    'bug',
    'build',
    'bulb',
    'bus',
    'business',
    'cafe',
    'calculator',
    'calendar',
    'call',
    'camera',
    'camera-reverse',
    'car',
    'car-sport',
    'card',
    'caret-back',
    'caret-back-circle',
    'caret-down',
    'caret-down-circle',
    'caret-forward',
    'caret-forward-circle',
    'caret-up',
    'caret-up-circle',
    'cart',
    'cash',
    'cellular',
    'chatbox',
    'chatbox-ellipses',
    'chatbubble',
    'chatbubble-ellipses',
    'chatbubbles',
    'checkbox',
    'checkmark',
    'checkmark-circle',
    'checkmark-done',
    'checkmark-done-circle',
    'chevron-back',
    'chevron-back-circle',
    'chevron-down',
    'chevron-down-circle',
    'chevron-forward',
    'chevron-forward-circle',
    'chevron-up',
    'chevron-up-circle',
    'clipboard',
    'close',
    'close-circle',
    'cloud',
    'cloud-circle',
    'cloud-done',
    'cloud-download',
    'cloud-offline',
    'cloud-upload',
    'cloudy',
    'cloudy-night',
    'code',
    'code-download',
    'code-slash',
    'code-working',
    'cog',
    'color-fill',
    'color-filter',
    'color-palette',
    'color-wand',
    'compass',
    'construct',
    'contract',
    'contrast',
    'copy',
    'create',
    'crop',
    'cube',
    'cut',
    'desktop',
    'disc',
    'document',
    'document-attach',
    'document-text',
    'documents',
    'download',
    'duplicate',
    'ear',
    'earth',
    'easel',
    'egg',
    'ellipse',
    'ellipsis-horizontal',
    'ellipsis-horizontal-circle',
    'ellipsis-vertical',
    'ellipsis-vertical-circle',
    'enter',
    'exit',
    'expand',
    'eye',
    'eye-off',
    'eyedrop',
    'fast-food',
    'female',
    'file-tray',
    'file-tray-full',
    'file-tray-stacked',
    'film',
    'filter',
    'finger-print',
    'fitness',
    'flag',
    'flame',
    'flash',
    'flash-off',
    'flashlight',
    'flask',
    'flower',
    'folder',
    'folder-open',
    'football',
    'funnel',
    'game-controller',
    'gift',
    'git-branch',
    'git-commit',
    'git-compare',
    'git-merge',
    'git-network',
    'git-pull-request',
    'glasses',
    'globe',
    'golf',
    'grid',
    'hammer',
    'hand-left',
    'hand-right',
    'happy',
    'hardware-chip',
    'headset',
    'heart',
    'heart-circle',
    'heart-dislike',
    'heart-dislike-circle',
    'heart-half',
    'help',
    'help-buoy',
    'help-circle',
    'home',
    'hourglass',
    'ice-cream',
    'image',
    'images',
    'infinite',
    'information',
    'information-circle',
    'journal',
    'key',
    'keypad',
    'language',
    'laptop',
    'layers',
    'leaf',
    'library',
    'link',
    'list',
    'list-circle',
    'locate',
    'location',
    'lock-closed',
    'lock-open',
    'log-in',
    'magnet',
    'mail',
    'mail-open',
    'mail-unread',
    'male',
    'male-female',
    'man',
    'map',
    'medal',
    'medical',
    'medkit',
    'megaphone',
    'menu',
    'mic',
    'mic-circle',
    'mic-off',
    'mic-off-circle',
    'moon',
    'move',
    'musical-note',
    'musical-notes',
    'navigate',
    'navigate-circle',
    'newspaper',
    'notifications',
    'notifications-circle',
    'notifications-off',
    'notifications-off-circle',
    'nuclear',
    'nutrition',
    'open',
    'options',
    'paper-plane',
    'partly-sunny',
    'pause',
    'pause-circle',
    'paw',
    'pencil',
    'people',
    'people-circle',
    'person',
    'person-add',
    'person-circle',
    'person-remove',
    'phone-landscape',
    'phone-portrait',
    'pie-chart',
    'pin',
    'pint',
    'pizza',
    'planet',
    'play',
    'play-back',
    'play-back-circle',
    'play-circle',
    'play-forward',
    'play-forward-circle',
    'play-skip-back',
    'play-skip-back-circle',
    'play-skip-forward',
    'play-skip-forward-circle',
    'podium',
    'power',
    'pricetag',
    'pricetags',
    'print',
    'pulse',
    'push',
    'qr-code',
    'radio',
    'radio-button-off',
    'radio-button-on',
    'rainy',
    'reader',
    'receipt',
    'recording',
    'refresh',
    'refresh-circle',
    'reload',
    'reload-circle',
    'remove',
    'remove-circle',
    'reorder-four',
    'reorder-three',
    'reorder-two',
    'repeat',
    'resize',
    'restaurant',
    'return-down-back',
    'return-down-forward',
    'return-up-back',
    'return-up-forward',
    'ribbon',
    'rocket',
    'rose',
    'sad',
    'save',
    'scan',
    'scan-circle',
    'school',
    'search',
    'search-circle',
    'send',
    'server',
    'settings',
    'shapes',
    'share',
    'share-social',
    'shield',
    'shield-checkmark',
    'shirt',
    'shuffle',
    'skull',
    'snow',
    'speedometer',
    'square',
    'star',
    'star-half',
    'stats-chart',
    'stop',
    'stop-circle',
    'stopwatch',
    'subway',
    'sunny',
    'swap-horizontal',
    'swap-vertical',
    'sync',
    'sync-circle',
    'tablet-landscape',
    'tablet-portrait',
    'tennisball',
    'terminal',
    'text',
    'thermometer',
    'thumbs-down',
    'thumbs-up',
    'thunderstorm',
    'time',
    'timer',
    'today',
    'toggle',
    'trail-sign',
    'train',
    'transgender',
    'trash',
    'trash-bin',
    'trending-down',
    'trending-up',
    'triangle',
    'trophy',
    'tv',
    'umbrella',
    'videocam',
    'volume-high',
    'volume-low',
    'volume-medium',
    'volume-mute',
    'volume-off',
    'walk',
    'wallet',
    'warning',
    'watch',
    'water',
    'wifi',
    'wine',
    'woman',
];

// #region other robbot related

/**
 * Robbot.data.name regexp
 */
export const ROBBOT_NAME_REGEXP = /^[a-zA-Z0-9_\-.]{1,255}$/;
export const ROBBOT_PREFIX_SUFFIX_REGEXP = /^[a-zA-Z0-9_\-.\s👀🤖:;&]{1,64}$/;
export const ROBBOT_PREFIX_SUFFIX_REGEXP_DESC =
    `0 to 64 alphanumerics, spaces, select special characters and emojis.`;

// #endregion other robbot related

// #region gestures

export const GESTURE_DOUBLE_CLICK_THRESHOLD_MS = 500;
/**
 * If a gesture's move threshold is less than this, then it can still be
 * considered a single punctiliar click. Otherwise, it's a move event.
 *
 * IOW, a click gesture only is considered a "click" if the onMove is triggered
 * less than this many times. If onMove is detected more than this many times,
 * then a move gesture will be triggered.
 */
export const GESTURE_CLICK_TOLERANCE_ONMOVE_THRESHOLD_COUNT = 5;

// #endregion gestures

export const SIMPLE_CONFIG_KEY_APP_VISIBLE = 'appBarVisible';
export const SIMPLE_CONFIG_KEY_APP_SELECTED = 'appBarSelectedApp';
export const SIMPLE_CONFIG_KEY_ROBBOT_VISIBLE = 'robbotBarVisible';
export const SIMPLE_CONFIG_KEY_ROBBOT_SELECTED_ADDR = 'robbotBarSelectedAddr';

// #region app

export const APP_NAME_REGEXP = /^[a-zA-Z0-9_\-.]{1,32}$/;
export const APP_REL8N_NAME = 'app';
export const DEFAULT_APP_ICON = 'apps-outline';

// #endregion app

export const YOUTUBE_LINK_REG_EXP = /^https:\/\/youtu\.be\/\w+$/;

export const WEB_1_PATHS = ['welcome', 'about-us', 'your-data'];
