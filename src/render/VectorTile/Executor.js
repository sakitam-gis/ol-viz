import { abstract } from 'ol/util.js';

class ExecutorGroup {
  getExecutor (zIndex, replayType) {
    return abstract();
  }

  isEmpty () {
    return abstract();
  }

  getMaxExtent () {
    return abstract();
  }

  addDeclutter (group) {
    return abstract();
  }
}

export default ExecutorGroup;
