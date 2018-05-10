import { abstract } from 'ol/util.js';

class BuilderGroup {
  getBuilder (zIndex, replayType) {
    return abstract();
  }

  isEmpty () {
    return abstract();
  }

  addDeclutter (group) {
    return abstract();
  }
}

export default BuilderGroup
