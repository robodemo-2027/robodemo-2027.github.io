import {loadJSON} from './lib.js';
import {successfulRetrievedCases} from './successful-demos.js?v=20261121-six';
import {mountPairedGallery} from './paired-gallery.js?v=20261121-native-stream';

export function retrievedCards(allRows,evidence) {
  return successfulRetrievedCases(allRows,evidence).map(row=>({
    key:row.key,
    title:[row.title,row.titleZh||row.title],
    status:[
      `FINAL SUCCESS / ${row.execution.level} / ${row.execution.split.toUpperCase()}`,
      `终态成功 / ${row.execution.level} / ${row.execution.split.toUpperCase()}`
    ],
    reference:{
      src:`${row.media.reference}.mp4`,poster:`${row.media.reference}.jpg`,
      identity:row.reference.uid,label:['RETRIEVED VIDEO INPUT','检索视频输入'],
      instruction:row.reference.instruction
    },
    execution:{
      src:`${row.media.execution}.mp4`,poster:`${row.media.execution}.jpg`,
      identity:row.execution.trial_id,label:['SUCCESSFUL ROBOT EXECUTION','成功的机器人执行'],
      instruction:row.execution.instruction
    }
  }));
}

export async function initRetrievalGallery() {
  const [allRows,evidence]=await Promise.all([
    loadJSON('data/retrieval-success-pairs.json'),
    loadJSON('data/retrieval-success-evidence.json?v=20261121-six')
  ]);
  const rows=retrievedCards(allRows,evidence);
  if(!rows.length)throw new Error('No verified successful retrieval-guided recordings.');
  mountPairedGallery('#retrieval-gallery',rows,'#retrieval-success-count');
}
