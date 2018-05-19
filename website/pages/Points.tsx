import * as React from 'react';
// @ts-ignore
import { Map, View } from 'ol';
// @ts-ignore
import { Tile } from 'ol/layer';
// @ts-ignore
import { OSM } from 'ol/source';
import { Props, Context } from '../interface/common';

// @ts-ignore
import { Layer } from '../../dist/ol-viz';

class Points extends React.Component <Props, Context> {
  private container: any;
  // @ts-ignore
  private map: Map | undefined;
  constructor (props: Props, context: Context) {
    super(props, context);
    this.state = {
      zoom: 5,
    };
  }

  componentDidMount () {
    // @ts-ignore
    const { zoom } = this.state;
    this.map = new Map({
      target: this.container,
      view: new View({
        zoom,
        center: [0, 0],
      }),
      layers: [
        new Tile({
          source: new OSM(),
        }),
      ],
    });
    console.log(Layer);
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

export default Points;
