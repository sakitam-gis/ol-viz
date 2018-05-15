import * as React from 'react';
import { layer, Map, source, View } from 'ol';
const Layer = layer.Layer;
const OSM = source.OSM;

class Index extends React.Component {
  private container: any;
  // @ts-ignore
  private map: Map | undefined;
  constructor (props: object, context: any) {
    super(props, context);
    this.state = {
      zoom: 14,
    };
  }

  componentDidMount () {
    this.map = new Map({
      target: this.container,
      view: new View({
        center: [0, 0],
      }),
      layers: [
        new Layer({
          source: new OSM(),
        }),
      ],
    });
  }

  componentWillUnmount () {
    // this.map.remove()
  }

  setRef = (x = null) => {
    this.container = x;
  }

  render () {
    // @ts-ignore
    return (<div ref={this.setRef} className="map-content"/>);
  }
}

export default Index;
