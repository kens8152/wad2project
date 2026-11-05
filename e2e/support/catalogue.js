// Catalogue rows (genres, venues, artists, events) for the fake Supabase in the browser tests.
// Copied from the Riffle Supabase project; artists include their genre for queries that join it.

export const GENRES = [
  {
    "id": "indie-rock",
    "name": "Indie Rock",
    "color": "#f0452f"
  },
  {
    "id": "pop",
    "name": "Pop Music",
    "color": "#1f6feb"
  },
  {
    "id": "mandopop",
    "name": "Contemporary Mandopop",
    "color": "#f0529c"
  },
  {
    "id": "electronic",
    "name": "Electronic",
    "color": "#0f9d8a"
  },
  {
    "id": "hip-hop",
    "name": "Hip-Hop",
    "color": "#9b2fd6"
  },
  {
    "id": "traditional",
    "name": "Traditional Ethnic Music",
    "color": "#f59e0b"
  }
]

export const VENUES = [
  {
    "id": "tinbox",
    "name": "TinBox",
    "address": "231 Bain Street, Singapore 180231",
    "lat": 1.2985,
    "lng": 103.8508
  },
  {
    "id": "battlebox",
    "name": "BattleBox",
    "address": "2 Cox Terrace, Battlebox, Singapore 179622",
    "lat": 1.2928,
    "lng": 103.8465
  },
  {
    "id": "kilo",
    "name": "Kilo Lounge",
    "address": "5 Stadium Walk, Singapore 397693",
    "lat": 1.303,
    "lng": 103.869
  },
  {
    "id": "esplanade-annexe",
    "name": "Esplanade Annexe Studio",
    "address": "8 Raffles Avenue, Singapore 039802",
    "lat": 1.2897,
    "lng": 103.8553
  },
  {
    "id": "projector",
    "name": "The Projector",
    "address": "6001 Beach Road, Singapore 199589",
    "lat": 1.3029,
    "lng": 103.8638
  },
  {
    "id": "haji-lane",
    "name": "Haji Lane Social Club",
    "address": "28 Haji Lane, Singapore 189232",
    "lat": 1.3006,
    "lng": 103.8587
  },
  {
    "id": "clarke-quay",
    "name": "Clarke Quay Central Stage",
    "address": "6 Eu Tong Sen Street, Singapore 059817",
    "lat": 1.2886,
    "lng": 103.8466
  },
  {
    "id": "tekka",
    "name": "Tekka Courtyard",
    "address": "665 Buffalo Road, Singapore 210665",
    "lat": 1.3066,
    "lng": 103.8508
  },
  {
    "id": "mount-emily",
    "name": "Mount Emily Bandstand",
    "address": "Upper Wilkie Road, Singapore 228092",
    "lat": 1.3016,
    "lng": 103.8493
  },
  {
    "id": "bay-east",
    "name": "Bay East Garden Lawn",
    "address": "18 Marina Gardens Drive, Singapore 018953",
    "lat": 1.2816,
    "lng": 103.861
  }
]

