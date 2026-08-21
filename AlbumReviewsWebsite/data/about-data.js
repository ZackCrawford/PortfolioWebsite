// About sections for the review pages.
//
// THIS FILE IS HAND-WRITTEN. parse_reviews.py never touches it, so anything
// here survives re-running the parser.
//
// Keyed by slug - the same slug in reviews-data.js and in the page URL
// (review.html?album=madvillainy). If a slug has no entry, or its entry is
// empty, the About section simply doesn't render on that page.
//
//   about: array of paragraphs (each string becomes its own <p>)
//   facts: quick-facts grid. Use these four keys, in this order:
//            Released, Recorded, Production, Certification
//          Leave out any you can't verify - don't guess. The grid adapts:
//            4 facts -> 2x2   |   3 -> one row of 3   |   2 -> one row of 2

const ABOUT = {

  "madvillainy": {
    about: [
      "Madvillainy is the only album by Madvillain, the duo of rapper MF DOOM and producer Madlib. Stones Throw released it on March 23, 2004, after roughly two years of on-and-off recording. Much of it came together at the label's house in the east Los Angeles hills, with Madlib building beats in a converted bomb shelter downstairs while DOOM wrote on the back porch. Several instrumentals were made in a São Paulo hotel room using little more than a portable record player, an SP-303 sampler and a borrowed cassette deck.",
      "An unfinished demo leaked online in late 2002, more than a year before release. The pair considered the record effectively out and largely abandoned it, returning only after other projects intervened; the second verse of \"Rhinestone Cowboy\" was written more than six months after the first. The finished album ignored nearly every convention of contemporary rap, with short tracks, no hooks and deliberately murky sound. It charted modestly but became one of Stones Throw's best sellers and is now routinely ranked among the greatest hip-hop albums ever made.",
    ],
    facts: {
      "Released": "March 23, 2004",
      "Recorded": "2002-2004, Los Angeles and São Paulo",
      "Production": "Madlib, with MF DOOM",
    },
  },

  "2pacalypse-now": {
    about: [
      "2Pacalypse Now is the debut solo album by Tupac Shakur, released in November 1991 through Interscope and TNT Recordings. He recorded it while still performing with Digital Underground, and most of the production comes from that camp's team, the Underground Railroad. The title plays on the 1979 war film Apocalypse Now.",
      "It stands as his most openly political record, built around racism, police brutality, poverty and teenage pregnancy rather than persona. Critics generally praised the writing and storytelling while finding the beats underwhelming. The album drew national controversy after a man who killed a Texas state trooper claimed it had influenced him, prompting Vice President Dan Quayle to say a record like it had no place in society. It was later certified gold, carried largely by the single \"Brenda's Got a Baby.\"",
    ],
    facts: {
      "Released": "November 12, 1991",
      "Recorded": "Starlight Sound, Richmond, CA",
      "Production": "The Underground Railroad",
      "Certification": "Gold (RIAA, 1995)",
    },
  },


  "3-years-5-months-and-2-days-in-the-life-of": {
    about: [
      "3 Years, 5 Months and 2 Days in the Life Of... is the debut album by Atlanta group Arrested Development, released March 24, 1992 on Chrysalis. The title refers to how long it took the group to land a record contract. Speech produced the record and wrote most of it, building beat-driven tracks layered with jazz, funk and soul rather than the harder sound dominating rap at the time.",
      "It offered an Afrocentric, socially conscious alternative to the gangsta rap then in the ascendant, and its commercial success is generally credited with opening the door for Southern hip-hop. The album topped the Village Voice's 1992 Pazz & Jop critics' poll and sold over six million copies worldwide. In 1993 Arrested Development became the first hip-hop act to win the Grammy for Best New Artist, also taking Best Rap Performance by a Duo or Group.",
    ],
    facts: {
      "Released": "March 24, 1992",
      "Recorded": "Bosstown Studios",
      "Production": "Speech",
    },
  },

  "bad": {
    about: [
      "Bad is Michael Jackson's seventh studio album, released August 31, 1987 on Epic, nearly five years after Thriller. Recording ran officially from January 1985 to July 1987 at Westlake Studios in Los Angeles, repeatedly interrupted by the Victory Tour, the We Are the World sessions and the Captain EO short film. It was his third and final album with producer Quincy Jones, who told him it was time to make a very honest record.",
      "Jackson took far more control this time, composing all but two tracks and co-producing throughout. The lyrics run through media scrutiny, paranoia, romance, self-improvement and world peace, and the title marked a deliberate turn from a youthful image toward something tougher. It reached number one in thirteen countries and has sold around 35 million copies, making it one of the best-selling albums ever released.",
    ],
    facts: {
      "Released": "August 31, 1987",
      "Recorded": "Westlake Studios, Los Angeles",
      "Production": "Quincy Jones and Michael Jackson",
      "Certification": "Diamond (RIAA, 2017)",
    },
  },

  "beauty-behind-the-madness": {
    about: [
      "Beauty Behind the Madness is the Weeknd's second studio album, released August 28, 2015 through XO and Republic. It followed Kiss Land, which drew decent reviews but underperformed commercially. Working with Republic A&R Wendy Goldstein led to a collaboration with Max Martin, and that pop-facing turn shaped much of what followed here.",
      "Abel Tesfaye executive produced alongside DaHeala and Illangelo, with additional production from Kanye West, Max Martin, Stephan Moccio and Ali Payami. Labrinth, Ed Sheeran and Lana Del Rey appear as guests. The record kept his darker R&B instincts while reaching openly for the charts, debuting at number one and staying there three consecutive weeks. It was the tenth best-selling album worldwide in 2015 and won Best Urban Contemporary Album at the 2016 Grammys.",
    ],
    facts: {
      "Released": "August 28, 2015",
      "Recorded": "Toronto, Los Angeles, New York, Stockholm",
      "Production": "The Weeknd, DaHeala, Illangelo",
      "Certification": "2x Platinum (RIAA, 2016)",
    },
  },

  "chromakopia": {
    about: [
      "CHROMAKOPIA is Tyler, the Creator's eighth studio album, released October 28, 2024 through Columbia. He wrote, produced and arranged the whole thing himself. At the Los Angeles listening event on release day he explained that it began as a record about growing up in Hawthorne and Inglewood, noting that almost nothing is publicly known about him before the age of seventeen, and that it became built around things his mother had told him as a child.",
      "The album runs through hip-hop, R&B and jazz across fourteen tracks, with paranoia and the pressures of fame recurring throughout, most directly on the lead single \"Noid.\" It carries a large cast of largely uncredited guests including Daniel Caesar, GloRilla, Lil Wayne, Schoolboy Q, Sexyy Red, Santigold, Lola Young and Teezo Touchdown.",
    ],
    facts: {
      "Released": "October 28, 2024",
      "Production": "Tyler, the Creator",
    },
  },

  "crybaby": {
    about: [
      "Crybaby is the fourth mixtape by Gustav Åhr, released independently on June 10, 2016 under the name Lil Peep. He made it over roughly three months, largely in his own bedroom in Long Beach, New York, and later in Pasadena, California, working closely with producers Lederrick, Cian P and Charlie Shuffler. The project set his half-sung, half-rapped vocals over samples drawn from bands like Pierce the Veil and Avenged Sevenfold, threading pop-punk and emo melodicism through trap-derived beats.",
      "It arrived with no label behind it, built and shared largely through SoundCloud, and became a defining document of what would later be labeled emo rap. The title track alone has drawn more than 120 million streams on Spotify. Following Peep's death in November 2017, the mixtape was reissued for streaming in June 2020 through AWAL, carrying ten of the original eleven tracks to an audience far larger than the one that first found them.",
    ],
    facts: {
      "Released": "June 10, 2016",
      "Recorded": "April-June 2016, Long Beach, NY and Pasadena, CA",
      "Production": "Lederrick, Cian P, Charlie Shuffler",
    },
  },

  "culture": {
    about: [
      "Culture is the second studio album by Migos - Quavo, Offset and Takeoff - released January 27, 2017 through Quality Control, 300 Entertainment and Atlantic. It followed the group's 2015 debut Yung Rich Nation, which had sold modestly, and arrived amid chatter that Migos' commercial moment had already passed. Production came from a long list of collaborators including Zaytoven, Metro Boomin, Murda Beatz and Cardo, built around the triplet flow the group had spent years refining on mixtapes.",
      "The album's second single, \"Bad and Boujee\" featuring Lil Uzi Vert, hit number one on the Billboard Hot 100 the same month Culture came out, helped along by a Donald Glover shout-out at the Golden Globes. Culture itself debuted atop the Billboard 200 and was certified platinum by the RIAA within three months of release. Critics credited it with pushing the Migos flow into hip-hop's mainstream vocabulary and cementing Quality Control as a major label force.",
    ],
    facts: {
      "Released": "January 27, 2017",
      "Production": "Zaytoven, Metro Boomin, Murda Beatz",
      "Certification": "Platinum (RIAA, 2017)",
    },
  },

  "don-t-be-dumb": {
    about: [
      "Don't Be Dumb is A$AP Rocky's fourth studio album, released January 16, 2026 through AWGE, A$AP Worldwide and RCA - his first full-length since 2018's Testing. The fifteen-track record was produced across a wide, eclectic list of collaborators including Take a Daytrip, T-Minus, Hit-Boy, Clams Casino and Cardo, with additional contributions from Pharrell Williams, Metro Boomin, The Alchemist and film composer Danny Elfman. Guests span BossMan Dlow, Brent Faiyaz, Doechii, Westside Gunn, Gorillaz and will.i.am, with Tyler, the Creator and Imogen Heap added to digital editions.",
      "The album arrived after years of delays and stray singles, during which Rocky's public profile grew as much through his relationship with Rihanna and fashion ventures as through music. It debuted at number one on the Billboard 200, his first number-one album debut in over a decade. Critics pointed to its genre-hopping scope - moving between trap, punk and orchestral flourishes - as evidence of an artist deliberately resisting a single lane after nearly eight years away from an album cycle.",
    ],
    facts: {
      "Released": "January 16, 2026",
      "Production": "A$AP Rocky, Take a Daytrip, T-Minus",
    },
  },

  "eternal-atake": {
    about: [
      "Eternal Atake is Lil Uzi Vert's second studio album, released March 6, 2020 through Generation Now and Atlantic after roughly two years of delays and false starts that had made it something of a running joke among fans. It was recorded between 2018 and 2020 across studios in New York City, Philadelphia and North Hollywood, produced by a large roster that included Wheezy and TM88, plus a beat from Chicago drill originator Chief Keef. The album leans into a loose sci-fi concept, casting Uzi as an alien abductee moving between alter egos across its tracklist.",
      "It debuted at number one on the Billboard 200 on the strength of tracks like \"Futsal Shuffle 2020\" and \"That Way.\" A deluxe edition, Lil Uzi Vert vs. the World 2, followed two weeks later. The album was certified platinum by the RIAA within months of release and has since been upgraded to 3x platinum, and its warm critical reception - after years of doubt about whether it would ever arrive - helped cement Uzi's standing as one of the decade's defining rap-adjacent stylists.",
    ],
    facts: {
      "Released": "March 6, 2020",
      "Recorded": "2018-2020, New York City, Philadelphia, and North Hollywood",
      "Production": "Wheezy, TM88, Chief Keef",
      "Certification": "3x Platinum (RIAA, 2024)",
    },
  },

  "goodbye-good-riddance": {
    about: [
      "Goodbye & Good Riddance is the debut studio album by Juice WRLD, released May 23, 2018 through Grade A Productions and Interscope, months after his breakout single \"Lucid Dreams\" first spread on SoundCloud. Nick Mira, who produced the bulk of the record, had been working with Juice WRLD since before either had wide recognition, building the melodic, guitar-inflected trap sound - close kin to the emo rap of the period - that the rest of the album's producers, including Benny Blanco and Cardo, built on.",
      "\"Lucid Dreams,\" built around an interpolation of Sting's \"Shape of My Heart,\" became the album's breakout hit, eventually reaching number two on the Billboard Hot 100. The album itself debuted at number 15 on the Billboard 200 before climbing to number four, and was certified platinum by the RIAA before the end of the year; by 2023 it had been upgraded to five-times platinum. Critics praised its raw, diaristic treatment of heartbreak and anxiety, themes that became only more resonant after Juice WRLD's death in December 2019.",
    ],
    facts: {
      "Released": "May 23, 2018",
      "Production": "Nick Mira, with Benny Blanco and Cardo",
      "Certification": "5x Platinum (RIAA, 2023)",
    },
  },

  "i-am-i-was": {
    about: [
      "i am > i was is 21 Savage's second studio album, released December 21, 2018 through Slaughter Gang and Epic. It followed his breakout collaborative album with Metro Boomin, Without Warning, and preceded his arrest by ICE in February 2019 over an expired visa - a case that drew wide public attention to his immigration status and upbringing in Atlanta. Metro Boomin, Southside and Wheezy anchored production across the record's eventual sprawl of guests and collaborators.",
      "The title plays on 21 Savage's account of his own growth, moving from the unfiltered violence of his earliest mixtapes toward songs about therapy, loss and reflection alongside the same menace that built his name. It debuted at number one on the Billboard 200 in the first chart week of 2019 and was certified platinum by the RIAA the following January, the only 21 Savage album to reach that mark. Singles \"A Lot,\" featuring J. Cole, and \"Monster,\" with Childish Gambino, both drew Grammy nominations.",
    ],
    facts: {
      "Released": "December 21, 2018",
      "Production": "Metro Boomin, Southside, Wheezy",
      "Certification": "Platinum (RIAA, January 2020)",
    },
  },

  "like-a-prayer": {
    about: [
      "Like a Prayer is Madonna's fourth studio album, released March 21, 1989 through Sire. Recorded between September 1988 and January 1989 across studios in Burbank, Sherman Oaks and Hollywood, plus Prince's Paisley Park in Minnesota, it reunited her with regular collaborators Patrick Leonard and Stephen Bray, with Prince himself co-writing and playing guitar on \"Love Song.\" Where her earlier records leaned toward dance-pop, this one turned inward, drawing on her Catholic upbringing, her parents' marriage and her own divorce from Sean Penn.",
      "The title track's video - Madonna dancing before burning crosses and kissing a Black saint in a church - drew condemnation from the Vatican and cost her a Pepsi sponsorship deal after the company pulled a commercial built around the song. The controversy did nothing to slow the album's reception: it debuted at number one on the Billboard 200, produced five singles, and was certified quadruple platinum by the RIAA. It's now routinely cited as Madonna's most critically acclaimed record.",
    ],
    facts: {
      "Released": "March 21, 1989",
      "Recorded": "September 1988-January 1989, Los Angeles and Chanhassen, MN",
      "Production": "Madonna, Patrick Leonard, Stephen Bray",
      "Certification": "4x Platinum (RIAA, 1997)",
    },
  },

  "music": {
    about: [
      "MUSIC (also styled I AM MUSIC) is Playboi Carti's third studio album, released March 14, 2025 through AWGE and Interscope, five years after Whole Lotta Red. The standard edition runs thirty tracks, drawing on a sprawling roster of producers including F1lthy, Cardo, Ojivolta, Kanye West and Metro Boomin. It marks a deliberate shift away from the high-pitched \"baby voice\" that defined Whole Lotta Red toward a lower, rasping delivery, while still leaning on the murky, distorted production style Carti helped popularize.",
      "The album debuted at number one on the Billboard 200 with 298,000 equivalent units in its first week - the biggest week for a rap album that year - and marked Carti's second chart-topping album after Whole Lotta Red. A deluxe edition, MUSIC - SORRY 4 DA WAIT, followed eleven days later with four additional tracks. Its opening week also produced the largest streaming total for a rap album in nearly a year, extending the anticipation that had built across years of delays and leaked snippets.",
    ],
    facts: {
      "Released": "March 14, 2025",
      "Production": "F1lthy, Cardo, Ojivolta",
    },
  },

  "one-x": {
    about: [
      "One-X is the second studio album by Three Days Grace, released June 13, 2006 and produced by Howard Benson. It was the band's first record made as a four-piece, with new guitarist Barry Stock taking over lead guitar duties so frontman Adam Gontier could focus on vocals. The songs lean into addiction, self-destruction and inner conflict, subjects Gontier has said were drawn directly from his own struggles with substance abuse.",
      "The album produced a run of rock radio staples, including \"Animal I Have Become,\" \"Riot,\" \"Pain\" and \"Never Too Late,\" and became the band's commercial breakthrough in the US. It has since been certified 5x platinum by the RIAA, with \"Animal I Have Become\" alone certified many times beyond that on its own. Two decades on, it remains Three Days Grace's best-selling and most enduring album.",
    ],
    facts: {
      "Released": "June 13, 2006",
      "Production": "Howard Benson",
      "Certification": "5x Platinum (RIAA, 2025)",
    },
  },

  "rebel": {
    about: [
      "Rebel is the debut studio album by EsDeeKid, a Liverpool rapper who has kept his real name and age private, released June 20, 2025 through XV Records and Lizzy Records. At twenty-one minutes across its tracklist, it's produced entirely by Wraith9 and features guest spots from Rico Ace, Fakemink and Fimiguerrero. It arrived on the back of \"Bally,\" his 2024 single with Rico Ace that landed in Pitchfork's \"The Ones\" column and established him as one of the UK's breakout drill-adjacent acts.",
      "Singles \"LV Sandals,\" \"Phantom\" and \"4 Raws\" preceded the album and became its early breakout tracks. By the end of 2025, Rebel had become the most-streamed hip-hop album in the world on Spotify, a notable feat for an artist still largely anonymous to the wider public, and a sign of UK drill and jerk's growing pull with a global audience.",
    ],
    facts: {
      "Released": "June 20, 2025",
      "Production": "Wraith9",
    },
  },

  "rodeo": {
    about: [
      "Rodeo is Travis Scott's debut studio album, released September 4, 2015 through Grand Hustle and Epic. Built with a large cast of producers led by Kanye West, Mike Dean and WondaGurl, it fuses trap, psychedelic rock and gospel textures into the dense, atmospheric sound that would come to define his career, carrying guest appearances from Kanye West, The Weeknd, Quavo, Justin Bieber, Young Thug and Chief Keef, among others.",
      "Lead single \"Antidote\" became a sleeper hit, eventually reaching the top twenty of the Billboard Hot 100 months after release, while the album itself debuted at number three on the Billboard 200. Its reputation has only grown since - the RIAA certified it 2x platinum in August 2024, nearly nine years after release - and it's widely regarded as the record that established Travis Scott's signature aesthetic ahead of Birds in the Trap Sing McKnight and Astroworld.",
    ],
    facts: {
      "Released": "September 4, 2015",
      "Production": "Kanye West, Mike Dean, WondaGurl",
      "Certification": "2x Platinum (RIAA, 2024)",
    },
  },

  "samurai": {
    about: [
      "Samurai is a studio album by Lupe Fiasco, released June 28, 2024 through 1st & 15th Entertainment and Thirty Tigers - his first since 2022's Drill Music in Zion. Produced entirely by Soundtrakk, who also built that previous record from top to bottom, it's Lupe's shortest studio album at eight tracks and the first of his career with no guest features at all.",
      "The record is built around a single conceit: reimagining Amy Winehouse, one of Lupe's own favorite artists, as a battle rapper. Singles \"Samurai\" and \"Cake\" each received music videos ahead of release. Consistent with his recent stripped-down, single-producer records, it drew praise for its concept and dense lyricism, continuing the more deliberately compact, less guest-driven approach Lupe has favored in the back half of his career.",
    ],
    facts: {
      "Released": "June 28, 2024",
      "Production": "Soundtrakk",
    },
  },

  "santana": {
    about: [
      "Santana is the self-titled debut studio album by the San Francisco band, released August 30, 1969 through Columbia. Early sessions in January 1969 were produced by David Rubinson, but most of the record took shape that May at Pacific Recording in San Mateo under producer Brent Dangerfield, once the band - led by 22-year-old guitarist Carlos Santana - had settled into the fusion of rock, blues and Afro-Latin percussion that would define its sound.",
      "The album's momentum owed a great deal to timing: the band's explosive performance at Woodstock, built around \"Soul Sacrifice,\" landed just two weeks before release and later featured prominently in the festival's documentary and soundtrack. Santana reached number four on the Billboard 200, and the single \"Evil Ways\" cracked the top ten. The RIAA has since certified it 2x platinum, and it remains the record that launched one of rock's most durable careers.",
    ],
    facts: {
      "Released": "August 30, 1969",
      "Recorded": "Pacific Recording, San Mateo, CA, May 1969",
      "Production": "David Rubinson, Brent Dangerfield",
      "Certification": "2x Platinum (RIAA)",
    },
  },

  "scrapyard": {
    about: [
      "Scrapyard is a mixtape by Quadeca (Benjamin Lasky), released February 16, 2024 through DeadAir Records and AWAL. Rather than a new standalone project, it collects songs cut from his 2023 album I Didn't Mean to Haunt You alongside newer material written afterward that didn't fit whatever record he was building next - Quadeca has described it plainly as leftovers, some from that album's sessions and some made in its aftermath.",
      "Produced by Quadeca himself alongside brakence, who also guests on the project along with Kevin Abstract, eight of its fifteen tracks were released ahead of time across three separate drops before the full mixtape arrived. Despite - or because of - its billing as a collection of loosies, it drew a warm response for its melancholic, genre-blurring songwriting, consistent with the more experimental, less rap-centered direction Quadeca has taken since emerging from YouTube and battle-rap circles.",
    ],
    facts: {
      "Released": "February 16, 2024",
      "Production": "Quadeca, brakence",
    },
  },

  "section-80": {
    about: [
      "Section.80 is Kendrick Lamar's debut studio album, released independently through Top Dawg Entertainment on July 2, 2011, with no major-label backing. Production came mostly from TDE's in-house Digi+Phonics collective alongside Terrace Martin, with an additional beat from J. Cole. Named for Section 8 housing, the album speaks to a generation raised amid the crack epidemic and Reaganomics-era policy, building outward from the \"HiiiPoWeR\" movement he'd introduced on a single of the same name earlier that year.",
      "Without a major label push behind it, the album spread through word of mouth and grassroots critical acclaim, and it directly led to Kendrick signing with Dr. Dre's Aftermath and Interscope later in 2011 alongside his continued deal with Top Dawg. In hindsight it's regarded as the foundation his subsequent catalog was built on - the record that set up good kid, m.A.A.d city and the run that followed.",
    ],
    facts: {
      "Released": "July 2, 2011",
      "Production": "Digi+Phonics, Terrace Martin, J. Cole",
    },
  },

  "sin-city-the-mixtape": {
    about: [
      "Sin City: The Mixtape is a project by Ski Mask the Slump God, released June 25, 2021 through Victor Victor Worldwide and Republic. A brief nine tracks and seventeen minutes long, it was produced largely by RONNY J, Slice, Nuri and John Cunningham, arriving as a looser, faster follow-up in the run of releases after his 2019 debut studio album Stokeley.",
      "The tape leans into the manic energy, horror-tinged humor and rapid-fire delivery that built Ski Mask's fanbase during his earlier SoundCloud-era mixtapes like Beware the Book of Eli. It was received as a smaller, lower-stakes companion piece rather than a major statement, valued mainly for short, high-energy bursts rather than any grander reinvention.",
    ],
    facts: {
      "Released": "June 25, 2021",
      "Production": "RONNY J, Slice, John Cunningham",
    },
  },

  "sing-me-a-lullaby-my-sweet-temptation": {
    about: [
      "Sing Me a Lullaby, My Sweet Temptation is a studio album by New Orleans duo $uicideboy$ - Scrim and Ruby da Cherry - released July 29, 2022 through their own label, G*59. Unusually for the group, the entire album was produced solo by Scrim under his producer alias Budd Dwyer, rather than the wider, rotating cast of outside producers typical of their catalog. It was preceded by the singles \"The Evil That Men Do\" and \"Escape from Babylon.\"",
      "The record continues the duo's blend of horrorcore-inflected trap with metal and industrial textures, set against the nihilistic, drug-referencing lyricism that built one of underground hip-hop's most devoted fanbases. The single-producer approach gave it a more cohesive, unified sound than some of the group's more scattered mixtape-style releases, and it was received as one of the more focused entries in their prolific catalog.",
    ],
    facts: {
      "Released": "July 29, 2022",
      "Production": "Scrim (as Budd Dwyer)",
    },
  },

  "swagger": {
    about: [
      "Swagger is the debut studio album by Celtic punk band Flogging Molly, released March 7, 2000. Formed out of the band's regular Monday-night residency at Molly Malone's pub in Los Angeles, the group recorded and mixed the album at Steve Albini's Electrical Audio studio in Chicago, with Albini's raw, live-room approach to mixing and the band self-producing the sessions.",
      "The record fuses traditional Irish instrumentation - fiddle, mandolin, accordion - with punk aggression and frontman Dave King's Dublin-born rasp, on songs like \"Salty Dog\" and \"Devil's Dance Floor\" that remain live staples two decades later. Swagger is now regarded as a founding document of the Celtic punk revival of the late 1990s and 2000s, alongside contemporaries like Dropkick Murphys.",
    ],
    facts: {
      "Released": "March 7, 2000",
      "Recorded": "Electrical Audio, Chicago",
      "Production": "Flogging Molly; mixed by Steve Albini",
    },
  },
  
  "ta13oo": {
    about: [
      "Ta13oo is Denzel Curry's third studio album, released July 27, 2018 through his own PH Recordings and Loma Vista. Production came from a rotating cast led by FnZ, DJ Dahi and Ronny J. Curry structured the record in three acts - Light, Grey and Dark - releasing each section on consecutive days before the full album dropped, tracing an increasingly dark emotional arc through love, trauma, addiction and fame across roughly a dozen tracks split evenly between them.",
      "Each act carried its own lead single - \"Sumo\" for Light, \"Clout Cobain\" for Grey and \"Percs\" for Dark - with guests including J.I.D. appearing on \"Sirens.\" Critics received it as Curry's most ambitious and accomplished work to date, a clear step up from his earlier mixtapes that helped cement him as one of the most respected voices to emerge from Florida's rap scene.",
    ],
    facts: {
      "Released": "July 27, 2018",
      "Production": "FnZ, DJ Dahi, Ronny J",
    },
  },

  "the-joshua-tree": {
    about: [
      "The Joshua Tree is U2's fifth studio album, released March 9, 1987 through Island Records. It was written and recorded through 1986 at Danesmoate House, a Georgian house in the Wicklow foothills outside Dublin, again with producers Daniel Lanois and Brian Eno, who'd first worked with the band on The Unforgettable Fire. Touring America and reading its literature had pushed the band toward the record's central theme - what bassist Adam Clayton called the bleakness and greed of Reagan-era America - reflected in the title and cover art's Mojave Desert imagery.",
      "The album became the fastest-selling record in UK chart history at the time of release and topped the charts in more than twenty countries. Its first two singles, \"With or Without You\" and \"I Still Haven't Found What I'm Looking For,\" both reached number one on the Billboard Hot 100, and the album won the Grammy for Album of the Year in 1988. The RIAA certified it Diamond in 1999 for ten million US units sold, and it remains a fixture on lists of the greatest albums ever made.",
    ],
    facts: {
      "Released": "March 9, 1987",
      "Recorded": "Danesmoate House, Rathfarnham, Ireland, 1986",
      "Production": "Daniel Lanois, Brian Eno",
      "Certification": "Diamond (RIAA, 1999)",
    },
  },

  "the-stranger": {
    about: [
      "The Stranger is Billy Joel's fifth studio album, released September 29, 1977 through Columbia and recorded at A&R Studios in New York City. It was the first of what became six consecutive Joel albums produced by Phil Ramone, whose fuller, more expansive approach marked a deliberate break from the sound of Joel's earlier records.",
      "The album spent six weeks at number two on the Billboard 200 and produced four singles, including the top-three hit \"Just the Way You Are,\" which went on to win Grammys for Record of the Year and Song of the Year, and the multi-part \"Scenes from an Italian Restaurant.\" The Stranger made Joel a household name in the summer of 1977 and has since been certified Diamond by the RIAA, making it his best-selling studio album.",
    ],
    facts: {
      "Released": "September 29, 1977",
      "Recorded": "A&R Studios, New York City",
      "Production": "Phil Ramone",
      "Certification": "Diamond (RIAA)",
    },
  },

  "violator": {
    about: [
      "Violator is Depeche Mode's seventh studio album, released March 19, 1990 through Mute and Sire. It was recorded with producer Flood across three studios - the band's own Worldwide facility at The Church in London, Logic Studios in Milan, and Puk Studios in Gjerlev, Denmark - and pushed the band's synth-pop further into darker, blues- and guitar-inflected territory, set out from the start by lead single \"Personal Jesus.\"",
      "The album produced four hit singles - \"Personal Jesus,\" \"Enjoy the Silence,\" \"Policy of Truth\" and \"World in My Eyes\" - and was supported by the arena-scale World Violation Tour that ran through most of 1990. It was certified 2x platinum by the RIAA within a year of release and 3x platinum by 1996, and it's widely regarded as the commercial and artistic peak of Depeche Mode's catalog.",
    ],
    facts: {
      "Released": "March 19, 1990",
      "Recorded": "The Church (London), Logic Studios (Milan), Puk Studios (Denmark)",
      "Production": "Depeche Mode, Flood",
      "Certification": "3x Platinum (RIAA, 1996)",
    },
  },

  "who-really-cares": {
    about: [
      "Who Really Cares is the second studio album by San Diego indie pop trio TV Girl, self-released February 26, 2016. Built by Brad Petering and Jason Wyman around loops and samples pulled from old, often obscure records and film dialogue, it deepened the sample-heavy approach of their 2014 debut French Exit. The band has described it plainly as an album about sex, or the lack of it, and the consequences, or lack of them, that follow.",
      "It drew a modest but appreciative response on release, then found an enormous second life nearly a decade later through TikTok, with tracks like \"Cigarettes Out the Window\" and \"Not Allowed\" each crossing a billion streams. \"Lovers Rock,\" built around a looped sample of the Shirelles' 1960 single \"The Dance Is Over,\" became one of the band's signature songs in the process.",
    ],
    facts: {
      "Released": "February 26, 2016",
      "Production": "TV Girl (Brad Petering, Jason Wyman)",
    },
  },

};
