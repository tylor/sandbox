/* The Cultch 2025/26 Impact Report — content transcribed from the published PDF.
   Source: 2526_The_Cultch_Impact_Report.pdf (thecultch.com) */

export const TAGS = {
  indigenous: { label: 'Indigenous Programming', color: '#F5B44C', ink: '#1A1A17' },
  soldout:    { label: 'Sold Out Show',         color: '#9F3633', ink: '#FFFFFF' },
  premiere:   { label: 'Premiere',              color: '#111111', ink: '#F4F767' },
  warrior:    { label: 'Warrior Festival',      color: '#7E825E', ink: '#FFFFFF' },
  local:      { label: 'Local Show',            color: '#C46FC9', ink: '#FFFFFF' },
  premium:    { label: 'Premium Presentation',  color: '#8CA5DF', ink: '#1A1A17' },
  youth:      { label: 'Youth Festival',        color: '#C46FC9', ink: '#FFFFFF' }
};

/* `premiereKind` carries the specific wording printed on the black chip. */
export const SHOWS = [
  {
    title: 'Wolf', company: 'Circa', origin: 'Australia',
    start: '2025-10-01', end: '2025-10-19', dates: 'Oct 01–19, 2025',
    venue: 'York Theatre', tags: ['premium']
  },
  {
    title: 'Fire Never Dies: The Tina Modotti Project',
    company: 'Electric Company Theatre', origin: 'Vancouver',
    start: '2025-10-15', end: '2025-10-26', dates: 'Oct 15–26, 2025',
    venue: 'Historic Theatre', tags: ['local', 'soldout', 'premiere'],
    premiereKind: 'World Premiere',
    note: 'Presented in partnership with the Vancouver Latin American Cultural Centre'
  },
  {
    title: 'Transform Festival', company: 'Urban Ink', origin: 'Vancouver',
    start: '2025-11-06', end: '2025-11-15', dates: 'Nov 06–15, 2025',
    venue: 'Vancouver Playhouse', tags: ['local', 'indigenous'],
    note: 'Presented by Urban Ink in collaboration with The Cultch'
  },
  {
    title: 'The Mush Hole', company: 'Kaha:wi Dance Theatre', origin: 'Tkarón:to / Toronto',
    start: '2025-11-14', end: '2025-11-16', dates: 'Nov 14–16, 2025',
    venue: 'Historic Theatre', tags: ['local', 'indigenous'],
    note: 'Presented as part of TRANSFORM Festival 2025'
  },
  {
    title: 'East Van Panto: West Van Story', company: 'Theatre Replacement', origin: 'Vancouver',
    start: '2025-11-19', end: '2026-01-11', dates: 'Nov 19, 2025 – Jan 11, 2026',
    venue: 'York Theatre', tags: ['premium', 'local', 'soldout']
  },
  {
    title: 'Burnout Paradise', company: 'Pony Cam', origin: 'Australia',
    start: '2025-11-20', end: '2025-12-07', dates: 'Nov 20 – Dec 07, 2025',
    venue: 'Historic Theatre', tags: []
  },
  {
    title: 'Paradisum', company: 'Recirquel', origin: 'Hungary',
    start: '2026-01-21', end: '2026-01-24', dates: 'Jan 21–24, 2026',
    venue: 'Vancouver Playhouse', tags: ['premium', 'soldout'],
    note: 'Presented with DanceHouse'
  },
  {
    title: 'Everything Has Disappeared',
    company: 'UNIT Productions & Mammalian Diving Reflex in collaboration with The Chop',
    origin: 'Toronto',
    start: '2026-01-29', end: '2026-02-01', dates: 'Jan 29 – Feb 01, 2026',
    venue: 'York Theatre', tags: [],
    note: 'Presented with PuSh International Performing Arts Festival and Live Biennale'
  },
  {
    title: 'Batshit', company: 'Leah Shelton & Quiet Riot', origin: 'Australia',
    start: '2026-02-11', end: '2026-02-15', dates: 'Feb 11–15, 2026',
    venue: 'Historic Theatre', tags: ['soldout', 'premiere', 'warrior'],
    premiereKind: 'Canadian Premiere'
  },
  {
    title: 'Upu', company: 'Upu Collective', origin: 'Aotearoa / New Zealand',
    start: '2026-02-17', end: '2026-02-21', dates: 'Feb 17–21, 2026',
    venue: 'York Theatre', tags: ['indigenous', 'warrior'],
    note: 'Full Circle: First Nations Performance'
  },
  {
    title: 'Red Like Fruit', company: '2b theatre company', origin: 'Halifax',
    start: '2026-02-18', end: '2026-02-22', dates: 'Feb 18–22, 2026',
    venue: 'Historic Theatre', tags: ['warrior']
  },
  {
    title: 'Tomboy (Chłopczyca)', company: 'the frank theatre company', origin: 'Vancouver',
    start: '2026-03-04', end: '2026-03-08', dates: 'Mar 04–08, 2026',
    venue: 'Vancity Culture Lab', tags: ['local', 'soldout', 'premiere', 'warrior'],
    premiereKind: 'World Premiere'
  },
  {
    title: 'People, Places, & Things', company: 'The Search Party', origin: 'Vancouver',
    start: '2026-03-10', end: '2026-03-22', dates: 'Mar 10–22, 2026',
    venue: 'Historic Theatre', tags: ['premiere', 'warrior'],
    premiereKind: 'Vancouver Premiere'
  },
  {
    title: 'On Native Land', company: 'Raven Theatre in collaboration with Urban Ink',
    origin: 'Vancouver',
    start: '2026-04-08', end: '2026-04-19', dates: 'April 08–19, 2026',
    venue: 'York Theatre', tags: ['local', 'indigenous']
  },
  {
    title: 'End of Greatness', company: 'Theatre Replacement', origin: 'Vancouver',
    start: '2026-04-16', end: '2026-04-19', dates: 'Apr 16–19, 2026',
    venue: 'Historic Theatre', tags: ['soldout']
  },
  {
    title: 'Juliet & Romeo', company: 'Lost Dog', origin: 'UK',
    start: '2026-04-29', end: '2026-05-03', dates: 'Apr 29 – May 03, 2026',
    venue: 'Historic Theatre', tags: ['soldout']
  },
  {
    title: 'Soldiers of Tomorrow', company: 'The Elbow Theatre', origin: 'Vancouver',
    start: '2026-05-06', end: '2026-05-10', dates: 'May 06–10, 2026',
    venue: 'Historic Theatre', tags: ['soldout']
  },
  {
    title: 'Ignite! 2026', company: 'Youth-Driven Arts Festival', origin: '',
    start: '2026-05-13', end: '2026-05-17', dates: 'May 13–17, 2026',
    venue: 'Historic Theatre', tags: ['youth']
  },
  {
    title: 'Sophie’s Surprise 29th', company: 'Three Legged Race Productions', origin: 'UK',
    start: '2026-06-10', end: '2026-06-28', dates: 'June 10–28, 2026',
    venue: 'York Theatre', tags: []
  }
];