export const ARTISTS = [
  {
    "id": "moon-carrot",
    "name": "Moon Carrot",
    "genre_id": "indie-rock",
    "tag": "lo-fi",
    "bio": null,
    "hometown": null,
    "formed": null,
    "socials": {},
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "indie-rock",
      "name": "Indie Rock",
      "color": "#f0452f"
    }
  },
  {
    "id": "fallingislands",
    "name": "FallingIslands",
    "genre_id": "electronic",
    "tag": "synthwave",
    "bio": "Falling Islands crafts shimmering synthwave soundscapes that pull from 80s retrofuturism and late-night neon aesthetics. The project began as solo studio experiments in a Queenstown apartment and has since evolved into a live A/V performance act. Their music feels like driving through an empty city at 3am with all the windows down.",
    "hometown": "Queenstown",
    "formed": 2017,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1788047974,
        "title": "FREE THE VEIL"
      },
      {
        "id": 1716514003,
        "title": "Netwlkr"
      },
      {
        "id": 1524558608,
        "title": "Numbers in Disguise"
      }
    ],
    "genre": {
      "id": "electronic",
      "name": "Electronic",
      "color": "#0f9d8a"
    }
  },
  {
    "id": "cloudy-yan",
    "name": "Cloudy Yan",
    "genre_id": "mandopop",
    "tag": "mandopop",
    "bio": "Cloudy Yan is a balladeer whose hushed, intimate vocals float over spare piano and orchestral strings. Her songs dwell in the quiet spaces between heartbreak and acceptance, drawing from her years living between Singapore and Taipei. Each release feels like a handwritten letter you keep in a drawer and reread on rainy days.",
    "hometown": "Buona Vista",
    "formed": 2020,
    "socials": {
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "mandopop",
      "name": "Contemporary Mandopop",
      "color": "#f0529c"
    }
  },
  {
    "id": "forest-bloom",
    "name": "Forest Bloom",
    "genre_id": "indie-rock",
    "tag": "dream-pop",
    "bio": "Forest Bloom makes hazy, reverb-drenched dream-pop that sounds like it was recorded inside a cloud. The duo met studying music at LASALLE and began layering guitar shimmer over drum machines in a Clementi practice room. Their songs are about daydreams, seasonal change, and the strange peace of being alone in a crowded city.",
    "hometown": "Clementi",
    "formed": 2019,
    "socials": {
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "indie-rock",
      "name": "Indie Rock",
      "color": "#f0452f"
    }
  },
  {
    "id": "aiyna",
    "name": "ai.yna",
    "genre_id": "pop",
    "tag": "alt-pop",
    "bio": "Aiyna makes alt-pop that refuses to sit still, jumping between wiry guitar hooks, layered synths, and lyrics that feel ripped from a private journal. She grew up in Jurong East absorbing everything from Björk to Mitski before finding her own voice in her early twenties. Her performances are visually striking and sonically unpredictable in the best way.",
    "hometown": "Jurong East",
    "formed": 2021,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "pop",
      "name": "Pop Music",
      "color": "#1f6feb"
    }
  },
  {
    "id": "mindosphere",
    "name": "Mindosphere",
    "genre_id": "electronic",
    "tag": "house",
    "bio": "Mindosphere is a house music producer and DJ rooted in the deeper, more meditative end of the dance music spectrum. Drawing from Chicago house, UK garage, and the ambient sounds of Singapore's late-night hawker centres, his sets are built for long, hypnotic journeys on the dance floor. He runs a monthly night in Chinatown that has become essential listening for the local electronic community.",
    "hometown": "Chinatown",
    "formed": 2014,
    "socials": {
      "spotify": "https://open.spotify.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "electronic",
      "name": "Electronic",
      "color": "#0f9d8a"
    }
  },
  {
    "id": "intrgnt",
    "name": "INTRGNT",
    "genre_id": "electronic",
    "tag": "techno",
    "bio": "intrgnt is a techno producer operating at the harder, industrial end of Singapore's electronic underground, releasing on limited-run vinyl and headlining basement clubs most people find by word of mouth. The project is intentionally anonymous — no press photos, no interviews — letting the music speak entirely on its own terms. Tracks are long, grinding, and engineered for maximum subwoofer damage.",
    "hometown": "Kallang",
    "formed": 2019,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "electronic",
      "name": "Electronic",
      "color": "#0f9d8a"
    }
  },
  {
    "id": "evanturetime",
    "name": "Evanturetime",
    "genre_id": "electronic",
    "tag": "edm",
    "bio": "Evanture Time brings high-energy EDM to Singapore's festival circuit, blending euphoric drops with melodic builds that keep dance floors moving until sunrise. Formed by two childhood friends from Tampines, they honed their craft playing underground warehouse parties before breaking onto the main stage. Their productions are known for tight sound design and crowd-tested energy.",
    "hometown": "Tampines",
    "formed": 2016,
    "socials": {
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1579396392,
        "title": "if it's with you"
      },
      {
        "id": 1618195822,
        "title": "for any weather"
      },
      {
        "id": 1383296000,
        "title": "White Lies"
      }
    ],
    "genre": {
      "id": "electronic",
      "name": "Electronic",
      "color": "#0f9d8a"
    }
  },
  {
    "id": "kin-leonn",
    "name": "Kin Leonn",
    "genre_id": "hip-hop",
    "tag": "hip-hop",
    "bio": "Kin Leonn is a Singapore hip-hop artist and producer whose dense, lyrical flow reflects life growing up in the heartlands with big city ambitions. He raps about code-switching, family pressure, and the grind of creative work in a country that doesn't always have a lane for it. His self-produced instrumentals pull from boom-bap, trap, and the sounds of Singapore's street corners.",
    "hometown": "Ang Mo Kio",
    "formed": 2016,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1441994688,
        "title": "There Were Days"
      },
      {
        "id": 1704274833,
        "title": "Missed Flight / New Friends"
      }
    ],
    "genre": {
      "id": "hip-hop",
      "name": "Hip-Hop",
      "color": "#9b2fd6"
    }
  },
  {
    "id": "loka-nada",
    "name": "Loka Nada",
    "genre_id": "traditional",
    "tag": "gamelan",
    "bio": "Loka Nada is a gamelan ensemble dedicated to keeping Javanese and Balinese court music traditions alive in Singapore's multicultural landscape. Founded by a group of second-generation Singaporeans who learned the instruments from community elders in Geylang Serai, they perform at cultural festivals, temples, and schools across the island. Their work bridges ritual heritage and contemporary audience curiosity.",
    "hometown": "Geylang Serai",
    "formed": 2015,
    "socials": {
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "traditional",
      "name": "Traditional Ethnic Music",
      "color": "#f59e0b"
    }
  },
  {
    "id": "kancing-rasa",
    "name": "Kancing Rasa",
    "genre_id": "traditional",
    "tag": "keroncong",
    "bio": "Kancing Rasa revives the gentle, waltzing rhythms of keroncong — the Indonesian-Portuguese folk style — and gives them room to breathe in modern Singapore. The group brings together musicians trained in classical strings, traditional kroncong guitar, and modern jazz to create arrangements that feel both archival and alive. Their name translates loosely to 'the fastening of feeling', which captures exactly what their music does.",
    "hometown": "Kampong Glam",
    "formed": 2016,
    "socials": {
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [],
    "genre": {
      "id": "traditional",
      "name": "Traditional Ethnic Music",
      "color": "#f59e0b"
    }
  },
  {
    "id": "sherman-zhuo",
    "name": "Sherman Zhuo",
    "genre_id": "mandopop",
    "tag": "mandopop",
    "bio": "Sherman Zhuo writes Mandopop with a contemporary edge, weaving personal stories of identity and belonging into polished, radio-ready arrangements. Growing up in Toa Payoh with music playing constantly in his family home, he began writing his own songs at fifteen. His voice carries an emotional warmth that resonates with listeners across the Mandarin-speaking world.",
    "hometown": "Toa Payoh",
    "formed": 2018,
    "socials": {
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1873881219,
        "title": "下一個你"
      },
      {
        "id": 1676896623,
        "title": "hard to let you go"
      },
      {
        "id": 1762573187,
        "title": "坠在原点的我"
      }
    ],
    "genre": {
      "id": "mandopop",
      "name": "Contemporary Mandopop",
      "color": "#f0529c"
    }
  },
  {
    "id": "krunkle",
    "name": "Krunkle",
    "genre_id": "indie-rock",
    "tag": "funk",
    "bio": "Krunkle is a five-piece indie rock band with a deep funk groove, influenced equally by vintage Stax records and the chaos of Singapore HDB corridor jams. Their live shows are notoriously sweaty affairs packed with extended instrumental breakdowns and call-and-response crowd moments. They've been a fixture of the Esplanade Annexe scene since their earliest gigs.",
    "hometown": "Geylang",
    "formed": 2015,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1719170173,
        "title": "Philia"
      },
      {
        "id": 1719170176,
        "title": "Stale"
      },
      {
        "id": 1719170327,
        "title": "Roofie Romance"
      }
    ],
    "genre": {
      "id": "indie-rock",
      "name": "Indie Rock",
      "color": "#f0452f"
    }
  },
  {
    "id": "lullaboy",
    "name": "Lullaboy",
    "genre_id": "pop",
    "tag": "r&b",
    "bio": "Lullaboy is a Singapore R&B singer-songwriter whose velvety falsetto and introspective lyrics have earned him a devoted online following. He started posting bedroom recordings to SoundCloud during his national service years and signed his first independent deal shortly after. His music sits at the intersection of neo-soul and contemporary R&B, always with a local emotional honesty.",
    "hometown": "Woodlands",
    "formed": 2018,
    "socials": {
      "x": "https://x.com",
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 1644633354,
        "title": "Shortcut To Heaven"
      },
      {
        "id": 1557401161,
        "title": "someone like u"
      },
      {
        "id": 1701539915,
        "title": "life with u"
      }
    ],
    "genre": {
      "id": "pop",
      "name": "Pop Music",
      "color": "#1f6feb"
    }
  },
  {
    "id": "riot-in-magenta",
    "name": "Riot In Magenta",
    "genre_id": "electronic",
    "tag": "synthpop",
    "bio": "Riot in Magenta makes synthpop with sharp hooks and a dramatic flair, nodding to classic new wave while staying firmly planted in the present. The trio formed in Katong after a chance meeting at a record swap meet and quickly built a reputation for theatrical live shows with synchronized lighting rigs. Their music is big, bright, and unashamedly catchy.",
    "hometown": "Katong",
    "formed": 2017,
    "socials": {
      "spotify": "https://open.spotify.com",
      "youtube": "https://youtube.com",
      "facebook": "https://facebook.com",
      "instagram": "https://instagram.com"
    },
    "image_url": null,
    "tracks": [
      {
        "id": 979774352,
        "title": "Told You So"
      },
      {
        "id": 780579097,
        "title": "Lost"
      },
      {
        "id": 780579100,
        "title": "Cloud"
      }
    ],
    "genre": {
      "id": "electronic",
      "name": "Electronic",
      "color": "#0f9d8a"
    }
  }
]

