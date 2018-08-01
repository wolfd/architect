import * as React from "react";
import * as THREE from "three";
import * as OrbitControls from "three-orbitcontrols";
import { generateMesh, latLongToNav, lineString, polygon } from "./geo-json";

export interface IGeoJson {
  type: any;
  features: GeoJSON.Feature[];
}

export default class BuildingView extends React.Component {
  private canvas: React.RefObject<HTMLCanvasElement>;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private controls: THREE.OrbitControls;

  private geoJson: IGeoJson;

  constructor(props: any) {
    super(props);
    this.canvas = React.createRef();

    this.scene = new THREE.Scene();

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.color.setHSL(0.6, 1, 0.6);
    hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.color.setHSL(0.1, 1, 0.95);
    directionalLight.position.set(-1, 1.75, 1);
    directionalLight.position.multiplyScalar(30);

    this.scene.add(directionalLight);

    directionalLight.castShadow = true;

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    fetch("/map.geo.json").then(
      response => response.json()
    ).then(geoJson => {
      this.geoJson = geoJson;
      this.generateMapGeometry();
    });

    generateMesh(this.scene);
  }

  public generateMapGeometry() {

    console.log(this.geoJson);
    for (const feature of this.geoJson.features) {
      if (feature.type !== "Feature") {
        continue;
      }
      const geometry = feature.geometry as GeoJSON.Geometry;
      if (geometry.type === "Polygon") {
        this.scene.add(polygon(
          geometry,
          new THREE.LineBasicMaterial({color: 0x000f40})
        ));
        if (feature.properties !== undefined) {
          const properties : any = feature.properties;
          if (properties.building === "yes") {
            for (let h = 0; h < 5; h++) {
              this.scene.add(polygon(
                geometry,
                new THREE.LineBasicMaterial({color: 0x000f40}),
                h * 2
              ));
            }
          }
        }
      } else if (geometry.type === "LineString") {
        this.scene.add(lineString(
          geometry,
          new THREE.LineBasicMaterial({color: 0x300f40})
        ));
      } else {
        console.log(`Unsupported type: ${feature.geometry.type}`);
      }
    }
  }

  public componentDidMount() {
    if (!this.canvas.current) {
      return;
    }
    const canvasEl = this.canvas.current;
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    // TODO(danny): make up actually be up with controls
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 20, 30e6);
    const olin = [42.293556, -71.263966];
    const olinGround = latLongToNav(olin[1], olin[0], 0.0);
    const olinUp = latLongToNav(olin[1], olin[0], 1000.0);
    this.camera.up.copy(olinUp.clone().sub(olinGround));
    this.camera.position.copy(olinUp.clone().add(new THREE.Vector3(5,5,5)));
    this.camera.lookAt(olinGround);

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.canvas.current);
    this.controls.target.copy(olinGround);

    this.onAnimationFrame();
  }

  public onAnimationFrame() {
    requestAnimationFrame(this.onAnimationFrame);
    this.renderer.render(this.scene, this.camera);
  }

  public render() {
    return (
      <canvas ref={this.canvas} />
    );
  }
}