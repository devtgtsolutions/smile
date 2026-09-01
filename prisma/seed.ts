import {
  PrismaClient,
  QuizDifficulty,
  QuizType,
  TenantStatus,
  HelpStatus,
} from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ============================================================
  // ADMIN USER
  // password = admin123
  // ============================================================

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crms.local' },
    update: {},
    create: {
      email: 'admin@crms.local',
      passwordHash:
        '$2a$12$Ezk6Q7fhavdYSTbUvmHODe9pHGzmKpjH5q24uoKe3WUET48Z34mOW',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Admin created');

  // ============================================================
  // TENANTS
  // ============================================================

  const tenantNames = [
    'Room-01',
    'Room-02',
    'Room-03',
    'VIP-Room',
    'Karaoke-Room',
  ];

  const tenants = [];

  for (const room of tenantNames) {
    const tenant = await prisma.tenant.upsert({
      where: { name: room },
      update: {},
      create: {
        name: room,
        status: TenantStatus.NORMAL,
      },
    });
    tenants.push(tenant);
  }

  console.log(`✅ ${tenants.length} tenants created`);

  // ============================================================
  // ROOM CONFIGURATION
  // ============================================================

  for (const tenant of tenants) {
    await prisma.roomConfiguration.upsert({
      where: { tenantId: tenant.id },
      update: {},
      create: {
        tenantId: tenant.id,
        audioProfile: {
          volume: 70,
          eq_bands: {},
          latency_compensation: 20,
        },
        lightingProfile: {
          default_ambiance: 'WARM',
          intensity: 80,
          dmx_universe: 1,
        },
        buzzerConfig: {
          debounce_ms: 50,
          sound_effect: 'click.wav',
        },
      },
    });
  }

  console.log('✅ Room configurations created');

  // ============================================================
  // HELP REQUESTS
  // ============================================================

  const findTenant = (name: string) => {
    const tenant = tenants.find((t) => t.name === name);
    if (!tenant) throw new Error(`Seed error: tenant "${name}" not found — check tenantNames above`);
    return tenant;
  };

  const helpRequestSeeds: {
    tenantName: string;
    reason: string;
    status: HelpStatus;
  }[] = [
    {
      tenantName: 'Room-02',
      reason: 'Technical problem — projector not turning on',
      status: HelpStatus.WAITING,
    },
    {
      tenantName: 'VIP-Room',
      reason: 'Microphone not working on Console 2',
      status: HelpStatus.IN_PROGRESS,
    },
    {
      tenantName: 'Room-01',
      reason: 'Requested extra chairs for the group',
      status: HelpStatus.RESOLVED,
    },
  ];

  for (const seed of helpRequestSeeds) {
    const tenant = findTenant(seed.tenantName);
    const existing = await prisma.helpRequest.findFirst({
      where: { tenantId: tenant.id, reason: seed.reason },
    });
    if (!existing) {
      await prisma.helpRequest.create({
        data: {
          tenantId: tenant.id,
          reason: seed.reason,
          status: seed.status,
        },
      });
      console.log(`✅ Help request seeded on ${seed.tenantName} (${seed.status})`);
    } else {
      console.log(`⏭️ Help request already exists on ${seed.tenantName}`);
    }
  }

  // ============================================================
  // QUIZ CATEGORIES
  // ============================================================

  const categoryNames = ['Culture', 'Science', 'Music'];
  const categories: Record<string, { id: string }> = {};

  for (const name of categoryNames) {
    const category = await prisma.quizCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categories[name] = category;
  }

  console.log('✅ Quiz categories created');

  // ============================================================
  // QUIZ #1 - GENERAL KNOWLEDGE (already 6 questions)
  // ============================================================

  const existingGeneralKnowledge = await prisma.quizCatalog.findFirst({
    where: { title: 'General Knowledge' },
  });

  if (!existingGeneralKnowledge) {
    await prisma.quizCatalog.create({
      data: {
        title: 'General Knowledge',
        categoryId: categories['Culture'].id,
        type: QuizType.QUIZ,
        createdBy: admin.id,
        questions: {
          create: [
            // FACILE
            {
              text: 'What is the capital of Japan?',
              difficulty: QuizDifficulty.FACILE,
              orderIndex: 0,
              points: 1,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Tokyo', isCorrect: true, orderIndex: 0 },
                  { text: 'Osaka', isCorrect: false, orderIndex: 1 },
                  { text: 'Nagoya', isCorrect: false, orderIndex: 2 },
                  { text: 'Sapporo', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'Largest ocean?',
              difficulty: QuizDifficulty.FACILE,
              orderIndex: 1,
              points: 1,
              timeLimit: 15,
              answerOptions: {
                create: [
                  { text: 'Atlantic', isCorrect: false, orderIndex: 0 },
                  { text: 'Pacific', isCorrect: true, orderIndex: 1 },
                  { text: 'Indian', isCorrect: false, orderIndex: 2 },
                  { text: 'Arctic', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            // MOYEN
            {
              text: 'Who painted the Mona Lisa?',
              difficulty: QuizDifficulty.MOYEN,
              orderIndex: 2,
              points: 2,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Leonardo da Vinci', isCorrect: true, orderIndex: 0 },
                  { text: 'Pablo Picasso', isCorrect: false, orderIndex: 1 },
                  { text: 'Vincent van Gogh', isCorrect: false, orderIndex: 2 },
                  { text: 'Michelangelo', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'Which country has the largest population in the world?',
              difficulty: QuizDifficulty.MOYEN,
              orderIndex: 3,
              points: 2,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'India', isCorrect: true, orderIndex: 0 },
                  { text: 'United States', isCorrect: false, orderIndex: 1 },
                  { text: 'Brazil', isCorrect: false, orderIndex: 2 },
                  { text: 'Indonesia', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            // DIFFICILE
            {
              text: 'Which treaty formally ended World War I?',
              difficulty: QuizDifficulty.DIFFICILE,
              orderIndex: 4,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Treaty of Versailles', isCorrect: true, orderIndex: 0 },
                  { text: 'Treaty of Paris', isCorrect: false, orderIndex: 1 },
                  { text: 'Treaty of Rome', isCorrect: false, orderIndex: 2 },
                  { text: 'Treaty of Vienna', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'What is the smallest country in the world by area?',
              difficulty: QuizDifficulty.DIFFICILE,
              orderIndex: 5,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Vatican City', isCorrect: true, orderIndex: 0 },
                  { text: 'Monaco', isCorrect: false, orderIndex: 1 },
                  { text: 'San Marino', isCorrect: false, orderIndex: 2 },
                  { text: 'Liechtenstein', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('✅ General Knowledge quiz created');
  } else {
    console.log('⏭️ General Knowledge quiz already exists');
  }

  // ============================================================
  // QUIZ #2 - SCIENCE (already 6 questions)
  // ============================================================

  const existingScienceQuiz = await prisma.quizCatalog.findFirst({
    where: { title: 'Science Quiz' },
  });

  if (!existingScienceQuiz) {
    await prisma.quizCatalog.create({
      data: {
        title: 'Science Quiz',
        categoryId: categories['Science'].id,
        type: QuizType.QUIZ,
        createdBy: admin.id,
        questions: {
          create: [
            // FACILE
            {
              text: 'Chemical formula of water?',
              difficulty: QuizDifficulty.FACILE,
              orderIndex: 0,
              points: 1,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'H2O', isCorrect: true, orderIndex: 0 },
                  { text: 'CO2', isCorrect: false, orderIndex: 1 },
                  { text: 'NaCl', isCorrect: false, orderIndex: 2 },
                  { text: 'HCl', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'Earth is the ____ planet from the Sun.',
              difficulty: QuizDifficulty.FACILE,
              orderIndex: 1,
              points: 1,
              timeLimit: 15,
              answerOptions: {
                create: [
                  { text: '2nd', isCorrect: false, orderIndex: 0 },
                  { text: '3rd', isCorrect: true, orderIndex: 1 },
                  { text: '4th', isCorrect: false, orderIndex: 2 },
                  { text: '5th', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            // MOYEN
            {
              text: 'What is the chemical symbol for gold?',
              difficulty: QuizDifficulty.MOYEN,
              orderIndex: 2,
              points: 2,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Au', isCorrect: true, orderIndex: 0 },
                  { text: 'Ag', isCorrect: false, orderIndex: 1 },
                  { text: 'Gd', isCorrect: false, orderIndex: 2 },
                  { text: 'Go', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'Which organelle is known as the powerhouse of the cell?',
              difficulty: QuizDifficulty.MOYEN,
              orderIndex: 3,
              points: 2,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Mitochondria', isCorrect: true, orderIndex: 0 },
                  { text: 'Nucleus', isCorrect: false, orderIndex: 1 },
                  { text: 'Ribosome', isCorrect: false, orderIndex: 2 },
                  { text: 'Golgi apparatus', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            // DIFFICILE
            {
              text: 'What is the approximate speed of light in vacuum?',
              difficulty: QuizDifficulty.DIFFICILE,
              orderIndex: 4,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: '300,000 km/s', isCorrect: true, orderIndex: 0 },
                  { text: '150,000 km/s', isCorrect: false, orderIndex: 1 },
                  { text: '30,000 km/s', isCorrect: false, orderIndex: 2 },
                  { text: '3,000 km/s', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
            {
              text: 'Which particle carries the electromagnetic force?',
              difficulty: QuizDifficulty.DIFFICILE,
              orderIndex: 5,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Photon', isCorrect: true, orderIndex: 0 },
                  { text: 'Electron', isCorrect: false, orderIndex: 1 },
                  { text: 'Neutron', isCorrect: false, orderIndex: 2 },
                  { text: 'Proton', isCorrect: false, orderIndex: 3 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('✅ Science Quiz created');
  } else {
    console.log('⏭️ Science Quiz already exists');
  }

  // ============================================================
  // BLIND TEST - 80s MUSIC (now 5 questions)
  // ============================================================

  const existing80sQuiz = await prisma.quizCatalog.findFirst({
    where: { title: '80s Music' },
  });

  if (!existing80sQuiz) {
    await prisma.quizCatalog.create({
      data: {
        title: '80s Music',
        categoryId: categories['Music'].id,
        type: QuizType.BLIND_TEST,
        createdBy: admin.id,
        questions: {
          create: [
            {
              text: 'Guess the 80s song!',
              difficulty: QuizDifficulty.FACILE,
              mediaUrl: '/audio/80s_track1.mp3',
              orderIndex: 0,
              points: 1,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Billie Jean', isCorrect: true, orderIndex: 0 },
                  { text: 'Thriller', isCorrect: false, orderIndex: 1 },
                  { text: 'Beat It', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Which 80s hit is this?',
              difficulty: QuizDifficulty.FACILE,
              mediaUrl: '/audio/80s_track2.mp3',
              orderIndex: 1,
              points: 1,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Every Breath You Take', isCorrect: true, orderIndex: 0 },
                  { text: 'Roxanne', isCorrect: false, orderIndex: 1 },
                  { text: 'Message in a Bottle', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Identify this 80s classic',
              difficulty: QuizDifficulty.MOYEN,
              mediaUrl: '/audio/80s_track3.mp3',
              orderIndex: 2,
              points: 2,
              timeLimit: 25,
              answerOptions: {
                create: [
                  { text: 'Livin\' on a Prayer', isCorrect: true, orderIndex: 0 },
                  { text: 'You Give Love a Bad Name', isCorrect: false, orderIndex: 1 },
                  { text: 'Wanted Dead or Alive', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Name that 80s tune',
              difficulty: QuizDifficulty.MOYEN,
              mediaUrl: '/audio/80s_track4.mp3',
              orderIndex: 3,
              points: 2,
              timeLimit: 25,
              answerOptions: {
                create: [
                  { text: 'Sweet Child O\' Mine', isCorrect: true, orderIndex: 0 },
                  { text: 'Paradise City', isCorrect: false, orderIndex: 1 },
                  { text: 'November Rain', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'What 80s song is playing?',
              difficulty: QuizDifficulty.DIFFICILE,
              mediaUrl: '/audio/80s_track5.mp3',
              orderIndex: 4,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Bohemian Rhapsody', isCorrect: false, orderIndex: 0 },
                  { text: 'Another One Bites the Dust', isCorrect: true, orderIndex: 1 },
                  { text: 'We Will Rock You', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('✅ 80s Music Blind Test created with 5 questions');
  } else {
    console.log('⏭️ 80s Music already exists');
  }

  // ============================================================
  // BLIND TEST - 90s HITS (now 5 questions)
  // ============================================================

  const existing90sQuiz = await prisma.quizCatalog.findFirst({
    where: { title: 'Blind Test — 90s Hits' },
  });

  if (!existing90sQuiz) {
    await prisma.quizCatalog.create({
      data: {
        title: 'Blind Test — 90s Hits',
        categoryId: categories['Music'].id,
        type: QuizType.BLIND_TEST,
        createdBy: admin.id,
        questions: {
          create: [
            // Original question
            {
              text: 'Guess the song!',
              difficulty: QuizDifficulty.MOYEN,
              mediaUrl: '/audio/track1.mp3',
              orderIndex: 0,
              points: 2,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Bohemian Rhapsody', isCorrect: true, orderIndex: 0 },
                  { text: 'Stairway to Heaven', isCorrect: false, orderIndex: 1 },
                  { text: 'Hotel California', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            // New questions 2–5
            {
              text: 'Which 90s hit is this?',
              difficulty: QuizDifficulty.FACILE,
              mediaUrl: '/audio/90s_track2.mp3',
              orderIndex: 1,
              points: 1,
              timeLimit: 20,
              answerOptions: {
                create: [
                  { text: 'Smells Like Teen Spirit', isCorrect: true, orderIndex: 0 },
                  { text: 'Come As You Are', isCorrect: false, orderIndex: 1 },
                  { text: 'Lithium', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Identify this 90s classic',
              difficulty: QuizDifficulty.MOYEN,
              mediaUrl: '/audio/90s_track3.mp3',
              orderIndex: 2,
              points: 2,
              timeLimit: 25,
              answerOptions: {
                create: [
                  { text: 'Wonderwall', isCorrect: true, orderIndex: 0 },
                  { text: 'Don\'t Look Back in Anger', isCorrect: false, orderIndex: 1 },
                  { text: 'Champagne Supernova', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Name that 90s tune',
              difficulty: QuizDifficulty.DIFFICILE,
              mediaUrl: '/audio/90s_track4.mp3',
              orderIndex: 3,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Basket Case', isCorrect: false, orderIndex: 0 },
                  { text: 'Good Riddance (Time of Your Life)', isCorrect: true, orderIndex: 1 },
                  { text: 'When I Come Around', isCorrect: false, orderIndex: 2 },
                ],
              },
            },
            {
              text: 'Which song is this?',
              difficulty: QuizDifficulty.DIFFICILE,
              mediaUrl: '/audio/90s_track5.mp3',
              orderIndex: 4,
              points: 3,
              timeLimit: 30,
              answerOptions: {
                create: [
                  { text: 'Wannabe', isCorrect: false, orderIndex: 0 },
                  { text: 'Spice Up Your Life', isCorrect: false, orderIndex: 1 },
                  { text: 'Viva Forever', isCorrect: true, orderIndex: 2 },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('✅ Blind Test 90s Hits created with 5 questions');
  } else {
    console.log('⏭️ Blind Test 90s Hits already exists');
  }

  // ============================================================
  // KARAOKE QUIZ (now 5 songs)
  // ============================================================

  let karaokeQuiz = await prisma.quizCatalog.findFirst({
    where: { title: 'Karaoke Catalog' },
  });

  if (!karaokeQuiz) {
    karaokeQuiz = await prisma.quizCatalog.create({
      data: {
        title: 'Karaoke Catalog',
        categoryId: categories['Music'].id,
        type: QuizType.KARAOKE,
        createdBy: admin.id,
      },
    });
    console.log('✅ Karaoke Catalog created');
  } else {
    console.log('⏭️ Karaoke Catalog already exists');
  }

  // Helper to create a song if not exists
  async function createSongIfNotExists(quizId: string, title: string, artist: string, externalApiId?: string) {
    const existing = await prisma.karaokeSong.findFirst({
      where: { quizId, title, artist },
    });
    if (!existing) {
      await prisma.karaokeSong.create({
        data: {
          quizId,
          title,
          artist,
          externalApiId: externalApiId || `song-${Date.now()}-${Math.random()}`,
          lyricsJson: [
            { timeMs: 0, line: `[Intro] ${title}` },
            { timeMs: 5000, line: `Verse 1 of ${title}` },
            { timeMs: 10000, line: `Chorus of ${title}` },
          ],
        },
      });
      console.log(`✅ Karaoke song created: ${title} by ${artist}`);
    } else {
      console.log(`⏭️ Karaoke song already exists: ${title}`);
    }
  }

  // Add 5 songs total (the previously existing ones + 2 new ones)
  await createSongIfNotExists(karaokeQuiz.id, 'Test Song One', 'Test Artist', 'demo-song-1');
  await createSongIfNotExists(karaokeQuiz.id, 'Bohemian Rhapsody', 'Queen');
  await createSongIfNotExists(karaokeQuiz.id, 'Imagine', 'John Lennon');
  await createSongIfNotExists(karaokeQuiz.id, 'Livin\' on a Prayer', 'Bon Jovi');
  await createSongIfNotExists(karaokeQuiz.id, 'Sweet Child O\' Mine', 'Guns N\' Roses');

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Admin Login');
  console.log('Email    : admin@crms.local');
  console.log('Password : admin123');
  console.log('');
  console.log('Tenants');
  tenants.forEach((tenant) => console.log(`- ${tenant.name}`));
  console.log('');
  console.log('Help Requests');
  helpRequestSeeds.forEach((seed) => console.log(`- ${seed.tenantName}: ${seed.status}`));
  console.log('');
  console.log('Quiz Categories');
  categoryNames.forEach((category) => console.log(`- ${category}`));
  console.log('');
  console.log('Question Difficulties');
  console.log('- FACILE');
  console.log('- MOYEN');
  console.log('- DIFFICILE');
  console.log('');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });