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

export const latLongToGlobal = (long: number, lat: number, altitude: number) => {
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

const longLatOrigin = [42.360888, -71.059705];
const origin = latLongToGlobal(longLatOrigin[1], longLatOrigin[0], 0);
const aboveOrigin = latLongToGlobal(longLatOrigin[1], longLatOrigin[0], 2);
export const up = aboveOrigin.clone().sub(origin).normalize();

const matrixToRotateOntoVector = (a: THREE.Vector3, b: THREE.Vector3) => {
  const v = a.clone().cross(b);
  const c = a.dot(b);

  const vX = new THREE.Matrix3().fromArray([
    0, -v.z, v.y, //
    v.z, 0, -v.x, //
    -v.y, v.x, 0 //
  ]);

  const vX2 = vX.clone().multiply(vX).multiplyScalar(1 / (1 + c));

  const I = new THREE.Matrix3().identity();
  const newValues = I.toArray();
  const vXa = vX.toArray();
  const vX2a = vX2.toArray();
  for (let i = 0; i < newValues.length; i++) {
    newValues[i] += vXa[i] + vX2a[i];
  }
  return new THREE.Matrix3().fromArray(newValues);
}

export const rotation = matrixToRotateOntoVector(new THREE.Vector3(0, 1, 0), up);
console.log(rotation);

export const latLongToNav = (long: number, lat: number, altitude: number) => {
  const unrotated = latLongToGlobal(long, lat, altitude).sub(origin);
  return unrotated.applyMatrix3(rotation);
}

export const building = (poly: GeoJSON.Polygon, properties: any, material: THREE.Material) => {
  let object: THREE.Object3D | null = null;
  const levels = properties['building:levels'];
  if (levels !== undefined) {
    object = polygon(
      poly,
      new THREE.LineBasicMaterial({color: 0x003f40}),
      levels * 3
    );
  }
  const height = properties.height;
  const minHeight = properties.min_height;
  if (height !== undefined) { // TODO: parse height if not number
    const low = minHeight !== undefined ? minHeight : 0;
    object = polygon(
      poly,
      new THREE.LineBasicMaterial({color: 0x00ff40}),
      height
    );
  }
  if (object === null) {
    object = polygon(
      poly,
      new THREE.LineBasicMaterial({color: 0x003f40}),
      0
    );
  }
  return object;
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
