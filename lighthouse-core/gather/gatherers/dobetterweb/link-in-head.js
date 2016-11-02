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

const Gatherer = require('../gatherer');

/* global document,window */

/* istanbul ignore next */
function getBlockFirstPaintLink() {
// filtered match stylesheet/import
// ref)
// https://www.igvita.com/2012/06/14/debunking-responsive-css-performance-myths/
// https://www.w3.org/TR/html-imports/#dfn-import-async-attribute
  const linkList = [... document.querySelectorAll('head link')].filter(link => {
    const asyncAttr = link.getAttribute('async');
    return (link.rel === 'stylesheet' && window.matchMedia(link.media).matches) ||
           (link.rel === 'import' && (asyncAttr === '' || asyncAttr));
  }).map(link => link.href);

  return Promise.resolve(linkList);
}

class LinkInHead extends Gatherer {

  _filteredLink(tracingData) {
    return tracingData.networkRecords.reduce((prev, record) => {
      // stylesheet of mimeType is text/css.
      // import of mimeType is text/html.
      if (/(css|html)/.test(record._mimeType)) {
        prev[record._url] = {
          transferSize: record._transferSize,
          startTime: record._startTime,
          endTime: record._endTime
        };
      }
      return prev;
    }, {});
  }

  _formatMS(info) {
    return Math.round((info.endTime - info.startTime) * 100) / 100;
  }

  afterPass(options, tracingData) {
    const linkInfo = this._filteredLink(tracingData);
    const driver = options.driver;
    this.artifact = {};
    return driver.evaluateAsync(`(${getBlockFirstPaintLink.toString()}())`)
      .then(result => {
        let totalTransferSize = 0;
        let totalSpendTime = 0;
        const filteredData = result.reduce((prev, url) => {
          if (linkInfo[url]) {
            const data = {};
            data.url = url;
            data.transferSize = linkInfo[url].transferSize;
            totalTransferSize += data.transferSize;
            data.spendTime = this._formatMS(linkInfo[url]);
            totalSpendTime += data.spendTime;
            prev.push(data);
          }
          return prev;
        }, []);
        this.artifact = {
          each: filteredData,
          total: {
            transferSize: totalTransferSize,
            spendTime: Math.round(totalSpendTime * 100) / 100
          }
        };
      })
      .catch(_ => {
        this.artifact = {
          value: -1,
          debugString: 'Unable to get stylesheet/webcomponents in head'
        };
      });
  }
}

module.exports = LinkInHead;
