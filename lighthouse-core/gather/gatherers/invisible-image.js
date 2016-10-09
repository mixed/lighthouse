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
'use strict';

const Gatherer = require('./gatherer');

// This is run in the page, not Lighthouse itself.
/* istanbul ignore next */
function getInVisibleImages() {
  const invisibleImages = [... document.querySelectorAll("img")].map( img => {
    return [img.getBoundingClientRect(), img];
  }).reduce( (prev, data) => {
    var info = data[0];
    var img = data[1];
    if(
      img.src !== "" &&
      info.width > 70 && info.height > 70 &&
      (info.top < 0 ||
      document.documentElement.clientHeight < info.top ||
      info.left < 0 ||
      document.documentElement.clientWidth  < info.left)
    ){
      info.src = img.src;
      prev.push(info);
    }
    return prev;
  },[]);
  // __returnResults is magically inserted by driver.evaluateAsync
  __returnResults(invisibleImages);
}

class InvisibleImage extends Gatherer {

  afterPass(options) {
    const driver = options.driver;

    return driver.sendCommand('Network.enable')
      .then(_ => {
        return new Promise((resolve, error) => {
          let imageDataList = [];
          const listener = (data) => {
            if(data.type === "Image"){
              imageDataList.push(data);
            }
          };

          driver.on('Network.responseReceived', listener);
          driver.once('Page.loadEventFired', _ => {
            driver.evaluateAsync(`${getInVisibleImages.toString()}()`).then(invisibleImages => {
              resolve(invisibleImages,imageDataList);
            });
            driver.off('Network.responseReceived', listener);
          });

        });
      })
      .then(data => {

      })
  }
}







        //   driver.once('LayerTree.layerTreeDidChange', data => {
        //     Promise.all(data.layers.map(info => {
        //       return driver.sendCommand('LayerTree.compositingReasons',{
        //         layerId : info.layerId
        //       })
        //     })).then(function(values) {
        //       resolve(values);
        //     });
        //     this.artifact = {
        //       raw: undefined,
        //       value: undefined,
        //       debugString: "test"
        //     };
        // return;
        //   });

module.exports = InvisibleImage;
