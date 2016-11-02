/**
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

/* eslint-env mocha */

const LinkInHeadGather = require('../../../../gather/gatherers/dobetterweb/link-in-head');
const assert = require('assert');
let linkInHeadGather;
const traceData = {
  networkRecords: [
    {
      _url: 'http://google.com/css/style.css',
      _mimeType: 'text/css',
      _transferSize: 10,
      _startTime: 10,
      _endTime: 10
    },
    {
      _url: 'http://google.com/wc/select.html',
      _mimeType: 'text/html',
      _transferSize: 11,
      _startTime: 11,
      _endTime: 11
    },
    {
      _url: 'http://google.com/js/app.js',
      _mimeType: 'text/javascript',
      _transferSize: 12,
      _startTime: 12,
      _endTime: 12
    }
  ]
};

describe('Link in head', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    linkInHeadGather = new LinkInHeadGather();
  });

  it('return formated Time', () => {
    return assert.equal(linkInHeadGather._formatMS({
      startTime: 0.888,
      endTime: 0.999
    }), 0.11);
  });

  it('return filtered Link', () => {
    return assert.deepEqual(linkInHeadGather._filteredLink(traceData), {
      'http://google.com/css/style.css': {
        transferSize: 10,
        startTime: 10,
        endTime: 10
      },
      'http://google.com/wc/select.html': {
        transferSize: 11,
        startTime: 11,
        endTime: 11
      }
    });
  });

  it('returns an artifact', () => {
    return linkInHeadGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.resolve(['http://google.com/css/style.css']);
        }
      }
    }, traceData).then(_ => {
      const expected = {
        each: [{
          url: 'http://google.com/css/style.css',
          transferSize: 10,
          spendTime: 0}],
        total: {
          transferSize: 10,
          spendTime: 0}
      };
      assert.deepEqual(linkInHeadGather.artifact, expected);
    });
  });

  it('handles driver failure', () => {
    return linkInHeadGather.afterPass({
      driver: {
        evaluateAsync() {
          return Promise.reject('such a fail');
        }
      }
    }, traceData).then(_ => {
      assert.equal(linkInHeadGather.artifact.value, -1);
      assert.ok(linkInHeadGather.artifact.debugString);
    });
  });
});