export const EVENTS = [
  {
    "id": "moon-carrot-haji-lane",
    "title": "Moon Carrot",
    "image": null,
    "genre_id": "indie-rock",
    "venue_id": "haji-lane",
    "headliner_id": "moon-carrot",
    "day_offset": 0,
    "dow": "Thu",
    "day_number": 29,
    "month": "Oct",
    "date_label": "Thu, 29 Oct",
    "start_time": "20:00:00",
    "time_label": "8:00 PM",
    "price": 15,
    "going": 40,
    "tag": "lo-fi"
  },
  {
    "id": "fallingislands-kilo",
    "title": "FallingIslands",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "kilo",
    "headliner_id": "fallingislands",
    "day_offset": 6,
    "dow": "Wed",
    "day_number": 4,
    "month": "Nov",
    "date_label": "Wed, 4 Nov",
    "start_time": "19:30:00",
    "time_label": "7:30 PM",
    "price": 20,
    "going": 54,
    "tag": "synthwave"
  },
  {
    "id": "fallingislands-battlebox",
    "title": "FallingIslands",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "battlebox",
    "headliner_id": "fallingislands",
    "day_offset": 3,
    "dow": "Sun",
    "day_number": 1,
    "month": "Nov",
    "date_label": "Sun, 1 Nov",
    "start_time": "20:00:00",
    "time_label": "8:00 PM",
    "price": 32,
    "going": 76,
    "tag": "synthwave"
  },
  {
    "id": "fallingislands-tinbox",
    "title": "FallingIslands",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "tinbox",
    "headliner_id": "fallingislands",
    "day_offset": 0,
    "dow": "Thu",
    "day_number": 29,
    "month": "Oct",
    "date_label": "Thu, 29 Oct",
    "start_time": "21:00:00",
    "time_label": "9:00 PM",
    "price": 25,
    "going": 118,
    "tag": "synthwave"
  },
  {
    "id": "evanturetime-projector",
    "title": "Evanturetime",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "projector",
    "headliner_id": "evanturetime",
    "day_offset": 6,
    "dow": "Wed",
    "day_number": 4,
    "month": "Nov",
    "date_label": "Wed, 4 Nov",
    "start_time": "23:00:00",
    "time_label": "11:00 PM",
    "price": 30,
    "going": 140,
    "tag": "edm"
  },
  {
    "id": "evanturetime-clarke-quay",
    "title": "Bass Bunker Sessions",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "clarke-quay",
    "headliner_id": "evanturetime",
    "day_offset": 1,
    "dow": "Fri",
    "day_number": 30,
    "month": "Oct",
    "date_label": "Fri, 30 Oct",
    "start_time": "22:00:00",
    "time_label": "10:00 PM",
    "price": 28,
    "going": 92,
    "tag": "edm"
  },
  {
    "id": "sherman-zhuo-esplanade",
    "title": "Sherman Zhuo: Midnight Letters",
    "image": null,
    "genre_id": "mandopop",
    "venue_id": "esplanade-annexe",
    "headliner_id": "sherman-zhuo",
    "day_offset": 2,
    "dow": "Sat",
    "day_number": 31,
    "month": "Oct",
    "date_label": "Sat, 31 Oct",
    "start_time": "19:30:00",
    "time_label": "7:30 PM",
    "price": 48,
    "going": 210,
    "tag": "mandopop"
  },
  {
    "id": "cloudy-yan-mount-emily",
    "title": "Cloudy Yan",
    "image": null,
    "genre_id": "mandopop",
    "venue_id": "mount-emily",
    "headliner_id": "cloudy-yan",
    "day_offset": 5,
    "dow": "Tue",
    "day_number": 3,
    "month": "Nov",
    "date_label": "Tue, 3 Nov",
    "start_time": "19:00:00",
    "time_label": "7:00 PM",
    "price": 0,
    "going": 160,
    "tag": "mandopop"
  },
  {
    "id": "krunkle-haji-lane",
    "title": "Krunkle",
    "image": null,
    "genre_id": "indie-rock",
    "venue_id": "haji-lane",
    "headliner_id": "krunkle",
    "day_offset": 1,
    "dow": "Fri",
    "day_number": 30,
    "month": "Oct",
    "date_label": "Fri, 30 Oct",
    "start_time": "20:30:00",
    "time_label": "8:30 PM",
    "price": 18,
    "going": 64,
    "tag": "funk"
  },
  {
    "id": "forest-bloom-tekka",
    "title": "Forest Bloom",
    "image": null,
    "genre_id": "indie-rock",
    "venue_id": "tekka",
    "headliner_id": "forest-bloom",
    "day_offset": 4,
    "dow": "Mon",
    "day_number": 2,
    "month": "Nov",
    "date_label": "Mon, 2 Nov",
    "start_time": "19:00:00",
    "time_label": "7:00 PM",
    "price": 12,
    "going": 38,
    "tag": "dream-pop"
  },
  {
    "id": "lullaboy-live-battlebox",
    "title": "Lullaboy live",
    "image": null,
    "genre_id": "pop",
    "venue_id": "battlebox",
    "headliner_id": "lullaboy",
    "day_offset": 17,
    "dow": "Sun",
    "day_number": 15,
    "month": "Nov",
    "date_label": "Sun, 15 Nov",
    "start_time": "20:00:00",
    "time_label": "8:00 PM",
    "price": 29,
    "going": 45,
    "tag": "r&b"
  },
  {
    "id": "lullaboy-projector",
    "title": "Lullaboy",
    "image": null,
    "genre_id": "pop",
    "venue_id": "projector",
    "headliner_id": "lullaboy",
    "day_offset": 4,
    "dow": "Mon",
    "day_number": 2,
    "month": "Nov",
    "date_label": "Mon, 2 Nov",
    "start_time": "20:00:00",
    "time_label": "8:00 PM",
    "price": 30,
    "going": 130,
    "tag": "r&b"
  },
  {
    "id": "aiyna-esplanade",
    "title": "ai.yna",
    "image": null,
    "genre_id": "pop",
    "venue_id": "esplanade-annexe",
    "headliner_id": "aiyna",
    "day_offset": 6,
    "dow": "Wed",
    "day_number": 4,
    "month": "Nov",
    "date_label": "Wed, 4 Nov",
    "start_time": "20:00:00",
    "time_label": "8:00 PM",
    "price": 35,
    "going": 99,
    "tag": "alt-pop"
  },
  {
    "id": "kin-leonn-tekka",
    "title": "Kin Leonn",
    "image": null,
    "genre_id": "hip-hop",
    "venue_id": "tekka",
    "headliner_id": "kin-leonn",
    "day_offset": 2,
    "dow": "Sat",
    "day_number": 31,
    "month": "Oct",
    "date_label": "Sat, 31 Oct",
    "start_time": "21:00:00",
    "time_label": "9:00 PM",
    "price": 22,
    "going": 71,
    "tag": "hip-hop"
  },
  {
    "id": "late-transmission-battlebox",
    "title": "Late Transmission",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "battlebox",
    "headliner_id": "mindosphere",
    "day_offset": 8,
    "dow": "Fri",
    "day_number": 6,
    "month": "Nov",
    "date_label": "Fri, 6 Nov",
    "start_time": "21:00:00",
    "time_label": "9:00 PM",
    "price": 27,
    "going": 62,
    "tag": "house"
  },
  {
    "id": "mindosphere-tinbox",
    "title": "Mindosphere",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "tinbox",
    "headliner_id": "mindosphere",
    "day_offset": 3,
    "dow": "Sun",
    "day_number": 1,
    "month": "Nov",
    "date_label": "Sun, 1 Nov",
    "start_time": "22:30:00",
    "time_label": "10:30 PM",
    "price": 26,
    "going": 80,
    "tag": "house"
  },
  {
    "id": "intrgnt-battlebox",
    "title": "INTRGNT",
    "image": null,
    "genre_id": "electronic",
    "venue_id": "battlebox",
    "headliner_id": "intrgnt",
    "day_offset": 23,
    "dow": "Sat",
    "day_number": 21,
    "month": "Nov",
    "date_label": "Sat, 21 Nov",
    "start_time": "21:00:00",
    "time_label": "9:00 PM",
    "price": 24,
    "going": 33,
    "tag": "techno"
  },
  {
    "id": "loka-nada-bay-east",
    "title": "Gamelan on the Lawn",
    "image": null,
    "genre_id": "traditional",
    "venue_id": "bay-east",
    "headliner_id": "loka-nada",
    "day_offset": 5,
    "dow": "Tue",
    "day_number": 3,
    "month": "Nov",
    "date_label": "Tue, 3 Nov",
    "start_time": "17:00:00",
    "time_label": "5:00 PM",
    "price": 15,
    "going": 88,
    "tag": "gamelan"
  }
]