export const CONNECTS_ORGS = [
  'Aboriginal Mother Centre Society', 'Aleph in the Tricities', 'Aunt Leah’s',
  'BC First Nations Justice Council', 'Big Brothers Big Sisters of Langley',
  'Bill Reid Gallery', 'Blind Beginnings', 'Canadian National Institute for the Blind',
  'Confederation Park Elementary', 'Downtown Eastside Women’s Centre',
  'Federation of BC Writers', 'Girl Guides', 'Indian Residential School Survivors Society',
  'Kéxwusm-áyakn Student Centre', 'Kids Up Front', 'Lower Mainland Down Syndrome Society',
  'Lu’ma Native Housing Society', 'Metro Vancouver Aboriginal Executive Council',
  'Pacific Association of First Nations Women', 'PAL Vancouver', 'Paul’s Club',
  'Sarah McLachlan School of Music', 'SFU Creative Writing', 'SFU Department of English',
  'SFU Department of Indigenous Studies', 'Spirit of the Children Society', 'Studio 58',
  'Tsleil-Waututh Nation', 'UBC Department of English', 'Union of BC Indian Chiefs',
  'Urban Indigenous People’s Advisory Committee', 'Urban Native Youth Association',
  'Volunteer Grandparents', 'Watari'
];

export const STAFF = [
  ['Heather Redfern', 'Executive Director'],
  ['Nicole McLuckie', 'Associate Executive Director'],
  ['Valentina Acevedo Montilla', 'Youth Program Manager'],
  ['Yuri Arajs', 'Gallery Curator'],
  ['Kelly Barker', 'Producer'],
  ['Kris Boyd', 'Operations Technology Manager & Web Developer'],
  ['Alex Doble', 'Box Office Assistant'],
  ['Len Gardiner', 'Groundskeeper'],
  ['Dylan Grace', 'Custodian'],
  ['Zuzia Juszkiewicz', 'Visual Designer'],
  ['Jenny Kong', 'Bookkeeper'],
  ['Ngaire Leach', 'Graphic & Web Designer'],
  ['Janice Lew', 'Co-Rentals Manager'],
  ['Jon Li', 'Development & Operations Associate'],
  ['Pippa Mackie', 'Partnerships Manager'],
  ['Andrew McCaw', 'Production Manager'],
  ['Lisa Mennell', 'Marketing & Communications Manager'],
  ['Neal Miskin', 'Head Audio'],
  ['Kaden O’Reilly', 'Technical Director'],
  ['Cee Peal', 'Indigenous Outreach Coordinator'],
  ['Paul Phalen', 'Hospitality & Business Development Manager'],
  ['Adam Prokop', 'Venue Technician'],
  ['Lucy Rosenstiel', 'Co-Rentals Manager'],
  ['Max Sample', 'Venue Technician'],
  ['Cara Siu', 'Ticket Services Manager'],
  ['Ry Strachan', 'Audience Services Manager'],
  ['Kathy Vito', 'Manager of Audience Development & Revenue Strategy'],
  ['Madelaine Walker', 'Assistant Production Manager'],
  ['Sara Wong', 'Marketing & Outreach Coordinator'],
  ['Jude Weismiller', 'Assistant Technical Director'],
  ['Carlie Yeung', 'Venue Technician']
];

