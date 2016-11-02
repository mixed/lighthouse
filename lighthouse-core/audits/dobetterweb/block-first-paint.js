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
 * @fileoverview Audit a page to see if it use link in head.
 */

'use strict';

const Audit = require('../audit');
const Formatter = require('../../formatters/formatter');

class BlockFirstPaintAudit extends Audit {

  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'block-first-paint',
      description: 'Site does not use <link> in head',
      helpText: 'Consider moving the link from head to body. <a href="https://www.youtube.com/watch?v=6m_E-mC0y3Y"  target="_blank">Link in head will block first paint.</a>',
      requiredArtifacts: ['LinkInHead']
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (typeof artifacts.LinkInHead === 'undefined' ||
        artifacts.LinkInHead.value === -1) {
      return BlockFirstPaintAudit.generateAuditResult({
        rawValue: false,
        debugString: 'LinkInHead gatherer did not run'
      });
    }

    const results = artifacts.LinkInHead.each.map(link => {
      return {
        url: link.url,
        label: `blocked first paint by ${link.spendTime}ms`
      };
    });

    let displayValue = '';
    const totalSpendTime = artifacts.LinkInHead.total.spendTime;
    if (results.length > 0) {
      displayValue = `${results.length} resources blocked first paint by ${totalSpendTime}ms`;
    }

    return BlockFirstPaintAudit.generateAuditResult({
      displayValue,
      rawValue: artifacts.LinkInHead.each.length === 0,
      extendedInfo: {
        formatter: Formatter.SUPPORTED_FORMATS.URLLIST,
        value: results
      }
    });
  }
}

module.exports = BlockFirstPaintAudit;
