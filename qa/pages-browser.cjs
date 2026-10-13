const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async()=>{
  const basePath=process.env.VITE_BASE_PATH || '/appointment-system/';
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--mode','pages','--port','5190','--strictPort','--host','127.0.0.1'], { stdio:'pipe',windowsHide:true,env:{...process.env,VITE_BASE_PATH:basePath} });
  let browser;
  try {
    await new Promise((resolve,reject)=>{server.stdout.on('data',data=>{if(String(data).includes('Local:'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error('Preview server exited '+code)));setTimeout(()=>reject(new Error('Preview startup timeout')),15000).unref();});
    browser=await chromium.launch({channel:process.env.TEST_BROWSER_CHANNEL||'msedge',headless:true});
    const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];const api=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(new URL(request.url()).pathname.includes('/api/'))api.push(request.url());});
    await page.goto('http://127.0.0.1:5190'+basePath);await page.getByText('Frontend preview · sample data · online login and saving unavailable',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Sample accounts',exact:true}).click();await page.getByRole('button',{name:/Sarah Mitchell/}).click();await page.getByRole('heading',{name:/Good morning/}).waitFor();
    assert.equal(await page.getByRole('button',{name:'New Appointment',exact:true}).count(),0);
    await page.getByRole('button',{name:'Appointments',exact:true}).first().click();await page.getByText('James Whitfield',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Settings',exact:true}).first().click();await page.getByRole('button',{name:'Account',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Update Password',exact:true}).isDisabled(),true);
    await page.getByRole('button',{name:'Sign Out',exact:true}).click();await page.getByRole('button',{name:'Sample accounts',exact:true}).click();await page.getByRole('button',{name:/James Alderton/}).click();
    await page.getByRole('button',{name:'System History',exact:true}).click();await page.locator('tbody tr').first().waitFor();
    assert.deepEqual(errors,[]);assert.deepEqual(api,[]);
    console.log('PASS: GitHub Pages repository subpath assets, sample role screens, read-only controls, sample audit, zero API requests, zero browser errors');
  } finally {if(browser)await browser.close();server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});}
})().catch(error=>{console.error(error);process.exitCode=1;});
