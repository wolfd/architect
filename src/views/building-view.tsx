import * as React from "react";
import * as THREE from "three";
import { generateMesh } from "./geo-json";

export interface IGeoFeature {
  geometry: any;
  id: string;
  properties: any;
  type: string;
}

export interface IGeoJson {
  type: any;
  features: IGeoFeature[];
}

export default class BuildingView extends React.Component {
  private canvas: React.RefObject<HTMLCanvasElement>;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private geoJson: IGeoJson;

  constructor(props: any) {
    super(props);
    this.canvas = React.createRef();

    this.scene = new THREE.Scene();

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 50, 0 );
    this.scene.add(hemiLight);

    const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );
    directionalLight.color.setHSL( 0.1, 1, 0.95 );
    directionalLight.position.set( -1, 1.75, 1 );
    directionalLight.position.multiplyScalar( 30 );
    
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
      // feature.geometry
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
    });
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.onAnimationFrame();
  }

  public onAnimationFrame() {
    requestAnimationFrame(this.onAnimationFrame);

    this.camera.position.z += 0.01;
    this.camera.position.x += 0.05;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  public render() {
    return (
      <canvas ref={this.canvas} />
    );
  }
}