export const EVENT_ARTISTS = [
  {
    "event_id": "fallingislands-tinbox",
    "artist_id": "fallingislands"
  },
  {
    "event_id": "fallingislands-battlebox",
    "artist_id": "fallingislands"
  },
  {
    "event_id": "fallingislands-battlebox",
    "artist_id": "lullaboy"
  },
  {
    "event_id": "fallingislands-battlebox",
    "artist_id": "kin-leonn"
  },
  {
    "event_id": "fallingislands-battlebox",
    "artist_id": "riot-in-magenta"
  },
  {
    "event_id": "fallingislands-kilo",
    "artist_id": "fallingislands"
  },
  {
    "event_id": "evanturetime-clarke-quay",
    "artist_id": "evanturetime"
  },
  {
    "event_id": "sherman-zhuo-esplanade",
    "artist_id": "sherman-zhuo"
  },
  {
    "event_id": "sherman-zhuo-esplanade",
    "artist_id": "cloudy-yan"
  },
  {
    "event_id": "krunkle-haji-lane",
    "artist_id": "krunkle"
  },
  {
    "event_id": "krunkle-haji-lane",
    "artist_id": "forest-bloom"
  },
  {
    "event_id": "lullaboy-projector",
    "artist_id": "lullaboy"
  },
  {
    "event_id": "lullaboy-projector",
    "artist_id": "aiyna"
  },
  {
    "event_id": "loka-nada-bay-east",
    "artist_id": "loka-nada"
  },
  {
    "event_id": "loka-nada-bay-east",
    "artist_id": "kancing-rasa"
  },
  {
    "event_id": "kin-leonn-tekka",
    "artist_id": "kin-leonn"
  },
  {
    "event_id": "cloudy-yan-mount-emily",
    "artist_id": "cloudy-yan"
  },
  {
    "event_id": "mindosphere-tinbox",
    "artist_id": "mindosphere"
  },
  {
    "event_id": "mindosphere-tinbox",
    "artist_id": "riot-in-magenta"
  },
  {
    "event_id": "moon-carrot-haji-lane",
    "artist_id": "moon-carrot"
  },
  {
    "event_id": "aiyna-esplanade",
    "artist_id": "aiyna"
  },
  {
    "event_id": "aiyna-esplanade",
    "artist_id": "lullaboy"
  },
  {
    "event_id": "forest-bloom-tekka",
    "artist_id": "forest-bloom"
  },
  {
    "event_id": "evanturetime-projector",
    "artist_id": "evanturetime"
  },
  {
    "event_id": "evanturetime-projector",
    "artist_id": "mindosphere"
  },
  {
    "event_id": "late-transmission-battlebox",
    "artist_id": "mindosphere"
  },
  {
    "event_id": "lullaboy-live-battlebox",
    "artist_id": "lullaboy"
  },
  {
    "event_id": "intrgnt-battlebox",
    "artist_id": "intrgnt"
  }
]
