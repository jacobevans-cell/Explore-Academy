document.addEventListener('DOMContentLoaded', function () {
  const footer = document.querySelector('.footer');
  if (!footer) return;

  const headings = Array.from(footer.querySelectorAll('h3'));
  headings.forEach(function (heading) {
    const label = (heading.textContent || '').trim().toLowerCase();
    if (label === 'explore' || label === 'families') {
      const column = heading.parentElement;
      if (column) column.remove();
    }
  });

  const grid = footer.querySelector('.grid');
  if (grid && !footer.querySelector('[data-athletics-footer-links]')) {
    const athletics = document.createElement('div');
    athletics.setAttribute('data-athletics-footer-links', 'true');
    athletics.innerHTML = [
      '<h3>Athletics</h3>',
      '<div class="footer-links">',
      '<a href="athletics.html">Eagles Athletics</a>',
      '<a href="athletics-portal/guardians-gamechangers/">Guardians & Gamechangers Signup</a>',
      '<a href="athletics-portal/teams/jv-girls-volleyball.html">JV Girls Volleyball</a>',
      '<a href="athletics-portal/teams/varsity-girls-volleyball.html">Varsity Girls Volleyball</a>',
      '<a href="athletics-portal/teams/boys-volleyball.html">Boys Volleyball</a>',
      '<a href="athletics-portal/teams/co-ed-flag-football.html">Co-ed Flag Football</a>',
      '</div>'
    ].join('');
    grid.appendChild(athletics);
  }

  // Show the event on the public athletics page without editing its generated HTML.
  const directory = document.querySelector('.team-directory');
  if (directory && !document.querySelector('[data-tournament-callout]')) {
    const callout = document.createElement('section');
    callout.className = 'section';
    callout.dataset.tournamentCallout = 'true';
    callout.innerHTML = '<div class="wrap"><div style="background:linear-gradient(115deg,#140825,#3b1585 55%,#1264bd);color:#fff;border-radius:22px;padding:clamp(22px,4vw,38px);box-shadow:0 18px 42px #170a3329"><div style="font-size:.75rem;font-weight:900;letter-spacing:.14em;color:#caa8ff">NOVEMBER 7 · 4–8 PM · EXPLORE ACADEMY</div><h2 style="font-size:clamp(2rem,4vw,3.3rem);line-height:1.05;margin:10px 0">Guardians &amp; Gamechangers</h2><p style="font-size:1.08rem;max-width:660px;margin:0 0 18px;color:#ece6f5">One player and one parent team up for a 2v2 volleyball tournament. $10 per team; wave assignments announced in advance.</p><a href="athletics-portal/guardians-gamechangers/" style="display:inline-block;background:#fff;color:#351477;text-decoration:none;font-weight:900;padding:12px 17px;border-radius:10px">Register your team →</a></div></div>';
    directory.parentNode.insertBefore(callout, directory);
  }

  footer.querySelectorAll('a[href]').forEach(function (link) {
    const href = link.getAttribute('href') || '';
    const allowed = href === 'athletics.html' || href.startsWith('athletics-portal/') || /^(mailto:|tel:|https?:)/i.test(href);
    if (!allowed) link.remove();
  });
});

