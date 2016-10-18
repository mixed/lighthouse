
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

const Audit = require('./audit');
const Formatter = require('../formatters/formatter');

class InvisibleImage extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance', // 카데고리 이름
      name: 'invisible-image', // 해당 audit 이름
      description: 'Invisible image information', //설명
      optimalValue: 0, // 최적의 값
      requiredArtifacts: ['InvisibleImage'] // gatherers에서 등록한 클래스 명
    };
  }

  /**
   * Audits the page to give a score for First Meaningful Paint.
   * @param {!Artifacts} artifacts The artifacts from the gather phase.
   * @return {!AuditResult} The score from the audit, ranging from 0-100.
   */
  static audit(artifacts) {
    const info = artifacts.InvisibleImage; // gatherers에서 등록한 클래스 명

    return InvisibleImage.generateAuditResult({ // 등록한 값으로 만듬.
        rawValue: info.length,
        optimalValue: this.meta.optimalValue,
        extendedInfo: {
          formatter: Formatter.SUPPORTED_FORMATS.INVISIBLE_IMAGE, // 등록한 formater
          value: info
        }
      });
  }
}

module.exports = InvisibleImage;
