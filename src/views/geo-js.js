import * as d3 from "d3";
import * as THREE from "three";
let epsilon = 1e-6;
let radius = 10;

function graticuleX(y0, y1, dy) {
  let yoo = d3.range(y0, y1 - epsilon, dy).concat(y1);
  return function (x) { return yoo.map(function (y) { return [x, y]; }); };
}

function graticuleY(x0, x1, dx) {
  let xoo = d3.range(x0, x1 - epsilon, dx).concat(x1);
  return function (y) { return xoo.map(function (x) { return [x, y]; }); };
}

// See https://github.com/d3/d3-geo/issues/95
export function graticule10() {
  
  let x1 = 180;
  let x0 = -x1;
  let y1 = 80;
  let y0 = -y1;
  let dx = 10;
  let dy = 10;
  let X1 = 180;
  let X0 = -X1;
  let Y1 = 90;
  let Y0 = -Y1;
  let DX = 90;
  let DY = 360;
  let x = graticuleX(y0, y1, 2.5);
  let y = graticuleY(x0, x1, 2.5);
  let X = graticuleX(Y0, Y1, 2.5);
  let Y = graticuleY(X0, X1, 2.5);



  return {
    coordinates: d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X)
      .concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y))
      .concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function (xo) { return Math.abs(xo % DX) > epsilon; }).map(x))
      .concat(d3.range(Math.ceil(y0 / dy) * dy, y1 + epsilon, dy).filter(function (yo) { return Math.abs(yo % DY) > epsilon; }).map(y)),
    type: "MultiLineString",
  };
}

// Converts a point [longitude, latitude] in degrees to a THREE.Vector3.
export function vertex(point) {
  let lambda = point[0] * Math.PI / 180;
  let phi = point[1] * Math.PI / 180;
  let cosPhi = Math.cos(phi);
  return new THREE.Vector3(
    radius * cosPhi * Math.cos(lambda),
    radius * cosPhi * Math.sin(lambda),
    radius * Math.sin(phi)
  );
}
