/**
 * @license
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Gathers the layers information.
 */

'use strict';

const Gatherer = require('../gatherer');

/* global document */

/* istanbul ignore next */

function forcedChangeLayerTree() {
  const mockDiv = document.createElement('div');
  document.body.appendChild(mockDiv);
}

/* istanbul ignore next */

class Layers extends Gatherer {

  getLayerTree() {
    return new Promise((resolve) => {
      const scriptSrc = `(${forcedChangeLayerTree.toString()}())`;

      // Chrome devtool protocal not support memory estimate. So I calculate memory refer to below url.
      // https://github.com/ChromeDevTools/devtools-frontend/blob/18c3293ee92e03f7b7c9f2a1d7ed879304e11c55/front_end/layers/LayerTreeModel.js#L434
      const bytesPerPixel = 4;

      this.driver.once('LayerTree.layerTreeDidChange', (data) => {
        let memory;
        const backendNodeIds = [];
        const layers = data.layers.map({layerId, parentLayerId, backendNodeId, width, height, paintCount} => {
          memory = width * height * bytesPerPixel;
          if(backendNodeId) {
            backendNodeIds.push(backendNodeId);
          }
          return {layerId, parentLayerId, backendNodeId, memory, paintCount}
        });

        resolve({
          layers
          backendNodeIds
        });

      });

      this.driver.evaluateAsync(scriptSrc).then(e => e);
    });
  }

  setCompositingReasons(data) {
    return Promise.all(data.layers.map(layer => {
      return this.driver.sendCommand('LayerTree.compositingReasons', {
        layerId: layer.layerId
      });
    })).then(reasons => {
      reasons.forEach((reason, i) => {
        info.layers[i] = reason;
      });
      return info;
    });
  }

  setNodeIds(data) {
    return this.driver.sendCommand('DOM.pushNodesByBackendIdsToFrontend', {
      backendNodeIds: data.backendNodeIds
    }).then(result => {
      data.nodeIds = result.nodeIds;
      return data;
    });
  }

  setDOMInfo(data) {
    const layerCount = data.layers;
    let excuteCount = 0;
    info.nodeInfo = {};

    return new Promise((resolve, reject) => {
      data.layers.forEach((layer, i) => {
        this.driver.sendCommand('DOM.resolveNode', {
          layerId: layer.layerId
        }).then((i => {
          return (result) => {
            data.nodeInfo[data.backendNodeIds[i]] = result.object.description;
            excuteCount++;
            if(layerCount === excuteCount){
              resolve(data);
            }
          }
        })(i)).catch(_ => {
          excuteCount++;
          if(layerCount === excuteCount){
            resolve(data);
          }
        })
      })
    });
  }

  organizeData(data) {
    const layerInfo = data.layers.map(e => {
      const id = (e.backendNodeId && data.nodeInfo[e.backendNodeId])?
                    data.nodeInfo[e.backendNodeId]:
                    '#'+e.layerId;
      const paintCount = e.paintCount;
      const memory = e.memory;
      const layerId = e.layerId;
      const parentLayerId = e.parentLayerId;
      const compositingReasons = e.compositingReasons;
      return {
        id,
        paintCount,
        memory,
        layerId,
        parentLayerId,
        compositingReasons,
        width: e.width,
        height: e.height
      };
    });
    return layerInfo;
  }

  /**
   * @param {!Object} options
   * @param {{networkRecords: !Array<!NetworkRecord>}} tracingData
   * @return {!Promise<!Array<{id: string, paintCount: number, layerId: number, parentLayerId: number, compositingReasons: <!Array<string>>, width: number, height: number}>>}
   */
  afterPass(options) {
    this.driver = options.driver;
    return this.driver.sendCommand('LayerTree.enable')
        .then((_) => this.getLayerTree())
        .then((data) => this.setCompositingReasons(data))
        .then((data) => this.setNodeIds(data))
        .then((data) => this.setDOMInfo(data))
        .then((data) => this.organizeData(data));
  }
}

module.exports = Layers;
