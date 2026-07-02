/* ============================================================
   InfoFlow KV — interactions
   ============================================================ */

/* ---------- NAV scroll state ---------- */
const nav = document.querySelector('.nav');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 40);
}, {passive:true});

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
}, {threshold:0.12});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- count-up metrics ---------- */
function countUp(el){
  const target = parseFloat(el.dataset.count);
  const dec = (el.dataset.dec|0);
  const suffix = el.dataset.suffix || '';
  const dur = 1200; const t0 = performance.now();
  function step(t){
    const p = Math.min(1, (t - t0)/dur);
    const e = 1 - Math.pow(1-p, 3);
    el.textContent = (target*e).toFixed(dec) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const mio = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting){ countUp(e.target); mio.unobserve(e.target); } });
}, {threshold:0.6});
document.querySelectorAll('[data-count]').forEach(el => mio.observe(el));

/* ============================================================
   HERO CANVAS — token attention flow toward the prompt
   ============================================================ */
(function(){
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let W, H, DPR, nodes = [], prompt, pulses = [];

  const CHUNK_COLORS = [
    [120,180,255], // a blue
    [110,225,205], // b teal
    [240,205,120], // c amber
    [225,150,230], // d magenta
  ];

  function resize(){
    DPR = Math.min(2, devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W*DPR; canvas.height = H*DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    build();
  }

  function build(){
    nodes = [];
    // prompt anchor on the right
    prompt = { x: W*0.80, y: H*0.5 };
    const N = Math.max(34, Math.min(70, Math.floor(W/22)));
    for (let i=0;i<N;i++){
      const chunk = i % 4;
      const col = CHUNK_COLORS[chunk];
      // distribute across left ~70% of width
      const gx = (i/N);
      const x = (0.04 + gx*0.66) * W + (Math.random()-0.5)*40;
      const y = (0.12 + Math.random()*0.76) * H;
      const selected = Math.random() < 0.16;
      nodes.push({
        x, y, bx:x, by:y,
        r: selected ? 3.4 : 1.6 + Math.random()*1.4,
        col, selected,
        phase: Math.random()*Math.PI*2,
        amp: 6 + Math.random()*16,
        spd: 0.2 + Math.random()*0.5,
        // attention weight to prompt
        w: selected ? 0.9 : Math.random()*0.28,
      });
    }
    pulses = [];
  }

  function spawnPulse(){
    // pick a node, weighted toward selected
    const pool = nodes.filter(n => n.selected || Math.random()<0.25);
    if (!pool.length) return;
    const n = pool[(Math.random()*pool.length)|0];
    pulses.push({ n, t:0, spd: 0.006 + Math.random()*0.01, hot: n.selected });
  }

  let last = 0;
  function frame(now){
    const dt = Math.min(40, now-last); last = now;
    ctx.clearRect(0,0,W,H);

    // drift the prompt slightly
    const pt = now*0.0004;
    prompt.x = W*0.80 + Math.cos(pt)*10;
    prompt.y = H*0.5 + Math.sin(pt*1.3)*16;

    // animate nodes
    for (const n of nodes){
      n.phase += n.spd * dt*0.02;
      n.x = n.bx + Math.cos(n.phase)*n.amp;
      n.y = n.by + Math.sin(n.phase*0.8)*n.amp*0.6;
    }

    // attention lines (faint)
    for (const n of nodes){
      const alpha = n.selected ? 0.32 : n.w*0.16;
      if (alpha < 0.02) continue;
      const [r,g,b] = n.selected ? [240,200,120] : n.col;
      ctx.beginPath();
      const mx = (n.x + prompt.x)/2;
      ctx.moveTo(n.x, n.y);
      ctx.bezierCurveTo(mx, n.y, mx, prompt.y, prompt.x, prompt.y);
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.lineWidth = n.selected ? 1.1 : 0.5;
      ctx.stroke();
    }

    // pulses traveling along curves
    if (!reduce && Math.random() < 0.5) spawnPulse();
    for (let i=pulses.length-1;i>=0;i--){
      const p = pulses[i]; p.t += p.spd*dt*0.06;
      if (p.t >= 1){ pulses.splice(i,1); continue; }
      const n = p.n, mx = (n.x+prompt.x)/2, t = p.t, it = 1-t;
      const x = it*it*it*n.x + 3*it*it*t*mx + 3*it*t*t*mx + t*t*t*prompt.x;
      const y = it*it*it*n.y + 3*it*it*t*n.y + 3*it*t*t*prompt.y + t*t*t*prompt.y;
      const [r,g,b] = p.hot ? [245,200,115] : [150,200,255];
      const rad = p.hot ? 3.2 : 2.1;
      const grd = ctx.createRadialGradient(x,y,0,x,y,rad*4);
      grd.addColorStop(0,`rgba(${r},${g},${b},0.9)`);
      grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x,y,rad*4,0,7); ctx.fill();
      ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
      ctx.beginPath(); ctx.arc(x,y,rad,0,7); ctx.fill();
    }

    // nodes
    for (const n of nodes){
      const [r,g,b] = n.selected ? [245,200,115] : n.col;
      if (n.selected){
        const glow = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*6);
        glow.addColorStop(0,`rgba(${r},${g},${b},0.5)`);
        glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(n.x,n.y,n.r*6,0,7); ctx.fill();
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${n.selected?1:0.7})`;
      ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,7); ctx.fill();
    }

    // prompt node — big glowing target
    const pg = ctx.createRadialGradient(prompt.x,prompt.y,0,prompt.x,prompt.y,46);
    pg.addColorStop(0,'rgba(150,200,255,0.55)');
    pg.addColorStop(0.5,'rgba(140,120,250,0.18)');
    pg.addColorStop(1,'rgba(140,120,250,0)');
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(prompt.x,prompt.y,46,0,7); ctx.fill();
    ctx.fillStyle = 'rgba(190,220,255,0.95)';
    ctx.beginPath(); ctx.arc(prompt.x,prompt.y,5,0,7); ctx.fill();
    ctx.strokeStyle = 'rgba(150,200,255,0.5)';
    ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(prompt.x,prompt.y,12,0,7); ctx.stroke();

    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  resize();
  if (reduce){ // static frame
    frame(0);
  } else {
    requestAnimationFrame(frame);
  }
})();

/* ============================================================
   PIPELINE DIAGRAM (dark, glowing)
   ============================================================ */
(function(){
  const host = document.getElementById('pipeline-diagram');
  if (!host) return;
  const ns = 'http://www.w3.org/2000/svg';
  const W = 760, H = 300;
  const chunkW = 116, chunkH = 52, gap = 18;
  const chunks = [
    {c:'var(--chunk-a)', label:'Chunk 1'},
    {c:'var(--chunk-b)', label:'Chunk 2'},
    {c:'var(--chunk-c)', label:'Chunk 3'},
    {c:'var(--chunk-d)', label:'Chunk 4'},
  ];

  function el(tag, attrs){ const e=document.createElementNS(ns,tag); for(const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function rect(x,y,w,h,fill,opt={}){ return el('rect',{x,y,width:w,height:h,rx:opt.rx??8,fill,
    stroke:opt.stroke||'none','stroke-width':opt.sw||1,opacity:opt.op??1}); }
  function text(x,y,t,opt={}){ const e=el('text',{x,y,'text-anchor':opt.anchor||'middle',
    'font-family':opt.mono?'JetBrains Mono, monospace':'Space Grotesk, sans-serif',
    'font-size':opt.size||11,fill:opt.fill||'var(--ink-2)'}); if(opt.weight)e.setAttribute('font-weight',opt.weight);
    if(opt.ls)e.setAttribute('letter-spacing',opt.ls); e.textContent=t; return e; }
  // draw-in an arrow/line; brighten a selected element from gray
  function drawIn(p,delay,dur){ p.style.strokeDasharray='1000'; p.animate([{strokeDashoffset:1000},{strokeDashoffset:0}],{duration:dur||1100,delay:delay||0,fill:'both',easing:'ease'}); }
  function fadeIn(e,delay,dur){ const o=e.getAttribute('opacity')||'1'; e.animate([{opacity:0},{opacity:o}],{duration:dur||950,delay:delay||0,fill:'both',easing:'ease'}); }
  function fadeOut(e,delay,dur){ const o=e.getAttribute('opacity')||'1'; e.animate([{opacity:o},{opacity:0}],{duration:dur||950,delay:delay||0,fill:'both',easing:'ease'}); }

  function build(step){
    const svg = el('svg',{viewBox:`0 0 ${W} ${H}`,width:'100%'});
    svg.style.maxHeight='340px'; svg.style.display='block';

    const defs = el('defs',{});
    defs.innerHTML = `
      <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)"/>
      </marker>
      <marker id="arh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--hot)"/>
      </marker>
      <marker id="arc" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)"/>
      </marker>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <linearGradient id="ptri" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.22"/><stop offset="1" stop-color="var(--chunk-d)" stop-opacity="0.12"/></linearGradient>`;
    svg.appendChild(defs);

    const titles = [
      '01 · Prefill each chunk offline',
      '02 · Concatenate · restore global RoPE',
      '03 · Score tokens by attention norm',
      '04 · Recompute selected tokens',
    ];
    svg.appendChild(text(W/2,22,titles[step].toUpperCase(),{mono:true,size:11,fill:'var(--accent)',ls:'0.08em',weight:600}));

    if (step === 0){
      // offline KV store (left)
      svg.appendChild(rect(28,50,322,212,'var(--bg)',{rx:14,stroke:'var(--line)'}));
      svg.appendChild(text(189,74,'OFFLINE KV STORE',{mono:true,size:10.5,fill:'var(--ink-2)',ls:'0.12em',weight:600}));
      const cy=[];
      for(let i=0;i<4;i++){
        const y=90+i*42; cy.push(y+16);
        svg.appendChild(rect(44,y,290,32,chunks[i].c,{rx:8,op:0.16,stroke:chunks[i].c,sw:1.4}));
        svg.appendChild(text(58,y+21,chunks[i].label,{anchor:'start',size:13,fill:'var(--ink)',weight:700}));
        for(let k=0;k<6;k++) svg.appendChild(rect(128+k*15,y+8,11,16,chunks[i].c,{rx:3,op:0.55,stroke:chunks[i].c,sw:1}));
        svg.appendChild(text(324,y+21,'RoPE 0…n',{anchor:'end',size:10,fill:'var(--ink-2)',mono:true}));
      }
      // query → RAG retrieves a relevant subset → final KV (right)
      svg.appendChild(text(508,72,'QUERY \u2192 RAG RETRIEVES',{anchor:'start',size:11,fill:'var(--accent)',mono:true,ls:'0.05em',weight:600}));
      svg.appendChild(rect(498,90,236,150,'var(--bg-2)',{rx:14,stroke:'var(--line)'}));
      svg.appendChild(text(516,116,'FINAL KV',{anchor:'start',size:13,fill:'var(--ink)',weight:700,mono:true,ls:'0.06em'}));
      const picks=[0,2], py=[134,184];
      picks.forEach((ci,idx)=>{
        const y=py[idx];
        const g=el('g',{});
        g.appendChild(rect(514,y,204,34,chunks[ci].c,{rx:8,op:0.18,stroke:chunks[ci].c,sw:1.4}));
        g.appendChild(text(528,y+22,chunks[ci].label,{anchor:'start',size:12,fill:'var(--ink)',weight:700}));
        for(let k=0;k<5;k++) g.appendChild(rect(610+k*16,y+9,11,16,chunks[ci].c,{rx:3,op:0.55,stroke:chunks[ci].c,sw:1}));
        fadeIn(g, 700+idx*700, 650); svg.appendChild(g);
      });
      // arrows: RAG pulls the relevant chunks out of the store into the final KV (drawn in)
      picks.forEach((ci,idx)=>{
        const y0=cy[ci], y1=py[idx]+17;
        const a=el('path',{d:`M 338 ${y0} C 410 ${y0}, 432 ${y1}, 496 ${y1}`,
          stroke:'var(--accent)','stroke-width':1.6,'stroke-opacity':0.85,fill:'none','marker-end':'url(#arc)'});
        drawIn(a, 400+idx*700, 650); svg.appendChild(a);
      });
      svg.appendChild(text(W/2,290,'RAG retrieves the relevant chunks \u2014 each cached alone, with no cross-chunk attention yet.',{size:14,fill:'var(--ink)'}));
    }

    if (step >= 1){
      const rowY=step===3?78:(step===2?176:158), ch=52, startX=30; let x=startX; const positions=[];
      const barBase=rowY-12, maxBarH=80;
      const SEL=(i,k)=>((i===0&&k===3)||(i===1&&k===1)||(i===2&&k===4)||(i===3&&k===0));
      const score=(i,k)=> SEL(i,k) ? 0.80+((i*5+k)%3)*0.06 : 0.12+(((i*13+k*7)%10)/10)*0.38;
      const rowRight=startX+4*(chunkW+gap)-gap;

      // global index axis (step 1) — draws in as positions go global
      if(step===1){
        const ay=118;
        const axln=el('line',{x1:startX,y1:ay,x2:rowRight+8,y2:ay,stroke:'var(--accent)','stroke-width':1.4,'stroke-opacity':0.55,'marker-end':'url(#ar)'});
        drawIn(axln,450,900); svg.appendChild(axln);
        [0,6,12,18,24].forEach((n,ti)=>{
          const tx=startX+(rowRight-startX)*(n/24);
          const tk=el('line',{x1:tx,y1:ay-4,x2:tx,y2:ay+4,stroke:'var(--accent)','stroke-width':1.2,'stroke-opacity':0.65});
          const lb=text(tx,ay-11,String(n),{size:11.5,fill:'var(--accent)',mono:true,weight:600});
          fadeIn(tk,500+ti*90); fadeIn(lb,500+ti*90); svg.appendChild(tk); svg.appendChild(lb);
        });
        svg.appendChild(text(startX,ay-31,'one continuous global index',{anchor:'start',size:13,fill:'var(--ink-2)',mono:true,weight:500}));
      }

      // attention-score bar chart (step 2)
      if(step===2){
        const ty=barBase-0.64*maxBarH;
        svg.appendChild(text(startX,72,'attention norm',{anchor:'start',size:12,fill:'var(--ink-2)',mono:true,weight:500}));
        svg.appendChild(el('line',{x1:startX,y1:ty,x2:rowRight,y2:ty,stroke:'var(--hot)','stroke-width':1.2,'stroke-dasharray':'5 4','stroke-opacity':0.85}));
        svg.appendChild(text(rowRight,ty-6,'top 15%',{anchor:'end',size:12,fill:'var(--hot)',mono:true,weight:600}));
      }

      let selN=0;
      for(let i=0;i<chunks.length;i++){
        svg.appendChild(rect(x,rowY,chunkW,ch,chunks[i].c,{rx:8,op:0.16,stroke:chunks[i].c,sw:1.4}));
        svg.appendChild(text(x+chunkW/2,rowY+20,chunks[i].label,{size:12,fill:'var(--ink)',weight:700}));
        for(let k=0;k<6;k++){
          const tx=x+8+k*17, ty=rowY+30;
          const sel=(step>=2)&&SEL(i,k);
          const bh=score(i,k)*maxBarH;
          const dly=500+selN*150;
          if(step===2){
            // uniform blue base bar + amber overlay for selected
            svg.appendChild(rect(tx,barBase-bh,12,bh,'var(--accent)',{rx:2,op:sel?0.28:0.42}));
            if(sel){ const ab=rect(tx,barBase-bh,12,bh,'var(--hot)',{rx:2,op:0.95}); fadeIn(ab,dly); svg.appendChild(ab); }
          }
          // gray base token cell
          svg.appendChild(rect(tx,ty,12,15,chunks[i].c,{rx:3,op:0.5,stroke:chunks[i].c,sw:1}));
          if(sel){ const tk=rect(tx,ty,12,15,'var(--hot)',{rx:3,op:1,stroke:'var(--hot)',sw:1}); tk.setAttribute('filter','url(#glow)'); if(step===2) fadeIn(tk,dly); svg.appendChild(tk); }
          positions.push({x:tx+6,y:ty+7,sel,chunk:i,barTop:barBase-bh});
          if(sel) selN++;
        }
        if(step===1){
          // local [0…5] (each chunk starts at 0) crossfades into the global index
          const loc=text(x+chunkW/2,rowY+ch+16,'[0…5] local',{size:11,fill:'var(--ink-4)',mono:true});
          const glob=text(x+chunkW/2,rowY+ch+16,`[${i*6}…${i*6+5}]`,{size:12,fill:'var(--accent)',mono:true,weight:600});
          fadeOut(loc,500,900); fadeIn(glob,500,900); svg.appendChild(loc); svg.appendChild(glob);
        } else if(step===2) svg.appendChild(text(x+chunkW/2,rowY+ch+16,`[${i*6}…${i*6+5}]`,
          {size:10,fill:'var(--ink-3)',mono:true,weight:400}));
        x+=chunkW+gap;
      }

      // prompt block
      const pX=x+10, pW=116;
      svg.appendChild(rect(pX,rowY,pW,ch,'var(--accent)',{rx:8,op:0.92}));
      svg.appendChild(text(pX+pW/2,rowY+ch/2-3,'PROMPT',{size:11,fill:'oklch(0.16 0.02 264)',weight:700,mono:true,ls:'0.08em'}));
      svg.appendChild(text(pX+pW/2,rowY+ch/2+14,'q₁ q₂ q₃ q₄ q₅',{size:10,fill:'oklch(0.20 0.03 264)',mono:true}));
      if(step<3) svg.appendChild(text(pX+pW/2,rowY+ch+16,'[24…28]',{size:10,fill:'var(--ink-3)',mono:true}));

      // prompt → selected-token arrows (step 2), drawn in with a stagger
      if(step===2){
        const sx=pX+4, sy=rowY+12;
        positions.filter(p=>p.sel).forEach((p,idx)=>{
          const a=el('path',{d:`M ${sx} ${sy} C ${sx-80} ${sy-46}, ${p.x} ${p.barTop-46}, ${p.x} ${p.barTop-5}`,
            stroke:'var(--hot)','stroke-width':1.5,'stroke-opacity':0.8,fill:'none','marker-end':'url(#arh)'});
          drawIn(a, 500+idx*150); svg.appendChild(a);
        });
        svg.appendChild(text(pX+pW/2,rowY-4,'prompt selects ↑',{anchor:'middle',size:10.5,fill:'var(--hot)',mono:true}));
      }

      // recompute (step 3): clean causal-attention triangle; selected tokens point to bright amber lines
      if(step>=3){
        const selected=positions.filter(p=>p.sel);
        selected.forEach(p=>{
          svg.appendChild(el('circle',{cx:p.x,cy:p.y,r:8.5,fill:'none',stroke:'var(--hot)','stroke-width':1.6,'stroke-opacity':0.95}));
        });
        const nTok=positions.length, oY=150, triH=86;
        const leftX=30, maxW=positions[nTok-1].x-leftX, axisY=oY+triH+10;
        // single clean causal triangle (no horizontal rungs)
        const tri=el('path',{d:`M ${leftX} ${oY} L ${(leftX+maxW).toFixed(1)} ${oY+triH} L ${leftX} ${oY+triH} Z`,fill:'url(#ptri)',stroke:'var(--accent)','stroke-width':1.3,'stroke-opacity':0.6});
        fadeIn(tri,200,700); svg.appendChild(tri);
        // each selected token → bright amber line spanning all earlier context + arrow down (drawn in)
        let rg=0;
        positions.forEach((p,g)=>{
          if(!p.sel) return;
          const y=oY+triH*(p.x-leftX)/maxW, dl=500+rg*180; rg++;
          svg.appendChild(el('line',{x1:leftX,y1:y,x2:p.x,y2:y,stroke:'var(--hot)','stroke-width':7,'stroke-opacity':0.22}));
          const ln=el('line',{x1:leftX,y1:y,x2:p.x,y2:y,stroke:'var(--hot)','stroke-width':3.2,'stroke-opacity':1}); drawIn(ln,dl,850); svg.appendChild(ln);
          const dot=el('circle',{cx:p.x,cy:y,r:3.4,fill:'var(--hot)'}); fadeIn(dot,dl,500); svg.appendChild(dot);
          const ar=el('path',{d:`M ${p.x} ${p.y+9} L ${p.x} ${y-6}`,stroke:'var(--hot)','stroke-width':1.7,'stroke-opacity':0.95,fill:'none','marker-end':'url(#arh)'}); drawIn(ar,dl,500); svg.appendChild(ar);
        });
        // bottom caption (consistent with steps 2 & 3)
        // RoPE coordinate axis below the triangle
        svg.appendChild(el('line',{x1:leftX,y1:axisY,x2:leftX+maxW+10,y2:axisY,stroke:'var(--accent)','stroke-width':1.3,'stroke-opacity':0.6,'marker-end':'url(#ar)'}));
        svg.appendChild(text(leftX,axisY+15,'0',{anchor:'start',size:11,mono:true,fill:'var(--accent)',weight:600}));
        svg.appendChild(text(leftX+maxW,axisY+15,'N · global RoPE',{anchor:'end',size:11,mono:true,fill:'var(--accent)',weight:600}));
        // bottom caption (consistent with steps 2 & 3)
        svg.appendChild(text(W/2,294,'Recomputed tokens now attend to all earlier context, restoring cross-chunk links.',{size:13,fill:'var(--ink)'}));
      }

      // captions
      if(step===1) svg.appendChild(text(W/2,296,'Local [0…n] indices rewritten into one continuous global index.',{size:14,fill:'var(--ink)'}));
      if(step===2) svg.appendChild(text(W/2,296,'attention norm  =  Σᵢ Aᵢⱼ   ·   keep the top-15% tokens by prompt-attention.',{size:13.5,fill:'var(--ink-2)',mono:true}));
    }

    host.innerHTML=''; host.appendChild(svg);
    svg.animate([{opacity:0},{opacity:1}],{duration:500,easing:'ease'});
  }

  const btns=document.querySelectorAll('[data-step]');
  btns.forEach(b=>b.addEventListener('click',()=>{
    btns.forEach(x=>x.classList.remove('on')); b.classList.add('on');
    build(parseInt(b.dataset.step));
  }));

  // autoplay once on first view
  let played=false;
  const pio=new IntersectionObserver((es)=>{
    es.forEach(e=>{
      if(e.isIntersecting && !played){
        played=true;
        let s=0; build(0);
        const iv=setInterval(()=>{ s++; if(s>3){clearInterval(iv);return;}
          btns.forEach(x=>x.classList.remove('on')); btns[s].classList.add('on'); build(s); },3200);
      }
    });
  },{threshold:0.35});
  pio.observe(host);
  build(0);
})();

