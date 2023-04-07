import { GroupLayer } from "./group-layer";

export interface MapDetail {
  name: string;
  defaultZoom: number;
  centerLat: number;
  centerLng: number;
  groupLayers: GroupLayer[];
  fileDomain: string;
  styleUrl: string;
}
