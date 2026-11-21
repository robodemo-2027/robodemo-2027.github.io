import {successfulHumanCases} from './successful-demos.js?v=20261121-six';
import {mountPairedGallery} from './paired-gallery.js?v=20261121-native-stream';

export function humanCards(data) {
  return successfulHumanCases(data).map(task=>({
    key:task.key,
    title:[task.en,task.zh],
    status:['FINAL SUCCESS / L0','终态成功 / L0'],
    reference:{
      src:task.videos.human,poster:task.posters.human,identity:task.reference,
      label:['HUMAN DEMONSTRATION','人类演示输入'],instruction:task.language
    },
    execution:{
      src:task.videos.with,poster:task.posters.with,identity:task.trial,
      label:['SUCCESSFUL ROBOT EXECUTION','成功的机器人执行'],instruction:task.language
    }
  }));
}

export function initDemos(data) {
  const rows=humanCards(data);
  if(!rows.length)throw new Error('No verified successful human-guided recordings.');
  const params=new URLSearchParams(location.search);
  if(params.has('comparison')&&params.get('comparison')!=='paired'){
    params.set('comparison','paired');
    history.replaceState(null,'',`${location.pathname}?${params}${location.hash}`);
  }
  mountPairedGallery('#human-gallery',rows,'#human-success-count');
}
