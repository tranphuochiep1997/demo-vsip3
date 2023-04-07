import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../models/api-response';
import { LayerProperty } from '../models/layer-property';
import { MapDetail } from '../models/map-detail';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  MAP_SERVICE_URL = `${environment.API_URL}/mapservice`;

  constructor(private http: HttpClient) { }

  getMapDetail(mapId: number): Observable<ApiResponse<MapDetail>> {
    const params = {
      mapId
    }
    return this.http.get<ApiResponse<MapDetail>>(`${this.MAP_SERVICE_URL}/v1/presentation/map-detail`, {params});
  }

  getLayerProperties(layerId: number): Observable<ApiResponse<LayerProperty[]>> {
    const params = {
      layerId
    }
    return this.http.get<ApiResponse<LayerProperty[]>>(`${this.MAP_SERVICE_URL}/v1/presentation/layer-properties`, {params});
  }
}
