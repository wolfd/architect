import * as React from "react";
import * as THREE from "three";
import * as OrbitControls from "three-orbitcontrols";
import { building, generateMesh, latLongToNav, lineString, polygon, rotation, up } from "./geo-json";

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
    hemiLight.up.set(0, 1, 0);
    this.scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.color.setHSL(0.1, 1, 0.95);
    directionalLight.position.set(0, 0, 1);
    directionalLight.position.multiplyScalar(30);

    this.scene.add(directionalLight);

    directionalLight.castShadow = true;

    this.onAnimationFrame = this.onAnimationFrame.bind(this);

    fetch("/boston.geo.json").then(
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
        if (feature.properties === undefined) {
          this.scene.add(polygon(
            geometry,
            new THREE.LineBasicMaterial({color: 0x000f40})
          ));
        }
        const properties : any = feature.properties;
        if (properties.building === "yes") {
          this.scene.add(building(
            geometry, feature.properties, new THREE.MeshPhongMaterial()
          ));
        } else if (properties.building) {
          this.scene.add(building(
            geometry, feature.properties, new THREE.MeshPhongMaterial()
          ));
          console.log(properties.building);
        } else {
          this.scene.add(polygon(
            geometry,
            new THREE.LineBasicMaterial({color: 0x000f40})
          ));
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
      precision: "highp",
    });
    // TODO(danny): make up actually be up with controls
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 20, 30e6);
    this.camera.position.copy(new THREE.Vector3(0, 100, 0));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.canvas.current);

    this.scene.add(new THREE.ArrowHelper(up, new THREE.Vector3(), 10, 0xff0000));
    this.scene.add(new THREE.AxesHelper(5));
    this.scene.add(new THREE.ArrowHelper(up.clone().applyMatrix3(rotation), new THREE.Vector3(), 10, 0xff0000));

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