const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', e => {
  glow.animate({left:`${e.clientX}px`,top:`${e.clientY}px`},{duration:650,fill:'forwards'});
});

const milestones = [...document.querySelectorAll('.milestone')];
const progress = document.querySelector('.timeline-progress');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting) entry.target.classList.add('in-view');
  });
},{threshold:.28});
milestones.forEach(m => observer.observe(m));

function updateProgress(){
  const timeline = document.querySelector('.timeline');
  const rect = timeline.getBoundingClientRect();
  const viewport = window.innerHeight;
  const total = timeline.offsetHeight;
  const traveled = Math.min(total, Math.max(0, viewport*.48 - rect.top));
  progress.style.height = `${(traveled/total)*100}%`;
}
window.addEventListener('scroll', updateProgress, {passive:true});
window.addEventListener('resize', updateProgress);
updateProgress();

milestones.forEach(m => {
  m.addEventListener('mousemove', e => {
    const visual = m.querySelector('.visual');
    if(!visual || window.innerWidth < 800) return;
    const r = visual.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width-.5;
    const y = (e.clientY-r.top)/r.height-.5;
    visual.style.transform = `perspective(900px) rotateX(${-y*5}deg) rotateY(${x*5}deg) translateY(-3px)`;
  });
  m.addEventListener('mouseleave', () => {
    const visual = m.querySelector('.visual');
    if(visual) visual.style.transform = '';
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const el=document.querySelector(a.getAttribute('href'));
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'});}
  });
});
