import { Layer } from "./layer";

export interface GroupLayer {
  id: number;
  name: string;
  groupLayers: GroupLayer[];
  layers: Layer[];
}
