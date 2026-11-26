import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

// Recut only the two credit cards. The experiment footage and AAC are copied.
const root=fileURLToPath(new URL('../',import.meta.url));
const original=process.argv[2]&&path.resolve(process.argv[2]);
if(!original)throw new Error('Usage: node scripts/update-film-credits.mjs ORIGINAL_FILM.mp4 [WORK_DIR]');
const work=process.argv[3]?path.resolve(process.argv[3]):fs.mkdtempSync(path.join(os.tmpdir(),'robodemo-credits-'));
fs.mkdirSync(work,{recursive:true});
const output=path.join(root,'assets/video/summary-public-authors-1080p.mp4');
assert.notEqual(original,output,'Preserve the original film');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const probe=(file,args)=>JSON.parse(execFileSync('ffprobe',['-v','error',...args,'-of','json',file],{maxBuffer:16e6}));
const ff=args=>execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
const metadata=probe(original,['-show_streams']);
const video=metadata.streams.find(s=>s.codec_type==='video');
assert.equal(video.nb_frames,'7619');
assert.equal(video.r_frame_rate,'30/1');
assert.equal(video.width,1920);
assert.equal(video.height,1080);
const originalHash=hash(original);
const scenes=[{id:'title',frames:240},{id:'closing',frames:257}];
for(const {id,frames} of scenes){
  const svg=path.join(root,`assets/svg/film-${id}-authors.svg`),png=path.join(work,`${id}.png`);
  execFileSync('rsvg-convert',[svg,'-o',png]);
  ff(['-loop','1','-framerate','30','-i',png,'-vf',
    `fade=t=in:st=0:d=0.18:color=0xFFFEFC,fade=t=out:st=${frames/30-.18}:d=0.18:color=0xFFFEFC,format=yuv420p`,
    '-frames:v',String(frames),'-an','-c:v','libx264','-crf','19','-preset','fast','-threads','2',
    '-pix_fmt','yuv420p','-movflags','+faststart',path.join(work,`${id}.mp4`)]);
}
ff(['-ss','8','-i',original,'-t','237.4','-map','0:v:0','-an','-c:v','copy',
  '-frames:v','7122',path.join(work,'middle.mp4')]);
fs.writeFileSync(path.join(work,'concat.txt'),['title','middle','closing']
  .map(id=>`file '${path.join(work,`${id}.mp4`).replaceAll("'","'\\''")}'`).join('\n')+'\n');
fs.mkdirSync(path.dirname(output),{recursive:true});
ff(['-f','concat','-safe','0','-i',path.join(work,'concat.txt'),'-i',original,
  '-map','0:v:0','-map','1:a:0','-c','copy','-t',String(7619/30),'-map_metadata','-1',
  '-movflags','+faststart',output]);
ff(['-i',path.join(work,'title.png'),'-frames:v','1','-q:v','2',
  path.join(root,'assets/posters/summary-public-authors.jpg')]);

const packets=(file,stream)=>probe(file,['-select_streams',stream,'-show_packets',
  '-show_entries','packet=pts_time,data_hash','-show_data_hash','sha256']).packets;
const originalVideo=packets(original,'v:0'),revisedVideo=packets(output,'v:0');
const middle=packets=>packets.filter(p=>+p.pts_time>=8&&+p.pts_time<245.4);
const originalMiddle=middle(originalVideo),revisedMiddle=middle(revisedVideo);
assert.equal(revisedVideo.length,7619);
assert.equal(originalMiddle.length,7122);
assert.deepEqual(revisedMiddle,originalMiddle,'Every middle video packet and presentation time must be unchanged');
const originalAudio=packets(original,'a:0'),revisedAudio=packets(output,'a:0');
assert.deepEqual(revisedAudio,originalAudio,'AAC narration and presentation times must be unchanged');
assert.equal(hash(original),originalHash);
const digest=items=>crypto.createHash('sha256').update(JSON.stringify(items)).digest('hex');
const receipt={
  revision:'2026-11-26',video:'assets/video/summary-public-authors-1080p.mp4',
  sourceSha256:originalHash,sha256:hash(output),frames:7619,duration:7619/30,
  changedIntervals:[{start:0,end:8,svg:'assets/svg/film-title-authors.svg'},
    {start:245.4,end:7619/30,svg:'assets/svg/film-closing-authors.svg'}],
  middleVideo:{start:8,end:245.4,packets:7122,packetAndTimestampSha256:digest(revisedMiddle),unchanged:true},
  narration:{packets:revisedAudio.length,packetAndTimestampSha256:digest(revisedAudio),unchanged:true},
  captions:{path:'assets/subtitles/summary-en.vtt',sha256:hash(path.join(root,'assets/subtitles/summary-en.vtt'))}
};
fs.writeFileSync(path.join(root,'data/film-authors-revision.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