/* ============================================================
   TOKEN DEMO
   ============================================================ */
(function(){
  const host=document.getElementById('tokens'); if(!host) return;
  const chunkTexts=[
    ['Margaret','Atwood','wrote','several','novels','but','the','1985','Booker','went','to','Keri','Hulme','for','the','bone','people'],
    ['The','bone','people','is','a','New','Zealand','novel','that','explores','Maori','mythology','and','isolation','themes'],
    ['A','film','adaptation','was','directed','by','Niki','Caro','in','2003','produced','independently','in','Wellington'],
    ['Caro','also','directed','Whale','Rider','and','later','Mulan','in','2020','for','Walt','Disney','Pictures'],
  ];
  const lens=chunkTexts.map(c=>c.length);
  const offs=[0,lens[0],lens[0]+lens[1],lens[0]+lens[1]+lens[2]];
  const strategies={
    ours:[offs[0]+7,offs[0]+11,offs[0]+16,offs[1]+1,offs[1]+7,offs[2]+2,offs[2]+6,offs[2]+7,offs[3]+2],
    cb:[offs[0]+0,offs[0]+3,offs[1]+4,offs[1]+9,offs[1]+12,offs[2]+0,offs[2]+8,offs[3]+5,offs[3]+11],
    epic:[offs[0],offs[0]+1,offs[1],offs[1]+1,offs[2],offs[2]+1,offs[3],offs[3]+1,offs[3]+2],
  };
  function render(mode){
    host.innerHTML=''; const sel=new Set(strategies[mode]); let gi=0;
    chunkTexts.forEach((toks,ci)=>{
      toks.forEach(t=>{
        const s=document.createElement('span');
        s.className=`tok c${ci}`+(sel.has(gi)?' sel':''); s.textContent=t;
        host.appendChild(s); gi++;
      });
      const br=document.createElement('span'); br.className='chunk-gap'; host.appendChild(br);
    });
  }
  render('ours');
  document.querySelectorAll('#tokdemo .mode').forEach(b=>{
    b.addEventListener('click',()=>{
      document.querySelectorAll('#tokdemo .mode').forEach(x=>x.classList.remove('on'));
      b.classList.add('on'); render(b.dataset.mode);
    });
  });
})();

/* ============================================================
   THE SETTING — two clear diagrams
   ============================================================ */
(function(){
  const ns='http://www.w3.org/2000/svg';
  const CH=[['var(--chunk-a)','A'],['var(--chunk-b)','B'],['var(--chunk-c)','C']];
  function E(t,a,txt){const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e;}
  const MONO='JetBrains Mono, monospace', DISP='Space Grotesk, sans-serif';
  const BX=14, BW=108, GAP=14, BY=20, BH=40;

  function blocks(svg,withLabel){
    CH.forEach((c,i)=>{
      const x=BX+i*(BW+GAP);
      svg.appendChild(E('rect',{x,y:BY,width:BW,height:BH,rx:9,fill:c[0],'fill-opacity':0.20,stroke:c[0],'stroke-width':1.5}));
      svg.appendChild(E('text',{x:x+BW/2,y:BY+25,'text-anchor':'middle','font-family':DISP,'font-size':15,'font-weight':600,fill:'var(--ink)'},'Doc '+c[1]));
    });
  }

  // 1 — positions collide
  function posSVG(){
    const svg=E('svg',{viewBox:'0 0 380 138'});
    blocks(svg,true);
    CH.forEach((c,i)=>{
      const x=BX+i*(BW+GAP);
      // local ruler 0..4
      for(let k=0;k<5;k++){
        const cx=x+10+k*Math.floor((BW-20)/4);
        const hot=k===0;
        svg.appendChild(E('rect',{x:cx,y:74,width:18,height:22,rx:4,
          fill:hot?'var(--hot)':'var(--bg-3)',stroke:hot?'var(--hot)':'var(--line-2)','stroke-width':1}));
        svg.appendChild(E('text',{x:cx+9,y:89,'text-anchor':'middle','font-family':MONO,'font-size':12,
          'font-weight':hot?700:400,fill:hot?'#0d1018':'var(--ink-3)'},k));
      }
      // arrow from block to its 0-cell
      svg.appendChild(E('line',{x1:x+10+9,y1:BY+BH,x2:x+10+9,y2:72,stroke:'var(--hot)','stroke-width':1.4,'stroke-dasharray':'3 3','marker-end':'url(#ar2)'}));
    });
    const defs=E('defs',{});
    defs.appendChild(E('marker',{id:'ar2',viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto'}))
      .appendChild(E('path',{d:'M0 0 L10 5 L0 10 z',fill:'var(--hot)'}));
    svg.insertBefore(defs,svg.firstChild);
    // collision bracket under the three 0s
    const zeros=[BX+10+9, BX+(BW+GAP)+10+9, BX+2*(BW+GAP)+10+9];
    svg.appendChild(E('path',{d:`M ${zeros[0]} 110 L ${zeros[0]} 118 L ${zeros[2]} 118 L ${zeros[2]} 110`,
      fill:'none',stroke:'var(--hot-2)','stroke-width':1.4}));
    svg.appendChild(E('text',{x:(zeros[0]+zeros[2])/2,y:132,'text-anchor':'middle','font-family':MONO,'font-size':11.5,
      fill:'var(--hot-2)','font-weight':600},'index 0 ×3  →  collision'));
    return svg;
  }

  // 2 — cross-doc attention missing
  function attnSVG(){
    const svg=E('svg',{viewBox:'0 0 380 138'});
    // within-chunk solid arcs (ok)
    CH.forEach((c,i)=>{
      const x=BX+i*(BW+GAP);
      svg.appendChild(E('path',{d:`M ${x+16} ${BY} Q ${x+BW/2} ${BY-26} ${x+BW-16} ${BY}`,
        fill:'none',stroke:c[0],'stroke-width':2.2,'stroke-opacity':0.9}));
    });
    blocks(svg,false);
    // cross-chunk dashed red broken arcs
    for(let i=0;i<2;i++){
      const xa=BX+i*(BW+GAP)+BW-20, xb=BX+(i+1)*(BW+GAP)+20;
      const mx=(xa+xb)/2;
      svg.appendChild(E('path',{d:`M ${xa} ${BY+BH} Q ${mx} ${BY+BH+34} ${xb} ${BY+BH}`,
        fill:'none',stroke:'var(--hot-2)','stroke-width':2,'stroke-dasharray':'5 5','stroke-opacity':0.95}));
      // ✗ badge at apex
      svg.appendChild(E('circle',{cx:mx,cy:BY+BH+30,r:11,fill:'var(--bg)',stroke:'var(--hot-2)','stroke-width':1.5}));
      svg.appendChild(E('text',{x:mx,y:BY+BH+34,'text-anchor':'middle','font-family':DISP,'font-size':13,'font-weight':700,fill:'var(--hot-2)'},'✗'));
    }
    svg.appendChild(E('text',{x:190,y:132,'text-anchor':'middle','font-family':MONO,'font-size':11.5,
      fill:'var(--hot-2)','font-weight':600},'links across boundaries never computed'));
    // small ok tick for within-chunk
    svg.appendChild(E('text',{x:BX+BW/2,y:BY-30,'text-anchor':'middle','font-family':MONO,'font-size':10,fill:'var(--ink-4)'},'within ✓'));
    return svg;
  }

  const p=document.getElementById('set-pos'); if(p)p.appendChild(posSVG());
  const a=document.getElementById('set-attn'); if(a)a.appendChild(attnSVG());
})();

/* ============================================================
   REORDER DIAGRAM (interactive, like the pipeline)
   ============================================================ */
(function(){
  const host=document.getElementById('reorder-diagram'); if(!host) return;
  const ns='http://www.w3.org/2000/svg';
  const W=760, H=300;
  // fewer selected tokens · re-selection (gsel) differs from local (sel)
  const CH=[{c:'var(--chunk-a)',l:'Chunk 1',s:0.40,sel:[2],gsel:[3]},{c:'var(--chunk-b)',l:'Chunk 2',s:0.60,sel:[1],gsel:[1,3]},
            {c:'var(--chunk-c)',l:'Chunk 3',s:0.80,sel:[1,3],gsel:[2,4]},{c:'var(--chunk-d)',l:'Chunk 4',s:0.20,sel:[2],gsel:[1]}];
  function el(t,a){const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
  function rect(x,y,w,h,fill,o={}){return el('rect',{x,y,width:w,height:h,rx:o.rx??8,fill,stroke:o.stroke||'none','stroke-width':o.sw||1,opacity:o.op??1});}
  function text(x,y,t,o={}){const e=el('text',{x,y,'text-anchor':o.anchor||'middle','font-family':o.mono?'JetBrains Mono, monospace':'Space Grotesk, sans-serif','font-size':o.size||12,fill:o.fill||'var(--ink-2)'});if(o.weight)e.setAttribute('font-weight',o.weight);if(o.ls)e.setAttribute('letter-spacing',o.ls);e.textContent=t;return e;}
  function drawIn(p,delay,dur){ p.style.strokeDasharray='1000'; p.animate([{strokeDashoffset:1000},{strokeDashoffset:0}],{duration:dur||1100,delay:delay||0,fill:'both',easing:'ease'}); }
  function fadeIn(e,delay,dur){ const o=e.getAttribute('opacity')||'1'; e.animate([{opacity:0},{opacity:o}],{duration:dur||950,delay:delay||0,fill:'both',easing:'ease'}); }

  const titles=['01 · Select under local RoPE',
                '02 · Score chunks, then reorder',
                '03 · Restore RoPE · re-select',
                '04 · Recompute selected tokens'];
  const caps=['Prompt-attention norm selects the top-15% tokens under local RoPE, avoiding positional bias.',
              'Hit-rate sorting places the richest chunk closest to the prompt where causal attention reaches it most easily.',
              'Scores tokens under real global positions for inference alignment.',
              'Selected tokens attend to all prior context, restoring cross-chunk links.'];
  // per-token score within a chunk: selected tokens high, others low
  function tokScore(ci,k){ const sel=CH[ci].sel.includes(k); return sel? 0.70+((ci*3+k)%3)*0.09 : 0.10+(((ci*7+k*5)%10)/10)*0.30; }
  // global re-scoring: re-selected (gsel) tokens are the ones above threshold
  function gScore(ci,k){ const sel=CH[ci].gsel.includes(k); return sel? 0.70+((ci*5+k*2)%3)*0.09 : 0.10+(((ci*11+k*3)%10)/10)*0.30; }

  // chunk box drawn like the §3 pipeline: title + row of token cells (selected = amber)
  function chunkBox(svg,x,y,w,ci,o={}){
    const c=CH[ci], h=o.h||52, dim=o.dim, selArr=o.selSet||c.sel;
    const r=rect(x,y,w,h,c.c,{rx:9,op:dim?0.08:0.16,stroke:c.c,sw:1.6});
    if(dim) r.setAttribute('stroke-opacity',0.5);
    svg.appendChild(r);
    svg.appendChild(text(x+w/2,y+19,c.l,{size:13,fill:dim?'var(--ink-3)':'var(--ink)',weight:700}));
    const n=5, cw=13, cg=5, tot=n*cw+(n-1)*cg, sx=x+(w-tot)/2, cy=y+h-22, pos=[];
    let sN=0;
    for(let k=0;k<n;k++){
      const sel=selArr.includes(k);
      if(sel){
        // gray base + amber overlay (fades in when animated)
        svg.appendChild(rect(sx+k*(cw+cg),cy,cw,15,c.c,{rx:3,op:0.5,stroke:c.c,sw:1}));
        const tk=rect(sx+k*(cw+cg),cy,cw,15,'var(--hot)',{rx:3,op:1,stroke:'var(--hot)',sw:1});
        tk.setAttribute('filter','url(#rglow)');
        if(o.anim) fadeIn(tk,(o.animDelay||300)+sN*100);
        svg.appendChild(tk); sN++;
      } else {
        svg.appendChild(rect(sx+k*(cw+cg),cy,cw,15,c.c,{rx:3,op:(dim?0.32:0.5),stroke:c.c,sw:1}));
      }
      pos.push({x:sx+k*(cw+cg)+cw/2,y:cy+7,sel,chunk:ci});
    }
    if(o.star) svg.appendChild(text(x+w-15,y+17,'\u2726',{size:13,fill:'var(--hot)'}));
    return pos;
  }

  function build(step){
    const svg=el('svg',{viewBox:`0 0 ${W} ${H}`}); svg.style.maxHeight='320px'; svg.style.display='block';
    const defs=el('defs',{}); defs.innerHTML=`<marker id="ra2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--accent)"/></marker><marker id="ra2h" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="var(--hot)"/></marker><linearGradient id="rtri" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity="0.16"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0.04"/></linearGradient><filter id="rglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`; svg.appendChild(defs);
    svg.appendChild(text(W/2,26,titles[step].toUpperCase(),{mono:true,size:11,fill:'var(--accent)',ls:'0.06em',weight:600}));

    const bw=120, gap=18;
    const order2=[3,0,1,2];
    const pX=70+4*bw+4*gap, pW=116;   // prompt column, gap matches inter-chunk spacing
    function promptBox(y,h){
      svg.appendChild(rect(pX,y,pW,h,'var(--accent)',{rx:9,op:0.92}));
      svg.appendChild(text(pX+pW/2,y+h/2-6,'PROMPT',{size:13,mono:true,fill:'oklch(0.16 0.02 264)',weight:700,ls:'0.04em'}));
      svg.appendChild(text(pX+pW/2,y+h/2+12,'q₁ q₂ q₃ q₄ q₅',{size:9.5,mono:true,fill:'oklch(0.20 0.03 264)'}));
    }

    // STEP 1 — select tokens by prompt-attention norm within each chunk (local RoPE)
    if(step===0){
      // prompt sits ON TOP; chunks in a row below; arrows fan downward
      const ppW=180, ppX=70+(4*bw+3*gap)/2-ppW/2, ppY=40, ppH=40, pcx=ppX+ppW/2, pcy=ppY+ppH;
      svg.appendChild(rect(ppX,ppY,ppW,ppH,'var(--accent)',{rx:9,op:0.92}));
      svg.appendChild(text(pcx,ppY+17,'PROMPT',{size:13,mono:true,fill:'oklch(0.16 0.02 264)',weight:700,ls:'0.04em'}));
      svg.appendChild(text(pcx,ppY+32,'q₁ q₂ q₃ q₄ q₅',{size:9.5,mono:true,fill:'oklch(0.20 0.03 264)'}));
      svg.appendChild(text(ppX+ppW+10,ppY+ppH/2+3,'selects ↓',{anchor:'start',size:9.5,mono:true,fill:'var(--hot)'}));
      const barBase=170, barMaxH=58, rowY=178;
      const thr=barBase-0.62*barMaxH;
      svg.appendChild(el('line',{x1:64,y1:thr,x2:598,y2:thr,stroke:'var(--hot)','stroke-width':1.1,'stroke-dasharray':'5 4','stroke-opacity':0.65}));
      svg.appendChild(text(602,thr-5,'top 15%',{anchor:'start',size:11,mono:true,fill:'var(--hot)',weight:600}));
      let x=70, allpos=[], selBars=[], sb=0;
      [0,1,2,3].forEach(ci=>{
        const n=5, cw=13, cg=5, tot=n*cw+(n-1)*cg, sx=x+(bw-tot)/2;
        for(let k=0;k<n;k++){
          const sc=tokScore(ci,k), sel=CH[ci].sel.includes(k), bh=sc*barMaxH;
          svg.appendChild(rect(sx+k*(cw+cg),barBase-bh,cw,bh,'var(--accent)',{rx:2,op:0.4}));
          if(sel){ const ab=rect(sx+k*(cw+cg),barBase-bh,cw,bh,'var(--hot)',{rx:2,op:0.95}); fadeIn(ab,500+sb*150); svg.appendChild(ab);
            selBars.push({x:sx+k*(cw+cg)+cw/2, top:barBase-bh}); sb++; }
        }
        const pos=chunkBox(svg,x,rowY,bw,ci,{anim:true,animDelay:500}); allpos=allpos.concat(pos);
        // per-chunk local RoPE ruler — every chunk independently spans [0…n]
        const ry=rowY+62, rL=x+14, rR=x+bw-14;
        svg.appendChild(el('line',{x1:rL,y1:ry,x2:rR,y2:ry,stroke:'var(--ink-3)','stroke-width':1.1,'stroke-opacity':0.6,'marker-end':'url(#ra2)'}));
        svg.appendChild(el('line',{x1:rL,y1:ry-3,x2:rL,y2:ry+3,stroke:'var(--ink-3)','stroke-width':1.1,'stroke-opacity':0.6}));
        svg.appendChild(text(rL,ry+13,'0',{anchor:'start',size:9.5,mono:true,fill:'var(--ink-3)'}));
        svg.appendChild(text(rR,ry+13,'n',{anchor:'end',size:9.5,mono:true,fill:'var(--ink-3)'}));
        svg.appendChild(text(x+bw/2,ry+13,'local RoPE',{anchor:'middle',size:9.5,mono:true,fill:'var(--ink-4)'}));
        x+=bw+gap;
      });
      // arrows fan DOWN from the prompt to each selected score bar (drawn in)
      selBars.forEach((b,idx)=>{
        const a=el('path',{d:`M ${pcx} ${pcy} C ${pcx} ${pcy+30}, ${b.x} ${b.top-46}, ${b.x} ${b.top-4}`,stroke:'var(--hot)','stroke-width':1.4,'stroke-opacity':0.8,fill:'none','marker-end':'url(#ra2h)'});
        drawIn(a, 500+idx*150); svg.appendChild(a);
      });
    }

    // STEP 2 — score chunks by hit-rate, then reorder (animated, in place)
    if(step===1){
      const barBase=144, barMaxH=46, rowY=170, bh=52;
      svg.appendChild(text(70,52,'hit-rate  (selected-token ratio)',{anchor:'start',size:11,mono:true,fill:'var(--ink-2)'}));
      // coordinate frame: y-axis + baseline so the bars read as a per-chunk chart
      const axL=64, axR=pX-12, baseY=barBase;
      svg.appendChild(el('line',{x1:axL,y1:baseY-barMaxH-8,x2:axL,y2:baseY,stroke:'var(--line)','stroke-width':1.2,'stroke-opacity':0.8}));
      svg.appendChild(el('line',{x1:axL,y1:baseY,x2:axR,y2:baseY,stroke:'var(--line)','stroke-width':1.2,'stroke-opacity':0.8}));
      // dashed reference gridlines + ticks at 0 / 40 / 80
      [0,0.5,1].forEach(f=>{ const gy=baseY-f*barMaxH;
        svg.appendChild(el('line',{x1:axL,y1:gy,x2:axR,y2:gy,stroke:'var(--line-2)','stroke-width':1,'stroke-dasharray':'3 5','stroke-opacity':f===0?0:0.5}));
        svg.appendChild(text(axL-6,gy+3,Math.round(f*80)+'%',{anchor:'end',size:8.5,mono:true,fill:'var(--ink-4)'}));
      });
      [0,1,2,3].forEach(ci=>{
        const finalI=order2.indexOf(ci), hot=ci===2;
        const fx=70+finalI*(bw+gap), sx0=70+ci*(bw+gap);
        const g=el('g',{}); svg.appendChild(g);
        const bhh=CH[ci].s/0.80*barMaxH;
        g.appendChild(rect(fx+bw/2-13,barBase-bhh,26,bhh,hot?'var(--hot)':CH[ci].c,{rx:3,op:hot?0.95:0.55}));
        g.appendChild(text(fx+bw/2,barBase-bhh-6,Math.round(CH[ci].s*100)+'%',{size:11,mono:true,fill:hot?'var(--hot)':'var(--ink-2)',weight:hot?700:500}));
        chunkBox(g,fx,rowY,bw,ci,{h:bh,star:hot});
        const dx=sx0-fx;
        g.style.transition='transform 2.4s cubic-bezier(.45,.05,.2,1)';
        g.style.transform='translateX('+dx+'px)';
        requestAnimationFrame(()=>requestAnimationFrame(()=>{ g.style.transform='translateX(0px)'; }));
      });
      promptBox(rowY,bh);
    }

    // shared: reordered chunks on the global RoPE axis
    function globalRow(seqY,bh,showPrompt,noAxis){
      if(!noAxis){
        svg.appendChild(el('line',{x1:70,y1:seqY-16,x2:700,y2:seqY-16,stroke:'var(--accent)','stroke-width':1.4,'stroke-opacity':0.6,'marker-end':'url(#ra2)'}));
        svg.appendChild(text(70,seqY-25,'0',{anchor:'start',size:11,mono:true,fill:'var(--accent)',weight:600}));
        svg.appendChild(text(700,seqY-25,'N',{anchor:'end',size:11,mono:true,fill:'var(--accent)',weight:600}));
      }
      let x=70, allpos=[];
      order2.forEach(ci=>{ const p=chunkBox(svg,x,seqY,bw,ci,{h:bh,star:ci===2,dim:ci===3,selSet:CH[ci].gsel}); allpos=allpos.concat(p); x+=bw+gap; });
      if(showPrompt){ promptBox(seqY,bh); }
      return allpos;
    }

    // STEP 3 — restore global RoPE (animated local→global), then re-select by prompt-attention
    if(step===2){
      const barBase=134, barMaxH=58, seqY=146, bh=52, axisY=234;
      const thr=barBase-0.62*barMaxH;
      svg.appendChild(el('line',{x1:64,y1:thr,x2:598,y2:thr,stroke:'var(--hot)','stroke-width':1.1,'stroke-dasharray':'5 4','stroke-opacity':0.65}));
      svg.appendChild(text(602,thr-5,'top 15%',{anchor:'start',size:11,mono:true,fill:'var(--hot)',weight:600}));
      let x=70, allpos=[], selBars=[], sb=0;
      order2.forEach((ci,i)=>{
        const n=5, cw=13, cg=5, tot=n*cw+(n-1)*cg, sx=x+(bw-tot)/2, dim=ci===3;
        for(let k=0;k<n;k++){ const sc=gScore(ci,k), sel=CH[ci].gsel.includes(k), bhh=sc*barMaxH;
          svg.appendChild(rect(sx+k*(cw+cg),barBase-bhh,cw,bhh,'var(--accent)',{rx:2,op:dim?0.28:0.4}));
          if(sel){ const ab=rect(sx+k*(cw+cg),barBase-bhh,cw,bhh,'var(--hot)',{rx:2,op:0.95}); fadeIn(ab,500+sb*150); svg.appendChild(ab);
            selBars.push({x:sx+k*(cw+cg)+cw/2, top:barBase-bhh}); sb++; } }
        const pos=chunkBox(svg,x,seqY,bw,ci,{h:bh,star:ci===2,dim,anim:true,selSet:CH[ci].gsel,animDelay:500}); allpos=allpos.concat(pos);
        // local→global index labels crossfade (local: every chunk starts at 0)
        const loc=text(x+bw/2,seqY+bh+18,'[0…4] local',{size:10.5,mono:true,fill:'var(--ink-4)'});
        const glob=text(x+bw/2,seqY+bh+18,`[${i*5}…${i*5+4}]`,{size:10.5,mono:true,fill:'var(--accent)',weight:600});
        svg.appendChild(loc); svg.appendChild(glob);
        loc.animate([{opacity:1},{opacity:0}],{duration:1500,delay:700,fill:'both'});
        glob.animate([{opacity:0},{opacity:1}],{duration:1500,delay:700,fill:'both'});
        x+=bw+gap;
      });
      // coordinate axis BELOW the boxes — draws in as RoPE goes global
      const ax0=70, ax1=628, axln=el('line',{x1:ax0,y1:axisY,x2:ax1,y2:axisY,stroke:'var(--accent)','stroke-width':1.4,'stroke-opacity':0.6,'marker-end':'url(#ra2)'});
      svg.appendChild(axln);
      axln.animate([{strokeDashoffset:560},{strokeDashoffset:0}],{duration:1400,delay:600,fill:'both'});
      axln.style.strokeDasharray='560';
      svg.appendChild(text(ax0,axisY+16,'0',{anchor:'start',size:11,mono:true,fill:'var(--accent)',weight:600}));
      svg.appendChild(text(ax1,axisY+16,'N · global RoPE',{anchor:'end',size:11,mono:true,fill:'var(--accent)',weight:600}));
      // prompt + fan arrows up to selected bars (matches §3.3)
      const pmidY=seqY+12;
      promptBox(seqY,bh);
      svg.appendChild(text(pX+pW/2,seqY-6,'re-selects ↑',{anchor:'middle',size:9.5,mono:true,fill:'var(--hot)'}));
      selBars.forEach((b,idx)=>{
        const a=el('path',{d:`M ${pX+4} ${pmidY} C ${pX-80} ${pmidY-44}, ${b.x} ${b.top-44}, ${b.x} ${b.top-4}`,stroke:'var(--hot)','stroke-width':1.4,'stroke-opacity':0.8,fill:'none','marker-end':'url(#ra2h)'});
        drawIn(a, 500+idx*150); svg.appendChild(a);
      });
    }

    // STEP 4 — recompute (clean triangle, vertical arrows down; RoPE axis BELOW as coordinate axis)
    if(step===3){
      const seqY=76, bh=46;
      const allpos=globalRow(seqY,bh,true,true);
      const lastX=allpos.reduce((m,p)=>Math.max(m,p.x),0);
      const oY=154, triH=86, leftX=70, maxW=lastX-leftX, axisY=oY+triH+10;
      const tri=el('path',{d:`M ${leftX} ${oY} L ${(leftX+maxW).toFixed(1)} ${oY+triH} L ${leftX} ${oY+triH} Z`,fill:'url(#rtri)',stroke:'var(--accent)','stroke-width':1.1,'stroke-opacity':0.55});
      fadeIn(tri,200,700); svg.appendChild(tri);
      allpos.filter(p=>p.sel).forEach((p,idx)=>{
        const y=oY+triH*(p.x-leftX)/maxW, dl=500+idx*180;
        svg.appendChild(el('line',{x1:leftX,y1:y,x2:p.x,y2:y,stroke:'var(--hot)','stroke-width':4,'stroke-opacity':0.18}));
        const ln=el('line',{x1:leftX,y1:y,x2:p.x,y2:y,stroke:'var(--hot)','stroke-width':1.7,'stroke-opacity':1}); drawIn(ln,dl,800); svg.appendChild(ln);
        const dot=el('circle',{cx:p.x,cy:y,r:2.6,fill:'var(--hot)'}); fadeIn(dot,dl,500); svg.appendChild(dot);
        const ar=el('path',{d:`M ${p.x} ${p.y+9} L ${p.x} ${y-5}`,stroke:'var(--hot)','stroke-width':1.3,'stroke-opacity':0.85,fill:'none','marker-end':'url(#ra2h)'}); drawIn(ar,dl,500); svg.appendChild(ar);
      });
      // RoPE coordinate axis below the triangle
      svg.appendChild(el('line',{x1:leftX,y1:axisY,x2:leftX+maxW+10,y2:axisY,stroke:'var(--accent)','stroke-width':1.3,'stroke-opacity':0.6,'marker-end':'url(#ra2)'}));
      svg.appendChild(text(leftX,axisY+15,'0',{anchor:'start',size:11,mono:true,fill:'var(--accent)',weight:600}));
      svg.appendChild(text(leftX+maxW,axisY+15,'N · global RoPE',{anchor:'end',size:11,mono:true,fill:'var(--accent)',weight:600}));
    }

    const cap=caps[step];
    if(Array.isArray(cap)){
      svg.appendChild(text(W/2,278,cap[0],{size:13.5,fill:'var(--ink)'}));
      svg.appendChild(text(W/2,295,cap[1],{size:13.5,fill:'var(--ink-2)'}));
    } else svg.appendChild(text(W/2,287,cap,{size:13.5,fill:'var(--ink)'}));
    host.innerHTML=''; host.appendChild(svg);
    svg.animate([{opacity:0},{opacity:1}],{duration:500,easing:'ease'});
  }

  const btns=document.querySelectorAll('[data-rstep]');
  btns.forEach(b=>b.addEventListener('click',()=>{ btns.forEach(x=>x.classList.remove('on')); b.classList.add('on'); build(parseInt(b.dataset.rstep)); }));
  let played=false;
  new IntersectionObserver((es)=>{es.forEach(e=>{ if(e.isIntersecting&&!played){ played=true; let s=0; build(0);
    const iv=setInterval(()=>{ s++; if(s>3){clearInterval(iv);return;} btns.forEach(x=>x.classList.remove('on')); btns[s].classList.add('on'); build(s); },3200);
  }});},{threshold:0.35}).observe(host);
  build(0);
})();

(function(){
  const ns='http://www.w3.org/2000/svg';
  const COLS=[ 'var(--chunk-a)','var(--chunk-b)','var(--chunk-c)','var(--chunk-d)' ];
  function E(t,a){const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
  function mask(kind){
    const S=200, n=4, cell=S/n;
    const svg=E('svg',{viewBox:`-20 -20 ${S+24} ${S+24}`});
    svg.appendChild(E('rect',{x:0,y:0,width:S,height:S,fill:'var(--bg)',rx:6}));

    if(kind==='full'){
      // each row attends to all earlier tokens — ONE continuous band per row (cols 0..i-1)
      for(let i=1;i<n;i++){
        svg.appendChild(E('rect',{x:0,y:i*cell,width:i*cell,height:cell,fill:COLS[i],opacity:0.30}));
      }
    }
    // per-chunk causal triangles on the diagonal (all kinds)
    for(let i=0;i<n;i++){
      const x=i*cell,y=i*cell;
      svg.appendChild(E('path',{d:`M ${x} ${y} L ${x+cell} ${y+cell} L ${x} ${y+cell} Z`,fill:COLS[i],opacity:kind==='full'?0.30:0.42}));
    }
    if(kind==='recompute'){
      // ~15% recomputed across the connected off-diagonal staircase
      for(let i=1;i<n;i++){
        const w=i*cell;
        svg.appendChild(E('rect',{x:0,y:i*cell,width:w,height:cell,fill:COLS[i],opacity:0.13}));
        for(let k=0;k<2;k++) svg.appendChild(E('rect',{x:4,y:i*cell+13+k*18,width:w-8,height:6,rx:3,fill:'var(--hot)'}));
      }
    }

    // faint grid — only on the CACHED card (B & C read as connected fills)
    if(kind==='cached'){
      for(let i=1;i<n;i++){
        svg.appendChild(E('line',{x1:i*cell,y1:0,x2:i*cell,y2:S,stroke:'var(--line-2)','stroke-width':1,opacity:0.55}));
        svg.appendChild(E('line',{x1:0,y1:i*cell,x2:S,y2:i*cell,stroke:'var(--line-2)','stroke-width':1,opacity:0.55}));
      }
    }
    if(kind==='full') svg.appendChild(E('line',{x1:0,y1:0,x2:S,y2:S,stroke:'var(--ink-3)','stroke-width':1,opacity:0.45}));
    svg.appendChild(E('rect',{x:0,y:0,width:S,height:S,fill:'none',stroke:'var(--line)','stroke-width':1.4,rx:6}));
    // column labels
    for(let i=0;i<n;i++){
      svg.appendChild(E('text',{x:i*cell+cell/2,y:-7,'text-anchor':'middle',
        'font-family':'JetBrains Mono, monospace','font-size':9,fill:'var(--ink-4)'})).textContent='C'+(i+1);
      const t=E('text',{x:-9,y:i*cell+cell/2+3,'text-anchor':'end',
        'font-family':'JetBrains Mono, monospace','font-size':9,fill:'var(--ink-4)'});t.textContent='C'+(i+1);
      svg.appendChild(t);
    }
    return svg;
  }
  const hosts={'mask-cached':'cached','mask-recompute':'recompute','mask-full':'full'};
  for(const id in hosts){const h=document.getElementById(id);if(h)h.appendChild(mask(hosts[id]));}
})();

/* ============================================================
   ROPE PLACEMENT — position bars on a 0→N ruler (matches slide)
   ============================================================ */
(function(){
  const ns='http://www.w3.org/2000/svg';
  const W=1000, H=100, rulerY=78;
  const COL=['var(--chunk-a)','var(--chunk-b)','var(--chunk-c)'];
  // chunks have DIFFERENT true lengths; how we re-place them differs per layout.
  // HL = head-local (all chunks start at the head, left-aligned) · TL = tail-local (all end at the tail, right-aligned)
  // HP = head-prompt (near chunks) · TP = tail-prompt (far at the tail)
  const L={
    hlhp:{chunks:[[0,27],[0,19],[0,26]],stacked:true,prompt:[27,53]},   // start at head 0 · prompt touches longest
    tltp:{chunks:[[39,66],[47,66],[40,66]],stacked:true,prompt:[66,100]},// end at tail 66 · prompt flush at N
    hltp:{chunks:[[0,27],[0,19],[0,26]],stacked:true,prompt:[76,100]},   // start at head 0 · prompt flush at tail N
    global:{chunks:[[0,27],[27,46],[46,72]],stacked:false,prompt:[72,100]} // true contiguous indices
  };
  function E(t,a,txt){const e=document.createElementNS(ns,t);for(const k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e;}
  function build(kind){
    const cfg=L[kind];
    const svg=E('svg',{viewBox:`0 0 ${W} ${H}`,preserveAspectRatio:'none'});
    svg.style.width='100%';svg.style.height='100%';
    const px=p=>6+(W-12)*p/100;
    const MONO='JetBrains Mono, monospace';
    // ruler
    svg.appendChild(E('line',{x1:6,y1:rulerY,x2:W-6,y2:rulerY,stroke:'var(--line)','stroke-width':1.4,'vector-effect':'non-scaling-stroke'}));
    for(let i=0;i<=10;i++){const x=6+(W-12)*i/10;svg.appendChild(E('line',{x1:x,y1:rulerY-4,x2:x,y2:rulerY+4,stroke:'var(--line)','stroke-width':1,'vector-effect':'non-scaling-stroke'}));}
    svg.appendChild(E('text',{x:6,y:rulerY+18,'font-family':MONO,'font-size':12,fill:'var(--ink-3)','text-anchor':'start'},'0'));
    svg.appendChild(E('text',{x:W-6,y:rulerY+18,'font-family':MONO,'font-size':12,fill:'var(--ink-3)','text-anchor':'end'},'N'));
    function block(x0,x1,y,h,fill,label,dark){
      const x=px(x0),w=px(x1)-px(x0);
      svg.appendChild(E('rect',{x,y,width:w,height:h,rx:7,fill,opacity:dark?0.96:0.92,stroke:fill,'stroke-width':1.4}));
      // glossy top highlight
      svg.appendChild(E('rect',{x:x+2.5,y:y+2,width:Math.max(0,w-5),height:Math.max(1,h*0.34),rx:5,fill:'#ffffff',opacity:0.13}));
      svg.appendChild(E('text',{x:x+w/2,y:y+h/2+4.5,'text-anchor':'middle','font-family':'Space Grotesk, sans-serif','font-size':h>30?15:12.5,'font-weight':700,fill:dark?'oklch(0.16 0.02 264)':'#fff'},label));
    }
    if(cfg.stacked){
      const ch=14,g=3,top=12;
      cfg.chunks.forEach((r,i)=>block(r[0],r[1],top+i*(ch+g),ch,COL[i],'Chunk '+(i+1),false));
      block(cfg.prompt[0],cfg.prompt[1],top,3*ch+2*g,'var(--accent)','prompt',true);
    }else{
      const y=16,h=44;
      cfg.chunks.forEach((r,i)=>block(r[0],r[1],y,h,COL[i],'Chunk '+(i+1),false));
      block(cfg.prompt[0],cfg.prompt[1],y,h,'var(--accent)','prompt',true);
    }
    return svg;
  }
  document.querySelectorAll('.spec[data-rope]').forEach(host=>{ host.innerHTML=''; host.appendChild(build(host.dataset.rope)); });
})();

document.querySelectorAll('.tab').forEach(t=>{
  t.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.tabpanel').forEach(x=>x.classList.remove('on'));
    t.classList.add('on');
    const panel=document.getElementById('panel-'+t.dataset.tab);
    panel.classList.add('on');
    panel.querySelectorAll('.bar>i').forEach(fillBar);
  });
});

/* ---------- speed bars fill on view ---------- */
function fillBar(i){ if(i.dataset.w) i.style.width=i.dataset.w; }
const bio=new IntersectionObserver((es)=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.querySelectorAll('.bar>i').forEach(fillBar); bio.unobserve(e.target);} });
},{threshold:0.3});
document.querySelectorAll('.speedgrid').forEach(g=>bio.observe(g));

/* ---------- motivation load bars ---------- */
const lbio=new IntersectionObserver((es)=>{
  es.forEach(e=>{ if(e.isIntersecting){
    e.target.querySelectorAll('.track>i').forEach(i=>{ if(i.dataset.w) i.style.width=i.dataset.w; });
    lbio.unobserve(e.target);
  }});
},{threshold:0.4});
document.querySelectorAll('.loadbars').forEach(g=>lbio.observe(g));

/* ============================================================
   BIBTEX copy
   ============================================================ */
const cb=document.getElementById('copybib');
if(cb) cb.addEventListener('click',async()=>{
  try{ await navigator.clipboard.writeText(document.getElementById('bibsrc').textContent);
    cb.textContent='Copied ✓'; setTimeout(()=>cb.textContent='Copy',1400);
  }catch{ cb.textContent='Select ↑'; }
});
