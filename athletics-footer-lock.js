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
      '<a href="athletics-portal/teams/jv-girls-volleyball.html">JV Girls Volleyball</a>',
      '<a href="athletics-portal/teams/varsity-girls-volleyball.html">Varsity Girls Volleyball</a>',
      '<a href="athletics-portal/teams/boys-volleyball.html">Boys Volleyball</a>',
      '<a href="athletics-portal/teams/co-ed-flag-football.html">Co-ed Flag Football</a>',
      '</div>'
    ].join('');
    grid.appendChild(athletics);
  }

  footer.querySelectorAll('a[href]').forEach(function (link) {
    const href = link.getAttribute('href') || '';
    const allowed = href === 'athletics.html' || href.startsWith('athletics-portal/') || /^(mailto:|tel:|https?:)/i.test(href);
    if (!allowed) link.remove();
  });
});
