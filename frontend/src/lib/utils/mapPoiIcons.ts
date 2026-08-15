import type maplibregl from 'maplibre-gl';
import type { RoadPoiKind } from '$lib/services/external/overpass';
import { cssVar } from '$lib/utils/color';

const SIZE = 64;
const PIXEL_RATIO = 2;

function tone(variable: string, fallback: string): string {
	return cssVar(variable) || fallback;
}

function canvas(draw: (context: CanvasRenderingContext2D) => void): ImageData {
	const element = document.createElement('canvas');
	element.width = SIZE;
	element.height = SIZE;
	const context = element.getContext('2d');
	if (!context) throw new Error('Canvas indisponível');
	context.lineCap = 'round';
	context.lineJoin = 'round';
	draw(context);
	return context.getImageData(0, 0, SIZE, SIZE);
}

function trafficSignal(): ImageData {
	return canvas((context) => {
		context.fillStyle = tone('--color-surface-950', '#080b12');
		context.strokeStyle = tone('--color-surface-50', '#f8fafc');
		context.lineWidth = 5;
		context.beginPath();
		context.roundRect(19, 5, 26, 45, 10);
		context.fill();
		context.stroke();
		context.fillStyle = tone('--color-ride-danger-300', '#fb7185');
		context.beginPath();
		context.arc(32, 16, 5, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = tone('--color-ride-alert-300', '#fcd34d');
		context.beginPath();
		context.arc(32, 28, 5, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = tone('--color-ride-safe-300', '#6ee7b7');
		context.beginPath();
		context.arc(32, 40, 5, 0, Math.PI * 2);
		context.fill();
		context.strokeStyle = tone('--color-surface-50', '#f8fafc');
		context.lineWidth = 5;
		context.beginPath();
		context.moveTo(32, 52);
		context.lineTo(32, 59);
		context.stroke();
	});
}

function speedCamera(): ImageData {
	return canvas((context) => {
		context.fillStyle = tone('--color-ride-danger-500', '#ef4444');
		context.strokeStyle = tone('--color-surface-950', '#080b12');
		context.lineWidth = 5;
		context.beginPath();
		context.roundRect(8, 17, 42, 31, 9);
		context.fill();
		context.stroke();
		context.beginPath();
		context.moveTo(50, 25);
		context.lineTo(59, 20);
		context.lineTo(59, 45);
		context.lineTo(50, 40);
		context.closePath();
		context.fill();
		context.stroke();
		context.fillStyle = tone('--color-surface-50', '#f8fafc');
		context.beginPath();
		context.arc(28, 32, 9, 0, Math.PI * 2);
		context.fill();
		context.fillStyle = tone('--color-surface-950', '#080b12');
		context.beginPath();
		context.arc(28, 32, 4, 0, Math.PI * 2);
		context.fill();
	});
}

function stopSign(): ImageData {
	return canvas((context) => {
		const points = [[23, 6], [41, 6], [58, 23], [58, 41], [41, 58], [23, 58], [6, 41], [6, 23]];
		context.fillStyle = tone('--color-ride-danger-500', '#ef4444');
		context.strokeStyle = tone('--color-surface-50', '#f8fafc');
		context.lineWidth = 5;
		context.beginPath();
		points.forEach(([x, y], index) => index === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
		context.closePath();
		context.fill();
		context.stroke();
		context.fillStyle = tone('--color-surface-50', '#f8fafc');
		context.font = '800 17px system-ui, sans-serif';
		context.textAlign = 'center';
		context.textBaseline = 'middle';
		context.fillText('PARE', 32, 33);
	});
}

function speedBump(): ImageData {
	return canvas((context) => {
		context.strokeStyle = tone('--color-surface-950', '#080b12');
		context.lineWidth = 13;
		context.beginPath();
		context.moveTo(7, 48);
		context.bezierCurveTo(18, 48, 19, 22, 32, 22);
		context.bezierCurveTo(45, 22, 46, 48, 57, 48);
		context.stroke();
		context.strokeStyle = tone('--color-ride-location-300', '#a78bfa');
		context.lineWidth = 7;
		context.stroke();
		context.strokeStyle = tone('--color-surface-50', '#f8fafc');
		context.lineWidth = 4;
		context.beginPath();
		context.moveTo(7, 56);
		context.lineTo(57, 56);
		context.stroke();
	});
}

export function registerRoadPoiIcons(map: maplibregl.Map): void {
	const icons: [RoadPoiKind, ImageData][] = [
		['traffic_signals', trafficSignal()],
		['speed_camera', speedCamera()],
		['stop', stopSign()],
		['traffic_calming', speedBump()]
	];
	icons.forEach(([kind, image]) => {
		const name = `road-poi-${kind}`;
		if (!map.hasImage(name)) map.addImage(name, image, { pixelRatio: PIXEL_RATIO });
	});
}

export function roadPoiPriority(kind: RoadPoiKind): number {
	if (kind === 'speed_camera') return 0;
	if (kind === 'traffic_signals') return 1;
	if (kind === 'stop') return 2;
	return 3;
}
