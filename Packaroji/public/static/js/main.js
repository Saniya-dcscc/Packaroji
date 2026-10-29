(() => {
const header=document.getElementById('siteHeader'), toggle=document.getElementById('menuToggle'), nav=document.getElementById('mainNav');
const scroll=()=>header&&header.classList.toggle('scrolled',window.scrollY>28);
scroll();window.addEventListener('scroll',scroll,{passive:true});
if(toggle&&nav){toggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');toggle.classList.toggle('active',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu')});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');toggle.classList.remove('active');toggle.setAttribute('aria-expanded','false')}))}
const items=document.querySelectorAll('.reveal');
if('IntersectionObserver'in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const ob=new IntersectionObserver((entries,o)=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');o.unobserve(e.target)}}),{threshold:.12});items.forEach((el,i)=>{el.style.transitionDelay=`${Math.min(i%4,3)*70}ms`;ob.observe(el)})}else items.forEach(el=>el.classList.add('visible'));
const select=document.getElementById('productSelect');if(select){const wanted=new URLSearchParams(location.search).get('product');if(wanted){const option=[...select.options].find(o=>o.value.toLowerCase()===wanted.toLowerCase());if(option)option.selected=true}}
})();