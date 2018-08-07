import * as d3 from "d3";
import * as THREE from "three";
import * as topojson from "topojson-client";

export const EARTH_RADIUS = 6.371e6;


export const generateMesh = (scene: THREE.Scene) => {
  let geoJson: any;

  fetch("https://unpkg.com/world-atlas@1/world/50m.json").then(
    response => response.json()
  ).then(json => {
    geoJson = json;
    const geoLand = multiLineString(
      topojson.mesh(geoJson, geoJson.objects.land),
      new THREE.LineBasicMaterial({ color: 0xff0000 })
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

export const latLongToNav = (long: number, lat: number, altitude: number) => {
  const unrotated = latLongToGlobal(long, lat, altitude).sub(origin);
  return unrotated.applyMatrix3(rotation);
}

export const generateMapGeometry = (geoJson: GeoJSON.FeatureCollection): THREE.Group => {
  const buildings = new THREE.Group();
  const naturalGroup = new THREE.Group();
  const lineGroup = new THREE.Group();
  const group = new THREE.Group();
  for (const feature of geoJson.features) {
    if (feature.type !== "Feature") {
      continue;
    }
    const geometry = feature.geometry as GeoJSON.Geometry;
    if (geometry.type === "Polygon") {
      // remove?
      if (feature.properties === undefined) {
        console.log("feature has no properties!");
        lineGroup.add(polygon(
          geometry,
          new THREE.LineBasicMaterial({ color: 0x000f40 })
        ));
      }

      const properties: any = feature.properties;
      if (properties.building === "yes") {
        buildings.add(building(
          geometry, feature.properties
        ));
      } else if (properties.building) {
        buildings.add(building(
          geometry, feature.properties
        ));
        console.debug(properties.building);
      }

      if (properties.natural) {
        naturalGroup.add(natural(geometry, properties));
      }
    } else if (geometry.type === "LineString") {
      lineGroup.add(lineString(
        geometry,
        new THREE.LineBasicMaterial({ color: 0x300f40 })
      ));
    } else {
      console.debug(`Unsupported type: ${feature.geometry.type}`);
    }
  }

  // group.add(lineGroup);
  group.add(buildings);
  group.add(naturalGroup);

  return group;
}

export const natural = (poly: GeoJSON.Polygon, properties: any) => {
  const mesh = new THREE.Mesh(flatPolygon(poly), naturalMaterial(properties));
  return mesh;
}

export const naturalMaterial = (properties: any) => {
  const naturalString: string = properties.natural;
  if (naturalString) {
    switch (naturalString) {
      case "bare_rock":
        return new THREE.MeshPhysicalMaterial({
          color: 0x595959,
          roughness: 0.83,
          metalness: 0.12,
          reflectivity: 0.07,
        });
      case "water":
        return new THREE.MeshPhysicalMaterial({
          color: 0xe2c3c,
          roughness: 0.15,
          metalness: 0.00,
          reflectivity: 0.77,
          clearCoat: 0.61,
          clearCoatRoughness: 0.28
        });
      default:
        console.log(naturalString);
    }
  }

  return new THREE.MeshStandardMaterial({
    color: 0x00dd44
  });
}

export const building = (poly: GeoJSON.Polygon, properties: any) => {
  const mesh = new THREE.Mesh(
    buildingGeometry(poly, properties),
    [roofMaterial(properties), buildingMaterial(properties)]
  );

  // NOTE: kinda bs
  (mesh as any).meta = properties;

  return mesh;
}

export const buildingGeometry = (poly: GeoJSON.Polygon, properties: any) => {
  const height = properties.height;
  const minHeight = properties.min_height;
  if (height !== undefined) { // TODO: parse height if not number
    const low = minHeight !== undefined ? minHeight : 0;
    return extrudePolygon(
      poly,
      height,
      low
    );
  }

  const levels = properties['building:levels'];
  if (levels !== undefined) {
    const low = minHeight !== undefined ? minHeight : 0;
    return extrudePolygon(
      poly,
      levels * 3,
      low // is this ever a thing?
    );
  }

  return extrudePolygon(
    poly,
    3
  );
}

export const roofMaterial = (properties: any): THREE.MeshMaterialType => {
  const materialString: string = properties["roof:material"];
  if (materialString) {
    switch (materialString) {
      case "concrete":
        return new THREE.MeshPhysicalMaterial({
          color: 0x595959,
          roughness: 0.83,
          metalness: 0.12,
          reflectivity: 0.07,
        });
      case "glass":
        return new THREE.MeshPhysicalMaterial({
          color: 0xe2c3c,
          roughness: 0.15,
          metalness: 0.00,
          reflectivity: 0.77,
          clearCoat: 0.61,
          clearCoatRoughness: 0.28 // especially for roof glass
        });
      default:
        console.log(materialString);
    }
  }

  const colorString: string = properties["roof:colour"];
  if (colorString) {
    return new THREE.MeshStandardMaterial({ color: colorString });
  }

  return new THREE.MeshStandardMaterial();
}

export const buildingMaterial = (properties: any): THREE.MeshMaterialType => {
  const colorString = properties["building:colour"];
  if (colorString) {
    return new THREE.MeshStandardMaterial({ color: colorString });
  }

  return new THREE.MeshStandardMaterial();
}

export const shapeFromPolygon = (poly: GeoJSON.Polygon): THREE.Shape => {
  const outerRing: THREE.Vector2[] = [];

  let shape: THREE.Shape | null = null;

  let outerRingDone = true;
  for (const line of poly.coordinates) {
    if (outerRingDone) {
      for (const coord of line) {
        outerRing.push(new THREE.Vector2(coord[0], coord[1]));
      }
      shape = new THREE.Shape(outerRing);
    } else {
      const innerRing: THREE.Vector2[] = [];
      for (const coord of line) {
        innerRing.push(new THREE.Vector2(coord[0], coord[1]));
      }
      if (shape === null) { // will always be defined but ok
        throw new Error("no no no");
      }
      shape.holes.push(new THREE.Path(innerRing));
    }
    outerRingDone = false;
  }

  // hopefully there are coordinates, I'd like to know if there aren't sometimes
  if (shape === null) {
    throw new Error("no shape defined!");
  }

  return shape;
}

export const flatPolygon = (poly: GeoJSON.Polygon): THREE.BufferGeometry => {
  const shape = shapeFromPolygon(poly);
  const geometry = new THREE.ShapeBufferGeometry(shape);
  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const v = latLongToNav(
      positions.getX(i), positions.getY(i), positions.getZ(i)
    );
    positions.setXYZ(i, v.x, v.y, v.z); // z necessary?
  }

  return geometry;
}

export const extrudePolygon = (poly: GeoJSON.Polygon, height: number, minHeight?: number): THREE.ExtrudeBufferGeometry => {
  const min = minHeight ? minHeight : 0;

  const shape = shapeFromPolygon(poly);

  const geometry = new THREE.ExtrudeBufferGeometry([shape], {
    depth: height - min,
    bevelEnabled: false,
  });

  const positions = geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i++) {
    const v = latLongToNav(
      positions.getX(i), positions.getY(i), positions.getZ(i) + min
    );
    positions.setXYZ(i, v.x, v.y, v.z); // z necessary?
  }

  return geometry;
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
