/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
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
 * @fileoverview Audit a page to see if it does not use incorrect layers that overlap layer or huge and repaninted layer.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../report/formatter');
const ONEMB = 1048576;
const HUGE_LAYER = '1MB';
const frequentPaintCountMin = 10;


function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes == 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  const bytesStr = (bytes / Math.pow(1024, i)).toLocaleString(undefined, {maximumFractionDigits: 2});

  return `${bytesStr} ${sizes[i]}`;
}

function searchHierarchy(layers, id, depth, isIncorrectLayer) {
  if(!id) {
    return depth;
  }

  for(let i = 0, l = layers.length; i < l; i++) {
    const layer = layers[i];

    if( layer.layerId === id ) {
      if(isIncorrectLayer) {
        layer.isIncorrectLayer = true;
      }
      return searchHierarchy(layers, layer.parentLayerId, depth+1, isIncorrectLayer);
    }
  }
}

class IncorrectLayers extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'incorrect-layers',
      description: 'Incorrect Layers',
      informative: true,
      helpText: 'Incorrect layer affects performance. '+
                 'It have to reduce unnecessary overlapped layers.' +
                 `and If the huge layer(over ${HUGE_LAYER}) changes frequently,` +
                 'it is have to separate changing part from unchanging part make layers.' +
                 '[Learn more](https://developers.google.com/web/fundamentals/performance/rendering/stick-to-compositor-only-properties-and-manage-layer-count)',
      requiredArtifacts: ['Layers']
    };
  }
  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const layers = artifacts.Layers;
    const totalCount = layers.length;
    const totalMemory = layers.reduce((a, b) => a + b.memory, 0);
    let invalidCount = 0;
    const depthPadding = 10;

    let results = layers.map((e, i) => {
      const info = {
        layerId: e.layerId,
        parentLayerId: e.parentLayerId,
        overlap: '',
        area: '',
        largeLayer: '',
        frequentlyRepainted: ''
      };

      info.arrow = {
        str: e.id,
        type: (e.layerId == (layers[i+1]?layers[i+1].parentLayerId:''))?'parent-layer':'single-layer'
      };

      // If you want to know detail information that check below url.
      // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/platform/graphics/CompositingReasons.cpp?l=12
      // https://cs.chromium.org/chromium/src/third_party/WebKit/Source/devtools/front_end/layer_viewer/LayerDetailsView.js?l=189
      if(e.compositingReasons.includes('assumedOverlap') ||
         e.compositingReasons.includes('overlap')) {
        invalidCount++;
        info.overlap = '✔';
      }

      info.area = (e.width * e.height/1000).toLocaleString(undefined, {maximumFractionDigits: 1}) + ' K';

      if(e.memory > ONEMB) {
        invalidCount++;
        info.largeLayer = `${bytesToSize(e.memory)}`;
      }

      if(e.frequentlyRepainted > frequentPaintCountMin) {
        invalidCount++;
        info.frequentlyRepainted = `${e.frequentlyRepainted}`;
      }

      return info;
    });

    results.forEach((info, i) => {

      if(info.overlap === '✔' || info.largeLayer || info.frequentlyRepainted) {
        info.isIncorrectLayer = true;
      } else {
        info.isIncorrectLayer = false;
      }

      const depth = searchHierarchy(results, info.layerId, 0, info.isIncorrectLayer);
      info.arrow.depth = (depth - 1) * depthPadding;
    });

    results = results.filter(({isIncorrectLayer}) => isIncorrectLayer);

    return {
      displayValue: `Total Layer Count: ${totalCount}, Layer Memory: ${bytesToSize(totalMemory)}`,
      rawValue: invalidCount === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.TABLE,
        value: {
          results,
          tableHeadings: {
            arrow: 'Layer ID',
            overlap: 'Overlaped Layer/Created because of overlap',
            area: 'Area (px²)',
            largeLayer: 'Large layer(over 1MB)',
            frequentlyRepainted: 'Frequently Repainted Layer(over 10)'
          }
        }
      }
    };
  }
}

module.exports = IncorrectLayers;
