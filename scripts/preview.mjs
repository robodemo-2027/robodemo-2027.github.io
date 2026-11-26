import http from 'node:http';
import fs from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT||4193);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mp4':'video/mp4',
  '.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.vtt':'text/vtt',
  '.ttf':'font/ttf','.csv':'text/csv','.txt':'text/plain'};

// Bind only to localhost; byte ranges let native video controls seek correctly.
http.createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){
      res.writeHead(405,{Allow:'GET, HEAD'}).end();return;
    }
    const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const segments=requested.split('/');
    if(segments.some(segment=>segment.startsWith('.'))){
      res.writeHead(403).end();return;
    }
    const file=await realpath(path.join(root,requested==='/'?'index.html':requested));
    if(!file.startsWith(root)){
      res.writeHead(403).end();return;
    }
    const info=await stat(file);
    if(!info.isFile()){res.writeHead(404).end();return;}
    const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream',
      'Accept-Ranges':'bytes','Cache-Control':'no-cache'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!range||!range[1]&&!range[2]){
        res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;
      }
      start=range[1]?Number(range[1]):Math.max(0,info.size-Number(range[2]));
      end=range[1]&&range[2]?Math.min(Number(range[2]),end):end;
      if(start>end||start<0){
        res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;
      }
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size){res.end();return;}
    const stream=fs.createReadStream(file,{start,end});
    stream.on('error',()=>res.destroy());
    res.on('close',()=>stream.destroy());
    stream.pipe(res);
  }catch{
    if(!res.headersSent)res.writeHead(404);
    res.end();
  }
}).listen(port,'127.0.0.1',()=>console.log(`Local preview: http://127.0.0.1:${port}/`));
