import { PrismaClient, QuizType, TenantStatus } from '../generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ------------------------------------------------------------
  // ADMIN USER
  // password = admin123
  // ------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: {
      email: 'admin@crms.local',
    },
    update: {},
    create: {
      email: 'admin@crms.local',
      passwordHash:
        '$2a$12$Ezk6Q7fhavdYSTbUvmHODe9pHGzmKpjH5q24uoKe3WUET48Z34mOW',
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Admin created');

  // ------------------------------------------------------------
  // TENANTS
  // ------------------------------------------------------------
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
      where: {
        name: room,
      },
      update: {},
      create: {
        name: room,
        status: TenantStatus.NORMAL,
      },
    });

    tenants.push(tenant);
  }

  console.log(`✅ ${tenants.length} tenants created`);

  // ------------------------------------------------------------
  // ROOM CONFIGURATION
  // ------------------------------------------------------------
  for (const tenant of tenants) {
    await prisma.roomConfiguration.upsert({
      where: {
        tenantId: tenant.id,
      },
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

  // ------------------------------------------------------------
  // QUIZ #1
  // ------------------------------------------------------------
  await prisma.quizCatalog.create({
    data: {
      title: 'General Knowledge',
      category: 'Culture',
      type: QuizType.QUIZ,
      difficulty: 2,
      createdBy: admin.id,

      questions: {
        create: [
          {
            text: 'What is the capital of Japan?',
            orderIndex: 0,
            points: 2,
            timeLimit: 20,

            answerOptions: {
              create: [
                {
                  text: 'Tokyo',
                  isCorrect: true,
                  orderIndex: 0,
                },
                {
                  text: 'Osaka',
                  isCorrect: false,
                  orderIndex: 1,
                },
                {
                  text: 'Nagoya',
                  isCorrect: false,
                  orderIndex: 2,
                },
                {
                  text: 'Sapporo',
                  isCorrect: false,
                  orderIndex: 3,
                },
              ],
            },
          },

          {
            text: 'Largest ocean?',
            orderIndex: 1,
            points: 1,
            timeLimit: 15,

            answerOptions: {
              create: [
                {
                  text: 'Atlantic',
                  isCorrect: false,
                  orderIndex: 0,
                },
                {
                  text: 'Pacific',
                  isCorrect: true,
                  orderIndex: 1,
                },
                {
                  text: 'Indian',
                  isCorrect: false,
                  orderIndex: 2,
                },
                {
                  text: 'Arctic',
                  isCorrect: false,
                  orderIndex: 3,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Quiz 1 created');

  // ------------------------------------------------------------
  // QUIZ #2
  // ------------------------------------------------------------
  await prisma.quizCatalog.create({
    data: {
      title: 'Science Quiz',
      category: 'Science',
      type: QuizType.QUIZ,
      difficulty: 3,
      createdBy: admin.id,

      questions: {
        create: [
          {
            text: 'Chemical formula of water?',
            orderIndex: 0,
            timeLimit: 20,

            answerOptions: {
              create: [
                {
                  text: 'H2O',
                  isCorrect: true,
                  orderIndex: 0,
                },
                {
                  text: 'CO2',
                  isCorrect: false,
                  orderIndex: 1,
                },
                {
                  text: 'NaCl',
                  isCorrect: false,
                  orderIndex: 2,
                },
                {
                  text: 'HCl',
                  isCorrect: false,
                  orderIndex: 3,
                },
              ],
            },
          },

          {
            text: 'Earth is the ____ planet from the Sun.',
            orderIndex: 1,

            answerOptions: {
              create: [
                {
                  text: '2nd',
                  isCorrect: false,
                  orderIndex: 0,
                },
                {
                  text: '3rd',
                  isCorrect: true,
                  orderIndex: 1,
                },
                {
                  text: '4th',
                  isCorrect: false,
                  orderIndex: 2,
                },
                {
                  text: '5th',
                  isCorrect: false,
                  orderIndex: 3,
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('✅ Quiz 2 created');

  // ------------------------------------------------------------
  // BLIND TEST
  // ------------------------------------------------------------
  await prisma.quizCatalog.create({
    data: {
      title: '80s Music',
      category: 'Music',
      type: QuizType.BLIND_TEST,
      difficulty: 2,
      createdBy: admin.id,
    },
  });

  console.log('✅ Blind Test created');

  // ------------------------------------------------------------
  // KARAOKE QUIZ
  // ------------------------------------------------------------
const karaokeQuiz = await prisma.quizCatalog.create({
  data: { title: 'Karaoke Catalog', category: 'Music', type: 'KARAOKE', difficulty: 1 },
});

await prisma.karaokeSong.create({
  data: {
    quizId: karaokeQuiz.id,
    title: 'Test Song One',
    artist: 'Test Artist',
    externalApiId: 'demo-song-1', // pretend ID for the external API
    lyricsJson: [
      { timeMs: 0, line: 'First line of the song' },
      { timeMs: 3000, line: 'Second line, three seconds in' },
      { timeMs: 7000, line: 'Third line, a bit later' },
    ],
  },
});

  await prisma.karaokeSong.createMany({
    data: [
      {
        quizId: karaokeQuiz.id,
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        lyricsJson: {
          lines: [],
        },
      },
      {
        quizId: karaokeQuiz.id,
        title: 'Imagine',
        artist: 'John Lennon',
        lyricsJson: {
          lines: [],
        },
      },
    ],
  });

  console.log('✅ Karaoke songs created');
// A one-off script or extend prisma/seed.ts
await prisma.quizCatalog.create({
  data: {
    title: 'Blind Test — 90s Hits',
    category: 'Music',
    type: 'BLIND_TEST',
    difficulty: 2,
    questions: {
      create: [
        {
          text: 'Guess the song!',
          mediaUrl: '/audio/track1.mp3',
          timeLimit: 20,
          points: 2,
          orderIndex: 0,
          answerOptions: {
            create: [
              { text: 'Bohemian Rhapsody', isCorrect: true, orderIndex: 0 },
              { text: 'Stairway to Heaven', isCorrect: false, orderIndex: 1 },
              { text: 'Hotel California', isCorrect: false, orderIndex: 2 },
            ],
          },
        },
      ],
    },
  },
});



  console.log('');
  console.log('🎉 Database seeded successfully!');
  console.log('');
  console.log('Admin Login');
  console.log('Email    : admin@crms.local');
  console.log('Password : admin123');
  console.log('');
  console.log('Tenants');
  tenants.forEach((t) => console.log(`- ${t.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });