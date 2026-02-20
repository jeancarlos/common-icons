/**
 * generate-metadata.mjs
 *
 * Reads the IconEnum from common-react source and the Icon component mapping
 * to produce icons-metadata.json with categories, tags, and source info.
 *
 * When icons can't be categorized by regex rules, calls Gemini CLI to
 * classify them automatically (uses execFileSync — no shell injection risk).
 *
 * Usage: node scripts/generate-metadata.mjs [--common-path /path/to/common-react]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Allow overriding the common-react path via CLI arg
const commonPathArg = process.argv.indexOf('--common-path');
const COMMON_PATH = commonPathArg !== -1
  ? resolve(process.argv[commonPathArg + 1])
  : resolve(ROOT, '../common-react');

// --- Parse IconEnum ---

function parseIconEnum() {
  let content;

  // Try local source first
  try {
    content = readFileSync(resolve(COMMON_PATH, 'src/types/icon.ts'), 'utf-8');
    console.log('Reading enum from local source:', resolve(COMMON_PATH, 'src/types/icon.ts'));
  } catch {
    // Fall back to installed npm package .d.ts
    try {
      const dtsPath = resolve(ROOT, 'node_modules/@zydon/common/dist/types/icon.d.ts');
      content = readFileSync(dtsPath, 'utf-8');
      console.log('Reading enum from npm package:', dtsPath);
    } catch {
      console.error('Could not find icon enum in source or npm package.');
      process.exit(1);
    }
  }

  // Extract enum values: lines like `  WALLET_03 = 'WALLET_03',` or `WALLET_03 = "WALLET_03"`
  const enumRegex = /^\s*(\w+)\s*=\s*["']\1["']/gm;
  const entries = [];
  let match;
  while ((match = enumRegex.exec(content)) !== null) {
    entries.push(match[1]);
  }

  return entries;
}

// --- Parse Icon Component to determine source (hugeicons vs custom) ---

function parseIconSources() {
  let content;
  try {
    content = readFileSync(resolve(COMMON_PATH, 'src/components/Icon/index.tsx'), 'utf-8');
  } catch {
    return {};
  }

  const hugeicons = new Set();
  const custom = new Set();

  // HugeIcons imports: import { ...names } from 'hugeicons-react';
  const hugeImportRegex = /import\s*\{([^}]+)\}\s*from\s*'hugeicons-react'/gs;
  let m;
  while ((m = hugeImportRegex.exec(content)) !== null) {
    const names = m[1].split(',').map(s => s.trim()).filter(Boolean);
    names.forEach(n => hugeicons.add(n));
  }

  // Custom imports: import X from 'assets/...'
  const customImportRegex = /import\s+(\w+)\s+from\s+'assets\//g;
  while ((m = customImportRegex.exec(content)) !== null) {
    custom.add(m[1]);
  }

  // Map enum entries to their sources via the ICONS mapping
  const iconSourceMap = {};

  // Pattern: [IconEnum.ENUM_NAME]: ImportedName
  const mappingRegex = /\[IconEnum\.(\w+)\]\s*:\s*(\w+)/g;
  while ((m = mappingRegex.exec(content)) !== null) {
    const [, enumName, importName] = m;
    if (hugeicons.has(importName)) {
      iconSourceMap[enumName] = 'hugeicons';
    } else if (custom.has(importName)) {
      iconSourceMap[enumName] = 'custom';
    }
  }

  return iconSourceMap;
}

// --- Category & Tag Mapping ---

const CATEGORY_RULES = [
  {
    name: 'AI',
    patterns: [/^AI_/, /^ARTIFICIAL_INTELLIGENCE/, /^MAGIC_AI$/, /^PENCIL_EDIT_AI$/, /^AI_SCREEN$/, /^AI_IDEA$/, /^AI_CHAT_BUBBLE$/, /^AI_PROGRAMMING$/],
    tags: ['artificial intelligence', 'machine learning', 'generative', 'smart', 'auto'],
  },
  {
    name: 'Arrows',
    patterns: [/^ARROW_/, /^CHEVRON_/, /^CIRCLE_ARROW_/, /^COMPARE_ARROWS$/, /^UNFOLD_MORE$/],
    tags: ['navigation', 'direction', 'back', 'forward', 'up', 'down', 'expand', 'collapse'],
  },
  {
    name: 'E-Commerce',
    patterns: [/^SHOPPING_/, /^CART_/, /^STORE_/, /^SALE_TAG/, /^HOT_PRICE$/, /^TROLLEY$/, /^PRODUCT(?!_BOX|_SEARCH)/, /^PRODUCTS$/, /^ORDERS$/, /^BAR_CODE/, /^QR_CODE$/, /^DISCOUNT_/, /^TICKET_BAR_CODE$/, /^PIX$/, /^PROMOTION$/],
    tags: ['shop', 'buy', 'store', 'basket', 'order', 'cart', 'barcode'],
  },
  {
    name: 'Finance',
    patterns: [/^MONEY_/, /^DOLLAR_/, /^WALLET/, /^PAYMENT/, /^TAXES$/, /^BANK$/, /^COINS_/, /^CURRENCY_/, /^CALCULATOR_MONEY$/, /^REVERSE_WITHDRAWAL/, /^WITHDRAW$/, /^INVOICE/, /^CREDIT_CARD/, /^COMPUTER_DOLLAR$/, /^TRADE_/, /^TRANSACTION_HISTORY$/, /^CARDS$/],
    tags: ['payment', 'banking', 'currency', 'transfer', 'withdraw', 'money'],
  },
  {
    name: 'Payment Cards',
    patterns: [/^MERCADO_PAGO$/, /^AMAZON_PAY$/, /^GOOGLE_PAY$/, /^PAYPAL$/, /^APPLE_PAY$/, /^ELO$/, /^MASTERCARD$/, /^AMERICAN_EXPRESS$/, /^DINERS_CLUB$/, /^CIRRUS$/, /^VISA$/, /^HIPERCARD$/, /^JCB$/, /^UNIONPAY$/, /^MAESTRO$/, /^HIPER$/, /^DISCOVER$/, /^CVC$/],
    tags: ['credit', 'debit', 'card brand', 'payment method'],
  },
  {
    name: 'Payment Badges',
    patterns: [/_BADGE$/],
    tags: ['payment method', 'checkout', 'badge'],
  },
  {
    name: 'Users',
    patterns: [/^USER_/, /^USER$/, /^ACCOUNT_/, /^PROFILE$/, /^ADD_USER/, /^MANAGER$/, /^MENTORING$/],
    tags: ['people', 'profile', 'team', 'group', 'person', 'account'],
  },
  {
    name: 'Files & Documents',
    patterns: [/^FILE/, /^EDIT_FILE$/, /^CHECKED_FILE$/, /^ADD_FILE$/, /^SEND_FILE$/, /^SHARE_FILE$/, /^SEARCH_FILE$/, /^ANNEXED_FILE$/, /^IC_/, /^MEDIA_/, /^XML_FILE/, /^GOOGLE_SHEET$/, /^WAVE_FILE$/, /^CHECK_SUCCESS_FILE$/, /^FILE_STAR$/, /^NOTE_/, /^DOCUMENT_CODE$/, /^FOLDER_/, /^FOLDER_OPEN$/, /^PDF_ICON$/, /^ATTACHMENT$/, /^LICENSE_ARTICLE$/],
    tags: ['document', 'attachment', 'upload', 'file type'],
  },
  {
    name: 'Communication',
    patterns: [/^MESSAGE_/, /^CHAT/, /^MAIL/, /^NOTIFICATION$/, /^BELL_/, /^BUBBLE_CHAT/, /^DOUBLE_CHAT/, /^PERSON_CHAT/, /^HEADSET$/, /^TELEPHONE$/, /^ERROR_BELL$/],
    tags: ['email', 'notify', 'alert', 'inbox', 'chat', 'message'],
  },
  {
    name: 'Status & Feedback',
    patterns: [/^CHECK_CIRCLE$/, /^CHECK_MARK/, /^SIMPLE_CHECK$/, /^ALERT_/, /^WARNING_/, /^INFO$/, /^INFO_CIRCLE$/, /^HELP_/, /^VERIFIED$/, /^HEXAGON_WARNING$/, /^CHECKMARK_/, /^THUMBS_/, /^CANCEL_CIRCLE/, /^PASSPORT_/, /^CHECK_LIST$/, /^INFORMATIONS$/],
    tags: ['success', 'error', 'confirm', 'validate', 'status', 'feedback'],
  },
  {
    name: 'Add & Remove',
    patterns: [/^ADD_CIRCLE$/, /^SIMPLE_ADD$/, /^MINUS_/, /^DELETE_/, /^CLOSE_MARK/, /^SUBNODE_ADD$/, /^TASK_ADD/, /^PACKAGE_ADD$/, /^PACKAGE_REMOVE$/, /^PROPERTY_DELETE$/, /^ADD_TO_LIST$/],
    tags: ['create', 'remove', 'cancel', 'clear', 'add'],
  },
  {
    name: 'Filter & Sort',
    patterns: [/^FILTER_/, /^SORTING_/, /^SORT_/, /^ORDENATING$/, /^PREFERENCE_HORIZONTAL$/],
    tags: ['order', 'ascending', 'descending', 'organize', 'filter'],
  },
  {
    name: 'Search',
    patterns: [/^SEARCH_(?!FILE)/, /^SEARCHING$/, /^ZOOM_/],
    tags: ['find', 'lookup', 'magnifying glass', 'search'],
  },
  {
    name: 'Settings & Tools',
    patterns: [/^SETTINGS$/, /^SLIDERS_HORIZONTAL$/, /^DASHBOARD_CIRCLE_SETTINGS$/, /^LIST_SETTING$/, /^TIME_SETTING$/, /^COMPUTER_SETTINGS/, /^TOOLS$/, /^WRENCH_/, /^PLUG_SOCKET$/, /^WEBHOOK$/, /^CUSTOMIZE$/],
    tags: ['config', 'preferences', 'gear', 'options', 'tools'],
  },
  {
    name: 'Layout & Views',
    patterns: [/^LIST_(?!CLOCK|SETTING)/, /^GRID_/, /^DASHBOARD_(?!CIRCLE)/, /^TABLE$/, /^COLUMN(?!_CHART)/, /^LAYOUT_/, /^VIEW_COLUMN$/, /^SIDEBAR_/, /^SIMPLE_LIST$/, /^COLUMNS$/, /^HORIZONTAL_LIST/, /^HORIZONTAL_LINES/, /^CAROUSEL_/, /^ALIGN_BOX/, /^TORN_LIST$/, /^MORE_GRID$/, /^INSERT_ROW$/],
    tags: ['view', 'display', 'board', 'grid', 'list', 'layout'],
  },
  {
    name: 'Data & Analytics',
    patterns: [/^CHART/, /^ANALYTICS/, /^BLOCKCHAIN$/, /^COLUMN_CHART$/, /^DATABASE/],
    tags: ['graph', 'metrics', 'statistics', 'report', 'data', 'database'],
  },
  {
    name: 'Social Media',
    patterns: [/^FACEBOOK/, /^INSTAGRAM$/, /^YOUTUBE$/, /^LINKEDIN$/, /^WHATSAPP$/, /^WHATSAPP_ICON$/, /^DISCORD$/, /^TIKTOK$/, /^X$/, /^GOOGLE$/],
    tags: ['social', 'network', 'share'],
  },
  {
    name: 'Editing',
    patterns: [/^PENCIL(?!_EDIT_AI)/, /^PAINT_/, /^COPY_/, /^SHARE_(?!FILE)/, /^DRAG_/, /^SAVE_/, /^TEXT_(?!NUMBER)/, /^TEXT$/, /^HTML$/, /^JSON$/, /^SQL$/, /^SOURCE_CODE$/, /^CODE_FOLDER$/],
    tags: ['write', 'draw', 'duplicate', 'clipboard', 'edit'],
  },
  {
    name: 'Logistics',
    patterns: [/^TRUCK/, /^SHIPPING_/, /^DELIVERY_/, /^PACKAGE_MOVING$/, /^PACKAGE_OPEN$/, /^PACKAGE$/, /^BOX$/, /^OPENED_BOX$/, /^SIZE_BOX$/, /^PRODUCT_BOX$/, /^PRODUCT_SEARCH_BOX$/],
    tags: ['transport', 'tracking', 'shipping', 'delivery', 'package'],
  },
  {
    name: 'Branding',
    patterns: [/^ZYDON/, /^ZOE_AI$/],
    tags: ['logo', 'brand', 'identity'],
  },
  {
    name: 'Flags',
    patterns: [/_FLAG$/, /^FLAG_/],
    tags: ['country', 'language', 'locale'],
  },
  {
    name: 'Security',
    patterns: [/^SECURITY/, /^LOCK_/, /^LOCKED$/, /^VIEW_OFF$/, /^AUTHORIZED$/, /^KEY_ACCESS$/, /^SQUARE_LOCK/, /^ACCESS$/],
    tags: ['privacy', 'password', 'authentication', 'security'],
  },
  {
    name: 'Media',
    patterns: [/^PLAY_/, /^PAUSE/, /^MIC_/, /^ADD_IMAGE$/, /^INSERT_CENTER_IMAGE$/, /^SEARCH_IMAGE$/, /^PLAY_EXECUTE$/],
    tags: ['audio', 'video', 'media', 'play', 'record'],
  },
  {
    name: 'Time & Calendar',
    patterns: [/^CALENDAR/, /^SELECT_HOUR/, /^COUNTER_CLOCK$/, /^CLOCK_/, /^DATE_TIME$/, /^INTERVAL_DATE$/, /^HOURGLASS$/, /^TIME_LIST$/, /^LIST_CLOCK$/],
    tags: ['date', 'time', 'schedule', 'calendar', 'clock'],
  },
  {
    name: 'Navigation',
    patterns: [/^HOME_/, /^MENU_/, /^OPEN_IN_NEW/, /^LOGOUT_/, /^DIRECTIONS$/, /^LOCATION_/, /^EARTH_/, /^INTERNET$/, /^GLOBAL_ICON$/],
    tags: ['home', 'menu', 'navigation', 'link', 'location'],
  },
  {
    name: 'Product Categories',
    patterns: [/^BONE$/, /^BLENDER$/, /^VEGETARIAN_FOOD$/, /^AUTOMOTIVE_BATTERY/, /^LAPTOP$/, /^NECKLACE$/, /^VYNIL_/, /^GAMEBOY$/, /^BLUSH_BRUSH/, /^RUNNING_SHOES$/, /^BABY_BOY_DRESS$/, /^MEDICINE_/, /^CRANE$/, /^WARDROBE_/, /^PERFUME$/, /^LAMP_/, /^STATIONERY$/],
    tags: ['product category', 'industry', 'department'],
  },
  {
    name: 'Development',
    patterns: [/^GITHUB/, /^REPOSITORY$/, /^COMPUTER_PROGRAMMING/, /^PUZZLE_STROKE/, /^CHART_RELATIONSHIP/, /^FLOW/, /^SMART_PHONE/, /^COMPUTER$/],
    tags: ['code', 'programming', 'development', 'api'],
  },
  {
    name: 'UI Controls',
    patterns: [/^TOGGLE_/, /^RADIO_BUTTON/, /^CHECK_BOX$/, /^DROPDOWN$/, /^SQUARE_FILL$/, /^DOT$/, /^CIRCLE$/, /^PERCENT/, /^DECIMAL$/, /^DECIMAL_INCREASE$/, /^INTEGER_NUMBER$/, /^NUMBER_ONE_OUTLINE$/, /^TEXT_NUMBER_SIGN$/, /^LOW_PRIORITY$/, /^CALCULATE_SIGNS$/],
    tags: ['input', 'control', 'form', 'toggle', 'checkbox', 'radio'],
  },
  {
    name: 'Cloud & Transfer',
    patterns: [/^CLOUD_/, /^DOWNLOAD_/, /^UPLOAD$/, /^INBOX_DOWNLOAD$/, /^SENT$/, /^LINK_HORIZONTAL$/],
    tags: ['cloud', 'download', 'upload', 'transfer', 'sync'],
  },
  {
    name: 'Business',
    patterns: [/^OFFICE$/, /^CORPORATE$/, /^BUILDING$/, /^FACTORY_/, /^HAND_BAG_BRIEFCASE$/, /^DISTRIBUTION$/],
    tags: ['business', 'company', 'office', 'enterprise', 'corporate'],
  },
  {
    name: 'Interface',
    patterns: [/^RELOAD_REFRESH$/, /^REFRESH_CHANGE$/, /^EXPAND_FULL_SCREEN$/, /^MAXIMIZE_SCREEN$/, /^MINIMIZE_SCREEN$/, /^MORE_OPTIONS_VERTICAL$/, /^MORE_03$/, /^MORE$/, /^MORE_BOLD$/, /^CURSOR_IN_WINDOW$/, /^LAYERS$/, /^PRINTER$/, /^SUMMATION$/, /^VIEW_ON$/, /^REPEATE_ONE_02$/, /^CLEAN$/, /^TOUCH_INTERACTION$/, /^BANNER$/, /^MINI_BANNER$/, /^RULER$/, /^CREATIVE_MARKET$/, /^FLASH_ROUNDED$/, /^FLASH_STROKE_ROUNDED$/, /^ZAP_ICON$/, /^IDEA$/, /^ROCKET$/, /^REVERSE$/, /^TASK_01$/, /^SAVE_MARK$/, /^FAVOURITE/, /^STAR$/, /^STAR_02$/],
    tags: ['interface', 'action', 'ui', 'interaction'],
  },
];

const VALID_CATEGORIES = new Set(CATEGORY_RULES.map(c => c.name));

function enumToDisplayName(enumName) {
  return enumName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\b0(\d)\b/g, '$1');
}

function enumToKebab(enumName) {
  return enumName.toLowerCase().replace(/_/g, '-');
}

function categorizeIcon(enumName) {
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(enumName)) {
        return rule;
      }
    }
  }
  return null;
}

function generateNameTags(enumName) {
  return enumName
    .toLowerCase()
    .split('_')
    .filter(w => w.length > 1 && !/^\d+$/.test(w));
}

// --- Gemini AI Categorization ---

function isGeminiAvailable() {
  try {
    execFileSync('which', ['gemini'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function geminiCategorize(uncategorizedIcons) {
  const categoryList = CATEGORY_RULES
    .map(c => `- ${c.name}: ${c.tags.join(', ')}`)
    .join('\n');

  const iconList = uncategorizedIcons.map(i => i.enumName).join(', ');

  const prompt = [
    'You are categorizing design system icons for a searchable catalog.',
    '',
    'Context: A React design system with 498+ icons from HugeIcons (open source)',
    'and custom SVGs. Icons are named in SCREAMING_SNAKE_CASE.',
    '',
    '## Available Categories (use ONLY these, do NOT invent new ones)',
    '',
    categoryList,
    '',
    '## Icons to Categorize',
    '',
    'These icons could not be matched by regex rules. Based on the enum name,',
    'determine what the icon represents and assign the best category.',
    '',
    iconList,
    '',
    '## Output',
    '',
    'Respond with ONLY a valid JSON array. No markdown fences, no explanation.',
    '',
    '[{"enumName":"ICON_NAME","category":"Category Name","tags":["tag1","tag2","tag3"]}]',
    '',
    'Rules:',
    '- Use ONLY categories from the list above',
    '- If nothing fits well, use "Interface" as fallback',
    '- 3-5 tags per icon, lowercase, describing purpose and visual appearance',
    '- Every icon in the list MUST appear in the output',
  ].join('\n');

  try {
    // execFileSync bypasses shell — safe from injection
    // Uses flash-lite: free tier, no API cost
    const raw = execFileSync('gemini', ['-m', 'gemini-2.0-flash-lite', '-p', prompt, '-o', 'text'], {
      encoding: 'utf-8',
      timeout: 120_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Extract JSON array from response (Gemini may wrap in markdown fences)
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('  Could not extract JSON from Gemini response');
      return [];
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    // Validate: only accept known categories
    return suggestions.filter(s =>
      s.enumName && s.category && VALID_CATEGORIES.has(s.category) && Array.isArray(s.tags)
    );
  } catch (err) {
    console.warn(`  Gemini call failed: ${err.message}`);
    return [];
  }
}

// --- Main ---

const entries = parseIconEnum();
console.log(`Found ${entries.length} icon enum entries`);

const iconSourceMap = parseIconSources();
console.log(`Mapped ${Object.keys(iconSourceMap).length} icons to sources`);

const metadata = entries.map(enumName => {
  const rule = categorizeIcon(enumName);
  const category = rule ? rule.name : 'Uncategorized';
  const categoryTags = rule ? rule.tags : [];
  const nameTags = generateNameTags(enumName);
  const source = iconSourceMap[enumName] || 'unknown';

  const tags = [...new Set([...categoryTags, ...nameTags, category.toLowerCase()])];

  return {
    enumName,
    displayName: enumToDisplayName(enumName),
    category,
    tags,
    source,
    svgPath: `svgs/${enumToKebab(category)}/${enumToKebab(enumName)}.svg`,
  };
});

// --- Gemini pass for uncategorized icons ---

const uncategorized = metadata.filter(m => m.category === 'Uncategorized');

if (uncategorized.length > 0) {
  console.log(`\n${uncategorized.length} uncategorized icon(s) — requesting Gemini categorization...`);

  if (isGeminiAvailable()) {
    const suggestions = geminiCategorize(uncategorized);

    if (suggestions.length > 0) {
      let applied = 0;
      for (const s of suggestions) {
        const icon = metadata.find(m => m.enumName === s.enumName);
        if (icon && icon.category === 'Uncategorized') {
          icon.category = s.category;
          icon.tags = [...new Set([...s.tags, ...icon.tags, s.category.toLowerCase()])];
          icon.svgPath = `svgs/${enumToKebab(icon.category)}/${enumToKebab(icon.enumName)}.svg`;
          applied++;
        }
      }
      console.log(`  Applied ${applied}/${uncategorized.length} Gemini suggestions`);
    } else {
      console.log('  Gemini returned no valid suggestions');
    }
  } else {
    console.log('  Gemini CLI not available — icons remain uncategorized');
  }
}

// Stats
const categories = {};
for (const icon of metadata) {
  categories[icon.category] = (categories[icon.category] || 0) + 1;
}
console.log('\nCategories:');
for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count}`);
}

const uncatFinal = metadata.filter(m => m.category === 'Uncategorized');
if (uncatFinal.length > 0) {
  console.log(`\nWARNING: ${uncatFinal.length} icon(s) still uncategorized:`);
  uncatFinal.forEach(i => console.log(`  - ${i.enumName}`));
}

// Write metadata
mkdirSync(resolve(ROOT, 'public'), { recursive: true });
writeFileSync(
  resolve(ROOT, 'public/icons-metadata.json'),
  JSON.stringify(metadata, null, 2),
);
console.log(`\nWrote ${metadata.length} icons to public/icons-metadata.json`);
