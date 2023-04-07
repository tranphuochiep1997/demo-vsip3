import { AfterViewInit, Component, OnInit } from '@angular/core';
import { faImage, faLayerGroup, faSearch, faBars } from '@fortawesome/free-solid-svg-icons';
import { NzFormatEmitEvent, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { Observable } from 'rxjs';
import { ApiResponse } from './models/api-response';
import { GroupLayer } from './models/group-layer';
import { Layer } from './models/layer';
import { LayerProperty } from './models/layer-property';
import { MapDetail } from './models/map-detail';
import { MapService } from './services/map.service';

declare var vtmapgl: any;
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'demo-vsip3';
  map: any;
  mapId: number = 503;
  collapseSidebar: boolean = false;
  faImage = faImage;
  faLayerGroup = faLayerGroup;
  faSearch = faSearch;
  faBars = faBars;
  
  groupLayers: GroupLayer[] = [];
  plainLayers: Layer[] = [];
  mapLayers: any[] = [];
  nodes: NzTreeNodeOptions[] = [];
  defaultCheckedKeys: string[] = [];
  fileDomain: string = '';
  layerPropertyAssociation: ({ [layerId: number]: LayerProperty[] }) = {};

  constructor(private mapService: MapService) {
    this.collapseSidebar = localStorage.getItem('collapseSidebar') === 'true';
    this.createGroupLayerNode = this.createGroupLayerNode.bind(this);
    this.getLayersFromGroupLayer = this.getLayersFromGroupLayer.bind(this);
    this.showLayerByLayerId = this.showLayerByLayerId.bind(this);
    this.hideLayerByLayerId = this.hideLayerByLayerId.bind(this);
    this.handleTreeNodeCheckChange = this.handleTreeNodeCheckChange.bind(this);
  }

  ngOnInit(): void {
  }

  getLayersFromGroupLayer(groupLayer: GroupLayer): Layer[] {
    return [...groupLayer.layers].concat(...groupLayer.groupLayers.flatMap(this.getLayersFromGroupLayer));
  }

  createGroupLayerNode(groupLayer: GroupLayer): any {
    this.defaultCheckedKeys = this.defaultCheckedKeys.concat([`${groupLayer.id}`]);
    const groupLayerChildren = groupLayer.groupLayers.map(this.createGroupLayerNode);
    const layerChildren = groupLayer.layers.map(layer => {
      this.defaultCheckedKeys = this.defaultCheckedKeys.concat([`${groupLayer.id}-${layer.id}`]);
      return {
        title: layer.name,
        key: `${groupLayer.id}-${layer.id}`,
        isLeaf: true,
        selectable: false
      }
    })
    return {
      title: groupLayer.name,
      key: `${groupLayer.id}`,
      expanded: true,
      selectable: false,
      children: groupLayerChildren.concat(layerChildren)
    }
  }

  ngAfterViewInit(): void {
    this.mapService.getMapDetail(this.mapId).subscribe((res: ApiResponse<MapDetail>) => {
      console.log(res.data);
      this.groupLayers = res.data.groupLayers;
      this.plainLayers = this.groupLayers.flatMap(this.getLayersFromGroupLayer);
      // console.log(this.groupLayers);
      this.nodes = res.data.groupLayers.map(this.createGroupLayerNode);
      // console.log(this.nodes);
      this.fileDomain = res.data.fileDomain;
      this.initMap(res.data);
    })
  }

  initMap(mapDetail: MapDetail) {
    vtmapgl.accessToken = '6bb2f6acb38de878d2a4ed539c280d00';
    // Khởi tạo bản đồ
    this.map = new vtmapgl.Map({
      container: 'map',
      center: [mapDetail.centerLng || 0, mapDetail.centerLat || 0], // tọa độ trung tâm [lng, lat]
      zoom: mapDetail.defaultZoom || 0, // mức zoom,
      hash: true,
      style: mapDetail.styleUrl
    });
    const nav = new vtmapgl.NavigationControl();
    this.map.addControl(nav, 'bottom-right');

    this.map.on('load', () => { 
      this.mapLayers = this.map.getStyle().layers;
    })
    this.map.on('styleimagemissing', (e: any) => this.loadIconImage(e.id));
    this.map.on('click', (e: any) => {
      const feature = this.map.queryRenderedFeatures(e.point)[0];
      if (!feature) return;
      this.showFeatureProperties(feature, e.lngLat);
    })
  }

  showFeatureProperties(feature: any, lngLat: number[]) {
    const {sourceLayer, properties: featureProperties} = feature;
    const layer = this.plainLayers.find(layer => layer.tableName === sourceLayer);
    if (!layer) return;
    this.getLayerPropertiesByLayerId(layer.id).subscribe((layerProperties: LayerProperty[]) => {
      const propertiesMappings = layerProperties.map(property => {
        return `<li><span class='fw-bold'>${property.alias || property.name}:</span> ${featureProperties[property.name] || ''}</li>`;
      }).join('');
      const HTML = `<div class='info-popup-body'>
        <h5 class='title'>Thông tin đối tượng</h5>
        <ul>
        ${propertiesMappings}
        </ul>
      </div>`;
      new vtmapgl.Popup({ className: 'info-popup' })
      .setLngLat(lngLat)
      .setHTML(HTML)
      .addTo(this.map);
    });
  }

  loadIconImage(imageUri: string) {
    this.map.loadImage(`${this.fileDomain}/${imageUri}`, (err: any, loadedImage: any) => {
      if (err) throw err;
      if (!this.map.hasImage(imageUri)) {
        this.map.addImage(imageUri, loadedImage);
      }
    });
  }

  nzEvent(event: NzFormatEmitEvent): void {
    if (!event.node?.origin) return;
    this.handleTreeNodeCheckChange(event.node.origin);
  }

  handleTreeNodeCheckChange(originNode: NzTreeNodeOptions) {
    if (originNode.isLeaf) {
      const layerId = +originNode.key.split('-')[1];
      this.toggleMapLayerByLayerId(layerId, originNode.checked === true);
    } else {
      originNode.children?.forEach(this.handleTreeNodeCheckChange);
    }
  }

  toggleMapLayerByLayerId(layerId: number, show: boolean) {
    const layer = this.plainLayers.find(layer => layer.id === layerId);
    if (!layer) return;
    const sourceLayer = layer.tableName;
    const toggleLayerFunc = show ? this.showLayerByLayerId : this.hideLayerByLayerId;
    this.mapLayers.filter(layer => layer['source-layer'] === sourceLayer).forEach(layer => {
      console.log(layer.id);
      toggleLayerFunc(layer.id);
    })
  }

  showLayerByLayerId(layerId: string) {
    this.map.setLayoutProperty(layerId, 'visibility', 'visible');
  }

  hideLayerByLayerId(layerId: string) {
    this.map.setLayoutProperty(layerId, 'visibility', 'none');
  }

  toggleSidebar() {
    this.collapseSidebar = !this.collapseSidebar;
    localStorage.setItem('collapseSidebar', this.collapseSidebar + '');
    setTimeout(() => {
      this.map.resize();
    }, 500);
  }

  getLayerPropertiesByLayerId(layerId: number): Observable<LayerProperty[]> {
    return new Observable((subscriber) => {
      if (!this.layerPropertyAssociation[layerId]) {
        this.mapService.getLayerProperties(layerId).subscribe((res: ApiResponse<LayerProperty[]>) => {
          const layerProperties = res.data;
          if (res.statusCode === 200) {
            this.layerPropertyAssociation[layerId] = layerProperties;
          }
          subscriber.next(layerProperties);
          subscriber.complete();
        })
      } else {
        subscriber.next(this.layerPropertyAssociation[layerId]);
        subscriber.complete();
      }
    })
  }
}
