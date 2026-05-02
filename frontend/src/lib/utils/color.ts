export function cssVar(name: string): string {
	const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	if (!raw) return '';
	if (raw.startsWith('#') || raw.startsWith('rgb')) return raw;
	if (raw.startsWith('oklch') || raw.startsWith('hsl') || raw.startsWith('lab') || raw.startsWith('lch')) {
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		const ctx = canvas.getContext('2d');
		if (!ctx) return raw;
		ctx.fillStyle = raw;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
	}
	return raw;
}
