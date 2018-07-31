import * as d3 from "d3";
import * as THREE from "three";
import * as topojson from "topojson-client";
import { graticule10, vertex } from "./geo-js";

export const generateMesh = (scene: THREE.Scene) =>{
  const width = 960;
  const height = 960;
  const radius = 228;
  let mesh: any;
  let graticule: any;
  let geoJson: any;

  fetch("https://unpkg.com/world-atlas@1/world/50m.json").then(
    response => response.json()
  ).then(json => {
    geoJson = json;
    scene.add(graticule = wireframe(graticule10(), new THREE.LineBasicMaterial({color: 0xaaaaaa})));
    scene.add(mesh = wireframe(topojson.mesh(geoJson, geoJson.objects.land), new THREE.LineBasicMaterial({color: 0xff0000})));
  });
}

// Converts a GeoJSON MultiLineString in spherical coordinates to a THREE.LineSegments.
function wireframe(multilinestring: any, material: THREE.Material) {
  const geometry = new THREE.Geometry;
  multilinestring.coordinates.forEach((line: any) => {
    d3.pairs(line.map(vertex), (a: any, b: any) => {
      geometry.vertices.push(a, b);
    });
  });
  return new THREE.LineSegments(geometry, material as THREE.LineBasicMaterial);
}