export const BOARD = [
  ['Caterina Sanders', 'Chair'], ['Stephanie Hollingshead', 'Vice Chair'],
  ['Sophia Curalli', 'Treasurer'], ['Jane E. Brindley', 'Secretary'],
  ['Giselle Blackman', 'Director'], ['Mary Cleaver', 'Director'],
  ['Emet Davis', 'Director'], ['Arlene H. Henry', 'Director'],
  ['Roger Holland', 'Director'], ['Elaine Hung', 'Director'],
  ['Gavin Marshall', 'Director']
];

export const RESTAURANTS = [
  'Absinthe Bistro', 'Caffè La Tana', 'Havana Vancouver', 'La Mezcaleria',
  'Odd Society', 'Social', 'Sing Sing Commercial'
];

export const REVENUE = [
  { label: 'Box office, rentals and bar sales', pct: 64, color: '#CE4729' },
  { label: 'Grants',      pct: 19, color: '#EECC52' },
  { label: 'Fundraising', pct: 17, color: '#2B5841' }
];

export const PANTO_SPONSORS = [
  'DL Chicken', 'Figaro’s Garden', 'Cassette Construction', 'Westbank and Crombie',
  'Boffo Construction', 'Vennie’s Sub Shop', 'Oonagh & Mark Pontin',
  'Gatley Lifestyle Store', 'Mary Cleaver Group', 'Mr. Mattress',
  'Pepino’s and La Tana', 'Sunrise Health Massage Therapy and Acupuncture'
];

export const FOUNDATIONS = [
  'Aikenhead Family Community Fund', 'Averbach Family Foundation',
  'Barry & Lauri Glotman Family Foundation', 'Benefaction Foundation',
  'Charitable Impact Foundation Canada', 'Charlotte and Sonya Wall Arts Fund',
  'Don and Susan Smith Fund, held at Vancity Community Foundation',
  'Elsie and Audrey Jang Fund, held at Vancouver Foundation', 'Footbridge Foundation',
  'George T. Kidd Memorial Fund, held at Vancity Community Foundation',
  'Jamie Evrard Fund, held at Vancouver Foundation', 'Jazz Blue Skies Foundation',
  'Lightburn Family Fund, held at Vancouver Foundation',
  'Marion Pearson & Jim Orr Fund, held at Vancouver Foundation',
  'Martz Family Fund, held at Vancouver Foundation', 'Oasis Foundation',
  'Peter and Melody Anderson Foundation Fund, held at Vancity Community Foundation',
  'R & J Stern Family Foundation', 'Remembering Otto & Marie Pick Foundation',
  'Russell-Mosoff Family Fund', 'The Christopher Foundation',
  'The Dr. Maxwell Hurston Family Foundation', 'The Hamber Foundation',
  'The McGrane-Pearson Endowment Fund, held at Vancouver Foundation',
  'The Steven Chambers Foundation',
  'Tudor Sheil Fund, held at Vancity Community Foundation'
];

/* Donor circles. A trailing "*" in the source marks a monthly donor — kept as
   `monthly: true` so the wall can badge it rather than printing a bare asterisk. */
const d = (s) => s.endsWith('*')
  ? { name: s.slice(0, -1).trim(), monthly: true }
  : { name: s, monthly: false };

