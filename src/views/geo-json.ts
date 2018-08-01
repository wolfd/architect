import * as d3 from "d3";
import * as THREE from "three";
import * as topojson from "topojson-client";

export const EARTH_RADIUS = 6.371e6;


export const generateMesh = (scene: THREE.Scene) =>{
  let geoJson: any;

  fetch("https://unpkg.com/world-atlas@1/world/50m.json").then(
    response => response.json()
  ).then(json => {
    geoJson = json;
    const geoLand = multiLineString(
      topojson.mesh(geoJson, geoJson.objects.land),
      new THREE.LineBasicMaterial({color: 0xff0000})
    );
    scene.add(geoLand);
  });
}

export const latLongToNav = (long: number, lat: number, altitude: number) => {
  const lambda = long * Math.PI / 180;
  const phi = lat * Math.PI / 180;
  const cosPhi = Math.cos(phi);

  const radius = EARTH_RADIUS + altitude;

  return new THREE.Vector3(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    radius * Math.sin(phi)
  );
}

export const lineString = (ls: GeoJSON.LineString, material: THREE.LineMaterialType) => {
  const geometry = new THREE.Geometry();
  const vectors = [];
  for (const coord of ls.coordinates) {
    vectors.push(latLongToNav(coord[0], coord[1], 0.0));
  }
  d3.pairs(vectors, (a, b) => {
    geometry.vertices.push(a, b);
  });

  return new THREE.LineSegments(geometry, material);
}

export const polygon = (poly: GeoJSON.Polygon, material: THREE.LineMaterialType, extraHeight?: number) => {
  const height = extraHeight ? extraHeight : 0.0;
  const geometry = new THREE.Geometry();
  for (const line of poly.coordinates) {
    const vectors = [];
    for (const coord of line) {
      vectors.push(latLongToNav(coord[0], coord[1], height));
    }
    d3.pairs(vectors, (a, b) => {
      geometry.vertices.push(a, b);
    });
  }
  return new THREE.LineSegments(geometry, material);
}

export const multiLineString = (mls: GeoJSON.MultiLineString, material: THREE.LineMaterialType) => {
  const geometry = new THREE.Geometry();
  for (const line of mls.coordinates) {
    const vectors = [];
    for (const coord of line) {
      vectors.push(latLongToNav(coord[0], coord[1], 0.0));
    }
    d3.pairs(vectors, (a, b) => {
      geometry.vertices.push(a, b);
    });
  }
  return new THREE.LineSegments(geometry, material);
}
