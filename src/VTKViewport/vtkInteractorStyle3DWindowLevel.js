import macro from 'vtk.js/Sources/macro';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import { States } from 'vtk.js/Sources/Rendering/Core/InteractorStyle/Constants';

import {
  toLowHighRange,
  toWindowLevel,
} from '../lib/windowLevelRangeConverter';

// ----------------------------------------------------------------------------
// vtkInteractorStyle3DWindowLevel methods
// ----------------------------------------------------------------------------
function vtkInteractorStyle3DWindowLevel(publicAPI, model) {
  /* Set our className */

  model.classHierarchy.push('vtkInteractorStyle3DWindowLevel');

  const superClass = Object.assign({}, publicAPI);

  publicAPI.handleLeftButtonPress = eventData => {
    if (model.enableWindowLevel) {
      model.wlStartPos = [eventData.position.x, eventData.position.y];
      const initialMappingRange = model.volumeActor
        .getProperty()
        .getRGBTransferFunction(0)
        .getMappingRange()
        .slice();

      model.levels = toWindowLevel(
        initialMappingRange[0],
        initialMappingRange[1]
      );

      publicAPI.startWindowLevel();
    } else {
      superClass.handleLeftButtonPress(eventData);
    }
  };

  publicAPI.handleLeftButtonRelease = eventData => {
    if (model.enableWindowLevel) {
      publicAPI.endWindowLevel();
    } else {
      superClass.handleLeftButtonRelease(eventData);
    }
  };

  publicAPI.handleMouseMove = eventData => {
    if (model.state === States.IS_WINDOW_LEVEL) {
      const { position } = eventData;
      publicAPI.windowLevel([position.x, position.y]);
    } else {
      superClass.handleMouseMove(eventData);
    }
  };

  publicAPI.windowLevel = pos => {
    const range = model.volumeActor
      .getMapper()
      .getInputData()
      .getPointData()
      .getScalars()
      .getRange();

    const imageDynamicRange = range[1] - range[0];
    const multiplier =
      Math.round(imageDynamicRange / 1024) * publicAPI.getLevelScale();

    const dx = Math.round((pos[0] - model.wlStartPos[0]) * multiplier);
    const dy = Math.round((pos[1] - model.wlStartPos[1]) * multiplier);

    let windowWidth = model.levels.windowWidth + dx;
    let windowCenter = model.levels.windowCenter - dy;
    windowWidth = Math.max(0.01, windowWidth);

    if (
      model.levels.windowWidth === windowWidth &&
      model.levels.windowCenter === windowCenter
    ) {
      return;
    }

    publicAPI.setWindowLevel(windowWidth, windowCenter);

    model.wlStartPos[0] = Math.round(pos[0]);
    model.wlStartPos[1] = Math.round(pos[1]);

    const onLevelsChanged = publicAPI.getOnLevelsChanged();
    if (onLevelsChanged) {
      onLevelsChanged({ windowCenter, windowWidth });
    }
  };

  publicAPI.setWindowLevel = (windowWidth, windowCenter) => {
    const { lower, upper } = toLowHighRange(windowWidth, windowCenter);

    model.levels = { windowWidth, windowCenter };
    const property = model.volumeActor.getProperty();
    const ctf = property.getRGBTransferFunction(0);
    ctf.removeAllPoints();
    ctf.addRGBPoint(lower, 0, 0, 0);
    ctf.addRGBPoint(upper, 1, 1, 1);

    const opacity = property.getScalarOpacity(0);
    opacity.removeAllPoints();
    opacity.addPoint(lower, 0);
    opacity.addPoint(upper, 1);
  };
}

// ----------------------------------------------------------------------------
// Object factory
// ----------------------------------------------------------------------------
const DEFAULT_VALUES = {
  onLevelsChanged: null,
  enableWindowLevel: false,
  levelScale: 1,
  volumeActor: null,
};

export function extend(publicAPI, model, initialValues = {}) {
  Object.assign(model, DEFAULT_VALUES, initialValues);

  // Inheritance
  vtkInteractorStyleTrackballCamera.extend(publicAPI, model, initialValues);

  (model.wlStartPos = [0, 0]),
    (model.levels = {
      windowWidth: 0,
      windowCenter: 0,
    });

  macro.setGet(publicAPI, model, [
    'onLevelsChanged',
    'enableWindowLevel',
    'levelScale',
    'volumeActor',
  ]);

  macro.setArray(publicAPI, model, ['windowLevel', 'dataRange'], 2);

  // Object specific methods
  vtkInteractorStyle3DWindowLevel(publicAPI, model);
}

// ----------------------------------------------------------------------------

export const newInstance = macro.newInstance(
  extend,
  'vtkInteractorStyle3DWindowLevel'
);

// ----------------------------------------------------------------------------

export default Object.assign({
  newInstance,
  extend,
});