export const DONOR_CIRCLES = [
  {
    id: 'legacy', name: 'Legacy Giving', range: '',
    people: ['The Estate of Madelene Vale Bird', 'The Estate of Harry Locke'].map(d)
  },
  {
    id: 'visionary', name: 'Visionary Circle', range: '$2,500 and above',
    people: [
      'Mauro Vescera*', 'Lydia Lovison & Thomas Woods*', 'Lynda Stokes*',
      'Mark & Lesley Vickars', 'Michael McLellan', 'Mindy Parfitt', 'Penelope Tham',
      'Roger Holland*', 'Samantha Cheng', 'Shannon Williams', 'Susan & Bruce Stout',
      'Vincent Hanemayer & Margaret Shaw'
    ].map(d)
  },
  {
    id: 'producers', name: 'Producer’s Circle', range: '$1,000 – $2,499',
    people: [
      'Alex Kochenko & David McCann*', 'Allyson Haug', 'Andrew & Sangeeta Wylie',
      'Anndraya Luui', 'Anonymous* x 2', 'Arlene H Henry Law Corp',
      'Barry & Lauri Glotman', 'C J Newson', 'Carolyne Curran-Knight', 'Elsie Jang',
      'Emily Mackinnon', 'Giselle Blackman', 'Heather Redfern*', 'Jane Westheuser*',
      'Jinelle & Brian Woodley', 'Ken Gracie & Philip Waddell', 'Leanne Averbach',
      'Louise Schwarz'
    ].map(d)
  },
  {
    id: 'directors', name: 'Director’s Circle', range: '',
    people: [
      'Andy & Patricia', 'Anonymous* x 8', 'Beverley & Eric Watt',
      'Catherine Aikenhead', 'Corey Payette & Marshall McMahen', 'D. Bell & M. Sim*',
      'D. Wendy Lee', 'Dana Cromie & Greg Brown', 'Daniel R. Worsley',
      'Darby Honeyman & Dave Hess', 'David Vogt & Tracy Proke', 'Doris Kraske',
      'Dr Jane Brindley & Dr Ross Paul', 'Dr Joy Masuhara',
      'Dr Mark Gatha & Kemo Schedlosky', 'Farren Gillaspie & Wei Jen Ng',
      'Frank Costanzo*', 'Gina Thorstenson & Robert Bartholomew',
      'Glenn & Loretta Barr', 'Glenn Tarigan', 'Gordon Harding', 'Heather Andrews',
      'Helen & Barry Thorson', 'James & Jane Gray', 'Jamie Evrard', 'Jane Baker*',
      'Jane Reid', 'Jane Macdonald', 'Janet & Keith Mitchell', 'Janice & Mike Chutter',
      'John H Kennedy*', 'Judge Daniel Steinberg', 'Kathleen Oliver*', 'Kathy Fletcher',
      'Kira Gerwing & Donovan Woollard', 'Laura Moore*', 'Lisa Martz',
      'Margaret Mardirossian', 'Martin & Phoebe Elfert*', 'Mark Nielsen',
      'Mary & John Sisler', 'Mike Carrigan', 'Myra Andrews', 'Nora Grove',
      'Norman Woo', 'Paul Bennett & Catherine Olsen', 'Paul Plater & Brent Wager',
      'Paul Williamson', 'Rich Baerg*', 'RK Popkin', 'Robelyn Martin', 'Sand Northup',
      'Stephanie Hollingshead', 'Stephanie Shack & Ryan Luetzen*', 'Susan Christie',
      'The Stilwell Family', 'Theresa & Gordon Mackie*', 'Todd Mundle',
      'Troy & Rosalyn Manthorpe'
    ].map(d)
  },
  {
    id: 'supporting', name: 'Supporting Donors', range: '$500 – $999',
    people: [
      'Alison Kelly', 'Alison Rolfe', 'Anonymous* x 11', 'Ardis Nelson*',
      'Barbara Fousek', 'Barry Mckinnon', 'Bill Millerd', 'Borja Brown',
      'Bruce McPherson', 'Camrose Ducote', 'Carol Newell', 'Carole Tarlington',
      'Caterina Pace', 'Christine Dewar', 'Christine Maurach',
      'Cindy Reid & Rory Gylander*', 'Colette Joni Sherman', 'Cyprien Lomas',
      'D & D Rollins', 'DD Kugler', 'David Cohen', 'Deana Grinnell',
      'Elizabeth & Rudy Kerklaan', 'Event Freight Logistics', 'Francis Chang',
      'Gail Nelson', 'George Heyman', 'Herb Auerbach', 'Jacqueline Brown',
      'Jacqueline van Dyk', 'Jennifer Sankey', 'John Ingram', 'John S. Wilson*',
      'Judith Coffin', 'Judith Rodrigo', 'Julia Quon', 'Kathy Vito & Trevor Battye*',
      'Katie Bedford', 'L Chinfen', 'Linda & Michael Sum', 'Linda Darlow Workshops',
      'Lynn & Ash Katey*', 'Lynn Hardy', 'Marcus Youssef', 'Mark Jeffrey',
      'Marianne Dys', 'Martina Lee', 'Mary Cleaver', 'Mary Lou & Alan Miles',
      'Matthew Budgeon', 'Megan Ashbury*', 'Melina Auerbach & Harri de Wijze',
      'Michelle Williams', 'Nick Petropolis', 'Patricia Curtis*',
      'Recycling Alternative', 'Richard & Christine Barker*', 'Richard Mew',
      'Sally Clark', 'Sandra Moe', 'Sheila Adams', 'Sheldon & Marilyn Chandler',
      'Shirls B', 'Stephen Heatley', 'Susan Osmers', 'The Toughs', 'Vanessa McNeil'
    ].map(d)
  },
  {
    id: 'monthly', name: 'Monthly Donors', range: '$499 and below',
    people: [
      'Alexa Deans', 'Amber Sacco', 'Andrew Hastie', 'Anonymous x 2', 'Brenda Benham',
      'Brian Postalian', 'Cathryn Duerksen', 'Connal McNamara', 'Dr Sharon Bailin',
      'Edo Boersma', 'Ellie O’Day', 'Eva Francis', 'Ingrid Kolsteren',
      'Jane Heyman & Lionel Johnston', 'Jenna Newman', 'June Wells', 'Karin Hartner',
      'Kathleen Roczkowskyj', 'Keltie Forsyth', 'Leigh Clark', 'Lisa Mennell',
      'Loretta Seto', 'Luke Swenson', 'Melody Mason',
      'Nedra Dickinson & Norm Ackermann', 'Nicole McLuckie', 'Peggy W',
      'Peter Dickinson', 'Sandra Ferens', 'Shaun Jackman', 'Sonia & Scott Fraser',
      'Steve Coventry & Kim Hawkins', 'Steven Maduro', 'Susan Tilkov', 'Tanya Boteju',
      'Tom MacGowan', 'Victoria Henderson'
    ].map(d)
  }
];

