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

const Formatter = require('./formatter');

class InvisibleImage extends Formatter {

  /**
   * gets the formatter for the CLI Printer and the HTML report.
   */
  static getFormatter(type) {
    switch (type) {
      case 'pretty':
        return function(info) {
          if (info === null ||
              typeof info === 'undefined') {
            return '';
          }

          const count = InvisibleImage._count(info);
          const duration = InvisibleImage._duration(info);
          const transferSize = InvisibleImage._transferSize(info);
          const listup = InvisibleImage._listup(info);

          const output = `    - Count: ${count}\n` +
          `    - Duration: ${duration}ms\n` +
          `    - Transfer Size: ${transferSize}KB\n` +
          '    - List' +
              '      ' + listup.replace(/\n/g, '\n      ') + '\n';
          return output;
        };

      case 'html':
        '';

      default:
        throw new Error('Unknown formatter type');
    }
  }

  static _count(info) {
    return info.length;
  }

  static _formatMS(ms) {
    return Math.round(ms * 100) / 100;
  }

  static _formatSize(ms) {
    return Math.round(ms / 10) / 100;
  }

  static _duration(info) {
    return InvisibleImage._formatMS(info.reduce((prev, next) => {
      return prev + next.perf.spendTime;
    }, 0));
  }

  static _transferSize(info) {
    return InvisibleImage._formatSize(info.reduce((prev, next) => {
      return prev + next.perf.transferSize;
    }, 0));
  }

  static _listup(info) {
    const totalCount = info.length;
    return info.reduce((prev, next, i) => {
      let delimiter;
      if (i === 0) {
        delimiter = '┏━';
      } else if (i === (totalCount - 1)) {
        delimiter = '┗━';
      } else {
        delimiter = '┣━';
      }
      return `${prev}\n${delimiter} ${next.filename} - ` +
              `${InvisibleImage._formatMS(next.perf.spendTime)}ms, ` +
              `${InvisibleImage._formatSize(next.perf.transferSize)}KB`;
    }, '');
  }
}

module.exports = InvisibleImage;
