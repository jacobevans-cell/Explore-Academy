export const TEAM_DATA = {
  jvGirlsVolleyball: {
    id: 'jv-girls-volleyball',
    sport: 'Volleyball',
    title: 'JV Girls Volleyball',
    subtitle: 'Explore Academy • CAA Elementary',
    season: {
      label: 'Season 1',
      start: '2026-08-11',
      end: '2026-09-25',
      display: 'August 11 – September 25, 2026'
    },
    roster: [
      { name: 'Nala Parker', number: '' },
      { name: 'Whitney Wright', number: '45' },
      { name: 'Marli Thompson', number: '23' },
      { name: 'Lilian Walbecq', number: '27' },
      { name: 'Niyane Parker', number: '' },
      { name: 'Aliya Montchery', number: '15' },
      { name: 'Krystal Thompson', number: '12' },
      { name: 'Andi Woods', number: '' },
      { name: 'Alaina Wilson', number: '28' },
      { name: 'Kataleya Eichberger', number: '67' },
      { name: 'Abigail Conner', number: '99' },
      { name: 'Ainslee Reneau', number: '5', detail: 'Swing player' },
      { name: 'Luxanna Rose', number: '21', detail: 'Swing player' }
    ],
    practice: [
      { day: 'Monday', time: '3:15–4:45 PM' },
      { day: 'Tuesday', time: '3:15–4:45 PM' },
      { day: 'Wednesday', time: 'OFF' },
      { day: 'Thursday', time: '3:15–4:45 PM' },
      { day: 'Friday', time: '' }
    ],
    games: [
      { date: 'Aug 14', time: '3:30 PM', opponent: 'Sequoia Pathfinder Verrado', arrival: '3:00 PM' },
      { date: 'Aug 25', time: '4:30 PM', opponent: 'South Valley Prep', arrival: '4:00 PM' },
      { date: 'Aug 27', time: '5:15 PM', opponent: 'BASIS Goodyear', arrival: '4:45 PM' },
      { date: 'Sep 1', time: '4:30 PM', opponent: 'Liberty Traditional', arrival: '4:00 PM' },
      { date: 'Sep 2', time: '4:00 PM', opponent: 'BASIS Goodyear', arrival: '3:30 PM' },
      { date: 'Sep 9', time: '4:30 PM', opponent: 'Sequoia Pathfinder Verrado', arrival: '4:00 PM' },
      { date: 'Sep 11', time: '4:30 PM', opponent: 'BASIS Goodyear', location: 'Away', address: '15800 W Sherman St, Goodyear, AZ 85338', drive: '40–50 min', leave: '3:10 PM', arrival: '4:00 PM' },
      { date: 'Sep 15', time: '4:30 PM', opponent: 'South Valley Prep & Arts Academy', location: 'Away', address: '7450 S 40th St, Phoenix, AZ 85042', drive: '55–70 min', leave: '2:50 PM', arrival: '4:00 PM' },
      { date: 'Sep 21', time: '4:00 PM', opponent: 'Liberty Traditional School', location: 'Away', address: '4027 N 45th Ave, Phoenix, AZ 85031', drive: '30–40 min', leave: '2:50 PM', arrival: '3:30 PM' }
    ],
    standingsSource: 'CAA / Bound',
    standingsPath: '../data/jv-standings.json'
  },
  varsityGirlsVolleyball: {
    id: 'varsity-girls-volleyball',
    sport: 'Volleyball',
    title: 'Varsity Girls Volleyball',
    subtitle: 'Explore Academy • Varsity',
    season: {
      label: 'Varsity Season',
      start: '2026-08-11',
      regularEnd: '2026-11-12',
      playoffsStart: '2026-11-16',
      end: '2026-11-19',
      display: 'August 11 – November 19, 2026',
      regularDisplay: 'Regular Season: September 21 – November 12, 2026',
      playoffsDisplay: 'Playoffs: Week of November 16, 2026',
      championshipDisplay: 'Championship: Thursday, November 19, 2026',
      championshipLocation: 'ADP'
    },
    roster: [
      { name: 'Avery Woods', number: '1', detail: 'Libero' },
      { name: 'Chelsea Crick', number: '3', detail: 'All-Around' },
      { name: 'Ainslee Reneau', number: '5', detail: 'Right Side' },
      { name: 'Rebelle Sheldone', number: '7', detail: 'Middle Blocker' },
      { name: 'Sadie Tharp', number: '12', detail: 'Middle Blocker' },
      { name: 'Jeslynn Guerrero', number: '13', detail: 'Setter' },
      { name: 'Luxanna Rose', number: '21', detail: 'Outside Hitter' },
      { name: 'Gabrielle Pelkey', number: '22', detail: 'Middle Blocker' },
      { name: 'Celestina Perez', number: '23', detail: 'Outside Hitter' },
      { name: 'Adalia Joseph', number: '' },
      { name: 'Molly Smithson', number: '' }
    ],
    practice: [
      { day: 'Monday', time: '4:45–6:45 PM' },
      { day: 'Tuesday', time: '4:45–6:45 PM' },
      { day: 'Wednesday', time: '4:45–6:45 PM' },
      { day: 'Thursday', time: '4:45–6:45 PM' },
      { day: 'Friday', time: '' }
    ],
    games: [
      { date: 'Sep 23', time: '4:45 PM', opponent: 'Milestones Charter School', location: 'Away', address: '4707 E Desert Cactus St, Phoenix, AZ 85032', drive: '40–55 min', leave: '3:20 PM', arrival: '4:15 PM' },
      { date: 'Oct 21', time: '4:45 PM', opponent: 'Milestones Charter School', location: 'Away', address: '4707 E Desert Cactus St, Phoenix, AZ 85032', drive: '40–55 min', leave: '3:20 PM', arrival: '4:15 PM', detail: '🎀 Pink Out Game' },
      { date: 'Oct 29', time: '4:30 PM', opponent: 'Synergy', location: 'Away', address: '2701 W Bethany Home Rd, Phoenix, AZ 85017', drive: '30–45 min', leave: '3:15 PM', arrival: '4:00 PM' }
    ]
  },
  boysVolleyball: {
    id: 'boys-volleyball',
    sport: 'Volleyball',
    title: 'Boys Volleyball',
    subtitle: 'Explore Academy',
    season: {
      label: 'Season 2',
      start: '2026-10-14',
      end: '2026-12-04',
      display: 'October 14 – December 4, 2026'
    },
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
      { name: 'Tristan Ruth', number: '' },
      { name: 'Jeshua Morris', number: '' }
    ],
    practice: [],
    games: []
  },
  coedFlagFootball: {
    id: 'co-ed-flag-football',
    sport: 'Flag Football',
    title: 'Co-ed Flag Football',
    subtitle: 'Explore Academy',
    season: {
      label: 'Flag Football Season',
      start: '2026-09-21',
      end: '2026-11-19',
      display: 'September 21 – November 19, 2026'
    },
    roster: [
      { name: 'Lily Moore', number: '' },
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
