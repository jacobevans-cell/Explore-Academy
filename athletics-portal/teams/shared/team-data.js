export const TEAM_DATA = {
  jvGirlsVolleyball: {
    id: 'jv-girls-volleyball',
    sport: 'Volleyball',
    title: 'JV Girls Volleyball',
    subtitle: 'Explore Academy • CAA Elementary',
    roster: [
      { name: 'Nala Parker', number: '' },
      { name: 'Whitney Wright', number: '45' },
      { name: 'Marli Thompson', number: '23' },
      { name: 'Lilian Walbecq', number: '27' },
      { name: 'Niyane Parker', number: '' },
      { name: 'Aliya Montchery', number: '15' },
      { name: 'Krystal Thompson', number: '12' },
      { name: 'Andi', number: '' },
      { name: 'Alaina Wilson', number: '28' },
      { name: 'Kataleya Eichberger', number: '67' },
      { name: 'Abigail Conner', number: '99' },
      { name: 'Ainslee', number: '5', detail: 'Swing player' },
      { name: 'Luxanna', number: '21', detail: 'Swing player' }
    ],
    practice: [
      { day: 'Monday', time: '3:15–4:30 PM' },
      { day: 'Tuesday', time: '3:15–4:30 PM' },
      { day: 'Wednesday', time: 'OFF' },
      { day: 'Thursday', time: '3:15–4:30 PM' },
      { day: 'Friday', time: '1:15–2:45 PM', detail: 'Optional combined practice' }
    ],
    games: [
      { date: 'Aug 14', time: '3:30 PM', opponent: 'Sequoia Pathfinder Verrado' },
      { date: 'Aug 25', time: '4:30 PM', opponent: 'South Valley Prep' },
      { date: 'Aug 27', time: '5:15 PM', opponent: 'BASIS Goodyear' },
      { date: 'Sep 1', time: '4:30 PM', opponent: 'Liberty Traditional' },
      { date: 'Sep 2', time: '4:00 PM', opponent: 'BASIS Goodyear' },
      { date: 'Sep 9', time: '4:30 PM', opponent: 'Sequoia Pathfinder Verrado' },
      { date: 'Sep 11', time: '4:30 PM', opponent: 'BASIS Goodyear' },
      { date: 'Sep 15', time: '4:30 PM', opponent: 'South Valley Prep & Arts Academy' },
      { date: 'Sep 21', time: '4:00 PM', opponent: 'Liberty Traditional School' }
    ],
    standingsSource: 'CAA / Bound',
    standingsPath: '../data/jv-standings.json'
  },
  varsityGirlsVolleyball: {
    id: 'varsity-girls-volleyball',
    sport: 'Volleyball',
    title: 'Varsity Girls Volleyball',
    subtitle: 'Explore Academy • Varsity',
    roster: [
      { name: 'Avery', number: '1', detail: 'Libero' },
      { name: 'Chelsea', number: '3', detail: 'All-Around' },
      { name: 'Ainslee', number: '5', detail: 'Right Side' },
      { name: 'Rebelle', number: '7', detail: 'Middle Blocker' },
      { name: 'Sadie', number: '12', detail: 'Middle Blocker' },
      { name: 'Jeslynn', number: '13', detail: 'Setter' },
      { name: 'Luxanna', number: '21', detail: 'Outside Hitter' },
      { name: 'Gabrielle', number: '22', detail: 'Middle Blocker' },
      { name: 'Celestina', number: '23', detail: 'Outside Hitter' }
    ],
    practice: [
      { day: 'Monday', time: '4:30–6:00 PM' },
      { day: 'Tuesday', time: '4:30–6:00 PM' },
      { day: 'Wednesday', time: '3:15–4:30 PM' },
      { day: 'Thursday', time: '4:30–6:00 PM' },
      { day: 'Friday', time: '' }
    ],
    games: [
      { date: 'Sep 23', time: '4:45 PM', opponent: 'Milestones Charter School', location: 'Away', address: '4707 E Desert Cactus St, Phoenix, AZ 85032' },
      { date: 'Oct 21', time: '4:45 PM', opponent: 'Milestones Charter School', location: 'Away', address: '4707 E Desert Cactus St, Phoenix, AZ 85032', detail: '🎀 Pink Out Game' },
      { date: 'Oct 29', time: '4:30 PM', opponent: 'Synergy', location: 'Away', address: '2701 W Bethany Home Rd, Phoenix, AZ 85017' }
    ]
  },
  boysVolleyball: {
    id: 'boys-volleyball',
    sport: 'Volleyball',
    title: 'Boys Volleyball',
    subtitle: 'Explore Academy',
    roster: [
      { name: 'Christian Smith', number: '' },
      { name: 'Zander Carmack', number: '' },
      { name: 'Harrison Hall', number: '' },
      { name: 'Caleb Pelkey', number: '' },
      { name: 'Josh Giddens', number: '' },
      { name: 'Suilaman Abdulle', number: '' },
      { name: 'Elijah Daniels', number: '' },
      { name: 'Wyatt Crawford', number: '' },
      { name: 'Kade Stula', number: '' },
      { name: 'Alejandro Brito', number: '' },
      { name: 'Tristan Ruth', number: '' }
    ],
    practice: [],
    games: []
  },
  coedFlagFootball: {
    id: 'co-ed-flag-football',
    sport: 'Flag Football',
    title: 'Co-ed Flag Football',
    subtitle: 'Explore Academy',
    roster: [
      { name: 'Jess Harambe', number: '' },
      { name: 'Lili Moore', number: '' },
      { name: 'Larissa Almazo', number: '13' },
      { name: 'Whitney Wright', number: '45' },
      { name: 'Lilian Walbecq', number: '27' },
      { name: 'Krystal Thompson', number: '12' },
      { name: 'Aliya Montchery', number: '15' },
      { name: 'Abigail Conner', number: '' },
      { name: 'Alaina Wilson', number: '28' },
      { name: 'Marli Thompson', number: '23' },
      { name: 'Niyane Parker', number: '' },
      { name: 'Nala Parker', number: '' },
      { name: 'Kataleya Eichberger', number: '67' }
    ],
    practice: [],
    games: []
  }
};

export const TEAM_PAGE_LINKS = [
  ['JV Girls', 'jv-girls-volleyball.html'],
  ['Varsity Girls', 'varsity-girls-volleyball.html'],
  ['Boys Volleyball', 'boys-volleyball.html'],
  ['Co-ed Flag Football', 'co-ed-flag-football.html']
];