export const TRIBUTES = [
  'Andrew Hastie in memory of William Arthur Hastie',
  'Cindy Reid & Rory Gylander, in honour of Kath B, Norman A, Duncan L & Chris W',
  'Colette Joni Sherman, in memory of Doreen Ingram',
  'Dr Evelyn Harden, in honour of Marcia Jasuilko',
  'Farren Gillaspie, in honour of Anne Lynn',
  'Heather Kennedy, in honour of The Box Office Team',
  'Herb Auerbach, in honour of Chris Wootten',
  'In honour of Heather Redfern',
  'In honour of Kathleen Bourchier',
  'In honour of Ken Gracie & Philip Waddell',
  'In memory of Elsie and George Kowalenko',
  'In memory of Nik Radosevic',
  'Jane Westheuser, in honour of Lynda Stokes',
  'Jazz Blue Skies Foundation, in honour of Owen Lock’s 2025 Volunteerism Award',
  'John S. Wilson, in memory of Karin Vickars',
  'Kathy Fletcher, in honour of Graeme Bird',
  'Kurtis Reeves, in memory of Kevin Cleveland Knight',
  'Martina Lee, in honour of Lynda Stokes',
  'Mike Carrigan, in honour of Harry Locke',
  'Sand Northrup, in memory of Shirley Northrup',
  'Shannon Williams, in memory of Audrey Williams',
  'Sonya Wall, in honour of Helen Janzen'
];

export const QUOTES = {
  wolf: {
    text: 'The Cultch performances at The York are always the best part of my day!',
    source: 'Wolf audience feedback'
  },
  onNativeLand: {
    text: 'Indigenous pricing meant I could attend with my Métis daughter who lives with disabilities.',
    source: 'Audience feedback — On Native Land'
  },
  donorSnobbery: {
    text: 'You’re building and maintaining community, bringing joy and challenging us all with new perspectives. The inclusive nature of The Cultch, and the distinct lack of ‘arts snobbery’ are wonderful.',
    source: 'Donor survey result'
  },
  donorRange: {
    text: 'Every season I am impressed by the wide range of performances we see and the variety of voices we hear from your stage.',
    source: 'Donor survey result'
  },
  donorVital: {
    text: 'Giving artists a place to speak, and the public a place to listen, to reflect, and sometimes even join in and participate, is vital.',
    source: 'Donor survey result'
  }
};
