import { mount, unmount } from 'svelte';
import { MapPin } from 'lucide-svelte';

export interface MarkerVisual {
	element: HTMLDivElement;
	destroy: () => void;
}

type MarkerIcon = typeof MapPin;
type EndpointRole = 'origin' | 'destination';

function element(className: string): HTMLDivElement {
	const node = document.createElement('div');
	node.className = className;
	return node;
}

function staticVisual(node: HTMLDivElement): MarkerVisual {
	return { element: node, destroy() {} };
}

export function createRiderMarker(): MarkerVisual {
	const root = element('map-rider-marker is-acquiring');
	root.dataset.accuracy = 'unknown';
	root.append(
		element('map-rider-marker__accuracy'),
		element('map-rider-marker__dot'),
		element('map-rider-marker__puck')
	);
	const timer = window.setTimeout(() => root.classList.remove('is-acquiring'), 1600);
	return {
		element: root,
		destroy() {
			window.clearTimeout(timer);
		}
	};
}

export function setRiderNavigating(node: HTMLElement, navigating: boolean): void {
	node.classList.toggle('is-navigating', navigating);
	if (navigating) node.classList.remove('is-acquiring');
}

export function setRiderAccuracy(node: HTMLElement, accuracyM: number | null): void {
	const level = accuracyM === null ? 'unknown' : accuracyM > 30 ? 'poor' : accuracyM > 15 ? 'fair' : 'good';
	node.dataset.accuracy = level;
}

export function createEndpointMarker(role: EndpointRole): MarkerVisual {
	const root = element(`map-endpoint-marker map-endpoint-marker--${role}`);
	const body = element('map-endpoint-marker__body');
	const label = document.createElement('span');
	label.textContent = role === 'origin' ? 'A' : 'B';
	body.append(label);
	root.append(body);
	return staticVisual(root);
}

export function setMarkerHidden(node: HTMLElement, hidden: boolean): void {
	node.classList.toggle('is-hidden', hidden);
}

export function createStopMarker(icon: MarkerIcon, colorVariable: string): MarkerVisual {
	const root = element('map-stop-marker');
	root.style.setProperty('--map-marker-tone', `var(${colorVariable})`);
	const instance = mount(icon, {
		target: root,
		props: { size: 14, color: 'currentColor', strokeWidth: 2.25 }
	});
	return {
		element: root,
		destroy() {
			void unmount(instance);
		}
	};
}
