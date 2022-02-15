import { FilesystemDirectory, FilesystemEncoding } from '@capacitor/core';

import { GIB } from 'ts-gib/dist/V1';
import { Ib, } from 'ts-gib';
import { SaltStrategy } from 'encrypt-gib';

/**
 * Naive selective logging/tracing mechanism.
 */
export const GLOBAL_LOG_A_LOT: boolean | number = false;

export const GLOBAL_DEBUG_BORDER = false;


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
// export const IBGIB_SPACE_UUID_DEFAULT = 'ib';
export const IBGIB_SPACE_NAME_DEFAULT = 'default_space';
export const IBGIB_META_SPACE_NAME_DEFAULT = 'default_meta_space';
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
export const IBGIB_ENCODING = FilesystemEncoding.UTF8;
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
 */
export const ROOT_REL8N_NAME = 'root';
/**
 * A tag ibGib uses this rel8n name for the ibgibs that it targets.
 */
export const TAGGED_REL8N_NAME = 'tagged';
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

export const CONSENSUS_ADDR_SYNC_NAIVE_PUT_MERGE = 'sync naive put merge^gib'

/**
 * These rel8n names are shown in a list view by default.
 */
export const DEFAULT_LIST_REL8N_NAMES: string[] = [
    'pic', 'comment', 'link', 'result', 'import',
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
 * If a comment has only alphanumerics, this is used in the ib.
 */
export const COMMENT_ONLY_HAS_NON_ALPHANUMERICS = '_non-alphanumerics_';

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
export const SAFE_SPECIAL_CHARS = `.'",!?`;

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

/**
 * RegExp for a hexadecimal string of length 32
 */
export const HEXADECIMAL_HASH_STRING_REGEXP_32 = /^[0-9a-fA-F]{32}$/;
/**
 * RegExp for a hexadecimal string of length 64
 */
export const HEXADECIMAL_HASH_STRING_REGEXP_64 = /^[0-9a-fA-F]{64}$/;


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
export const DEFAULT_AWS_MAX_RETRY_THROUGHPUT = 3;
export const DEFAULT_AWS_MAX_RETRY_UNPROCESSED_ITEMS = 5;
export const DEFAULT_AWS_PUT_BATCH_SIZE = 25;
export const DEFAULT_AWS_GET_BATCH_SIZE = 100;
export const DEFAULT_AWS_PUT_THROTTLE_MS = 1000;
export const DEFAULT_AWS_GET_THROTTLE_MS = 500;
/** Will send query commands in parallel in batches of this size.  */
export const DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE = 5;
export const DEFAULT_AWS_RETRY_THROUGHPUT_THROTTLE_MS = 3000;
/**
 * This is returned if we're trying to do things too quickly when batch write/get
 *
 * @link https://docs.aws.amazon.com/AWSJavaSDK/latest/javadoc/com/amazonaws/services/dynamodbv2/model/ProvisionedThroughputExceededException.html
 */
export const AWS_THROUGHPUT_ERROR_NAME = "ProvisionedThroughputExceededException";
export const AWS_ERROR_MSG_ITEM_SIZE_EXCEEDED = "Item size has exceeded the maximum allowed size";

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