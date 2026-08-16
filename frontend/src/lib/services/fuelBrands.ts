export type FuelBrandKey = 'petrobras' | 'shell' | 'ipiranga' | 'ale';

interface BrandRule {
	key: FuelBrandKey;
	label: string;
	wikidata: string[];
	exact: string[];
	matches: RegExp;
}

const BRAND_RULES: BrandRule[] = [
	{
		key: 'petrobras',
		label: 'Petrobras',
		wikidata: ['Q4836468', 'Q873274'],
		exact: ['br', 'posto br'],
		matches: /(^|[^\p{L}\p{N}])(petrobr[áa]s|vibra energia)([^\p{L}\p{N}]|$)/iu
	},
	{
		key: 'shell',
		label: 'Shell',
		wikidata: ['Q110716465', 'Q154950'],
		exact: [],
		matches: /(^|[^\p{L}\p{N}])(shell|ra[íi]zen)([^\p{L}\p{N}]|$)/iu
	},
	{
		key: 'ipiranga',
		label: 'Ipiranga',
		wikidata: ['Q2081136'],
		exact: [],
		matches: /(^|[^\p{L}\p{N}])ipiranga([^\p{L}\p{N}]|$)/iu
	},
	{
		key: 'ale',
		label: 'Ale',
		wikidata: ['Q9600717'],
		exact: ['ale', 'posto ale'],
		matches: /(^|[^\p{L}\p{N}])ale combust[íi]veis([^\p{L}\p{N}]|$)/iu
	}
];

export const BRAND_PRIORITY: FuelBrandKey[] = ['petrobras', 'shell', 'ipiranga'];

export function brandLabel(key: FuelBrandKey): string {
	return BRAND_RULES.find((rule) => rule.key === key)?.label ?? key;
}

export function detectBrand(tags: Record<string, string> | undefined): FuelBrandKey | null {
	if (!tags) return null;

	const wikidata = tags['brand:wikidata'] ?? tags['operator:wikidata'];
	if (wikidata) {
		const byId = BRAND_RULES.find((rule) => rule.wikidata.includes(wikidata));
		if (byId) return byId.key;
	}

	for (const field of ['brand', 'operator']) {
		const value = tags[field]?.trim().toLowerCase();
		if (!value) continue;
		const byExact = BRAND_RULES.find((rule) => rule.exact.includes(value));
		if (byExact) return byExact.key;
	}

	for (const field of ['brand', 'operator', 'name']) {
		const value = tags[field];
		if (!value) continue;
		const byText = BRAND_RULES.find((rule) => rule.matches.test(value));
		if (byText) return byText.key;
	}

	return null;
}

const GASEOUS_ONLY = /^fuel:(cng|gnv|lpg)$/i;

export function sellsLiquidFuel(tags: Record<string, string> | undefined): boolean {
	if (!tags) return true;
	const fuelKeys = Object.keys(tags).filter((key) => key.startsWith('fuel:') && tags[key] === 'yes');
	if (fuelKeys.length === 0) return true;
	return fuelKeys.some((key) => !GASEOUS_ONLY.test(key));
}
