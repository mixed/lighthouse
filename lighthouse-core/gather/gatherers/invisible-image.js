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
function getInVisibleImages(param) {

  const invisibleImages = [... document.querySelectorAll("img")].map( img => {
    return [img.getBoundingClientRect(), img];
  }).reduce( (prev, data) => {
    var info = data[0];
    var img = data[1];
    if(
      img.src !== "" &&
      info.width > 70 && info.height > 70 &&
      (info.top < param.top*-1 ||
      info.top > document.documentElement.clientHeight + param.bottom ||
      info.left < param.left*-1 ||
      info.left > document.documentElement.clientWidth + param.right)
    ){
      prev[img.src] = {
        "url" : img.src,
        "box" : {
          top : info.top,
          bottom : info.bottom,
          left : info.left,
          right : info.right,
          width : info.width,
          height : info.height
        }
      };
    }
    return prev;
  },{});
  // __returnResults is magically inserted by driver.evaluateAsync
  __returnResults(invisibleImages);
}

function getFileName(filename, url){
  if(filename === ""){
    const extractFileName = url.match(/\/([^/]*?)\.[\S]{3}$/);
    return extractFileName?extractFileName[0]:"none";
  }
  return filename;

}

function reviseThreshold(param){
  return JSON.stringify(["left","right","top","bottom"].reduce((prev, current) => {
    if(typeof param[current] === "string"){
      if(current === "left" || current === "right" ||
         current === "top" || current === "bottom"){
        prev[current] = param[current].replace(/(device\-)(w|h)/,(_, a, b) => {
          return "document.documentElement.client"+b.toUpperCase();
        });
      }
    }else{
      prev[current] = param[current]||0;
    }
    return prev;
  },{})).replace(/"/g,"");
}

class InvisibleImage extends Gatherer {

  afterPass(options,tracingData) {
    const driver = options.driver;
    const navigationRecord = tracingData.networkRecords.reduce( (prev, record) => {
      if(/image/.test(record._mimeType)){
        prev[record._url] = {
          transferSize: record._transferSize,
          filename: record._parsedURL.lastPathComponent,
          startTime: record._startTime,
          endTime: record._endTime,
          timing: record._timing
        };
      }
      return prev;
    },{});
    const param = reviseThreshold(options.config.threshold);
    return driver.evaluateAsync(`(${getInVisibleImages.toString()})(${param})`)
      .then( data => {
        const filteredData = Object.keys(data).reduce((prev, url) => {
          if(navigationRecord[url]){
            data[url].filename = getFileName(navigationRecord[url].filename,url);
            data[url].perf = navigationRecord[url];
            data[url].perf.spendTime = data[url].perf.endTime - data[url].perf.startTime;
            prev.push(data[url]);
          }
          return prev;
        },[]);

        this.artifact = filteredData;
        return;
      },_ => {
        this.artifact = [];
        return;
      });
  }
}


module.exports = InvisibleImage;
