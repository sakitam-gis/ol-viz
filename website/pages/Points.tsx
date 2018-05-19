import * as React from 'react';
// @ts-ignore
import Map from 'ol/Map';
// @ts-ignore
import View from 'ol/View';
// @ts-ignore
import TileLayer from 'ol/layer/tile';
// @ts-ignore
import OSM from 'ol/source/osm';
import { Props, Context } from '../interface/common';

class Points extends React.Component <Props, Context> {
  private container: any;
  // @ts-ignore
  private map: Map | undefined;
  constructor (props: Props, context: Context) {
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
        new TileLayer({
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

export default Points;
