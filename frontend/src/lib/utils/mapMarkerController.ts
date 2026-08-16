import * as maplibregl from 'maplibre-gl';
import type { RouteStopEntry } from '$lib/types/routeStop';
import type { LatLng } from '$lib/services/routing';
import { haversineM, toLngLat } from '$lib/utils/mapHelpers';
import { stopColor } from '$lib/utils/stopColors';
import { stopIcon } from '$lib/utils/stopIcons';
import {
	createEndpointMarker,
	createRiderMarker,
	createStopMarker,
	setMarkerHidden,
	setRiderAccuracy,
	setRiderNavigating,
	type MarkerVisual
} from '$lib/utils/mapMarkers';

interface ManagedMarker {
	marker: maplibregl.Marker;
	visual: MarkerVisual;
}

const ORIGIN_HIDE_RADIUS_M = 50;

function normalizeBearing(value: number): number {
	return ((value % 360) + 360) % 360;
}

function targetBearing(from: number, to: number): number {
	const delta = ((to - from + 540) % 360) - 180;
	return from + delta;
}

export class MapMarkerController {
	private rider: ManagedMarker | null = null;
	private origin: ManagedMarker | null = null;
	private originPoint: LatLng | null = null;
	private routeMarkers: ManagedMarker[] = [];
	private stopMarkers: ManagedMarker[] = [];
	private navigating = false;
	private markerTo: LatLng | null = null;
	private markerFrame = 0;
	private markerBearing: number | null = null;

	constructor(private map: maplibregl.Map) {}

	private create(visual: MarkerVisual, coords: LatLng, options: maplibregl.MarkerOptions = {}): ManagedMarker {
		const marker = new maplibregl.Marker({ ...options, element: visual.element })
			.setLngLat(toLngLat(coords))
			.addTo(this.map);
		return { marker, visual };
	}

	private remove(entry: ManagedMarker | null): void {
		if (!entry) return;
		entry.visual.destroy();
		entry.marker.remove();
	}

	private ensureRider(coords: LatLng): ManagedMarker {
		if (this.rider) return this.rider;
		const visual = createRiderMarker();
		setRiderNavigating(visual.element, this.navigating);
		this.rider = this.create(visual, coords, { rotationAlignment: 'map', pitchAlignment: 'map' });
		this.markerTo = coords;
		return this.rider;
	}

	updateRider(coords: LatLng, accuracyM: number | null): void {
		const rider = this.ensureRider(coords);
		setRiderAccuracy(rider.visual.element, accuracyM);
		if (this.navigating) return;
		rider.marker.setLngLat(toLngLat(coords));
		this.markerTo = coords;
	}

	updateOriginVisibility(userPosition: LatLng): void {
		if (!this.origin || !this.originPoint) return;
		setMarkerHidden(this.origin.visual.element, haversineM(userPosition, this.originPoint) < ORIGIN_HIDE_RADIUS_M);
	}

	placeEndpoints(originCoords: LatLng, destinationCoords: LatLng): void {
		this.origin = this.create(createEndpointMarker('origin'), originCoords, { anchor: 'bottom' });
		this.origin.marker.setPopup(new maplibregl.Popup().setText('Início'));
		const destination = this.create(createEndpointMarker('destination'), destinationCoords, { anchor: 'bottom' });
		destination.marker.setPopup(new maplibregl.Popup().setText('Destino'));
		this.originPoint = originCoords;
		this.routeMarkers = [this.origin, destination];
	}

	showStops(stops: RouteStopEntry[]): void {
		this.stopMarkers.forEach((entry) => this.remove(entry));
		this.stopMarkers = stops.map((stop) => {
			const colors = stopColor(stop.stopType);
			const entry = this.create(createStopMarker(stopIcon(stop.stopType), colors.marker), stop.coords);
			entry.marker.setPopup(new maplibregl.Popup().setText(stop.name));
			return entry;
		});
	}

	clearRoute(): void {
		this.routeMarkers.forEach((entry) => this.remove(entry));
		this.stopMarkers.forEach((entry) => this.remove(entry));
		this.routeMarkers = [];
		this.stopMarkers = [];
		this.origin = null;
		this.originPoint = null;
	}

	setNavigating(active: boolean): void {
		this.navigating = active;
		if (this.rider) setRiderNavigating(this.rider.visual.element, active);
		if (active) return;
		cancelAnimationFrame(this.markerFrame);
		this.markerBearing = null;
		this.rider?.marker.setRotation(0);
	}

	moveRider(coords: LatLng, bearing: number | null, durationMs: number): void {
		const rider = this.ensureRider(coords);
		const current = rider.marker.getLngLat();
		const markerFrom: LatLng = [current.lat, current.lng];
		this.markerTo = coords;
		const start = performance.now();
		let bearingFrom = 0;
		let bearingTo = 0;
		if (bearing !== null) {
			const normalized = normalizeBearing(bearing);
			if (this.markerBearing === null) {
				this.markerBearing = normalized;
				rider.marker.setRotation(normalized);
			}
			bearingFrom = this.markerBearing;
			bearingTo = targetBearing(this.markerBearing, normalized);
		}
		cancelAnimationFrame(this.markerFrame);
		const step = (now: number) => {
			const t = durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs);
			rider.marker.setLngLat([
				markerFrom[1] + (coords[1] - markerFrom[1]) * t,
				markerFrom[0] + (coords[0] - markerFrom[0]) * t
			]);
			if (bearing !== null) {
				this.markerBearing = bearingFrom + (bearingTo - bearingFrom) * t;
				rider.marker.setRotation(this.markerBearing);
			}
			if (t < 1) this.markerFrame = requestAnimationFrame(step);
			else if (this.markerBearing !== null) this.markerBearing = normalizeBearing(this.markerBearing);
		};
		this.markerFrame = requestAnimationFrame(step);
	}

	destroy(): void {
		cancelAnimationFrame(this.markerFrame);
		this.clearRoute();
		this.remove(this.rider);
		this.rider = null;
	}
}
