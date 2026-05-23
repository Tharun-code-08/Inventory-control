/**
 * Offline HSN suggestions for Indian GST (4/6/8 digit codes).
 * Not legal advice — users should verify codes on the GST portal before filing.
 */

export type HsnSuggestion = {
  code: string;
  description: string;
  source: 'gst' | 'category' | 'keyword';
  confidence: 'high' | 'medium';
};

/** Keyword rules: longest match wins. Extend as you onboard more product families. */
const KEYWORD_RULES: Array<{ keywords: string[]; code: string; description: string }> = [
  { keywords: ['petrol engine', 'diesel engine', 'internal combustion engine'], code: '84072900', description: 'Spark-ignition engines' },
  { keywords: ['engine', 'motor assembly'], code: '84072900', description: 'Engines (general)' },
  { keywords: ['bolt', 'screw', 'fastener', 'nut and bolt'], code: '73181500', description: 'Threaded fasteners' },
  { keywords: ['stainless steel', 'ss sheet', 'steel plate'], code: '72193400', description: 'Stainless steel flat-rolled' },
  { keywords: ['rice', 'basmati', 'paddy'], code: '10063010', description: 'Rice' },
  { keywords: ['wheat flour', 'atta', 'flour'], code: '11010000', description: 'Wheat flour' },
  { keywords: ['cooking oil', 'sunflower oil', 'edible oil'], code: '15121900', description: 'Edible vegetable oils' },
  { keywords: ['tea', 'black tea', 'green tea'], code: '09024020', description: 'Tea' },
  { keywords: ['coffee'], code: '09012100', description: 'Coffee' },
  { keywords: ['milk powder', 'dairy milk'], code: '04022100', description: 'Milk powder' },
  { keywords: ['biscuit', 'cookie', 'snack'], code: '19053100', description: 'Biscuits' },
  { keywords: ['soap', 'detergent', 'washing powder'], code: '34012000', description: 'Soap / detergents' },
  { keywords: ['shampoo', 'hair care'], code: '33051090', description: 'Hair care preparations' },
  { keywords: ['mobile phone', 'smartphone', 'cell phone'], code: '85171300', description: 'Smartphones' },
  { keywords: ['laptop', 'notebook computer'], code: '84713010', description: 'Portable computers' },
  { keywords: ['computer', 'desktop', 'monitor'], code: '84714190', description: 'Data processing machines' },
  { keywords: ['cable', 'wire', 'electrical wire'], code: '85444999', description: 'Electric conductors' },
  { keywords: ['switch', 'socket', 'mcb', 'electrical panel'], code: '85365090', description: 'Electrical switches/apparatus' },
  { keywords: ['led bulb', 'led light', 'tube light'], code: '85395200', description: 'LED lamps' },
  { keywords: ['paint', 'enamel paint', 'primer'], code: '32091090', description: 'Paints and varnishes' },
  { keywords: ['pipe', 'pvc pipe', 'hdpe pipe'], code: '39172390', description: 'Plastic tubes/pipes' },
  { keywords: ['valve', 'ball valve', 'gate valve'], code: '84818030', description: 'Valves' },
  { keywords: ['pump', 'water pump', 'centrifugal pump'], code: '84137091', description: 'Pumps' },
  { keywords: ['bearing', 'ball bearing'], code: '84821020', description: 'Ball bearings' },
  { keywords: ['tyre', 'tire', 'automobile tyre'], code: '40111010', description: 'Pneumatic tyres' },
  { keywords: ['battery', 'lithium battery', 'inverter battery'], code: '85076000', description: 'Lithium batteries' },
  { keywords: ['furniture', 'chair', 'table wood'], code: '94036000', description: 'Wooden furniture' },
  { keywords: ['paper', 'a4 paper', 'copier paper'], code: '48025690', description: 'Paper stationery' },
  { keywords: ['pen', 'ball pen', 'stationery pen'], code: '96081019', description: 'Ball-point pens' },
  { keywords: ['cement', 'portland cement'], code: '25232930', description: 'Portland cement' },
  { keywords: ['brick', 'clay brick', 'building brick'], code: '69041000', description: 'Building bricks' },
  { keywords: ['sand', 'construction sand'], code: '25059000', description: 'Natural sands' },
  { keywords: ['aggregate', 'crushed stone', 'gravel'], code: '25171010', description: 'Crushed stone aggregates' },
  { keywords: ['rebar', 'tmt bar', 'steel bar'], code: '72142090', description: 'Steel bars and rods' },
  { keywords: ['angle', 'channel', 'i beam', 'structural steel'], code: '72163200', description: 'Structural steel sections' },
  { keywords: ['aluminium sheet', 'aluminum sheet', 'alu sheet'], code: '76061290', description: 'Aluminium plates/sheets' },
  { keywords: ['copper wire', 'copper cable'], code: '74081100', description: 'Copper wire' },
  { keywords: ['glass bottle', 'glass jar'], code: '70109000', description: 'Glass containers' },
  { keywords: ['plastic bottle', 'pet bottle'], code: '39233090', description: 'Plastic bottles' },
  { keywords: ['carton', 'corrugated box', 'packaging box'], code: '48191000', description: 'Corrugated cartons' },
  { keywords: ['packing tape', 'adhesive tape', 'bopp tape'], code: '39191000', description: 'Self-adhesive tapes' },
  { keywords: ['gloves', 'safety gloves', 'rubber gloves'], code: '40151900', description: 'Rubber gloves' },
  { keywords: ['helmet', 'safety helmet', 'hard hat'], code: '65061010', description: 'Safety headgear' },
  { keywords: ['mask', 'face mask', 'surgical mask'], code: '63079090', description: 'Textile face masks' },
  { keywords: ['sanitizer', 'hand sanitizer'], code: '38089400', description: 'Disinfectants / sanitizer' },
  { keywords: ['fertilizer', 'urea', 'npk'], code: '31021010', description: 'Fertilizers' },
  { keywords: ['pesticide', 'insecticide', 'herbicide'], code: '38089199', description: 'Pesticides' },
  { keywords: ['seed', 'vegetable seed'], code: '12099190', description: 'Seeds for sowing' },
  { keywords: ['spice', 'masala', 'turmeric', 'chilli powder'], code: '09103030', description: 'Spices' },
  { keywords: ['sugar', 'refined sugar'], code: '17019990', description: 'Sugar' },
  { keywords: ['salt', 'iodized salt'], code: '25010010', description: 'Salt' },
  { keywords: ['honey', 'natural honey'], code: '04090000', description: 'Natural honey' },
  { keywords: ['juice', 'fruit juice'], code: '20098990', description: 'Fruit juices' },
  { keywords: ['soft drink', 'cola', 'carbonated beverage'], code: '22021010', description: 'Soft drinks' },
  { keywords: ['mineral water', 'packaged water'], code: '22011010', description: 'Packaged drinking water' },
  { keywords: ['beer', 'wine', 'liquor', 'alcohol'], code: '22030000', description: 'Beer' },
  { keywords: ['cigarette', 'tobacco'], code: '24022090', description: 'Cigarettes' },
  { keywords: ['medicine', 'tablet', 'pharmaceutical'], code: '30049099', description: 'Medicaments' },
  { keywords: ['syringe', 'needle', 'medical disposable'], code: '90183100', description: 'Medical syringes' },
  { keywords: ['wheelchair', 'walker', 'crutches'], code: '90211000', description: 'Orthopaedic appliances' },
  { keywords: ['air conditioner', 'ac unit', 'split ac'], code: '84151010', description: 'Air conditioning machines' },
  { keywords: ['refrigerator', 'fridge', 'freezer'], code: '84182100', description: 'Refrigerators / freezers' },
  { keywords: ['washing machine', 'washer'], code: '84501100', description: 'Washing machines' },
  { keywords: ['microwave', 'oven', 'cooking range'], code: '85166000', description: 'Electric ovens / microwaves' },
  { keywords: ['fan', 'ceiling fan', 'exhaust fan'], code: '84145100', description: 'Electric fans' },
  { keywords: ['heater', 'geyser', 'water heater'], code: '85161000', description: 'Electric water heaters' },
  { keywords: ['printer', 'toner', 'cartridge'], code: '84433290', description: 'Printers / cartridges' },
  { keywords: ['router', 'modem', 'network switch'], code: '85176290', description: 'Network equipment' },
  { keywords: ['cctv', 'camera', 'surveillance'], code: '85258090', description: 'Cameras / CCTV' },
  { keywords: ['ups', 'inverter', 'stabilizer'], code: '85044090', description: 'Power supplies / UPS' },
  { keywords: ['solar panel', 'photovoltaic'], code: '85414011', description: 'Solar cells / panels' },
  { keywords: ['generator', 'dg set', 'diesel generator'], code: '85021200', description: 'Electric generators' },
  { keywords: ['tool', 'hand tool', 'spanner', 'wrench'], code: '82041110', description: 'Hand tools' },
  { keywords: ['drill', 'grinder', 'power tool'], code: '84672900', description: 'Power tools' },
  { keywords: ['welding', 'electrode', 'welding rod'], code: '83112000', description: 'Welding consumables' },
  { keywords: ['lubricant', 'engine oil', 'grease'], code: '27101980', description: 'Lubricating oils' },
  { keywords: ['fuel', 'diesel', 'petrol', 'gasoline'], code: '27101940', description: 'Motor spirit / diesel' },
  { keywords: ['lpg', 'cylinder gas'], code: '27111900', description: 'LPG' },
  { keywords: ['tyre tube', 'inner tube'], code: '40139020', description: 'Tyre inner tubes' },
  { keywords: ['spare part', 'auto part', 'clutch plate'], code: '87089900', description: 'Motor vehicle parts' },
  { keywords: ['two wheeler', 'motorcycle', 'scooter'], code: '87112029', description: 'Motorcycles' },
  { keywords: ['bicycle', 'cycle'], code: '87120010', description: 'Bicycles' },
  { keywords: ['toy', 'plastic toy'], code: '95030030', description: 'Toys' },
  { keywords: ['garment', 'shirt', 't shirt', 'apparel'], code: '61091000', description: 'T-shirts / knitted garments' },
  { keywords: ['saree', 'fabric', 'textile'], code: '52081120', description: 'Woven cotton fabrics' },
  { keywords: ['footwear', 'shoe', 'sandal'], code: '64039990', description: 'Footwear' },
  { keywords: ['bag', 'backpack', 'handbag'], code: '42021290', description: 'Bags' },
  { keywords: ['watch', 'wrist watch'], code: '91021100', description: 'Wrist watches' },
  { keywords: ['jewellery', 'gold ornament', 'silver'], code: '71131910', description: 'Jewellery' },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match product description (and optional category name) to a known HSN rule.
 * Sorted by keyword length so "petrol engine" beats "engine".
 */
export function suggestHsnFromDescription(
  description: string,
  categoryName?: string,
): HsnSuggestion | null {
  const haystack = normalizeText([description, categoryName].filter(Boolean).join(' '));
  if (haystack.length < 3) return null;

  const sorted = [...KEYWORD_RULES].sort(
    (a, b) =>
      Math.max(...b.keywords.map((k) => k.length)) -
      Math.max(...a.keywords.map((k) => k.length)),
  );

  for (const rule of sorted) {
    const hit = rule.keywords.find((kw) => haystack.includes(normalizeText(kw)));
    if (hit) {
      return {
        code: rule.code,
        description: rule.description,
        source: 'keyword',
        confidence: hit.length >= 8 ? 'high' : 'medium',
      };
    }
  }
  return null;
}

export function suggestHsnFromCategoryDefault(
  categoryName: string,
  defaultHsnCode?: string | null,
): HsnSuggestion | null {
  const code = defaultHsnCode?.trim();
  if (!code || !/^\d{4}(\d{2}){0,2}$/.test(code)) return null;
  return {
    code,
    description: `${categoryName} (category default)`,
    source: 'category',
    confidence: 'high',
  };
}

/** Prefer category default, then description keywords. */
export function resolveHsnSuggestion(args: {
  description: string;
  categoryName?: string;
  categoryDefaultHsn?: string | null;
}): HsnSuggestion | null {
  return (
    suggestHsnFromCategoryDefault(args.categoryName ?? '', args.categoryDefaultHsn) ??
    suggestHsnFromDescription(args.description, args.categoryName)
  );
}
