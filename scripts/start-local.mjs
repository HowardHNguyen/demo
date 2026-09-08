import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const version=process.versions.node.split('.').map(Number);
if(version[0]<22||(version[0]===22&&version[1]<13)){console.error('VitalCKM requires Node.js 22.13 or newer. Install Node.js from https://nodejs.org and try again.');process.exit(1)}
const port=Number(process.env.PORT||4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT must be an integer from 1024 to 65535.');
const url=`http://localhost:${port}/`;
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(args){return spawn(npm,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'})}
if(!existsSync(path.join(root,'node_modules','vinext'))){console.log('Installing the locked dependencies. Internet access is needed on the first run.');const install=run(['ci']);const code=await new Promise(r=>install.on('exit',r));if(code!==0)process.exit(Number(code)||1)}
try{const response=await fetch(url,{signal:AbortSignal.timeout(1000)});if(response){console.error(`Port ${port} is already in use. Close the other demo terminal, or set PORT to a different value.`);process.exit(1)}}catch{}
console.log(`\nStarting VitalCKM Care at ${url}\nKeep this terminal open. Press Control+C to stop.\n`);
const child=run(['run','dev','--','--host','127.0.0.1','--port',String(port)]);
let stopped=false;child.on('exit',code=>{stopped=true;process.exitCode=code||0});
process.on('SIGINT',()=>{stopped=true;child.kill('SIGINT')});process.on('SIGTERM',()=>{stopped=true;child.kill('SIGTERM')});
for(let i=0;i<90&&!stopped;i++){
 await new Promise(r=>setTimeout(r,1000));
 try{const response=await fetch(url,{signal:AbortSignal.timeout(2500)});if(!response.ok)continue;
  let browser;
  if(process.platform==='darwin')browser=spawn('open',['-a','Google Chrome',url],{stdio:'ignore'});
  else if(process.platform==='win32')browser=spawn('cmd',['/c','start','','chrome',url],{stdio:'ignore'});
  else browser=spawn('google-chrome',[url],{stdio:'ignore'});
  browser.on('error',()=>console.log(`Open Chrome and visit ${url}`));
  browser.on('exit',code=>{if(code)console.log(`Open Chrome and visit ${url}`)});
  console.log(`Ready. Open Chrome at ${url}\nThis is a synthetic demonstration. Do not enter real patient information.`);break;
 }catch{}
 if(i===89)console.log(`The app is still starting. Check the messages above, then open ${url}`);
}
