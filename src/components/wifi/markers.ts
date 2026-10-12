// Map markers (DESIGN-SYSTEM 2.6, 3.17): Leaflet divIcons with a transparent 44x44 hit area and the status shape
// centered. The shapes come from icons.ts, the same drawings as the legend and the badges (CRAFT-10).
import L from 'leaflet';
import { statusShape } from '../ui/icons.ts';
import type { Fee } from './labels.ts';

const SIZE: L.PointExpression = [44, 44];

export const markerIcon = (fee: Fee) => L.divIcon({ className: 'marker', html: statusShape(fee, 28, 'shape--marker'), iconSize: SIZE });
export const locationIcon = () => L.divIcon({ className: 'marker marker--location', html: statusShape('location', 28), iconSize: SIZE });

/** Highlighted (its row hovered or focused) or selected (its row activated). */
export function markState(m: L.Marker | undefined, state: 'is-highlighted' | 'is-selected', on: boolean) {
  m?.getElement()?.classList.toggle(state, on);
  if (state === 'is-selected') m?.setZIndexOffset(on ? 1000 : 0);
}
